import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatasCollectionsService } from '../datas-collections/datas-collections.service';
import { ODataDelayUtil } from '../common/utils/odata-delay.util';

interface TableInfo {
  tableName: string;
  baseUrl: string;
  collectionName: string;
  source1cCount: number;
  sourceOnecCount: number;
  needsUpdate: boolean;
}

@Injectable()
export class DataSyncService {
  private readonly logger = new Logger(DataSyncService.name);

  constructor(
    @InjectDataSource('source1c') private readonly source1cDataSource: DataSource,
    @InjectDataSource('source_one_c') private readonly sourceOnecDataSource: DataSource,
    private readonly datasCollectionsService: DatasCollectionsService
  ) {}

  /**
   * Получает список всех таблиц из source_one_c с их метаданными
   */
  private async getTableList(): Promise<TableInfo[]> {
    const collections = await this.datasCollectionsService.getAllCollectionsMeta();
    const tableInfos: TableInfo[] = [];

    for (const collection of collections) {
      const tableName = `odata_${this.normalizeNameForTable(collection.collectionName)}`;
      
      try {
        const source1cCount = await this.countRecordsInTable('source1c', tableName);
        const sourceOnecCount = await this.countRecordsInTable('source_one_c', tableName);
        
        tableInfos.push({
          tableName,
          baseUrl: collection.baseUrl,
          collectionName: collection.collectionName,
          source1cCount,
          sourceOnecCount,
          needsUpdate: source1cCount !== sourceOnecCount
        });
      } catch (error) {
        this.logger.warn(`Failed to get counts for table ${tableName}: ${error.message}`);
      }
    }

    return tableInfos;
  }

  /**
   * Подсчитывает количество записей в таблице
   */
  private async countRecordsInTable(database: 'source1c' | 'source_one_c', tableName: string): Promise<number> {
    try {
      const dataSource = database === 'source1c' ? this.source1cDataSource : this.sourceOnecDataSource;
      const sql = `SELECT COUNT(*) as count FROM ${tableName}`;
      const result = await dataSource.query(sql);
      return parseInt(result[0].count) || 0;
    } catch (error) {
      this.logger.warn(`Table ${tableName} not found in ${database}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Нормализует имя для таблицы (аналогично GetScopeOneCService)
   */
  private normalizeNameForTable(name: string): string {
    return name.replace(/\W+/g, '_').toLowerCase();
  }

  /**
   * Синхронизирует данные из source1c в source_one_c
   */
  private async syncTableData(tableName: string, baseUrl: string, collectionName: string): Promise<boolean> {
    try {
      this.logger.log(`Syncing table ${tableName} from source1c to source_one_c`);

      // Получаем данные из source1c
      const sourceData = await this.source1cDataSource.query(
        `SELECT * FROM ${tableName} ORDER BY created_at DESC`
      );

      if (sourceData.length === 0) {
        this.logger.log(`No data found in source1c table ${tableName}`);
        return true;
      }

      // Очищаем таблицу в source_one_c
      await this.sourceOnecDataSource.query(`TRUNCATE TABLE ${tableName}`);

      // Вставляем данные в source_one_c
      if (sourceData.length > 0) {
        const columns = Object.keys(sourceData[0]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Вставляем данные батчами по 20 записей с задержкой
        const batchSize = 20;
        for (let i = 0; i < sourceData.length; i += batchSize) {
          const batch = sourceData.slice(i, i + batchSize);
          
          // Задержка каждые 20 записей
          await ODataDelayUtil.delayForBatch(i, batchSize);
          
          const values = batch.map(row => 
            columns.map(col => row[col])
          );

          this.logger.log(`DataSync BATCH ${Math.floor(i/batchSize) + 1}: inserting ${batch.length} rows into ${tableName}`);
          
          for (const rowValues of values) {
            await this.sourceOnecDataSource.query(sql, rowValues);
          }
          
          this.logger.log(`DataSync BATCH ${Math.floor(i/batchSize) + 1} COMPLETED: ${batch.length} rows processed`);
        }
      }

      // Обновляем метаданные
      await this.datasCollectionsService.updateCollectionAfterLoad(
        baseUrl, 
        collectionName, 
        tableName
      );

      this.logger.log(`Successfully synced ${sourceData.length} records to ${tableName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to sync table ${tableName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Основной метод синхронизации - проверяет и обновляет все таблицы
   */
  async performSync(): Promise<void> {
    this.logger.log('Starting data synchronization check...');

    try {
      const tableInfos = await this.getTableList();
      const tablesToUpdate = tableInfos.filter(table => table.needsUpdate);

      this.logger.log(`Found ${tableInfos.length} tables, ${tablesToUpdate.length} need updating`);

      if (tablesToUpdate.length === 0) {
        this.logger.log('All tables are in sync, no updates needed');
        return;
      }

      // Обновляем каждую таблицу последовательно
      for (const tableInfo of tablesToUpdate) {
        this.logger.log(
          `Syncing ${tableInfo.tableName}: source1c=${tableInfo.source1cCount}, ` +
          `source_one_c=${tableInfo.sourceOnecCount}`
        );

        const success = await this.syncTableData(
          tableInfo.tableName,
          tableInfo.baseUrl,
          tableInfo.collectionName
        );

        if (success) {
          this.logger.log(`Successfully synced ${tableInfo.tableName}`);
        } else {
          this.logger.error(`Failed to sync ${tableInfo.tableName}`);
        }

        // Небольшая пауза между таблицами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.logger.log('Data synchronization completed');
    } catch (error) {
      this.logger.error(`Data synchronization failed: ${error.message}`);
    }
  }

  /**
   * Получает статистику синхронизации
   */
  async getSyncStatus(): Promise<{
    totalTables: number;
    syncedTables: number;
    outOfSyncTables: number;
    tables: TableInfo[];
  }> {
    const tableInfos = await this.getTableList();
    const outOfSyncTables = tableInfos.filter(table => table.needsUpdate);

    return {
      totalTables: tableInfos.length,
      syncedTables: tableInfos.length - outOfSyncTables.length,
      outOfSyncTables: outOfSyncTables.length,
      tables: tableInfos
    };
  }
}
