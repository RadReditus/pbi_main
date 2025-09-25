import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface CollectionMeta {
  baseUrl: string;
  collectionName: string;
  lastCheckTime: Date;
  recordsCount: number;
}

@Injectable()
export class DatasCollectionsService {
  constructor(@InjectDataSource('source_one_c') private readonly dataSource: DataSource) {}

  /**
   * Обновляет или создает запись о коллекции
   */
  async upsertCollectionMeta(meta: CollectionMeta): Promise<void> {
    const sql = `
      INSERT INTO datas_collections (base_url, collection_name, last_check_time, records_count, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (base_url, collection_name)
      DO UPDATE SET
        last_check_time = EXCLUDED.last_check_time,
        records_count = EXCLUDED.records_count,
        updated_at = NOW()
    `;
    
    await this.dataSource.query(sql, [
      meta.baseUrl,
      meta.collectionName,
      meta.lastCheckTime,
      meta.recordsCount
    ]);
  }

  /**
   * Получает все метаданные коллекций
   */
  async getAllCollectionsMeta(): Promise<CollectionMeta[]> {
    const sql = `
      SELECT 
        base_url as "baseUrl",
        collection_name as "collectionName", 
        last_check_time as "lastCheckTime",
        records_count as "recordsCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM datas_collections 
      ORDER BY last_check_time DESC
    `;
    
    return await this.dataSource.query(sql);
  }

  /**
   * Получает метаданные для конкретной коллекции
   */
  async getCollectionMeta(baseUrl: string, collectionName: string): Promise<CollectionMeta | null> {
    const sql = `
      SELECT 
        base_url as "baseUrl",
        collection_name as "collectionName",
        last_check_time as "lastCheckTime", 
        records_count as "recordsCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM datas_collections 
      WHERE base_url = $1 AND collection_name = $2
    `;
    
    const result = await this.dataSource.query(sql, [baseUrl, collectionName]);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Подсчитывает количество записей в таблице коллекции
   */
  async countRecordsInTable(tableName: string): Promise<number> {
    try {
      const sql = `SELECT COUNT(*) as count FROM ${tableName}`;
      const result = await this.dataSource.query(sql);
      return parseInt(result[0].count) || 0;
    } catch (error) {
      console.warn(`Failed to count records in table ${tableName}:`, error.message);
      return 0;
    }
  }

  /**
   * Обновляет метаданные после загрузки коллекции
   */
  async updateCollectionAfterLoad(baseUrl: string, collectionName: string, tableName: string): Promise<void> {
    const recordsCount = await this.countRecordsInTable(tableName);
    
    await this.upsertCollectionMeta({
      baseUrl,
      collectionName,
      lastCheckTime: new Date(),
      recordsCount
    });
  }
}

