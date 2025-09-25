import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios from 'axios';
import crypto from 'crypto';
import { ODataDelayUtil } from '../common/utils/odata-delay.util';
import { ConfigService } from '../config/config.service';

export interface SyncResult {
  tableName: string;
  strategy: 'full' | 'incremental' | 'skip';
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  duration: number;
}

export interface SyncOptions {
  forceFullSync?: boolean;
  batchSize?: number;
  timeout?: number;
}

@Injectable()
export class SmartSyncService {
  private readonly logger = new Logger(SmartSyncService.name);

  constructor(
    @InjectDataSource('source1c') private readonly source1cDataSource: DataSource,
    @InjectDataSource('source_one_c') private readonly sourceOnecDataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Умная синхронизация таблицы с проверкой количества записей
   */
  async syncTable(
    tableName: string,
    baseUrl: string,
    collectionName: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.log(`Starting smart sync for table ${tableName}`);

    try {
      // Проверяем, включены ли сервисы загрузки данных
      const dataServicesSettings = this.configService.getDataServicesSettings();
      const isSource1cEnabled = dataServicesSettings.source1c.enabled;
      const isGetScopeOnecEnabled = dataServicesSettings.getScopeOneC.enabled;
      
      // Если ни один из сервисов не включен, не читаем OData
      if (!isSource1cEnabled && !isGetScopeOnecEnabled) {
        this.logger.log(`Skipping sync for ${tableName} - all data services are disabled`);
        return {
          tableName,
          strategy: 'skip',
          recordsProcessed: 0,
          recordsInserted: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          duration: Date.now() - startTime
        };
      }
      
      // 1. Получаем количество записей в OData источнике
      const remoteCount = await this.getRemoteRecordCount(baseUrl, collectionName);
      this.logger.log(`Remote count for ${tableName}: ${remoteCount}`);

      // 2. Получаем количество записей в нашей таблице
      const localCount = await this.getLocalRecordCount(tableName);
      this.logger.log(`Local count for ${tableName}: ${localCount}`);

      // 3. Определяем стратегию синхронизации
      const strategy = this.determineSyncStrategy(remoteCount, localCount, options.forceFullSync);
      this.logger.log(`Sync strategy for ${tableName}: ${strategy}`);

      let result: SyncResult;

      switch (strategy) {
        case 'skip':
          result = {
            tableName,
            strategy: 'skip',
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            recordsSkipped: remoteCount,
            duration: Date.now() - startTime
          };
          break;

        case 'full':
          result = await this.performFullSync(tableName, baseUrl, collectionName, options);
          break;

        case 'incremental':
          result = await this.performIncrementalSync(tableName, baseUrl, collectionName, localCount, options);
          break;
      }

      result.duration = Date.now() - startTime;
      this.logger.log(`Sync completed for ${tableName}: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      this.logger.error(`Sync failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Определяет стратегию синхронизации
   */
  private determineSyncStrategy(
    remoteCount: number,
    localCount: number,
    forceFullSync: boolean = false
  ): 'full' | 'incremental' | 'skip' {
    if (forceFullSync) {
      return 'full';
    }

    if (localCount === 0) {
      // Таблица пустая - полная синхронизация
      return 'full';
    }

    if (remoteCount === localCount) {
      // Количество совпадает - пропускаем
      return 'skip';
    }

    if (remoteCount > localCount) {
      // Удаленных записей больше - инкрементальная синхронизация
      return 'incremental';
    }

    // Удаленных записей меньше - полная синхронизация (возможно данные удалились)
    return 'full';
  }

  /**
   * Получает количество записей из OData источника
   */
  private async getRemoteRecordCount(baseUrl: string, collectionName: string): Promise<number> {
    try {
      // Проверяем, включены ли сервисы загрузки данных
      const dataServicesSettings = this.configService.getDataServicesSettings();
      const isSource1cEnabled = dataServicesSettings.source1c.enabled;
      const isGetScopeOnecEnabled = dataServicesSettings.getScopeOneC.enabled;
      
      // Если ни один из сервисов не включен, не читаем OData
      if (!isSource1cEnabled && !isGetScopeOnecEnabled) {
        this.logger.log(`Skipping OData read for ${collectionName} - all data services are disabled`);
        return 0;
      }
      
      // Задержка перед запросом к OData
      await ODataDelayUtil.delay();
      
      const settings = this.configService.getDataServicesSettings();
      const username = settings.source1c.username;
      const password = settings.source1c.password;
      
      const url = `${baseUrl}/${encodeURIComponent(collectionName)}?$format=json&$count=true`;
      
      const response = await axios.get(url, {
        auth: { username, password },
        timeout: settings.source1c.timeoutSeconds * 1000,
        headers: { Accept: 'application/json' },
      });

      const data = response.data;
      
      if (typeof data['@odata.count'] === 'number') {
        return data['@odata.count'];
      }
      
      if (typeof data.count === 'number') {
        return data.count;
      }
      
      if (Array.isArray(data.value)) {
        return data.value.length;
      }
      
      if (Array.isArray(data)) {
        return data.length;
      }
      
      return 0;
    } catch (error) {
      this.logger.error(`Failed to get remote count for ${collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Получает количество записей в локальной таблице
   */
  private async getLocalRecordCount(tableName: string): Promise<number> {
    try {
      const result = await this.source1cDataSource.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      return parseInt(result[0].count) || 0;
    } catch (error) {
      this.logger.warn(`Table ${tableName} not found, returning 0`);
      return 0;
    }
  }

  /**
   * Выполняет полную синхронизацию
   */
  private async performFullSync(
    tableName: string,
    baseUrl: string,
    collectionName: string,
    options: SyncOptions
  ): Promise<SyncResult> {
    this.logger.log(`Performing full sync for ${tableName}`);

    // Очищаем таблицу
    await this.source1cDataSource.query(`TRUNCATE TABLE ${tableName}`);

    // Загружаем все данные
    const allData = await this.fetchAllData(baseUrl, collectionName, options);
    
    // Вставляем данные
    const inserted = await this.insertData(tableName, allData);

    return {
      tableName,
      strategy: 'full',
      recordsProcessed: allData.length,
      recordsInserted: inserted,
      recordsUpdated: 0,
      recordsSkipped: 0,
      duration: 0 // будет установлено в вызывающем методе
    };
  }

  /**
   * Выполняет инкрементальную синхронизацию
   */
  private async performIncrementalSync(
    tableName: string,
    baseUrl: string,
    collectionName: string,
    localCount: number,
    options: SyncOptions
  ): Promise<SyncResult> {
    this.logger.log(`Performing incremental sync for ${tableName}`);

    // Получаем все данные
    const allData = await this.fetchAllData(baseUrl, collectionName, options);
    
    // Получаем существующие хеши
    const existingHashes = await this.getExistingHashes(tableName);
    
    // Фильтруем только новые данные
    const newData = allData.filter(record => {
      const hash = this.computeHash(record);
      return !existingHashes.has(hash);
    });

    this.logger.log(`Found ${newData.length} new records out of ${allData.length} total`);

    // Вставляем только новые данные
    const inserted = await this.insertData(tableName, newData);

    return {
      tableName,
      strategy: 'incremental',
      recordsProcessed: allData.length,
      recordsInserted: inserted,
      recordsUpdated: 0,
      recordsSkipped: allData.length - newData.length,
      duration: 0 // будет установлено в вызывающем методе
    };
  }

  /**
   * Получает все данные из OData источника
   */
  private async fetchAllData(
    baseUrl: string,
    collectionName: string,
    options: SyncOptions
  ): Promise<any[]> {
    // Проверяем, включены ли сервисы загрузки данных
    const dataServicesSettings = this.configService.getDataServicesSettings();
    const isSource1cEnabled = dataServicesSettings.source1c.enabled;
    const isGetScopeOnecEnabled = dataServicesSettings.getScopeOneC.enabled;
    
    // Если ни один из сервисов не включен, не читаем OData
    if (!isSource1cEnabled && !isGetScopeOnecEnabled) {
      this.logger.log(`Skipping OData read for ${collectionName} - all data services are disabled`);
      return [];
    }
    
    // Задержка перед запросом к OData
    await ODataDelayUtil.delay();
    
    const settings = this.configService.getDataServicesSettings();
    const username = settings.source1c.username;
    const password = settings.source1c.password;
    
    const url = `${baseUrl}/${encodeURIComponent(collectionName)}?$format=json`;
    
    const response = await axios.get(url, {
      auth: { username, password },
      timeout: options.timeout || settings.source1c.timeoutSeconds * 1000,
      headers: { Accept: 'application/json' },
    });

    const data = response.data;
    
    if (Array.isArray(data.value)) {
      return data.value;
    }
    
    if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  }

  /**
   * Получает существующие хеши из таблицы
   */
  private async getExistingHashes(tableName: string): Promise<Set<string>> {
    try {
      const result = await this.source1cDataSource.query(`SELECT hash FROM ${tableName}`);
      return new Set(result.map((row: any) => row.hash));
    } catch (error) {
      this.logger.warn(`Failed to get existing hashes for ${tableName}:`, error);
      return new Set();
    }
  }

  /**
   * Вставляет данные в таблицу
   */
  private async insertData(tableName: string, data: any[]): Promise<number> {
    if (data.length === 0) return 0;

    // Вставляем данные батчами по 20 записей с задержкой
    const batchSize = 20;
    let totalInserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Задержка каждые 20 записей
      await ODataDelayUtil.delayForBatch(i, batchSize);
      
      const hashes = batch.map(record => this.computeHash(record));
      const params: any[] = [];
      const valuesSql: string[] = [];

      for (let j = 0; j < batch.length; j++) {
        const hashParam = `$${params.length + 1}`;
        params.push(hashes[j]);
        const jsonParam = `$${params.length + 1}`;
        params.push(JSON.stringify(batch[j]));
        valuesSql.push(`(${hashParam}, ${jsonParam})`);
      }

      const sql = `INSERT INTO ${tableName} (hash, payload) VALUES ${valuesSql.join(',')} ON CONFLICT (hash) DO NOTHING`;
      
      this.logger.log(`SmartSync BATCH ${Math.floor(i/batchSize) + 1}: inserting ${batch.length} rows into ${tableName}`);
      await this.source1cDataSource.query(sql, params);
      totalInserted += batch.length;
      
      this.logger.log(`SmartSync BATCH ${Math.floor(i/batchSize) + 1} COMPLETED: ${batch.length} rows processed`);
    }
    
    this.logger.log(`SmartSync INSERT COMPLETED for ${tableName}: ${totalInserted} total rows`);
    return totalInserted;
  }

  /**
   * Вычисляет хеш записи
   */
  private computeHash(obj: any): string {
    const json = JSON.stringify(obj);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Синхронизирует все таблицы из списка коллекций
   */
  async syncAllTables(
    collections: Array<{ baseUrl: string; collectionName: string; tableName: string }>,
    options: SyncOptions = {}
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const collection of collections) {
      try {
        const result = await this.syncTable(
          collection.tableName,
          collection.baseUrl,
          collection.collectionName,
          options
        );
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to sync table ${collection.tableName}:`, error);
        results.push({
          tableName: collection.tableName,
          strategy: 'skip',
          recordsProcessed: 0,
          recordsInserted: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          duration: 0
        });
      }
    }

    return results;
  }
}




