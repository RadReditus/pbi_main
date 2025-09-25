import { Injectable, Logger } from '@nestjs/common';

export interface ServiceStatus {
  name: string;
  enabled: boolean;
  running: boolean;
  lastRun?: Date;
  lastError?: string;
  nextRun?: Date;
}

@Injectable()
export class ServiceStatusService {
  private readonly logger = new Logger(ServiceStatusService.name);
  private services: Map<string, ServiceStatus> = new Map();

  constructor() {
    // Инициализируем статусы сервисов
    this.services.set('source1c', {
      name: 'Source1C Service',
      enabled: false,
      running: false
    });
    
    this.services.set('get_scope_one_c', {
      name: 'GetScopeOneC Service', 
      enabled: false,
      running: false
    });
    
    this.services.set('monitoring', {
      name: 'Monitoring Service',
      enabled: false,
      running: false
    });
  }

  /**
   * Обновляет статус сервиса
   */
  updateServiceStatus(serviceName: string, status: Partial<ServiceStatus>): void {
    const currentStatus = this.services.get(serviceName);
    if (currentStatus) {
      this.services.set(serviceName, {
        ...currentStatus,
        ...status,
        lastRun: status.running ? new Date() : currentStatus.lastRun
      });
      
      this.logger.log(`Service ${serviceName} status updated:`, {
        enabled: status.enabled ?? currentStatus.enabled,
        running: status.running ?? currentStatus.running,
        lastRun: status.running ? new Date() : currentStatus.lastRun
      });
    }
  }

  /**
   * Получает статус конкретного сервиса
   */
  getServiceStatus(serviceName: string): ServiceStatus | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Получает статус всех сервисов
   */
  getAllServicesStatus(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  /**
   * Проверяет, готовы ли все необходимые сервисы для запуска мониторинга
   */
  isMonitoringReady(): boolean {
    const source1c = this.services.get('source1c');
    const getScopeOneC = this.services.get('get_scope_one_c');
    
    // Мониторинг готов, если хотя бы один из сервисов загрузки данных активен
    const hasActiveDataService = 
      (source1c?.enabled && source1c?.running) || 
      (getScopeOneC?.enabled && getScopeOneC?.running);
    
    this.logger.log('Checking monitoring readiness:', {
      source1c: { enabled: source1c?.enabled, running: source1c?.running },
      getScopeOneC: { enabled: getScopeOneC?.enabled, running: getScopeOneC?.running },
      monitoringReady: hasActiveDataService
    });
    
    return hasActiveDataService;
  }

  /**
   * Проверяет, активен ли конкретный сервис
   */
  isServiceActive(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service ? (service.enabled && service.running) : false;
  }

  /**
   * Устанавливает ошибку для сервиса
   */
  setServiceError(serviceName: string, error: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      this.services.set(serviceName, {
        ...service,
        lastError: error,
        running: false
      });
      this.logger.error(`Service ${serviceName} error:`, error);
    }
  }

  /**
   * Сбрасывает ошибку сервиса
   */
  clearServiceError(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      this.services.set(serviceName, {
        ...service,
        lastError: undefined
      });
    }
  }

  /**
   * Получает общую статистику сервисов
   */
  getServicesStats(): {
    total: number;
    enabled: number;
    running: number;
    withErrors: number;
  } {
    const services = Array.from(this.services.values());
    return {
      total: services.length,
      enabled: services.filter(s => s.enabled).length,
      running: services.filter(s => s.running).length,
      withErrors: services.filter(s => s.lastError).length
    };
  }
}




