// Проверка подключения к PostgreSQL
const { Client } = require('pg');

const postgresConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: 'rts_decaux_reklama',
};

async function checkConnection() {
  const client = new Client(postgresConfig);
  
  try {
    console.log('🔌 Проверка подключения к PostgreSQL...');
    console.log(`📡 Хост: ${postgresConfig.host}:${postgresConfig.port}`);
    console.log(`🗄️  База данных: ${postgresConfig.database}`);
    console.log(`👤 Пользователь: ${postgresConfig.user}`);
    
    const startTime = Date.now();
    await client.connect();
    const endTime = Date.now();
    
    console.log(`✅ Подключение успешно! (${endTime - startTime}ms)`);
    
    // Проверяем версию PostgreSQL
    const versionResult = await client.query('SELECT version()');
    console.log(`📊 Версия PostgreSQL: ${versionResult.rows[0].version.split(' ')[0]}`);
    
    // Проверяем доступные базы данных
    const dbResult = await client.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY datname
    `);
    
    console.log(`🗄️  Доступные базы данных: ${dbResult.rows.map(r => r.datname).join(', ')}`);
    
    // Проверяем таблицы в нашей базе
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📋 Таблиц в базе ${postgresConfig.database}: ${tablesResult.rows.length}`);
    
    if (tablesResult.rows.length > 0) {
      console.log(`📝 Таблицы: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);
      
      // Проверяем первую таблицу
      const firstTable = tablesResult.rows[0].table_name;
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${firstTable}"`);
      const count = countResult.rows[0].count;
      console.log(`📊 Записей в ${firstTable}: ${count}`);
    }
    
    console.log('\n🎉 Все проверки пройдены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:');
    console.error(`   Сообщение: ${error.message}`);
    console.error(`   Код: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Возможно, PostgreSQL не запущен или недоступен');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   💡 Проверьте правильность хоста');
    } else if (error.code === '28P01') {
      console.error('   💡 Проверьте правильность логина и пароля');
    } else if (error.code === '3D000') {
      console.error('   💡 База данных не существует');
    }
    
    console.error('\n🔧 Рекомендации:');
    console.error('1. Убедитесь, что PostgreSQL запущен');
    console.error('2. Проверьте настройки подключения');
    console.error('3. Создайте базу данных rts_decaux_reklama');
    console.error('4. Проверьте права доступа пользователя');
    
  } finally {
    await client.end();
    console.log('\n🔌 Соединение закрыто');
  }
}

console.log('🧪 Проверка подключения к PostgreSQL');
console.log('=====================================');
checkConnection().catch(console.error);
