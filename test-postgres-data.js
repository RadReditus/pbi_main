// Тест данных в PostgreSQL после записи
const { Client } = require('pg');

// Конфигурация подключения к PostgreSQL
const postgresConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: 'rts_decaux_reklama', // Наша база данных
};

async function testPostgresData() {
  const client = new Client(postgresConfig);
  
  try {
    console.log('🔌 Подключение к PostgreSQL...');
    await client.connect();
    console.log('✅ Подключение успешно!');
    
    // 1. Получаем список всех таблиц
    console.log('\n📋 Список таблиц в базе данных:');
    console.log('================================');
    
    const tablesResult = await client.query(`
      SELECT table_name, table_comment
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`Найдено таблиц: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name} - ${table.table_comment || 'Без комментария'}`);
    });
    
    // 2. Проверяем структуру каждой таблицы
    console.log('\n🏗️ Структура таблиц:');
    console.log('=====================');
    
    for (const table of tablesResult.rows.slice(0, 5)) { // Проверяем первые 5 таблиц
      console.log(`\n📊 Таблица: ${table.table_name}`);
      console.log('-'.repeat(50));
      
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_comment
        FROM information_schema.columns 
        WHERE table_name = '${table.table_name}'
        ORDER BY ordinal_position
      `);
      
      columnsResult.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) - ${col.column_comment || 'Без комментария'}`);
      });
    }
    
    // 3. Проверяем данные в таблицах
    console.log('\n📊 Данные в таблицах:');
    console.log('=====================');
    
    for (const table of tablesResult.rows.slice(0, 3)) { // Проверяем первые 3 таблицы
      console.log(`\n🔍 Таблица: ${table.table_name}`);
      console.log('-'.repeat(50));
      
      try {
        // Получаем количество записей
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        const recordCount = countResult.rows[0].count;
        console.log(`  Всего записей: ${recordCount}`);
        
        if (recordCount > 0) {
          // Получаем первые 3 записи
          const dataResult = await client.query(`SELECT * FROM "${table.table_name}" LIMIT 3`);
          
          console.log('  Первые записи:');
          dataResult.rows.forEach((row, index) => {
            console.log(`    Запись ${index + 1}:`);
            Object.entries(row).forEach(([key, value]) => {
              // Проверяем, содержит ли значение hex ID или кириллицу
              const isHexId = /^0x[0-9A-Fa-f]{16}$/.test(value);
              const hasCyrillic = /[а-яё]/i.test(value);
              const isGarbled = /[¡¿]|Yn6|ìç|b!!/.test(value);
              
              let status = '';
              if (isHexId) status = '🔢 HEX ID';
              else if (hasCyrillic) status = '✅ Кириллица';
              else if (isGarbled) status = '❌ Каракули';
              else status = '📝 Обычный текст';
              
              console.log(`      ${key}: ${value} ${status}`);
            });
          });
        }
      } catch (error) {
        console.log(`  ❌ Ошибка при чтении данных: ${error.message}`);
      }
    }
    
    // 4. Поиск hex ID в данных
    console.log('\n🔍 Поиск hex ID в данных:');
    console.log('=========================');
    
    const hexIdPattern = /0x[0-9A-Fa-f]{16}/;
    let totalHexIds = 0;
    let translatedHexIds = 0;
    
    for (const table of tablesResult.rows.slice(0, 5)) {
      try {
        const dataResult = await client.query(`SELECT * FROM "${table.table_name}" LIMIT 100`);
        
        dataResult.rows.forEach(row => {
          Object.values(row).forEach(value => {
            if (typeof value === 'string' && hexIdPattern.test(value)) {
              totalHexIds++;
              console.log(`  Найден hex ID: ${value} в таблице ${table.table_name}`);
              
              // Проверяем, переведен ли он
              if (/[а-яё]/i.test(value)) {
                translatedHexIds++;
                console.log(`    ✅ Переведен в: ${value}`);
              } else {
                console.log(`    ❌ Не переведен`);
              }
            }
          });
        });
      } catch (error) {
        // Игнорируем ошибки чтения
      }
    }
    
    console.log(`\n📊 Статистика hex ID:`);
    console.log(`  Всего найдено: ${totalHexIds}`);
    console.log(`  Переведено: ${translatedHexIds}`);
    console.log(`  Не переведено: ${totalHexIds - translatedHexIds}`);
    
    // 5. Поиск каракулей кириллицы
    console.log('\n🔍 Поиск каракулей кириллицы:');
    console.log('=============================');
    
    const garbledPattern = /[¡¿]|Yn6|ìç|b!!/;
    let totalGarbled = 0;
    let fixedGarbled = 0;
    
    for (const table of tablesResult.rows.slice(0, 5)) {
      try {
        const dataResult = await client.query(`SELECT * FROM "${table.table_name}" LIMIT 100`);
        
        dataResult.rows.forEach(row => {
          Object.values(row).forEach(value => {
            if (typeof value === 'string' && garbledPattern.test(value)) {
              totalGarbled++;
              console.log(`  Найдены каракули: ${value} в таблице ${table.table_name}`);
              
              // Проверяем, исправлены ли они
              if (/[а-яё]/i.test(value) && !garbledPattern.test(value)) {
                fixedGarbled++;
                console.log(`    ✅ Исправлены в: ${value}`);
              } else {
                console.log(`    ❌ Не исправлены`);
              }
            }
          });
        });
      } catch (error) {
        // Игнорируем ошибки чтения
      }
    }
    
    console.log(`\n📊 Статистика каракулей:`);
    console.log(`  Всего найдено: ${totalGarbled}`);
    console.log(`  Исправлено: ${fixedGarbled}`);
    console.log(`  Не исправлено: ${totalGarbled - fixedGarbled}`);
    
    // 6. Общая статистика
    console.log('\n📈 Общая статистика базы данных:');
    console.log('=================================');
    
    const totalTables = tablesResult.rows.length;
    let totalRecords = 0;
    
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        totalRecords += parseInt(countResult.rows[0].count);
      } catch (error) {
        // Игнорируем ошибки
      }
    }
    
    console.log(`  Всего таблиц: ${totalTables}`);
    console.log(`  Всего записей: ${totalRecords}`);
    console.log(`  Среднее записей на таблицу: ${Math.round(totalRecords / totalTables)}`);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании PostgreSQL:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Соединение с PostgreSQL закрыто');
  }
}

// Запуск теста
console.log('🧪 Тестирование данных в PostgreSQL');
console.log('=====================================');
testPostgresData().catch(console.error);
