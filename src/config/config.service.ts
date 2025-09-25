import { Injectable } from '@nestjs/common';
import { AppSettings, loadConfigFromEnv } from './config';

@Injectable()
export class ConfigService {
  private settings: AppSettings;

  constructor() {
    this.settings = loadConfigFromEnv();
  }

  /**
   * Получает все настройки
   */
  getSettings(): AppSettings {
    return this.settings;
  }

  /**
   * Получает настройки приложения
   */
  getAppSettings() {
    return this.settings.app;
  }

  /**
   * Получает настройки базы данных
   */
  getDatabaseSettings() {
    return this.settings.database;
  }

  /**
   * Получает настройки аутентификации
   */
  getAuthSettings() {
    return this.settings.auth;
  }

  /**
   * Получает настройки сервисов загрузки данных
   */
  getDataServicesSettings() {
    return this.settings.dataServices;
  }

  /**
   * Получает настройки мониторинга
   */
  getMonitoringSettings() {
    return this.settings.monitoring;
  }

  /**
   * Получает настройки логирования
   */
  getLoggingSettings() {
    return this.settings.logging;
  }

  /**
   * Обновляет настройки (для runtime изменения)
   */
  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = {
      ...this.settings,
      ...updates,
      app: { ...this.settings.app, ...updates.app },
      database: { ...this.settings.database, ...updates.database },
      auth: { ...this.settings.auth, ...updates.auth },
      dataServices: { ...this.settings.dataServices, ...updates.dataServices },
      monitoring: { ...this.settings.monitoring, ...updates.monitoring },
      logging: { ...this.settings.logging, ...updates.logging },
    };
  }

  /**
   * Проверяет, включен ли конкретный сервис
   */
  isServiceEnabled(serviceName: keyof AppSettings['dataServices']): boolean {
    return this.settings.dataServices[serviceName].enabled;
  }

  /**
   * Включает/отключает сервис
   */
  setServiceEnabled(serviceName: keyof AppSettings['dataServices'], enabled: boolean): void {
    this.settings.dataServices[serviceName].enabled = enabled;
  }

  /**
   * Проверяет, включен ли мониторинг
   */
  isMonitoringEnabled(): boolean {
    return this.settings.monitoring.enabled;
  }

  /**
   * Включает/отключает мониторинг
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.settings.monitoring.enabled = enabled;
  }
}




