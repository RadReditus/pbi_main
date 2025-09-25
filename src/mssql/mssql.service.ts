import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '../config/config.service';
import { ServiceStatusService } from '../health/service-status.service';
import { RussianNamesMapperService } from './russian-names-mapper.service';
import * as mssql from 'mssql';

@Injectable()
export class MssqlService implements OnModuleInit {
  private readonly logger = new Logger(MssqlService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly serviceStatusService: ServiceStatusService,
    private readonly russianNamesMapper: RussianNamesMapperService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('MssqlService.onModuleInit() called - START');
      
      // Импортируем настройки напрямую из settings.ts
      this.logger.log('Loading settings from ../config/settings');
      const settings = require('../config/settings');
      this.logger.log('Settings loaded successfully');
      
      const mssqlPtcDbEnabled = settings.mssqlPtcDbEnabled;
      const mssqlDelaySeconds = settings.mssqlDelaySeconds;
      
      this.logger.log(`MSSQL loader initialization: enabled=${mssqlPtcDbEnabled}, delay=${mssqlDelaySeconds}s`);
      
      // Обновляем статус сервиса
      this.logger.log('Updating service status');
      this.serviceStatusService.updateServiceStatus('mssql_loader', {
        enabled: mssqlPtcDbEnabled,
        running: false
      });
      this.logger.log('Service status updated');
      
      if (!mssqlPtcDbEnabled) {
        this.logger.log('MSSQL loader disabled by configuration (mssqlPtcDbEnabled = false)');
        return;
      }

      this.logger.log(`MSSQL loader will start in ${mssqlDelaySeconds}s`);
      
      setTimeout(() => {
        this.logger.log('MSSQL loader timeout triggered - starting runMssqlLoader');
        this.runMssqlLoader().catch((err) => {
          this.logger.error('MSSQL loader run error', err.stack || err);
          this.serviceStatusService.setServiceError('mssql_loader', err.message || 'Unknown error');
        });
      }, mssqlDelaySeconds * 1000);
      
      this.logger.log('MssqlService.onModuleInit() completed successfully');
    } catch (error) {
      this.logger.error('MssqlService.onModuleInit() ERROR:', error.stack || error);
      this.serviceStatusService.setServiceError('mssql_loader', error.message || 'Unknown error in onModuleInit');
    }
  }

  private async runMssqlLoader(): Promise<void> {
    try {
      this.logger.log('Starting MSSQL data loader...');
      
      // Отмечаем сервис как запущенный
      this.serviceStatusService.updateServiceStatus('mssql_loader', {
        running: true,
        lastRun: new Date()
      });

      // Импортируем настройки напрямую из settings.ts
      const { mssqlLaunchDbLoad, mssqlCredentials, mssqlTimeoutSeconds, mssqlBatchSize, mssqlBatchDelaySeconds } = require('../config/settings');

      this.logger.log(`MSSQL Launch DB Load: ${JSON.stringify(mssqlLaunchDbLoad)}`);
      this.logger.log(`MSSQL Credentials: ${JSON.stringify(mssqlCredentials)}`);

      // Обрабатываем каждую базу из launch_db_load
      for (const dbConfig of mssqlLaunchDbLoad) {
        for (const [dbName, isEnabled] of Object.entries(dbConfig)) {
          this.logger.log(`Processing database: ${dbName}, enabled: ${isEnabled}`);
          
          if (!isEnabled) {
            this.logger.log(`Skipping ${dbName} - disabled in configuration`);
            continue;
          }

          if (!mssqlCredentials[dbName]) {
            this.logger.warn(`No credentials found for ${dbName}, skipping`);
            continue;
          }

          this.logger.log(`Loading database ${dbName} from MSSQL...`);
          await this.loadDatabaseFromMssql(dbName, mssqlCredentials[dbName], mssqlTimeoutSeconds, mssqlBatchSize, mssqlBatchDelaySeconds);
        }
      }

      this.logger.log('MSSQL data loader completed successfully');
    } catch (error) {
      this.logger.error('MSSQL loader error', error.stack || error);
      this.serviceStatusService.setServiceError('mssql_loader', error.message || 'Unknown error');
    }
  }

  private async loadDatabaseFromMssql(dbName: string, credentials: any, timeoutSeconds: number, batchSize: number, batchDelaySeconds: number): Promise<void> {
    this.logger.log(`Starting load for database: ${dbName}`);
    
    try {
      // Создаем базу данных в PostgreSQL
      await this.createPostgresDatabase(dbName);
      
      // Подключаемся к MSSQL
      const mssqlConfig = {
        server: credentials.server,
        port: credentials.port,
        database: credentials.database,
        user: credentials.username,
        password: credentials.password,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          requestTimeout: timeoutSeconds * 1000,
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      };

      const pool = await mssql.connect(mssqlConfig);
      this.logger.log(`Connected to MSSQL database: ${credentials.database}`);

      // Получаем список таблиц
      const tablesResult = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);

      const tables = tablesResult.recordset.map(row => row.TABLE_NAME);
      this.logger.log(`Found ${tables.length} tables in MSSQL database: ${tables.join(', ')}`);

      // Загружаем каждую таблицу
      for (const tableName of tables) {
        await this.loadTableFromMssql(pool, dbName, tableName, batchSize, batchDelaySeconds);
      }

      await pool.close();
      this.logger.log(`Completed load for database: ${dbName}`);
    } catch (error) {
      this.logger.error(`Error loading database ${dbName}:`, error.stack || error);
      throw error;
    }
  }

  private async createPostgresDatabase(dbName: string): Promise<void> {
    try {
      // Подключаемся к базе postgres для создания новой базы
      const adminDataSource = new DataSource({
        type: 'postgres',
        host: process.env.PG_HOST,
        port: +(process.env.PG_PORT || 5432),
        username: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: 'postgres', // Подключаемся к системной базе
      });

      await adminDataSource.initialize();
      
      // Проверяем, существует ли база
      const dbExists = await adminDataSource.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      );

      if (dbExists.length === 0) {
        // Создаем базу данных с поддержкой кириллицы
        await adminDataSource.query(`CREATE DATABASE "${dbName}" WITH ENCODING 'UTF8' LC_COLLATE='C.utf8' LC_CTYPE='C.utf8' TEMPLATE=template0`);
        this.logger.log(`Created PostgreSQL database: ${dbName} with UTF8 encoding and C.utf8 collation`);
      } else {
        this.logger.log(`PostgreSQL database ${dbName} already exists`);
      }

      await adminDataSource.destroy();
    } catch (error) {
      this.logger.error(`Error creating PostgreSQL database ${dbName}:`, error.stack || error);
      throw error;
    }
  }

  private async loadTableFromMssql(pool: mssql.ConnectionPool, dbName: string, tableName: string, batchSize: number, batchDelaySeconds: number): Promise<void> {
    this.logger.log(`Loading table: ${tableName} from MSSQL to PostgreSQL database: ${dbName}`);
    
    try {
      // Получаем структуру таблицы
      const columnsResult = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `);

      const columns = columnsResult.recordset;
      
      // Создаем таблицу в PostgreSQL
      await this.createPostgresTable(dbName, tableName, columns);
      
      // Загружаем данные батчами
      await this.loadTableDataInBatches(pool, dbName, tableName, columns, batchSize, batchDelaySeconds);
      
      this.logger.log(`Completed loading table: ${tableName}`);
      
      // Проверяем кириллицу в справочниках
      if (tableName.startsWith('_Reference')) {
        await this.checkCyrillicInTable(dbName, tableName);
      }
    } catch (error) {
      this.logger.error(`Error loading table ${tableName}:`, error.stack || error);
      throw error;
    }
  }

  private async createPostgresTable(dbName: string, tableName: string, columns: any[]): Promise<void> {
    try {
      // Создаем подключение к новой базе данных
      const dbDataSource = new DataSource({
        type: 'postgres',
        host: process.env.PG_HOST,
        port: +(process.env.PG_PORT || 5432),
        username: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: dbName,
      });

      await dbDataSource.initialize();

      // Получаем русские названия
      const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
      const russianTableDisplayName = this.russianNamesMapper.getTableRussianName(tableName);

      // Создаем SQL для создания таблицы с русскими названиями
      const columnDefinitions = columns.map(col => {
        let pgType = this.mapMssqlToPostgresType(col.DATA_TYPE, col.CHARACTER_MAXIMUM_LENGTH);
        let nullable = col.IS_NULLABLE === 'YES' ? '' : 'NOT NULL';
        
        // Получаем русское название поля
        const russianFieldName = this.russianNamesMapper.getPostgresFieldName(col.COLUMN_NAME);
        const russianFieldDisplayName = this.russianNamesMapper.getFieldRussianName(col.COLUMN_NAME);
        
        // Логируем маппинг типов данных и названий
        this.logger.log(`Column mapping for ${tableName}.${col.COLUMN_NAME}: MSSQL type "${col.DATA_TYPE}" (length: ${col.CHARACTER_MAXIMUM_LENGTH}) -> PostgreSQL type "${pgType}"`);
        this.logger.log(`Field name mapping: ${col.COLUMN_NAME} -> ${russianFieldName} (${russianFieldDisplayName})`);
        
        return `"${russianFieldName}" ${pgType} ${nullable}`.trim();
      }).join(',\n  ');

      // Добавляем комментарии к таблице и полям
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS "${russianTableName}" (
          ${columnDefinitions}
        )
      `;

      await dbDataSource.query(createTableSql);
      
      // Добавляем комментарий к таблице
      const tableCommentSql = `COMMENT ON TABLE "${russianTableName}" IS '${russianTableDisplayName}'`;
      await dbDataSource.query(tableCommentSql);
      
      // Добавляем комментарии к полям
      for (const col of columns) {
        const russianFieldName = this.russianNamesMapper.getPostgresFieldName(col.COLUMN_NAME);
        const russianFieldDisplayName = this.russianNamesMapper.getFieldRussianName(col.COLUMN_NAME);
        const fieldCommentSql = `COMMENT ON COLUMN "${russianTableName}"."${russianFieldName}" IS '${russianFieldDisplayName}'`;
        await dbDataSource.query(fieldCommentSql);
      }
      
      this.logger.log(`Created PostgreSQL table: ${russianTableName} (${russianTableDisplayName}) in database: ${dbName}`);

      await dbDataSource.destroy();
    } catch (error) {
      this.logger.error(`Error creating PostgreSQL table ${tableName}:`, error.stack || error);
      throw error;
    }
  }

  private mapMssqlToPostgresType(mssqlType: string, maxLength?: number): string {
    const typeMap: { [key: string]: string } = {
      'varchar': maxLength ? `VARCHAR(${maxLength})` : 'TEXT',
      'nvarchar': maxLength ? `VARCHAR(${maxLength})` : 'TEXT',
      'char': maxLength ? `CHAR(${maxLength})` : 'CHAR(1)',
      'nchar': maxLength ? `CHAR(${maxLength})` : 'CHAR(1)',
      'text': 'TEXT',
      'ntext': 'TEXT',
      'int': 'INTEGER',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'tinyint': 'SMALLINT',
      'bit': 'BOOLEAN',
      'decimal': 'DECIMAL',
      'numeric': 'NUMERIC',
      'float': 'DOUBLE PRECISION',
      'real': 'REAL',
      'datetime': 'TIMESTAMP',
      'datetime2': 'TIMESTAMP',
      'smalldatetime': 'TIMESTAMP',
      'date': 'DATE',
      'time': 'TIME',
      'uniqueidentifier': 'UUID',
      'varbinary': 'BYTEA',
      'binary': 'BYTEA',
      'image': 'BYTEA',
    };

    return typeMap[mssqlType.toLowerCase()] || 'TEXT';
  }

  private async checkCyrillicInTable(dbName: string, tableName: string): Promise<void> {
    try {
      // Создаем подключение к базе данных
      const dbDataSource = new DataSource({
        type: 'postgres',
        host: process.env.PG_HOST,
        port: +(process.env.PG_PORT || 5432),
        username: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: dbName,
      });

      await dbDataSource.initialize();

      // Получаем русские названия
      const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
      const russianTableDisplayName = this.russianNamesMapper.getTableRussianName(tableName);

      // Получаем первые 5 записей из справочника
      const result = await dbDataSource.query(`SELECT * FROM "${russianTableName}" LIMIT 5`);
      
      this.logger.log(`=== КИРИЛЛИЦА В СПРАВОЧНИКЕ ${russianTableName} (${russianTableDisplayName}) ===`);
      
      if (result.length === 0) {
        this.logger.log(`Справочник ${russianTableDisplayName} пуст`);
      } else {
        // Выводим каждую запись
        result.forEach((record, index) => {
          this.logger.log(`Запись ${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            // Получаем русское название поля
            const russianFieldName = this.russianNamesMapper.getFieldRussianName(key);
            
            // Проверяем, содержит ли поле кириллицу
            const hasCyrillic = /[а-яё]/i.test(String(value));
            const status = hasCyrillic ? '✅ КИРИЛЛИЦА' : '📝 ТЕКСТ';
            this.logger.log(`  ${russianFieldName} (${key}): ${value} (${status})`);
          });
          this.logger.log('---');
        });
      }

      await dbDataSource.destroy();
    } catch (error) {
      this.logger.error(`Ошибка проверки кириллицы в ${tableName}:`, error.stack || error);
    }
  }

  private async loadTableDataInBatches(
    pool: mssql.ConnectionPool, 
    dbName: string, 
    tableName: string, 
    columns: any[],
    batchSize: number,
    batchDelaySeconds: number
  ): Promise<void> {
    const batchDelay = batchDelaySeconds * 1000; // Пауза между батчами в миллисекундах
    
    try {
      // Получаем общее количество записей
      const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM "${tableName}"`);
      const totalRecords = countResult.recordset[0].total;
      
      this.logger.log(`Total records to load: ${totalRecords} for table: ${tableName}`);
      
      let offset = 0;
      let batchNumber = 1;
      
      while (offset < totalRecords) {
        this.logger.log(`Loading batch ${batchNumber} (${offset + 1}-${Math.min(offset + batchSize, totalRecords)}) for table: ${tableName}`);
        
        // Получаем данные батча
        const batchResult = await pool.request().query(`
          SELECT * FROM "${tableName}"
          ORDER BY (SELECT NULL)
          OFFSET ${offset} ROWS
          FETCH NEXT ${batchSize} ROWS ONLY
        `);
        
        if (batchResult.recordset.length === 0) {
          break;
        }
        
        // Вставляем данные в PostgreSQL
        await this.insertBatchToPostgres(dbName, tableName, batchResult.recordset, columns);
        
        this.logger.log(`Completed batch ${batchNumber} (${batchResult.recordset.length} records) for table: ${tableName}`);
        
        offset += batchSize;
        batchNumber++;
        
        // Пауза между батчами (кроме последнего)
        if (offset < totalRecords) {
          this.logger.log(`Waiting ${batchDelay / 1000}s before next batch...`);
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }
      
      this.logger.log(`Completed loading all data for table: ${tableName}`);
    } catch (error) {
      this.logger.error(`Error loading table data for ${tableName}:`, error.stack || error);
      throw error;
    }
  }

  private async insertBatchToPostgres(
    dbName: string, 
    tableName: string, 
    records: any[], 
    columns: any[]
  ): Promise<void> {
    if (records.length === 0) return;
    
    try {
      const dbDataSource = new DataSource({
        type: 'postgres',
        host: process.env.PG_HOST,
        port: +(process.env.PG_PORT || 5432),
        username: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: dbName,
      });

      await dbDataSource.initialize();

      // Получаем русские названия
      const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
      
      // Подготавливаем данные для вставки с русскими названиями полей
      const columnNames = columns.map(col => {
        const russianFieldName = this.russianNamesMapper.getPostgresFieldName(col.COLUMN_NAME);
        return `"${russianFieldName}"`;
      }).join(', ');
      
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      const insertSql = `INSERT INTO "${russianTableName}" (${columnNames}) VALUES (${placeholders})`;
      
      // Вставляем записи по одной (можно оптимизировать для батчевой вставки)
      for (const record of records) {
        const values = columns.map(col => record[col.COLUMN_NAME]);
        await dbDataSource.query(insertSql, values);
      }

      await dbDataSource.destroy();
    } catch (error) {
      this.logger.error(`Error inserting batch to PostgreSQL for table ${tableName}:`, error.stack || error);
      throw error;
    }
  }
}
