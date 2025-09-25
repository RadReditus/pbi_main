import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { TableCounter } from './table-counter.entity';
import { DatasCollectionsService } from '../datas-collections/datas-collections.service';
import { SmartSyncService } from '../sync/smart-sync.service';
import { ServiceStatusService } from '../health/service-status.service';
import { ODataDelayUtil } from '../common/utils/odata-delay.util';
import { ConfigService } from '../config/config.service';
@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringService.name);
  private monitoringEnabled = false;

  constructor(
    @InjectRepository(TableCounter, 'users') private counterRepo: Repository<TableCounter>,
    private readonly datasCollectionsService: DatasCollectionsService,
    private readonly smartSyncService: SmartSyncService,
    private readonly serviceStatusService: ServiceStatusService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const settings = this.configService.getMonitoringSettings();
    const enabled = settings.enabled;
    
    if (!enabled) {
      this.logger.log('Monitoring disabled by configuration');
      return;
    }
    
    // Ждем, пока загрузятся данные из 1С (20 сек + время на загрузку)
    const monitoringDelaySeconds = settings.delaySeconds;
    this.logger.log(`Monitoring will start in ${monitoringDelaySeconds}s after data loading services`);
    
    setTimeout(() => {
      this.checkAndEnableMonitoring();
    }, monitoringDelaySeconds * 1000);
  }

  /**
   * Проверяет готовность сервисов загрузки данных и включает мониторинг
   */
  private checkAndEnableMonitoring(): void {
    const isReady = this.serviceStatusService.isMonitoringReady();
    
    if (isReady) {
      this.monitoringEnabled = true;
      this.serviceStatusService.updateServiceStatus('monitoring', {
        enabled: true,
        running: true
      });
      this.logger.log('Monitoring enabled - data loading services are active');
    } else {
      this.logger.log('Monitoring not enabled - no active data loading services found');
      this.serviceStatusService.updateServiceStatus('monitoring', {
        enabled: false,
        running: false
      });
      
      // Повторная проверка через 30 секунд
      setTimeout(() => {
        this.checkAndEnableMonitoring();
      }, 30000);
    }
  }

  /**
   * Запускается ежедневно в 00:00 по казахстанскому времени (UTC+3) для проверки изменений в OData источниках
   */
  @Cron('0 0 * * *', {
    timeZone: 'Asia/Almaty'
  })
  async checkForChanges(): Promise<void> {
    if (!this.monitoringEnabled) {
      this.logger.log('Monitoring is disabled - waiting for data loading to complete');
      return;
    }

    this.logger.log('Starting OData monitoring cycle...');
    
    try {
      const collections = await this.datasCollectionsService.getAllCollectionsMeta();
      
      if (collections.length === 0) {
        this.logger.log('No collections found - skipping monitoring cycle');
        return;
      }
      
      for (const collection of collections) {
        await this.checkCollectionChanges(collection.baseUrl, collection.collectionName);
        // Небольшая пауза между проверками
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.logger.log('OData monitoring cycle completed');
    } catch (error) {
      this.logger.error('Error during monitoring cycle:', error);
    }
  }

  /**
   * Проверяет изменения в конкретной коллекции
   */
  private async checkCollectionChanges(baseUrl: string, collectionName: string): Promise<void> {
    const tableName = `odata_${this.normalizeTableName(collectionName)}`;
    
    try {
      // Проверяем, включены ли сервисы загрузки данных
      const dataServicesSettings = this.configService.getDataServicesSettings();
      const isSource1cEnabled = dataServicesSettings.source1c.enabled;
      const isGetScopeOnecEnabled = dataServicesSettings.getScopeOneC.enabled;
      
      // Если ни один из сервисов не включен, не читаем OData
      if (!isSource1cEnabled && !isGetScopeOnecEnabled) {
        this.logger.log(`Skipping OData read for ${collectionName} - all data services are disabled`);
        return;
      }
      
      // Получаем текущий счетчик из нашей БД
      let counter = await this.counterRepo.findOne({
        where: { tableName, baseUrl }
      });

      if (!counter) {
        // Создаем новый счетчик если его нет
        counter = this.counterRepo.create({
          tableName,
          baseUrl,
          collectionName,
          currentCount: 0,
          lastSyncedCount: 0,
          needsUpdate: false
        });
        await this.counterRepo.save(counter);
      }

      // Получаем количество записей из OData источника
      const remoteCount = await this.getRemoteRecordCount(baseUrl, collectionName);
      
      // Обновляем счетчик
      counter.currentCount = remoteCount;
      counter.lastCheckedAt = new Date();
      counter.needsUpdate = counter.lastSyncedCount !== remoteCount;
      
      await this.counterRepo.save(counter);

      this.logger.log(`Table ${tableName}: remote=${remoteCount}, local=${counter.lastSyncedCount}, needsUpdate=${counter.needsUpdate}`);

      // Если данные изменились, синхронизируем
      if (counter.needsUpdate) {
        await this.syncTableData(tableName, baseUrl, collectionName);
        
        // Обновляем счетчик после синхронизации
        counter.lastSyncedCount = remoteCount;
        counter.needsUpdate = false;
        counter.lastUpdatedAt = new Date();
        await this.counterRepo.save(counter);
        
        this.logger.log(`Successfully synced table ${tableName} with ${remoteCount} records`);
      } else {
        this.logger.log(`Table ${tableName} is up to date (${remoteCount} records)`);
      }

    } catch (error) {
      this.logger.error(`Error checking collection ${collectionName} at ${baseUrl}:`, error);
    }
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
      
      // OData может возвращать count в разных форматах
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
   * Синхронизирует данные таблицы с использованием умной логики
   */
  private async syncTableData(tableName: string, baseUrl: string, collectionName: string): Promise<void> {
    try {
      // Проверяем, включены ли сервисы загрузки данных
      const dataServicesSettings = this.configService.getDataServicesSettings();
      const isSource1cEnabled = dataServicesSettings.source1c.enabled;
      const isGetScopeOnecEnabled = dataServicesSettings.getScopeOneC.enabled;
      
      // Если ни один из сервисов не включен, не синхронизируем
      if (!isSource1cEnabled && !isGetScopeOnecEnabled) {
        this.logger.log(`Skipping sync for ${tableName} - all data services are disabled`);
        return;
      }
      
      this.logger.log(`Starting smart sync for table ${tableName} from ${baseUrl}/${collectionName}`);
      
      const settings = this.configService.getDataServicesSettings();
      
      // Используем умную синхронизацию
      const result = await this.smartSyncService.syncTable(
        tableName,
        baseUrl,
        collectionName,
        {
          forceFullSync: false, // Используем умную логику
          batchSize: 1000,
          timeout: settings.source1c.timeoutSeconds * 1000
        }
      );

      this.logger.log(`Smart sync completed for ${tableName}:`, {
        strategy: result.strategy,
        processed: result.recordsProcessed,
        inserted: result.recordsInserted,
        skipped: result.recordsSkipped,
        duration: result.duration
      });

      // Обновляем метаданные коллекции
      await this.datasCollectionsService.updateCollectionAfterLoad(baseUrl, collectionName, tableName);
      
    } catch (error) {
      this.logger.error(`Failed to sync table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Нормализует имя таблицы
   */
  private normalizeTableName(name: string): string {
    return name.replace(/\W+/g, '_').toLowerCase();
  }

  /**
   * Получает статус всех счетчиков
   */
  async getCountersStatus(): Promise<TableCounter[]> {
    return this.counterRepo.find({
      order: { lastCheckedAt: 'DESC' }
    });
  }

  /**
   * Получает статистику мониторинга
   */
  async getMonitoringStats(): Promise<{
    totalTables: number;
    upToDateTables: number;
    needsUpdateTables: number;
    lastCheckTime: Date | null;
  }> {
    const counters = await this.counterRepo.find();
    
    const upToDateTables = counters.filter(c => !c.needsUpdate).length;
    const needsUpdateTables = counters.filter(c => c.needsUpdate).length;
    const lastCheckTime = counters.length > 0 
      ? new Date(Math.max(...counters.map(c => c.lastCheckedAt?.getTime() || 0)))
      : null;

    return {
      totalTables: counters.length,
      upToDateTables,
      needsUpdateTables,
      lastCheckTime
    };
  }

  /**
   * Принудительная проверка всех таблиц
   */
  async forceCheckAll(): Promise<void> {
    this.logger.log('Force checking all tables...');
    await this.checkForChanges();
  }

  /**
   * Принудительная синхронизация конкретной таблицы
   */
  async forceSyncTable(tableName: string): Promise<void> {
    const counter = await this.counterRepo.findOne({
      where: { tableName }
    });

    if (!counter) {
      throw new Error(`Table counter not found for ${tableName}`);
    }

    await this.syncTableData(tableName, counter.baseUrl, counter.collectionName);
    
    counter.lastSyncedCount = counter.currentCount;
    counter.needsUpdate = false;
    counter.lastUpdatedAt = new Date();
    await this.counterRepo.save(counter);
  }

  /**
   * Принудительно включает мониторинг (для тестирования)
   */
  enableMonitoring(): void {
    this.monitoringEnabled = true;
    this.logger.log('Monitoring manually enabled');
  }

  /**
   * Отключает мониторинг
   */
  disableMonitoring(): void {
    this.monitoringEnabled = false;
    this.logger.log('Monitoring manually disabled');
  }

  /**
   * Проверяет статус мониторинга
   */
  isMonitoringEnabled(): boolean {
    return this.monitoringEnabled;
  }
}
