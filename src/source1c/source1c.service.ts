import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { DataSource } from 'typeorm';
import { DatasCollectionsService } from '../datas-collections/datas-collections.service';
import { ServiceStatusService } from '../health/service-status.service';
import { ConfigService } from '../config/config.service';
import { ODataDelayUtil } from '../common/utils/odata-delay.util';

type SourceLink = {
  url: string;
  name?: string;
};

@Injectable()
export class Source1cService implements OnModuleInit {
  private readonly logger = new Logger(Source1cService.name);

  constructor(
    @InjectDataSource('source1c') private readonly dataSource: DataSource,
    private readonly datasCollectionsService: DatasCollectionsService,
    private readonly serviceStatusService: ServiceStatusService,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    const settings = this.configService.getDataServicesSettings();
    const enabled = settings.source1c.enabled;
    
    // Обновляем статус сервиса
    this.serviceStatusService.updateServiceStatus('source1c', {
      enabled,
      running: false
    });
    
    if (!enabled) {
      this.logger.log('Source1c disabled by configuration');
      return;
    }

    const delaySeconds = settings.source1c.delaySeconds;
    this.logger.log(`Source1c will start in ${delaySeconds}s`);
    
    setTimeout(() => {
      this.runSafe().catch((err) => {
        this.logger.error('Source1c run error', err.stack || err);
        this.serviceStatusService.setServiceError('source1c', err.message || 'Unknown error');
      });
    }, delaySeconds * 1000);
  }

  private async runSafe(): Promise<void> {
    try {
      // Отмечаем сервис как запущенный
      this.serviceStatusService.updateServiceStatus('source1c', {
        running: true
      });
      
      await this.run();
      
      // Отмечаем успешное завершение
      this.serviceStatusService.updateServiceStatus('source1c', {
        running: false
      });
      
    } catch (error: any) {
      this.logger.error('Unhandled error in Source1c', error.stack || error);
      this.serviceStatusService.setServiceError('source1c', error.message || 'Unknown error');
    }
  }

  private parseLinksFromEnv(): SourceLink[] {
    const settings = this.configService.getDataServicesSettings();
    return settings.source1c.links;
  }

  private extractCollectionName(url: string): string {
    // between 'standard.odata/' and '?$format=json'
    const marker = 'standard.odata/';
    const idx = url.indexOf(marker);
    if (idx === -1) return 'unknown_collection';
    const after = url.slice(idx + marker.length);
    const endIdx = after.indexOf('?$format=json');
    let segment = endIdx >= 0 ? after.slice(0, endIdx) : after;
    if (segment.endsWith('/')) segment = segment.slice(0, -1);
    try {
      return decodeURIComponent(segment).replace(/\W+/g, '_').toLowerCase();
    } catch {
      return segment.replace(/\W+/g, '_').toLowerCase();
    }
  }

  private extractBaseUrl(url: string): string {
    // Extract base URL up to 'standard.odata/'
    const marker = 'standard.odata/';
    const idx = url.indexOf(marker);
    if (idx === -1) {
      // If no standard.odata marker, extract up to last '/'
      const lastSlash = url.lastIndexOf('/');
      return lastSlash > 0 ? url.slice(0, lastSlash) : url;
    }
    return url.slice(0, idx + marker.length - 1);
  }

  private normalizeUrl(rawUrl: string): string {
    let u = (rawUrl || '').trim();
    if (u.startsWith('@')) u = u.slice(1);
    if (!/^https?:\/\//i.test(u)) {
      u = 'http://' + u;
    }
    return u;
  }

  private async fetchValueArray(url: string): Promise<any[]> {
    // Задержка перед запросом к OData
    await ODataDelayUtil.delay();
    
    const settings = this.configService.getDataServicesSettings();
    const config: AxiosRequestConfig = {
      auth: { 
        username: settings.source1c.username, 
        password: settings.source1c.password 
      },
      timeout: settings.source1c.timeoutSeconds * 1000,
      headers: { Accept: 'application/json' },
    };
    const normalized = this.normalizeUrl(url);
    this.logger.log(`Fetching URL: ${normalized}`);
    const res = await axios.get(normalized, config);
    const data = res.data;
    if (data && Array.isArray(data.value)) return data.value;
    if (Array.isArray(data)) return data; // fallback
    return [];
  }

  private async ensureTable(tableName: string): Promise<void> {
    // JSONB payload, deterministic sha256 hash per row to deduplicate
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGSERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    const addHashIfMissing = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS hash TEXT NOT NULL DEFAULT ''`;
    const dropDefault = `ALTER TABLE ${tableName} ALTER COLUMN hash DROP DEFAULT`;
    const addUniqueIdx = `CREATE UNIQUE INDEX IF NOT EXISTS ${tableName}_hash_uidx ON ${tableName}(hash)`;
    await this.dataSource.query(createTableSql);
    await this.dataSource.query(addHashIfMissing);
    await this.dataSource.query(dropDefault);
    await this.dataSource.query(addUniqueIdx);
  }

  private computeHash(obj: any): string {
    const json = JSON.stringify(obj);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  private async insertRows(tableName: string, rows: any[]): Promise<number> {
    if (rows.length === 0) return 0;
    
    this.logger.log(`DEBUG: ===== SOURCE1C INSERTING ${rows.length} rows into ${tableName} =====`);
    if (rows.length > 0) {
      this.logger.log(`DEBUG: First row keys: ${Object.keys(rows[0]).join(', ')}`);
      this.logger.log(`DEBUG: First row sample: ${JSON.stringify(rows[0], null, 2).substring(0, 300)}...`);
    }
    
    // Вставляем данные батчами по 20 записей с задержкой
    const batchSize = 20;
    let totalInserted = 0;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Задержка каждые 20 записей
      await ODataDelayUtil.delayForBatch(i, batchSize);
      
      const hashes = batch.map((r) => this.computeHash(r));
      const params: any[] = [];
      const valuesSql: string[] = [];
      
      for (let j = 0; j < batch.length; j += 1) {
        const hashParam = `$${params.length + 1}`;
        params.push(hashes[j]);
        const jsonParam = `$${params.length + 1}`;
        params.push(JSON.stringify(batch[j]));
        valuesSql.push(`(${hashParam}, ${jsonParam})`);
      }
      
      const sql = `INSERT INTO ${tableName} (hash, payload) VALUES ${valuesSql.join(',')} ON CONFLICT (hash) DO NOTHING`;
      this.logger.log(`DEBUG: SOURCE1C BATCH ${Math.floor(i/batchSize) + 1}: inserting ${batch.length} rows`);
      
      const result = await this.dataSource.query(sql, params);
      const inserted = Array.isArray(result) && typeof (result as any).rowCount === 'number' ? (result as any).rowCount : batch.length;
      totalInserted += inserted;
      
      this.logger.log(`DEBUG: SOURCE1C BATCH ${Math.floor(i/batchSize) + 1} COMPLETED: ${inserted} rows inserted`);
    }
    
    this.logger.log(`DEBUG: ===== SOURCE1C INSERT COMPLETED for ${tableName}: ${totalInserted} total rows =====`);
    return totalInserted;
  }

  async run(): Promise<void> {
    const links = this.parseLinksFromEnv();
    if (links.length === 0) {
      this.logger.log('No SOURCE1C_LINKS configured');
      return;
    }

    for (const link of links) {
      const collection = link.name || this.extractCollectionName(link.url);
      const tableName = `odata_${collection}`;
      try {
        this.logger.log(`Processing ${collection}`);
        await this.ensureTable(tableName);
        const value = await this.fetchValueArray(link.url);
        const inserted = await this.insertRows(tableName, value);
        this.logger.log(`Inserted ${inserted} rows into ${tableName}`);
        
        // Обновляем метаданные коллекции после загрузки
        const baseUrl = this.extractBaseUrl(link.url);
        await this.datasCollectionsService.updateCollectionAfterLoad(baseUrl, collection, tableName);
        this.logger.log(`Updated metadata for collection ${collection} from ${baseUrl}`);
      } catch (err: any) {
        this.logger.error(`Failed for ${collection}: ${err.message || err}`);
      }
    }
  }
}


