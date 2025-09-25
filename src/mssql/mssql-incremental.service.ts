import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '../config/config.service';
import { ServiceStatusService } from '../health/service-status.service';
import { MssqlChangeTracker } from './mssql-change-tracker.entity';
import { RecordsService } from '../records/records.service';
import { RussianNamesMapperService } from './russian-names-mapper.service';
import * as mssql from 'mssql';
import * as crypto from 'crypto';

export interface MssqlIncrementalResult {
  databaseName: string;
  tableName: string;
  strategy: 'full' | 'incremental' | 'skip';
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  duration: number;
  lastProcessedId: number;
}

@Injectable()
export class MssqlIncrementalService implements OnModuleInit {
  private readonly logger = new Logger(MssqlIncrementalService.name);

  constructor(
    @InjectRepository(MssqlChangeTracker, 'users')
    private readonly changeTrackerRepo: Repository<MssqlChangeTracker>,
    private readonly configService: ConfigService,
    private readonly serviceStatusService: ServiceStatusService,
    private readonly recordsService: RecordsService,
    private readonly russianNamesMapper: RussianNamesMapperService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('MssqlIncrementalService.onModuleInit() called - START');
      
      const settings = require('../config/settings');
      const mssqlPtcDbEnabled = settings.mssqlPtcDbEnabled;
      const mssqlDelaySeconds = settings.mssqlDelaySeconds;
      
      this.logger.log(`MSSQL incremental loader initialization: enabled=${mssqlPtcDbEnabled}, delay=${mssqlDelaySeconds}s`);
      
      this.serviceStatusService.updateServiceStatus('mssql_incremental_loader', {
        enabled: mssqlPtcDbEnabled,
        running: false
      });
      
      if (!mssqlPtcDbEnabled) {
        this.logger.log('MSSQL incremental loader disabled by configuration');
        return;
      }

      this.logger.log(`MSSQL incremental loader will start in ${mssqlDelaySeconds}s`);
      
      setTimeout(() => {
        this.logger.log('MSSQL incremental loader timeout triggered - starting runIncrementalLoader');
        this.runIncrementalLoader().catch((err) => {
          this.logger.error('MSSQL incremental loader run error', err.stack || err);
          this.serviceStatusService.setServiceError('mssql_incremental_loader', err.message || 'Unknown error');
        });
      }, mssqlDelaySeconds * 1000);
      
      this.logger.log('MssqlIncrementalService.onModuleInit() completed successfully');
    } catch (error) {
      this.logger.error('MssqlIncrementalService.onModuleInit() ERROR:', error.stack || error);
      this.serviceStatusService.setServiceError('mssql_incremental_loader', error.message || 'Unknown error in onModuleInit');
    }
  }

  private async runIncrementalLoader(): Promise<void> {
    try {
      this.logger.log('Starting MSSQL incremental data loader...');
      
      this.serviceStatusService.updateServiceStatus('mssql_incremental_loader', {
        running: true,
        lastRun: new Date()
      });

      const { mssqlLaunchDbLoad, mssqlCredentials, mssqlTimeoutSeconds } = require('../config/settings');

      this.logger.log(`MSSQL Launch DB Load: ${JSON.stringify(mssqlLaunchDbLoad)}`);

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

          this.logger.log(`Loading database ${dbName} from MSSQL with incremental sync...`);
          await this.loadDatabaseIncremental(dbName, mssqlCredentials[dbName], mssqlTimeoutSeconds);
        }
      }

      this.logger.log('MSSQL incremental data loader completed successfully');
    } catch (error) {
      this.logger.error('MSSQL incremental loader error', error.stack || error);
      this.serviceStatusService.setServiceError('mssql_incremental_loader', error.message || 'Unknown error');
    }
  }

  private async loadDatabaseIncremental(dbName: string, credentials: any, timeoutSeconds: number): Promise<void> {
    this.logger.log(`Starting incremental load for database: ${dbName}`);
    
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

      // Загружаем каждую таблицу с инкрементальной синхронизацией
      for (const tableName of tables) {
        await this.loadTableIncremental(pool, dbName, tableName);
      }

      await pool.close();
      this.logger.log(`Completed incremental load for database: ${dbName}`);
    } catch (error) {
      this.logger.error(`Error loading database ${dbName}:`, error.stack || error);
      throw error;
    }
  }

  private async loadTableIncremental(pool: mssql.ConnectionPool, dbName: string, tableName: string): Promise<MssqlIncrementalResult> {
    const startTime = Date.now();
    this.logger.log(`Starting incremental load for table: ${tableName} in database: ${dbName}`);
    
    try {
      // Получаем или создаем трекер изменений
      let tracker = await this.changeTrackerRepo.findOne({
        where: { databaseName: dbName, tableName: tableName }
      });

      if (!tracker) {
        tracker = await this.createChangeTracker(dbName, tableName, pool);
      }

      // Определяем стратегию синхронизации
      const strategy = await this.determineSyncStrategy(pool, dbName, tableName, tracker);
      this.logger.log(`Sync strategy for ${tableName}: ${strategy}`);

      let result: MssqlIncrementalResult;

      switch (strategy) {
        case 'full':
          result = await this.performFullSync(pool, dbName, tableName, tracker);
          break;
        case 'incremental':
          result = await this.performIncrementalSync(pool, dbName, tableName, tracker);
          break;
        case 'skip':
          result = await this.performSkipSync(dbName, tableName, tracker);
          break;
      }

      result.duration = Date.now() - startTime;
      this.logger.log(`Completed ${strategy} sync for ${tableName}: ${JSON.stringify(result)}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error in incremental load for table ${tableName}:`, error.stack || error);
      throw error;
    }
  }

  private async createChangeTracker(dbName: string, tableName: string, pool: mssql.ConnectionPool): Promise<MssqlChangeTracker> {
    this.logger.log(`Creating change tracker for ${dbName}.${tableName}`);
    
    // Определяем первичный ключ и колонку времени
    const primaryKeyResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = '${tableName}' AND CONSTRAINT_NAME LIKE 'PK_%'
      ORDER BY ORDINAL_POSITION
    `);

    const primaryKeyColumn = primaryKeyResult.recordset.length > 0 
      ? primaryKeyResult.recordset[0].COLUMN_NAME 
      : 'id';

    // Ищем колонку времени (datetime, timestamp и т.д.)
    const timestampResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}' 
        AND (DATA_TYPE IN ('datetime', 'datetime2', 'timestamp') OR COLUMN_NAME LIKE '%date%' OR COLUMN_NAME LIKE '%time%')
      ORDER BY ORDINAL_POSITION
    `);

    const timestampColumn = timestampResult.recordset.length > 0 
      ? timestampResult.recordset[0].COLUMN_NAME 
      : null;

    const tracker = this.changeTrackerRepo.create({
      databaseName: dbName,
      tableName: tableName,
      primaryKeyColumn: primaryKeyColumn,
      timestampColumn: timestampColumn,
      lastProcessedRecordId: 0,
      totalRecordsCount: 0,
      processedRecordsCount: 0,
      isActive: true
    });

    return await this.changeTrackerRepo.save(tracker);
  }

  private async determineSyncStrategy(
    pool: mssql.ConnectionPool, 
    dbName: string, 
    tableName: string, 
    tracker: MssqlChangeTracker
  ): Promise<'full' | 'incremental' | 'skip'> {
    
    // Получаем текущее количество записей в MSSQL
    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM "${tableName}"`);
    const currentCount = countResult.recordset[0].total;

    // Если это первая загрузка или количество записей уменьшилось
    if (tracker.processedRecordsCount === 0 || currentCount < tracker.totalRecordsCount) {
      this.logger.log(`Full sync needed for ${tableName}: first load or records decreased`);
      return 'full';
    }

    // Если количество записей не изменилось
    if (currentCount === tracker.totalRecordsCount) {
      this.logger.log(`Skip sync for ${tableName}: no changes detected`);
      return 'skip';
    }

    // Если количество записей увеличилось - инкрементальная синхронизация
    this.logger.log(`Incremental sync needed for ${tableName}: records increased from ${tracker.totalRecordsCount} to ${currentCount}`);
    return 'incremental';
  }

  private async performFullSync(
    pool: mssql.ConnectionPool, 
    dbName: string, 
    tableName: string, 
    tracker: MssqlChangeTracker
  ): Promise<MssqlIncrementalResult> {
    this.logger.log(`Performing full sync for ${tableName}`);
    
    // Очищаем таблицу в PostgreSQL
    await this.clearPostgresTable(dbName, tableName);
    
    // Получаем все данные из MSSQL
    const allDataResult = await pool.request().query(`SELECT * FROM "${tableName}" ORDER BY "${tracker.primaryKeyColumn}"`);
    const allRecords = allDataResult.recordset;
    
    // Обрабатываем через систему Records для фильтрации
    const processedRecords = await this.processRecordsThroughFilter(dbName, tableName, allRecords);
    
    // Вставляем в PostgreSQL
    const insertedCount = await this.insertRecordsToPostgres(dbName, tableName, processedRecords);
    
    // Обновляем трекер
    await this.updateTracker(tracker, allRecords.length, allRecords.length, allRecords[allRecords.length - 1]?.[tracker.primaryKeyColumn] || 0);
    
    return {
      databaseName: dbName,
      tableName: tableName,
      strategy: 'full',
      recordsProcessed: allRecords.length,
      recordsInserted: insertedCount,
      recordsUpdated: 0,
      recordsSkipped: allRecords.length - insertedCount,
      duration: 0,
      lastProcessedId: allRecords[allRecords.length - 1]?.[tracker.primaryKeyColumn] || 0
    };
  }

  private async performIncrementalSync(
    pool: mssql.ConnectionPool, 
    dbName: string, 
    tableName: string, 
    tracker: MssqlChangeTracker
  ): Promise<MssqlIncrementalResult> {
    this.logger.log(`Performing incremental sync for ${tableName}`);
    
    // Получаем новые записи с ID больше последнего обработанного
    const newRecordsResult = await pool.request().query(`
      SELECT * FROM "${tableName}" 
      WHERE "${tracker.primaryKeyColumn}" > ${tracker.lastProcessedRecordId}
      ORDER BY "${tracker.primaryKeyColumn}"
    `);
    
    const newRecords = newRecordsResult.recordset;
    this.logger.log(`Found ${newRecords.length} new records for ${tableName}`);
    
    if (newRecords.length === 0) {
      return {
        databaseName: dbName,
        tableName: tableName,
        strategy: 'incremental',
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        duration: 0,
        lastProcessedId: tracker.lastProcessedRecordId
      };
    }
    
    // Обрабатываем через систему Records для фильтрации
    const processedRecords = await this.processRecordsThroughFilter(dbName, tableName, newRecords);
    
    // Вставляем в PostgreSQL
    const insertedCount = await this.insertRecordsToPostgres(dbName, tableName, processedRecords);
    
    // Обновляем трекер
    const newTotalCount = tracker.totalRecordsCount + newRecords.length;
    const lastProcessedId = newRecords[newRecords.length - 1][tracker.primaryKeyColumn];
    await this.updateTracker(tracker, newTotalCount, newRecords.length, lastProcessedId);
    
    return {
      databaseName: dbName,
      tableName: tableName,
      strategy: 'incremental',
      recordsProcessed: newRecords.length,
      recordsInserted: insertedCount,
      recordsUpdated: 0,
      recordsSkipped: newRecords.length - insertedCount,
      duration: 0,
      lastProcessedId: lastProcessedId
    };
  }

  private async performSkipSync(dbName: string, tableName: string, tracker: MssqlChangeTracker): Promise<MssqlIncrementalResult> {
    this.logger.log(`Skipping sync for ${tableName} - no changes detected`);
    
    return {
      databaseName: dbName,
      tableName: tableName,
      strategy: 'skip',
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      duration: 0,
      lastProcessedId: tracker.lastProcessedRecordId
    };
  }

  private async processRecordsThroughFilter(dbName: string, tableName: string, records: any[]): Promise<any[]> {
    this.logger.log(`Processing ${records.length} records through filter system for ${tableName}`);
    
    // Конвертируем записи MSSQL в формат для системы Records
    const items = records.map(record => ({
      uid: `${dbName}_${tableName}_${record[Object.keys(record)[0]]}`, // Используем первый ключ как ID
      type: `${dbName}_${tableName}`,
      payload: record
    }));
    
    // Обрабатываем через систему Records (дедупликация и фильтрация)
    const filteredRecords = await this.recordsService.upsertFiltered(items);
    
    this.logger.log(`Filtered ${records.length} records to ${filteredRecords.length} for ${tableName}`);
    
    return filteredRecords.map(record => record.payload);
  }

  private async insertRecordsToPostgres(dbName: string, tableName: string, records: any[]): Promise<number> {
    if (records.length === 0) return 0;
    
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

      // Получаем структуру таблицы
      const columnsResult = await dbDataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${russianTableName}' 
        ORDER BY ordinal_position
      `);
      
      const columnNames = columnsResult.map(col => col.column_name);
      
      let insertedCount = 0;
      
      for (const record of records) {
        try {
          // Преобразуем названия полей в записи в русские
          const russianRecord = {};
          for (const [key, value] of Object.entries(record)) {
            const russianFieldName = this.russianNamesMapper.getPostgresFieldName(key);
            russianRecord[russianFieldName] = value;
          }
          
          const values = columnNames.map(col => russianRecord[col]);
          const placeholders = columnNames.map((_, index) => `$${index + 1}`).join(', ');
          const insertSql = `INSERT INTO "${russianTableName}" (${columnNames.map(name => `"${name}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          
          await dbDataSource.query(insertSql, values);
          insertedCount++;
        } catch (error) {
          this.logger.warn(`Failed to insert record in ${russianTableName}: ${error.message}`);
        }
      }

      await dbDataSource.destroy();
      return insertedCount;
    } catch (error) {
      this.logger.error(`Error inserting records to PostgreSQL for table ${tableName}:`, error.stack || error);
      throw error;
    }
  }

  private async clearPostgresTable(dbName: string, tableName: string): Promise<void> {
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
      
      // Получаем русское название таблицы
      const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
      
      await dbDataSource.query(`TRUNCATE TABLE "${russianTableName}"`);
      await dbDataSource.destroy();
      
      this.logger.log(`Cleared table ${russianTableName} (${tableName}) in database ${dbName}`);
    } catch (error) {
      this.logger.error(`Error clearing table ${tableName}:`, error.stack || error);
      throw error;
    }
  }

  private async updateTracker(tracker: MssqlChangeTracker, totalCount: number, processedCount: number, lastProcessedId: number): Promise<void> {
    tracker.totalRecordsCount = totalCount;
    tracker.processedRecordsCount += processedCount;
    tracker.lastProcessedRecordId = lastProcessedId;
    tracker.lastProcessedTimestamp = new Date();
    
    await this.changeTrackerRepo.save(tracker);
    this.logger.log(`Updated tracker for ${tracker.databaseName}.${tracker.tableName}: total=${totalCount}, processed=${processedCount}, lastId=${lastProcessedId}`);
  }

  private async createPostgresDatabase(dbName: string): Promise<void> {
    try {
      const adminDataSource = new DataSource({
        type: 'postgres',
        host: process.env.PG_HOST,
        port: +(process.env.PG_PORT || 5432),
        username: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: 'postgres',
      });

      await adminDataSource.initialize();
      
      const dbExists = await adminDataSource.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      );

      if (dbExists.length === 0) {
        await adminDataSource.query(`CREATE DATABASE "${dbName}" WITH ENCODING 'UTF8' LC_COLLATE='C.utf8' LC_CTYPE='C.utf8' TEMPLATE=template0`);
        this.logger.log(`Created PostgreSQL database: ${dbName}`);
      } else {
        this.logger.log(`PostgreSQL database ${dbName} already exists`);
      }

      await adminDataSource.destroy();
    } catch (error) {
      this.logger.error(`Error creating PostgreSQL database ${dbName}:`, error.stack || error);
      throw error;
    }
  }
}
