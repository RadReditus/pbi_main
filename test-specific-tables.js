// Тест конкретных таблиц с hex ID и кириллицей
const { Client } = require('pg');

// Конфигурация подключения к PostgreSQL
const postgresConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: 'rts_decaux_reklama',
};

// Таблицы, которые могут содержать hex ID
const targetTables = [
  'остатки_товаров', // _AccumRg10332
  'товары_на_складах', // _AccumRg10180
  'движения_товаров', // _AccumRg10347
  'продажи_товаров', // _AccumRg10367
  'закупки_товаров', // _AccumRg10467
  'цены_товаров', // _InfoRg7798
  'характеристики_товаров', // _InfoRg7821
  'свойства_товаров', // _InfoRg7825
];

async function testSpecificTables() {
  const client = new Client(postgresConfig);
  
  try {
    console.log('🔌 Подключение к PostgreSQL...');
    await client.connect();
    console.log('✅ Подключение успешно!');
    
    // Проверяем каждую целевую таблицу
    for (const tableName of targetTables) {
      console.log(`\n🔍 Проверка таблицы: ${tableName}`);
      console.log('='.repeat(60));
      
      try {
        // Проверяем существование таблицы
        const existsResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          )
        `);
        
        if (!existsResult.rows[0].exists) {
          console.log(`❌ Таблица ${tableName} не существует`);
          continue;
        }
        
        console.log(`✅ Таблица ${tableName} существует`);
        
        // Получаем структуру таблицы
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_comment
          FROM information_schema.columns 
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `);
        
        console.log(`📊 Структура (${columnsResult.rows.length} колонок):`);
        columnsResult.rows.forEach(col => {
          console.log(`  ${col.column_name} (${col.data_type}) - ${col.column_comment || 'Без комментария'}`);
        });
        
        // Получаем количество записей
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const recordCount = countResult.rows[0].count;
        console.log(`📈 Всего записей: ${recordCount}`);
        
        if (recordCount > 0) {
          // Анализируем данные
          await analyzeTableData(client, tableName, columnsResult.rows);
        }
        
      } catch (error) {
        console.log(`❌ Ошибка при проверке таблицы ${tableName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Соединение с PostgreSQL закрыто');
  }
}

async function analyzeTableData(client, tableName, columns) {
  console.log(`\n🔍 Анализ данных в таблице ${tableName}:`);
  console.log('-'.repeat(50));
  
  try {
    // Получаем первые 10 записей для анализа
    const dataResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 10`);
    
    if (dataResult.rows.length === 0) {
      console.log('  📭 Таблица пуста');
      return;
    }
    
    // Анализируем каждую колонку
    const columnAnalysis = {};
    
    columns.forEach(col => {
      columnAnalysis[col.column_name] = {
        totalValues: 0,
        hexIds: 0,
        cyrillic: 0,
        garbled: 0,
        examples: []
      };
    });
    
    // Анализируем данные
    dataResult.rows.forEach((row, rowIndex) => {
      Object.entries(row).forEach(([columnName, value]) => {
        if (value === null || value === undefined) return;
        
        const analysis = columnAnalysis[columnName];
        if (!analysis) return;
        
        analysis.totalValues++;
        
        if (typeof value === 'string') {
          // Проверяем hex ID
          if (/^0x[0-9A-Fa-f]{16}$/.test(value)) {
            analysis.hexIds++;
            if (analysis.examples.length < 3) {
              analysis.examples.push(value);
            }
          }
          
          // Проверяем кириллицу
          if (/[а-яё]/i.test(value)) {
            analysis.cyrillic++;
          }
          
          // Проверяем каракули
          if (/[¡¿]|Yn6|ìç|b!!/.test(value)) {
            analysis.garbled++;
            if (analysis.examples.length < 3) {
              analysis.examples.push(value);
            }
          }
        }
      });
    });
    
    // Выводим результаты анализа
    Object.entries(columnAnalysis).forEach(([columnName, analysis]) => {
      if (analysis.totalValues === 0) return;
      
      console.log(`\n  📊 Колонка: ${columnName}`);
      console.log(`    Всего значений: ${analysis.totalValues}`);
      
      if (analysis.hexIds > 0) {
        console.log(`    🔢 Hex ID: ${analysis.hexIds} (${Math.round(analysis.hexIds / analysis.totalValues * 100)}%)`);
        console.log(`    Примеры: ${analysis.examples.join(', ')}`);
      }
      
      if (analysis.cyrillic > 0) {
        console.log(`    ✅ Кириллица: ${analysis.cyrillic} (${Math.round(analysis.cyrillic / analysis.totalValues * 100)}%)`);
      }
      
      if (analysis.garbled > 0) {
        console.log(`    ❌ Каракули: ${analysis.garbled} (${Math.round(analysis.garbled / analysis.totalValues * 100)}%)`);
        console.log(`    Примеры: ${analysis.examples.join(', ')}`);
      }
    });
    
    // Показываем примеры записей
    console.log(`\n📋 Примеры записей:`);
    dataResult.rows.slice(0, 3).forEach((row, index) => {
      console.log(`\n  Запись ${index + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        let status = '';
        if (typeof value === 'string') {
          if (/^0x[0-9A-Fa-f]{16}$/.test(value)) {
            status = '🔢 HEX ID';
          } else if (/[а-яё]/i.test(value)) {
            status = '✅ Кириллица';
          } else if (/[¡¿]|Yn6|ìç|b!!/.test(value)) {
            status = '❌ Каракули';
          } else {
            status = '📝 Обычный текст';
          }
        } else {
          status = '📊 Данные';
        }
        
        console.log(`    ${key}: ${value} ${status}`);
      });
    });
    
  } catch (error) {
    console.log(`  ❌ Ошибка при анализе данных: ${error.message}`);
  }
}

// Запуск теста
console.log('🧪 Тестирование конкретных таблиц PostgreSQL');
console.log('=============================================');
testSpecificTables().catch(console.error);
