// Быстрая проверка данных в PostgreSQL
const { Client } = require('pg');

const postgresConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: 'rts_decaux_reklama',
};

async function quickCheck() {
  const client = new Client(postgresConfig);
  
  try {
    console.log('🔌 Подключение к PostgreSQL...');
    await client.connect();
    console.log('✅ Подключено!');
    
    // 1. Список таблиц
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Найдено таблиц: ${tablesResult.rows.length}`);
    
    // 2. Проверяем первые 3 таблицы
    for (const table of tablesResult.rows.slice(0, 3)) {
      console.log(`\n🔍 Таблица: ${table.table_name}`);
      
      try {
        // Количество записей
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        const count = countResult.rows[0].count;
        console.log(`  📊 Записей: ${count}`);
        
        if (count > 0) {
          // Первая запись
          const dataResult = await client.query(`SELECT * FROM "${table.table_name}" LIMIT 1`);
          const firstRow = dataResult.rows[0];
          
          console.log(`  📝 Первая запись:`);
          Object.entries(firstRow).forEach(([key, value]) => {
            let status = '';
            if (typeof value === 'string') {
              if (/^0x[0-9A-Fa-f]{16}$/.test(value)) {
                status = '🔢 HEX ID';
              } else if (/[а-яё]/i.test(value)) {
                status = '✅ Кириллица';
              } else if (/[¡¿]|Yn6|ìç|b!!/.test(value)) {
                status = '❌ Каракули';
              } else {
                status = '📝 Текст';
              }
            } else {
              status = '📊 Данные';
            }
            
            console.log(`    ${key}: ${value} ${status}`);
          });
        }
      } catch (error) {
        console.log(`  ❌ Ошибка: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await client.end();
  }
}

console.log('🧪 Быстрая проверка PostgreSQL');
console.log('==============================');
quickCheck().catch(console.error);
