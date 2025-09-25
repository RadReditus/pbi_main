// Скрипт для проверки переменных окружения
require('dotenv').config();

console.log('🔍 Проверка переменных окружения для MSSQL\n');

// Основные переменные для MSSQL
const mssqlVars = [
  'MSSQL_PTC_DB',
  'MSSQL_DELAY_SECONDS', 
  'MSSQL_TIMEOUT_SECONDS',
  'LAUNCH_DB_LOAD'
];

// Переменные для RTS_DECAUX_REKLAMA (используем REKLAMA_* из .env)
const rtsVars = [
  'REKLAMA_MSSQL_SERVER',
  'REKLAMA_MSSQL_DATABASE', 
  'REKLAMA_MSSQL_USERNAME',
  'REKLAMA_MSSQL_PASSWORD',
  'REKLAMA_MSSQL_PORT'
];

// Переменные для PostgreSQL
const pgVars = [
  'PG_HOST',
  'PG_PORT',
  'PG_USER', 
  'PG_PASSWORD',
  'PG_DB_USERS',
  'PG_DB_FILTERED',
  'PG_DB_TAGGED'
];

console.log('📋 ОСНОВНЫЕ MSSQL ПЕРЕМЕННЫЕ:');
mssqlVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  console.log(`${status} ${varName}: ${value || 'НЕ УСТАНОВЛЕНО'}`);
});

console.log('\n🔑 КРЕДЫ ДЛЯ RTS_DECAUX_REKLAMA (REKLAMA_*):');
rtsVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = varName.includes('PASSWORD') ? '***' : value;
  console.log(`${status} ${varName}: ${displayValue || 'НЕ УСТАНОВЛЕНО'}`);
});

console.log('\n🐘 ПЕРЕМЕННЫЕ POSTGRESQL:');
pgVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = varName.includes('PASSWORD') ? '***' : value;
  console.log(`${status} ${varName}: ${displayValue || 'НЕ УСТАНОВЛЕНО'}`);
});

console.log('\n📊 СТАТИСТИКА:');
const totalVars = [...mssqlVars, ...rtsVars, ...pgVars];
const setVars = totalVars.filter(varName => process.env[varName]);
console.log(`Установлено: ${setVars.length}/${totalVars.length} переменных`);

console.log('\n🎯 РЕКОМЕНДАЦИИ:');
if (!process.env.REKLAMA_MSSQL_SERVER) {
  console.log('❌ Нужно установить REKLAMA_MSSQL_SERVER');
}
if (!process.env.REKLAMA_MSSQL_DATABASE) {
  console.log('❌ Нужно установить REKLAMA_MSSQL_DATABASE');
}
if (!process.env.REKLAMA_MSSQL_USERNAME) {
  console.log('❌ Нужно установить REKLAMA_MSSQL_USERNAME');
}
if (!process.env.REKLAMA_MSSQL_PASSWORD) {
  console.log('❌ Нужно установить REKLAMA_MSSQL_PASSWORD');
}

console.log('\n📝 Пример .env файла:');
console.log('REKLAMA_MSSQL_SERVER=172.22.0.42');
console.log('REKLAMA_MSSQL_DATABASE=rts_decaux_reklama');
console.log('REKLAMA_MSSQL_USERNAME=dbread');
console.log('REKLAMA_MSSQL_PASSWORD=159357-Db');
console.log('REKLAMA_MSSQL_PORT=1433');
