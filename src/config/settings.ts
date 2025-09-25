// =============================================================================
// НАСТРОЙКИ PBI EXCHANGE
// Переменные настроек с явными значениями для секунд и true/false
// =============================================================================

import { loadConfigFromEnv, AppSettings } from './config';

// Загружаем конфигурацию из переменных окружения
const config = loadConfigFromEnv();

// =============================================================================
// ОСНОВНЫЕ НАСТРОЙКИ ПРИЛОЖЕНИЯ
// =============================================================================

export const appPort = config.app.port; // Порт для запуска API сервера
export const nodeEnv = config.app.nodeEnv; // Окружение приложения (development/production)

// =============================================================================
// НАСТРОЙКИ БАЗ ДАННЫХ
// =============================================================================

// PostgreSQL настройки
export const pgHost = config.database.postgres.host; // Хост PostgreSQL сервера
export const pgPort = config.database.postgres.port; // Порт PostgreSQL сервера
export const pgUser = config.database.postgres.user; // Пользователь для подключения к PostgreSQL
export const pgPassword = config.database.postgres.password; // Пароль для подключения к PostgreSQL
export const pgUsersDb = config.database.postgres.usersDb; // База данных для пользователей и ролей
export const pgFilteredDb = config.database.postgres.filteredDb; // База данных для отфильтрованных записей
export const pgTaggedDb = config.database.postgres.taggedDb; // База данных для тегированных записей
export const pgSource1cDb = config.database.postgres.source1cDb; // База данных для данных из 1С (Source1C)
export const pgSourceOnecDb = config.database.postgres.sourceOnecDb; // База данных для данных из 1С (GetScopeOneC)

// MongoDB настройки
export const mongoUri = config.database.mongo.uri; // URI подключения к MongoDB

// Redis настройки
export const redisHost = config.database.redis.host; // Хост Redis сервера
export const redisPort = config.database.redis.port; // Порт Redis сервера

// =============================================================================
// НАСТРОЙКИ АУТЕНТИФИКАЦИИ
// =============================================================================

export const jwtSecret = config.auth.jwtSecret; // Секретный ключ для JWT токенов
export const apiKeyPbi = config.auth.apiKeyPbi; // API ключ для Power BI
export const odataPwSecret = config.auth.odataPwSecret; // Секретный ключ для шифрования паролей OData

// =============================================================================
// НАСТРОЙКИ СЕРВИСОВ ЗАГРУЗКИ ДАННЫХ
// =============================================================================

// Source1C сервис
export const source1cEnabled = config.dataServices.source1c.enabled; // Включен ли сервис Source1C
export const source1cDelaySeconds = 20; // Задержка перед запуском Source1C в секундах
export const source1cUsername = config.dataServices.source1c.username; // Имя пользователя для подключения к 1С
export const source1cPassword = config.dataServices.source1c.password; // Пароль для подключения к 1С
export const source1cTimeoutSeconds = 120; // Таймаут запросов к 1С в секундах
export const source1cLinks = config.dataServices.source1c.links; // Массив ссылок на OData коллекции 1С

// GetScopeOneC сервис
export const getScopeOnecEnabled = config.dataServices.getScopeOneC.enabled; // Включен ли сервис GetScopeOneC
export const getScopeOnecDelaySeconds = 20; // Задержка перед запуском GetScopeOneC в секундах
export const getScopeOnecUsername = config.dataServices.getScopeOneC.username; // Имя пользователя для подключения к 1С
export const getScopeOnecPassword = config.dataServices.getScopeOneC.password; // Пароль для подключения к 1С
export const getScopeOnecTimeoutSeconds = 120; // Таймаут запросов к 1С в секундах
export const getScopeOnecBaseUrls = config.dataServices.getScopeOneC.baseUrls; // Массив базовых URL для GetScopeOneC

// =============================================================================
// НАСТРОЙКИ MSSQL ЗАГРУЗКИ
// =============================================================================

export const mssqlPtcDbEnabled = config.dataServices.mssql.enabled; // Включен ли функционал загрузки данных из MSSQL
export const mssqlDelaySeconds = 30; // Задержка перед запуском MSSQL загрузки в секундах
export const mssqlTimeoutSeconds = 300; // Таймаут запросов к MSSQL в секундах
export const mssqlLaunchDbLoad = [{"reklama": true, "ptc_reklama": true}]; // Список баз для загрузки
export const mssqlCredentials = config.dataServices.mssql.credentials; // Креды для подключения к MSSQL базам
export const mssqlBatchSize = 10000; // Размер батча для загрузки данных (10,000 записей)
export const mssqlBatchDelaySeconds = 5; // Пауза между батчами в секундах

// =============================================================================
// НАСТРОЙКИ PTC_REKLAMA MSSQL
// =============================================================================

export const ptcReklamaEnabled = config.dataServices.mssql.enabled; // Включен ли функционал загрузки PTC_REKLAMA
export const ptcReklamaDelaySeconds = 30; // Задержка перед запуском PTC_REKLAMA загрузки в секундах
export const ptcReklamaTimeoutSeconds = 300; // Таймаут запросов к PTC_REKLAMA MSSQL в секундах
export const ptcReklamaBatchSize = 10000; // Размер батча для загрузки PTC_REKLAMA данных
export const ptcReklamaBatchDelaySeconds = 5; // Пауза между батчами PTC_REKLAMA в секундах

// =============================================================================
// НАСТРОЙКИ МОНИТОРИНГА
// =============================================================================

export const monitoringEnabled = config.monitoring.enabled; // Включен ли мониторинг OData источников
export const monitoringDelaySeconds = 60; // Задержка перед запуском мониторинга в секундах
export const monitoringCronExpression = "0 */5 * * * *"; // Cron выражение для периодического мониторинга (каждые 5 минут)

// =============================================================================
// НАСТРОЙКИ ЛОГИРОВАНИЯ
// =============================================================================

export const fileLogging = true; // Включено ли логирование в файл
export const logFilePath = config.logging.logFilePath; // Путь к файлу логов

// =============================================================================
// ЭКСПОРТ ИНТЕРФЕЙСА ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
// =============================================================================

export { AppSettings } from './config';




