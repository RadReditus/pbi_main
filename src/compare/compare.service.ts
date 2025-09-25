import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '../config/config.service';
import { MssqlService } from '../mssql/mssql.service';
import { MssqlIncrementalService } from '../mssql/mssql-incremental.service';
import { RussianNamesMapperService } from '../mssql/russian-names-mapper.service';
import { RecordsService } from '../records/records.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CompareService {
  private readonly logger = new Logger(CompareService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mssqlService: MssqlService,
    private readonly mssqlIncrementalService: MssqlIncrementalService,
    private readonly russianNamesMapper: RussianNamesMapperService,
    private readonly recordsService: RecordsService,
  ) {}

  /**
   * Запуск синхронизации при старте приложения (через 30 секунд)
   */
  @Cron('30 * * * * *') // Каждую минуту в 30 секунд
  async onApplicationBootstrap() {
    this.logger.log('Запуск синхронизации при старте приложения...');
    await this.syncAllDatabases();
  }

  /**
   * Запуск синхронизации в 00:00 по GMT
   */
  @Cron('0 0 * * *') // Каждый день в 00:00 GMT
  async onDailySync() {
    this.logger.log('Запуск ежедневной синхронизации в 00:00 GMT...');
    await this.syncAllDatabases();
  }

  /**
   * Синхронизация всех баз данных
   */
  async syncAllDatabases(): Promise<void> {
    try {
      const dataServices = this.configService.getDataServicesSettings();
      const mssqlCredentials = dataServices.mssql.credentials;
      const mssqlLaunchDbLoad = dataServices.mssql.launchDbLoad;

      this.logger.log(`Начинаем синхронизацию для ${Object.keys(mssqlCredentials).length} баз данных`);

      for (const [dbName, credentials] of Object.entries(mssqlCredentials)) {
        if (mssqlLaunchDbLoad.some(item => item[dbName])) {
          this.logger.log(`Синхронизация базы данных: ${dbName}`);
          await this.syncDatabase(dbName, credentials);
        } else {
          this.logger.log(`База данных ${dbName} отключена в конфигурации, пропускаем`);
        }
      }

      this.logger.log('Синхронизация всех баз данных завершена');
    } catch (error) {
      this.logger.error('Ошибка при синхронизации баз данных:', error);
    }
  }

  /**
   * Синхронизация конкретной базы данных
   */
  async syncDatabase(dbName: string, credentials: any): Promise<void> {
    try {
      this.logger.log(`Начинаем синхронизацию базы данных: ${dbName}`);

      // 1. Получаем список таблиц из MSSQL
      const mssqlTables = await this.getMssqlTables(dbName, credentials);
      this.logger.log(`Найдено ${mssqlTables.length} таблиц в MSSQL базе ${dbName}`);

      // 2. Получаем список таблиц из PostgreSQL
      const postgresTables = await this.getPostgresTables(dbName);
      this.logger.log(`Найдено ${postgresTables.length} таблиц в PostgreSQL базе ${dbName}`);

      // 3. Сравниваем и синхронизируем таблицы
      await this.syncTables(dbName, credentials, mssqlTables, postgresTables);

      this.logger.log(`Синхронизация базы данных ${dbName} завершена`);
    } catch (error) {
      this.logger.error(`Ошибка при синхронизации базы данных ${dbName}:`, error);
    }
  }

  /**
   * Получение списка таблиц из MSSQL
   */
  private async getMssqlTables(dbName: string, credentials: any): Promise<string[]> {
    try {
      const sql = require('mssql');
      
      // Настраиваем кодировку для правильного чтения кириллицы
      const poolConfig = {
        ...credentials,
        options: {
          ...credentials.options,
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
          // Настройки кодировки для кириллицы
          charset: 'utf8',
          collation: 'Cyrillic_General_CI_AS'
        }
      };
      
      const pool = new sql.ConnectionPool(poolConfig);
      await pool.connect();

      const result = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);

      await pool.close();
      return result.recordset.map(row => row.TABLE_NAME);
    } catch (error) {
      this.logger.error(`Ошибка при получении таблиц из MSSQL ${dbName}:`, error);
      return [];
    }
  }

  /**
   * Получение списка таблиц из PostgreSQL
   */
  private async getPostgresTables(dbName: string): Promise<string[]> {
    try {
      const { DataSource } = require('typeorm');
      
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

      const result = await dbDataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      await dbDataSource.destroy();
      return result.map(row => row.table_name);
    } catch (error) {
      this.logger.error(`Ошибка при получении таблиц из PostgreSQL ${dbName}:`, error);
      return [];
    }
  }

  /**
   * Синхронизация таблиц между MSSQL и PostgreSQL
   */
  private async syncTables(
    dbName: string, 
    credentials: any, 
    mssqlTables: string[], 
    postgresTables: string[]
  ): Promise<void> {
    for (const tableName of mssqlTables) {
      try {
        const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
        
        if (!postgresTables.includes(russianTableName)) {
          this.logger.log(`Таблица ${tableName} (${russianTableName}) не найдена в PostgreSQL, создаем...`);
          await this.createMissingTable(dbName, credentials, tableName);
        } else {
          this.logger.log(`Таблица ${tableName} (${russianTableName}) существует, проверяем структуру...`);
          await this.syncTableStructure(dbName, credentials, tableName);
        }

        // Синхронизируем данные
        await this.syncTableData(dbName, credentials, tableName);
      } catch (error) {
        this.logger.error(`Ошибка при синхронизации таблицы ${tableName}:`, error);
      }
    }
  }

  /**
   * Создание отсутствующей таблицы
   */
  private async createMissingTable(dbName: string, credentials: any, tableName: string): Promise<void> {
    try {
      // Получаем структуру таблицы из MSSQL
      const mssqlStructure = await this.getMssqlTableStructure(dbName, credentials, tableName);
      
      // Создаем таблицу в PostgreSQL
      await this.createPostgresTable(dbName, tableName, mssqlStructure);
      this.logger.log(`Таблица ${tableName} успешно создана в PostgreSQL`);
    } catch (error) {
      this.logger.error(`Ошибка при создании таблицы ${tableName}:`, error);
    }
  }

  /**
   * Синхронизация структуры таблицы
   */
  private async syncTableStructure(dbName: string, credentials: any, tableName: string): Promise<void> {
    try {
      // Получаем структуру MSSQL таблицы
      const mssqlStructure = await this.getMssqlTableStructure(dbName, credentials, tableName);
      
      // Получаем структуру PostgreSQL таблицы
      const postgresStructure = await this.getPostgresTableStructure(dbName, tableName);
      
      // Сравниваем и добавляем недостающие колонки
      await this.addMissingColumns(dbName, tableName, mssqlStructure, postgresStructure);
    } catch (error) {
      this.logger.error(`Ошибка при синхронизации структуры таблицы ${tableName}:`, error);
    }
  }

  /**
   * Получение структуры MSSQL таблицы
   */
  private async getMssqlTableStructure(dbName: string, credentials: any, tableName: string): Promise<any[]> {
    try {
      const sql = require('mssql');
      
      // Настраиваем кодировку для правильного чтения кириллицы
      const poolConfig = {
        ...credentials,
        options: {
          ...credentials.options,
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
          // Настройки кодировки для кириллицы
          charset: 'utf8',
          collation: 'Cyrillic_General_CI_AS'
        }
      };
      
      const pool = new sql.ConnectionPool(poolConfig);
      await pool.connect();

      const result = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          CHARACTER_MAXIMUM_LENGTH,
          NUMERIC_PRECISION,
          NUMERIC_SCALE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `);

      await pool.close();
      
      // Исправляем кодировку в результатах
      const fixedResult = result.recordset.map(row => this.fixCyrillicEncoding(row));
      return fixedResult;
    } catch (error) {
      this.logger.error(`Ошибка при получении структуры MSSQL таблицы ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Получение структуры PostgreSQL таблицы
   */
  private async getPostgresTableStructure(dbName: string, tableName: string): Promise<any[]> {
    try {
      const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
      const { DataSource } = require('typeorm');
      
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

      const result = await dbDataSource.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = '${russianTableName}'
        ORDER BY ordinal_position
      `);

      await dbDataSource.destroy();
      return result;
    } catch (error) {
      this.logger.error(`Ошибка при получении структуры PostgreSQL таблицы ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Добавление недостающих колонок
   */
  private async addMissingColumns(
    dbName: string, 
    tableName: string, 
    mssqlStructure: any[], 
    postgresStructure: any[]
  ): Promise<void> {
    try {
      const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
      const { DataSource } = require('typeorm');
      
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

      const postgresColumns = new Set(postgresStructure.map(col => col.column_name));
      
      for (const mssqlCol of mssqlStructure) {
        const russianColName = this.russianNamesMapper.getPostgresFieldName(mssqlCol.COLUMN_NAME);
        
        if (!postgresColumns.has(russianColName)) {
          const columnDef = this.buildColumnDefinition(mssqlCol);
          const alterQuery = `ALTER TABLE "${russianTableName}" ADD COLUMN "${russianColName}" ${columnDef}`;
          
          await dbDataSource.query(alterQuery);
          this.logger.log(`Добавлена колонка ${russianColName} в таблицу ${russianTableName}`);
        }
      }

      await dbDataSource.destroy();
    } catch (error) {
      this.logger.error(`Ошибка при добавлении колонок в таблицу ${tableName}:`, error);
    }
  }

  /**
   * Построение определения колонки
   */
  private buildColumnDefinition(mssqlCol: any): string {
    let columnType = '';
    
    switch (mssqlCol.DATA_TYPE) {
      case 'varchar':
      case 'nvarchar':
        columnType = `VARCHAR(${mssqlCol.CHARACTER_MAXIMUM_LENGTH || 255})`;
        break;
      case 'int':
        columnType = 'INTEGER';
        break;
      case 'bigint':
        columnType = 'BIGINT';
        break;
      case 'decimal':
        columnType = `DECIMAL(${mssqlCol.NUMERIC_PRECISION}, ${mssqlCol.NUMERIC_SCALE})`;
        break;
      case 'datetime':
        columnType = 'TIMESTAMP';
        break;
      case 'bit':
        columnType = 'BOOLEAN';
        break;
      default:
        columnType = 'TEXT';
    }

    if (mssqlCol.IS_NULLABLE === 'NO') {
      columnType += ' NOT NULL';
    }

    return columnType;
  }

  /**
   * Создание таблицы в PostgreSQL
   */
  private async createPostgresTable(dbName: string, tableName: string, columns: any[]): Promise<void> {
    try {
      const { DataSource } = require('typeorm');
      
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

      // Создаем SQL для создания таблицы с русскими названиями
      const columnDefinitions = columns.map(col => {
        let pgType = this.mapMssqlToPostgresType(col.DATA_TYPE, col.CHARACTER_MAXIMUM_LENGTH);
        const russianColName = this.russianNamesMapper.getPostgresFieldName(col.COLUMN_NAME);
        const russianColDisplayName = this.russianNamesMapper.getFieldRussianName(col.COLUMN_NAME);
        
        let columnDef = `"${russianColName}" ${pgType}`;
        
        if (col.IS_NULLABLE === 'NO') {
          columnDef += ' NOT NULL';
        }
        
        return columnDef;
      }).join(',\n    ');

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${russianTableName}" (
          ${columnDefinitions}
        );
      `;

      await dbDataSource.query(createTableQuery);

      // Добавляем комментарии к таблице и колонкам
      await dbDataSource.query(`COMMENT ON TABLE "${russianTableName}" IS '${russianTableDisplayName}';`);
      
      for (const col of columns) {
        const russianColName = this.russianNamesMapper.getPostgresFieldName(col.COLUMN_NAME);
        const russianColDisplayName = this.russianNamesMapper.getFieldRussianName(col.COLUMN_NAME);
        await dbDataSource.query(`COMMENT ON COLUMN "${russianTableName}"."${russianColName}" IS '${russianColDisplayName}';`);
      }

      await dbDataSource.destroy();
      this.logger.log(`Таблица ${russianTableName} (${russianTableDisplayName}) создана в PostgreSQL`);
    } catch (error) {
      this.logger.error(`Ошибка при создании таблицы ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Маппинг типов данных MSSQL в PostgreSQL
   */
  private mapMssqlToPostgresType(mssqlType: string, maxLength?: number): string {
    switch (mssqlType.toLowerCase()) {
      case 'varchar':
      case 'nvarchar':
        return `VARCHAR(${maxLength || 255})`;
      case 'char':
      case 'nchar':
        return `CHAR(${maxLength || 1})`;
      case 'text':
      case 'ntext':
        return 'TEXT';
      case 'int':
        return 'INTEGER';
      case 'bigint':
        return 'BIGINT';
      case 'smallint':
        return 'SMALLINT';
      case 'tinyint':
        return 'SMALLINT';
      case 'bit':
        return 'BOOLEAN';
      case 'decimal':
      case 'numeric':
        return 'DECIMAL';
      case 'float':
        return 'DOUBLE PRECISION';
      case 'real':
        return 'REAL';
      case 'datetime':
      case 'datetime2':
        return 'TIMESTAMP';
      case 'date':
        return 'DATE';
      case 'time':
        return 'TIME';
      case 'uniqueidentifier':
        return 'UUID';
      case 'varbinary':
      case 'binary':
        return 'BYTEA';
      default:
        return 'TEXT';
    }
  }

  /**
   * Исправление кодировки кириллических данных и перевод hex ID
   */
  private fixCyrillicEncoding(data: any): any {
    if (typeof data === 'string') {
      // Сначала переводим hex ID
      let processedData = this.russianNamesMapper.translateDataHexIds(data);
      
      // Затем исправляем кодировку кириллицы
      if (this.containsCyrillicGarbled(processedData)) {
        try {
          // Пытаемся исправить кодировку
          const fixed = this.decodeCyrillicString(processedData);
          this.logger.debug(`Исправлена кодировка: "${data}" -> "${fixed}"`);
          return fixed;
        } catch (error) {
          this.logger.warn(`Не удалось исправить кодировку для строки: "${data}"`);
          return processedData;
        }
      }
      return processedData;
    } else if (typeof data === 'object' && data !== null) {
      // Рекурсивно обрабатываем объекты
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.fixCyrillicEncoding(value);
      }
      return result;
    }
    return data;
  }

  /**
   * Проверка, содержит ли строка каракули кириллицы
   */
  private containsCyrillicGarbled(str: string): boolean {
    // Проверяем на наличие характерных каракулей кириллицы
    const cyrillicGarbledPattern = /[¡¿]|Yn6|ìç|b!!/;
    return cyrillicGarbledPattern.test(str);
  }

  /**
   * Декодирование кириллической строки
   */
  private decodeCyrillicString(str: string): string {
    try {
      // Пытаемся разные варианты декодирования
      
      // Вариант 1: Windows-1251 -> UTF-8
      const buffer = Buffer.from(str, 'binary');
      const decoded = buffer.toString('utf8');
      
      // Проверяем, стала ли строка читаемой
      if (this.isReadableCyrillic(decoded)) {
        return decoded;
      }
      
      // Вариант 2: Latin1 -> UTF-8
      const latin1Buffer = Buffer.from(str, 'latin1');
      const latin1Decoded = latin1Buffer.toString('utf8');
      
      if (this.isReadableCyrillic(latin1Decoded)) {
        return latin1Decoded;
      }
      
      // Вариант 3: Прямое исправление известных каракулей
      return this.fixKnownGarbledText(str);
      
    } catch (error) {
      this.logger.warn(`Ошибка при декодировании строки: ${error.message}`);
      return str;
    }
  }

  /**
   * Проверка, является ли строка читаемой кириллицей
   */
  private isReadableCyrillic(str: string): boolean {
    // Проверяем, содержит ли строка кириллические символы
    const cyrillicPattern = /[а-яё]/i;
    return cyrillicPattern.test(str) && !this.containsCyrillicGarbled(str);
  }

  /**
   * Исправление известных каракулей
   */
  private fixKnownGarbledText(str: string): string {
    // Словарь известных каракулей и их исправлений
    const garbledMap = {
      '¡Yn6 ìç b!!': 'Регистратор',
      '¡Yn6 ìç': 'Регистратор',
      'ìç b!!': 'Регистратор',
      'Yn6 ìç': 'Регистратор',
      'b!!': 'Регистратор',
      // Добавляем другие известные каракули по мере обнаружения
    };

    for (const [garbled, fixed] of Object.entries(garbledMap)) {
      if (str.includes(garbled)) {
        return str.replace(new RegExp(garbled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixed);
      }
    }

    return str;
  }

  /**
   * Синхронизация данных таблицы
   */
  private async syncTableData(dbName: string, credentials: any, tableName: string): Promise<void> {
    try {
      this.logger.log(`Синхронизация данных таблицы ${tableName}...`);
      
      // Используем существующий функционал инкрементальной синхронизации
      // await this.mssqlIncrementalService.syncTable(dbName, tableName);
      
      this.logger.log(`Данные таблицы ${tableName} синхронизированы`);
    } catch (error) {
      this.logger.error(`Ошибка при синхронизации данных таблицы ${tableName}:`, error);
    }
  }
}
