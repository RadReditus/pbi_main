import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import axios from 'axios';
import crypto from 'crypto';
import { DataSource } from 'typeorm';
import { DatasCollectionsService } from '../datas-collections/datas-collections.service';
import { ServiceStatusService } from '../health/service-status.service';
import { ODataDelayUtil } from '../common/utils/odata-delay.util';
import { ConfigService } from '../config/config.service';

@Injectable()
export class GetScopeOneCService implements OnModuleInit {
  private readonly logger = new Logger(GetScopeOneCService.name);

  constructor(
    @InjectDataSource('source_one_c') private readonly dataSource: DataSource,
    private readonly datasCollectionsService: DatasCollectionsService,
    private readonly serviceStatusService: ServiceStatusService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const settings = this.configService.getDataServicesSettings();
    const enabled = settings.getScopeOneC.enabled;
    
    // Обновляем статус сервиса
    this.serviceStatusService.updateServiceStatus('get_scope_one_c', {
      enabled,
      running: false
    });
    
    if (!enabled) {
      this.logger.log('GetScopeOneC disabled by configuration');
      return;
    }
    
    const delaySeconds = settings.getScopeOneC.delaySeconds;
    this.logger.log(`GetScopeOneC will start in ${delaySeconds}s`);
    
    setTimeout(() => {
      this.run().catch((e) => {
        this.logger.error('Run error', e.stack || e);
        this.serviceStatusService.setServiceError('get_scope_one_c', e.message || 'Unknown error');
      });
    }, delaySeconds * 1000);
  }

  private normalizeBaseUrl(raw: string): string {
    let u = (raw || '').trim();
    if (u.startsWith('@')) u = u.slice(1);
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
  }

  private decodeName(s: string): string {
    try { return decodeURIComponent(s); } catch { return s; }
  }

  private normalizeNameForTable(name: string): string {
    return this.decodeName(name).replace(/\W+/g, '_').toLowerCase();
  }

  private async ensureTable(tableName: string): Promise<void> {
    const createSql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGSERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    const addHashIfMissing = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS hash TEXT NOT NULL DEFAULT ''`;
    const dropDefault = `ALTER TABLE ${tableName} ALTER COLUMN hash DROP DEFAULT`;
    const addUniqueIdx = `CREATE UNIQUE INDEX IF NOT EXISTS ${tableName}_hash_uidx ON ${tableName}(hash)`;
    await this.dataSource.query(createSql);
    await this.dataSource.query(addHashIfMissing);
    await this.dataSource.query(dropDefault);
    await this.dataSource.query(addUniqueIdx);
  }

  private normalizeKey(key: string): string {
    return String(key || '')
      .replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_') // Keep Cyrillic chars
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  private detectType(value: any): 'boolean' | 'number' | 'timestamptz' | 'jsonb' | 'text' {
    if (value === null || value === undefined) return 'text';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'jsonb';
    if (typeof value === 'string') {
      const s = value.trim();
      // ISO date/datetime simple detection
      if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(s)) {
        return 'timestamptz';
      }
      // numeric string
      if (/^[+-]?(?:\d+\.\d+|\d+)$/.test(s)) return 'number';
      return 'text';
    }
    return 'text';
  }

  private pgTypeOf(kind: 'boolean' | 'number' | 'timestamptz' | 'jsonb' | 'text'): string {
    switch (kind) {
      case 'boolean': return 'BOOLEAN';
      case 'number': return 'NUMERIC';
      case 'timestamptz': return 'TIMESTAMPTZ';
      case 'jsonb': return 'JSONB';
      default: return 'TEXT';
    }
  }

  private async getExistingColumns(tableName: string): Promise<Set<string>> {
    const rows = await this.dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [tableName]
    );
    return new Set(rows.map((r: any) => r.column_name));
  }

  private inferColumnTypes(rows: any[]): Record<string, string> {
    const types: Record<string, string> = {};
    const sample = rows.slice(0, Math.min(rows.length, 200));
    for (const row of sample) {
      if (!row || typeof row !== 'object') continue;
      for (const [rawKey, val] of Object.entries(row)) {
        const key = this.normalizeKey(rawKey);
        if (!key) continue;
        const detected = this.detectType(val);
        const pgType = this.pgTypeOf(detected);
        const prev = types[key];
        if (!prev) types[key] = pgType;
        else if (prev !== pgType) {
          // Resolve conflicts: prefer JSONB > TIMESTAMPTZ > NUMERIC > TEXT > BOOLEAN
          const order = { JSONB: 4, TIMESTAMPTZ: 3, NUMERIC: 2, TEXT: 1, BOOLEAN: 0 } as Record<string, number>;
          types[key] = order[prev] >= order[pgType] ? prev : pgType;
        }
      }
    }
    return types;
  }

  private async ensureColumns(tableName: string, rows: any[]): Promise<string[]> {
    const existing = await this.getExistingColumns(tableName);
    const inferred = this.inferColumnTypes(rows);
    const toCreate: string[] = [];
    for (const [col, type] of Object.entries(inferred)) {
      if (!existing.has(col)) toCreate.push(`ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    if (toCreate.length > 0) {
      const sql = `ALTER TABLE ${tableName} ${toCreate.join(', ')}`;
      await this.dataSource.query(sql);
    }
    // Return the ordered list of data columns (excluding id/hash/created_at)
    return Object.keys(inferred);
  }

  private hashRow(obj: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  }

  private mapRecordSetFields(row: any): any {
    // Map RecordSet fields to table columns
    const mappedRow = { ...row };
    
    // Map specific fields from RecordSet to table columns
    if (row['Сумма']) {
      mappedRow['сумма'] = row['Сумма'];
    }
    if (row['КоличествоDr']) {
      mappedRow['количествоdr'] = row['КоличествоDr'];
    }
    if (row['КоличествоCr']) {
      mappedRow['количествоcr'] = row['КоличествоCr'];
    }
    if (row['НомерСтроки']) {
      mappedRow['номерстроки'] = row['НомерСтроки'];
    }
    if (row['Содержание']) {
      mappedRow['содержание'] = row['Содержание'];
    }
    if (row['ВидДокумента']) {
      mappedRow['виддокумента'] = row['ВидДокумента'];
    }
    if (row['AccountDr_Key']) {
      mappedRow['accountdr_key'] = row['AccountDr_Key'];
    }
    if (row['AccountCr_Key']) {
      mappedRow['accountcr_key'] = row['AccountCr_Key'];
    }
    if (row['Организация_Key']) {
      mappedRow['организация_key'] = row['Организация_Key'];
    }
    if (row['ВалютнаяСуммаDr']) {
      mappedRow['валютнаясуммаdr'] = row['ВалютнаяСуммаDr'];
    }
    if (row['ВалютнаяСуммаCr']) {
      mappedRow['валютнаясуммаcr'] = row['ВалютнаяСуммаCr'];
    }
    if (row['СтруктурнаяЕдиницаDr_Key']) {
      mappedRow['структурнаяединицаdr_key'] = row['СтруктурнаяЕдиницаDr_Key'];
    }
    if (row['СтруктурнаяЕдиницаCr_Key']) {
      mappedRow['структурнаяединицаcr_key'] = row['СтруктурнаяЕдиницаCr_Key'];
    }
    
    return mappedRow;
  }

  private async insertRows(tableName: string, rows: any[]): Promise<number> {
    if (!rows || rows.length === 0) return 0;
    
    // Debug: log first row structure
    if (rows.length > 0) {
      this.logger.log(`DEBUG: ===== INSERTING ${rows.length} rows into ${tableName} =====`);
      this.logger.log(`DEBUG: First row keys: ${Object.keys(rows[0]).join(', ')}`);
      this.logger.log(`DEBUG: First row sample: ${JSON.stringify(rows[0], null, 2).substring(0, 500)}...`);
    }
    
    // Process rows to expand RecordSet arrays into separate rows
    const expandedRows: any[] = [];
    for (const row of rows) {
      const recordSet = row['RecordSet'] || row['Recordset'] || row['recordset'];
      if (Array.isArray(recordSet) && recordSet.length > 0) {
        // Debug: log RecordSet structure
        this.logger.log(`DEBUG: RecordSet has ${recordSet.length} items`);
        if (recordSet.length > 0) {
          this.logger.log(`DEBUG: First RecordSet item keys: ${Object.keys(recordSet[0]).join(', ')}`);
        }
        
        // Create a separate row for each item in RecordSet
        for (const recordItem of recordSet) {
          const expandedRow = {
            ...row,
            // Flatten RecordSet item properties into the main row
            ...recordItem
          };
          // Remove the original RecordSet field
          delete expandedRow['RecordSet'];
          delete expandedRow['Recordset'];
          delete expandedRow['recordset'];
          
          // Debug: log expanded row structure
          this.logger.log(`DEBUG: Expanded row keys: ${Object.keys(expandedRow).join(', ')}`);
          
          // Map RecordSet fields to table columns
          const mappedRow = this.mapRecordSetFields(expandedRow);
          
          expandedRows.push(mappedRow);
        }
      } else {
        // No RecordSet or empty RecordSet, use original row
        const cleanRow = { ...row };
        delete cleanRow['RecordSet'];
        delete cleanRow['Recordset'];
        delete cleanRow['recordset'];
        expandedRows.push(cleanRow);
      }
    }
    
    // Ensure table has columns for OData fields (including flattened RecordSet fields)
    const dataCols = await this.ensureColumns(tableName, expandedRows);
    this.logger.log(`DEBUG: Data columns for ${tableName}: ${dataCols.join(', ')}`);

    // Build batch insert with dynamic columns (only hash + data columns, no payload)
    const baseCols = ['hash'];
    const allCols = baseCols.concat(dataCols);
    this.logger.log(`DEBUG: All columns for insert: ${allCols.join(', ')}`);

    // Вставляем данные батчами по 20 записей с задержкой
    const batchSize = 20;
    let totalInserted = 0;
    
    for (let i = 0; i < expandedRows.length; i += batchSize) {
      const batch = expandedRows.slice(i, i + batchSize);
      
      // Задержка каждые 20 записей
      await ODataDelayUtil.delayForBatch(i, batchSize);
      
      const params: any[] = [];
      const tuples: string[] = [];
      
      for (const row of batch) {
        const tupleParams: string[] = [];
        // hash only
        const h = this.hashRow(row);
        params.push(h);
        tupleParams.push(`$${params.length}`);
        // dynamic columns
        for (const col of dataCols) {
          // Try multiple variations of the column name
          let rawVal = row[col] ?? row[col.replace(/_/g, '')];
          if (rawVal === undefined) {
            // Try with first letter capitalized
            const capitalizedCol = col.charAt(0).toUpperCase() + col.slice(1);
            rawVal = row[capitalizedCol] ?? row[capitalizedCol.replace(/_/g, '')];
          }
          if (rawVal === undefined) {
            // Try with all letters capitalized
            const upperCol = col.toUpperCase();
            rawVal = row[upperCol] ?? row[upperCol.replace(/_/g, '')];
          }
          if (rawVal === undefined) {
            // Try specific OData field mappings
            if (col === 'recorder_type') {
              rawVal = row['Recorder_Type'] ?? row['RecorderType'];
            } else if (col === 'recorder') {
              rawVal = row['Recorder'];
            }
          }
          
          // Debug: log field mapping
          if (rawVal === undefined) {
            this.logger.log(`DEBUG: Field '${col}' not found in row, using NULL`);
            tupleParams.push('NULL');
          } else {
            this.logger.log(`DEBUG: Field '${col}' = '${rawVal}' (type: ${typeof rawVal})`);
            if (typeof rawVal === 'object') {
              params.push(JSON.stringify(rawVal));
              tupleParams.push(`$${params.length}::jsonb`);
            } else {
              params.push(rawVal);
              tupleParams.push(`$${params.length}`);
            }
          }
        }
        tuples.push(`(${tupleParams.join(',')})`);
      }
      
      const sql = `INSERT INTO ${tableName} (${allCols.join(',')}) VALUES ${tuples.join(',')} ON CONFLICT (hash) DO NOTHING`;
      this.logger.log(`DEBUG: BATCH ${Math.floor(i/batchSize) + 1}: executing SQL with ${batch.length} rows`);
      this.logger.log(`DEBUG: SQL params count: ${params.length}`);
      
      await this.dataSource.query(sql, params);
      totalInserted += batch.length;
      
      this.logger.log(`DEBUG: BATCH ${Math.floor(i/batchSize) + 1} COMPLETED: ${batch.length} rows processed`);
    }
    
    this.logger.log(`DEBUG: ===== INSERT COMPLETED for ${tableName}: ${totalInserted} total rows =====`);
    return totalInserted;
  }

  private async discoverCollections(baseUrl: string, auth: { username: string; password: string }): Promise<string[]> {
    // Задержка перед запросом к OData
    await ODataDelayUtil.delay();
    
    // OData service document usually at base; V4 JSON lists in 'value' with 'name' or 'url'
    const url = baseUrl;
    const settings = this.configService.getDataServicesSettings();
    const res = await axios.get(url, { auth, timeout: settings.getScopeOneC.timeoutSeconds * 1000, headers: { Accept: 'application/json' } });
    const data = res.data;
    if (data && Array.isArray(data.value)) {
      const names = data.value
        .map((e: any) => e?.name || e?.url || e?.entitySet || e?.title)
        .filter((x: any) => typeof x === 'string') as string[];
      return names;
    }
    // fallback: try metadata-like JSON structures
    return [];
  }

  private async fetchCollection(baseBaseUrl: string, collection: string, auth: { username: string; password: string }): Promise<any[]> {
    // Задержка перед запросом к OData
    await ODataDelayUtil.delay();
    
    const encoded = encodeURI(collection);
    const query = '%24format=json';
    const url = `${baseBaseUrl}/${encoded}/?${query}`;
    this.logger.log(`Fetching ${url}`);
    const settings = this.configService.getDataServicesSettings();
    const res = await axios.get(url, { auth, timeout: settings.getScopeOneC.timeoutSeconds * 1000, headers: { Accept: 'application/json' } });
    const data = res.data;
    if (data && Array.isArray(data.value)) return data.value;
    if (Array.isArray(data)) return data;
    return [];
  }

  async run(): Promise<void> {
    try {
      // Отмечаем сервис как запущенный
      this.serviceStatusService.updateServiceStatus('get_scope_one_c', {
        running: true
      });
      
      const settings = this.configService.getDataServicesSettings();
      const auth = { 
        username: settings.getScopeOneC.username, 
        password: settings.getScopeOneC.password 
      };
      const bases = settings.getScopeOneC.baseUrls;
      if (!bases.length) {
        this.logger.warn('No GetScopeOneC base URLs configured');
        return;
      }

    for (const baseRaw of bases) {
      const base = this.normalizeBaseUrl(baseRaw);
      try {
        const collections = await this.discoverCollections(base, auth);
        if (collections.length === 0) {
          this.logger.warn(`No collections discovered at ${base}`);
          continue;
        }
        for (const name of collections) {
          const tableName = `odata_${this.normalizeNameForTable(name)}`;
          try {
            await this.ensureTable(tableName);
            const rows = await this.fetchCollection(base, name, auth);
            const inserted = await this.insertRows(tableName, rows);
            this.logger.log(`Inserted up to ${inserted} rows into ${tableName}`);
            
            // Обновляем метаданные коллекции после загрузки
            await this.datasCollectionsService.updateCollectionAfterLoad(base, name, tableName);
            this.logger.log(`Updated metadata for collection ${name} from ${base}`);
          } catch (e: any) {
            this.logger.error(`Failed ${name} at ${base}: ${e.message || e}`);
          }
        }
      } catch (e: any) {
        this.logger.error(`Discovery failed at ${base}: ${e.message || e}`);
      }
    }
    
    // Отмечаем успешное завершение
    this.serviceStatusService.updateServiceStatus('get_scope_one_c', {
      running: false
    });
    
    } catch (error: any) {
      this.logger.error('Unhandled error in GetScopeOneC', error.stack || error);
      this.serviceStatusService.setServiceError('get_scope_one_c', error.message || 'Unknown error');
    }
  }
}


