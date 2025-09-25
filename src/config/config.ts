// =============================================================================
// КОНФИГУРАЦИОННЫЙ ПЕРЕХОДНИК
// Загружает данные из .env файла и передает их в settings.ts
// =============================================================================

// =============================================================================
// ИНТЕРФЕЙСЫ
// =============================================================================

export interface AppSettings {
  app: {
    port: number;
    nodeEnv: string;
  };
  database: {
    postgres: {
      host: string;
      port: number;
      user: string;
      password: string;
      usersDb: string;
      filteredDb: string;
      taggedDb: string;
      source1cDb: string;
      sourceOnecDb: string;
    };
    mongo: {
      uri: string;
    };
    redis: {
      host: string;
      port: number;
    };
  };
  auth: {
    jwtSecret: string;
    apiKeyPbi: string;
    odataPwSecret: string;
  };
  dataServices: {
    source1c: {
      enabled: boolean;
      delaySeconds: number;
      username: string;
      password: string;
      timeoutSeconds: number;
      links: Array<{ url: string; name?: string }>;
    };
    getScopeOneC: {
      enabled: boolean;
      delaySeconds: number;
      username: string;
      password: string;
      timeoutSeconds: number;
      baseUrls: string[];
    };
    mssql: {
      enabled: boolean;
      delaySeconds: number;
      timeoutSeconds: number;
      launchDbLoad: Array<{ [key: string]: boolean }>;
      credentials: {
        [key: string]: {
          server: string;
          database: string;
          username: string;
          password: string;
          port: number;
        };
      };
    };
  };
  monitoring: {
    enabled: boolean;
    delaySeconds: number;
    cronExpression: string;
  };
  logging: {
    fileLogging: boolean;
    logFilePath: string;
  };
}

/**
 * Загружает и конвертирует переменные окружения в настройки приложения
 */
export function loadConfigFromEnv(): AppSettings {
  // =============================================================================
  // ОСНОВНЫЕ НАСТРОЙКИ ПРИЛОЖЕНИЯ
  // =============================================================================
  const appPort = getNumberEnvVar('PORT', 3000);
  const nodeEnv = getEnvVar('NODE_ENV', 'development');

  // =============================================================================
  // НАСТРОЙКИ БАЗ ДАННЫХ
  // =============================================================================
  
  // PostgreSQL настройки
  const pgHost = getEnvVar('PG_HOST', 'localhost');
  const pgPort = getNumberEnvVar('PG_PORT', 5432);
  const pgUser = getEnvVar('PG_USER', 'app');
  const pgPassword = getEnvVar('PG_PASSWORD', 'app');
  const pgUsersDb = getEnvVar('PG_DB_USERS', 'users_db');
  const pgFilteredDb = getEnvVar('PG_DB_FILTERED', 'onec_filtered_db');
  const pgTaggedDb = getEnvVar('PG_DB_TAGGED', 'onec_tagged_db');
  const pgSource1cDb = getEnvVar('SOURCE1C_PG_DB', 'source_1c');
  const pgSourceOnecDb = getEnvVar('GET_SCOPE_ONEC_PG_DB', 'source_one_c');

  // MongoDB настройки
  const mongoUri = getEnvVar('MONGO_URI', 'mongodb://localhost:27017/pbi_exchange');

  // Redis настройки
  const redisHost = getEnvVar('REDIS_HOST', 'localhost');
  const redisPort = getNumberEnvVar('REDIS_PORT', 6379);

  // =============================================================================
  // НАСТРОЙКИ АУТЕНТИФИКАЦИИ
  // =============================================================================
  const jwtSecret = getEnvVar('JWT_SECRET', 'change_me_long_random');
  const apiKeyPbi = getEnvVar('API_KEY_PBI', '0123456789abcdef0123456789abcdef');
  const odataPwSecret = getEnvVar('ODATA_PW_SECRET', '32bytes_hex_key_for_aes_256');

  // =============================================================================
  // НАСТРОЙКИ СЕРВИСОВ ЗАГРУЗКИ ДАННЫХ
  // =============================================================================
  
  // Source1C сервис
  const source1cEnabled = getBooleanEnvVar('SOURCE1C_ENABLE', false);
  const source1cDelaySeconds = getNumberEnvVar('SOURCE1C_DELAY_SECONDS', 20);
  const source1cUsername = getEnvVar('SOURCE1C_USERNAME', 'Power_BI');
  const source1cPassword = getEnvVar('SOURCE1C_PASSWORD', 'Y#632754265740oq');
  const source1cTimeoutSeconds = getNumberEnvVar('SOURCE1C_TIMEOUT_SECONDS', 120);
  
  // Парсинг ссылок Source1C
  let source1cLinks: Array<{ url: string; name?: string }> = [];
  if (process.env.SOURCE1C_LINKS) {
    try {
      source1cLinks = JSON.parse(process.env.SOURCE1C_LINKS);
    } catch (e) {
      // Fallback для простого списка URL
      const urls = process.env.SOURCE1C_LINKS.split(',').map(url => ({ url: url.trim() }));
      source1cLinks = urls;
    }
  }

  // GetScopeOneC сервис
  const getScopeOnecEnabled = getBooleanEnvVar('GET_SCOPE_ONEC_ENABLE', false);
  const getScopeOnecDelaySeconds = getNumberEnvVar('GET_SCOPE_ONEC_DELAY_SECONDS', 20);
  const getScopeOnecUsername = getEnvVar('GET_SCOPE_ONEC_USERNAME', 'Power_BI');
  const getScopeOnecPassword = getEnvVar('GET_SCOPE_ONEC_PASSWORD', 'Y#632754265740oq');
  const getScopeOnecTimeoutSeconds = getNumberEnvVar('GET_SCOPE_ONEC_TIMEOUT_SECONDS', 120);
  
  // Парсинг базовых URL GetScopeOneC
  const getScopeOnecBaseUrls = getArrayEnvVar('GET_SCOPE_ONEC_BASEURLS', []);

  // =============================================================================
  // НАСТРОЙКИ MSSQL
  // =============================================================================
  const mssqlEnabled = getBooleanEnvVar('MSSQL_PTC_DB', true);
  const mssqlDelaySeconds = getNumberEnvVar('MSSQL_DELAY_SECONDS', 30);
  const mssqlTimeoutSeconds = getNumberEnvVar('MSSQL_TIMEOUT_SECONDS', 300);
  
  // Парсинг launch_db_load
  const mssqlLaunchDbLoadRaw = getEnvVar('LAUNCH_DB_LOAD', '[]');
  let mssqlLaunchDbLoad: Array<{ [key: string]: boolean }> = [];
  try {
    mssqlLaunchDbLoad = JSON.parse(mssqlLaunchDbLoadRaw);
  } catch (e) {
    console.warn('Failed to parse LAUNCH_DB_LOAD, using empty array');
  }

  // Парсинг кредов для MSSQL
  const mssqlCredentials: { [key: string]: any } = {};
  const mssqlCredKeys = ['reklama', 'ptc_reklama']; // Добавляем ключи для кредов
  
  for (const key of mssqlCredKeys) {
    let server, database, username, password, port;
    
    if (key === 'ptc_reklama') {
      // Специальная обработка для PTC_REKLAMA с другими именами переменных
      server = getEnvVar('IP_PTC_REKLAMA_SQL', '');
      database = getEnvVar('ONE_C_BASE_PTC_REKLAMA_SQL', '');
      username = getEnvVar('LOGIN_PTC_REKLAMA_SQL', '');
      password = getEnvVar('PASS_PTC_REKLAMA_SQL', '');
      port = getNumberEnvVar('PTC_REKLAMA_MSSQL_PORT', 1433);
    } else {
      // Стандартная обработка для других баз
      server = getEnvVar(`${key.toUpperCase()}_MSSQL_SERVER`, '');
      database = getEnvVar(`${key.toUpperCase()}_MSSQL_DATABASE`, '');
      username = getEnvVar(`${key.toUpperCase()}_MSSQL_USERNAME`, '');
      password = getEnvVar(`${key.toUpperCase()}_MSSQL_PASSWORD`, '');
      port = getNumberEnvVar(`${key.toUpperCase()}_MSSQL_PORT`, 1433);
    }
    
    if (server && database && username && password) {
      mssqlCredentials[key] = {
        server,
        database,
        username,
        password,
        port,
      };
    }
  }

  // =============================================================================
  // НАСТРОЙКИ МОНИТОРИНГА
  // =============================================================================
  const monitoringEnabled = getBooleanEnvVar('MONITORING_ENABLE', true);
  const monitoringDelaySeconds = getNumberEnvVar('MONITORING_DELAY_SECONDS', 60);
  const monitoringCronExpression = getEnvVar('MONITORING_CRON_EXPRESSION', '0 */5 * * * *');

  // =============================================================================
  // НАСТРОЙКИ ЛОГИРОВАНИЯ
  // =============================================================================
  const fileLogging = getBooleanEnvVar('FILE_LOGGING', true);
  const logFilePath = getEnvVar('LOG_FILE_PATH', '/app/logs/app.log');

  // Возвращаем объект настроек
  return {
    app: {
      port: appPort,
      nodeEnv: nodeEnv,
    },
    database: {
      postgres: {
        host: pgHost,
        port: pgPort,
        user: pgUser,
        password: pgPassword,
        usersDb: pgUsersDb,
        filteredDb: pgFilteredDb,
        taggedDb: pgTaggedDb,
        source1cDb: pgSource1cDb,
        sourceOnecDb: pgSourceOnecDb,
      },
      mongo: {
        uri: mongoUri,
      },
      redis: {
        host: redisHost,
        port: redisPort,
      },
    },
    auth: {
      jwtSecret: jwtSecret,
      apiKeyPbi: apiKeyPbi,
      odataPwSecret: odataPwSecret,
    },
    dataServices: {
      source1c: {
        enabled: source1cEnabled,
        delaySeconds: source1cDelaySeconds,
        username: source1cUsername,
        password: source1cPassword,
        timeoutSeconds: source1cTimeoutSeconds,
        links: source1cLinks,
      },
      getScopeOneC: {
        enabled: getScopeOnecEnabled,
        delaySeconds: getScopeOnecDelaySeconds,
        username: getScopeOnecUsername,
        password: getScopeOnecPassword,
        timeoutSeconds: getScopeOnecTimeoutSeconds,
        baseUrls: getScopeOnecBaseUrls,
      },
      mssql: {
        enabled: mssqlEnabled,
        delaySeconds: mssqlDelaySeconds,
        timeoutSeconds: mssqlTimeoutSeconds,
        launchDbLoad: mssqlLaunchDbLoad,
        credentials: mssqlCredentials,
      },
    },
    monitoring: {
      enabled: monitoringEnabled,
      delaySeconds: monitoringDelaySeconds,
      cronExpression: monitoringCronExpression,
    },
    logging: {
      fileLogging: fileLogging,
      logFilePath: logFilePath,
    },
  };
}

/**
 * Получает значение переменной окружения с типизацией
 */
export function getEnvVar<T = string>(
  key: string,
  defaultValue: T,
  converter?: (value: string) => T
): T {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  
  if (converter) {
    return converter(value);
  }
  
  return value as T;
}

/**
 * Получает булево значение из переменной окружения
 */
export function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key]?.toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes') {
    return true;
  }
  if (value === 'false' || value === '0' || value === 'no') {
    return false;
  }
  return defaultValue;
}

/**
 * Получает числовое значение из переменной окружения
 */
export function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Получает массив строк из переменной окружения
 */
export function getArrayEnvVar(key: string, defaultValue: string[] = [], separator: RegExp = /[\n,;|]+/): string[] {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  
  return value
    .split(separator)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}
