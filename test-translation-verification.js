// Тест проверки переводов в реальном времени
const { Client } = require('pg');

// Конфигурация подключения к PostgreSQL
const postgresConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: 'rts_decaux_reklama',
};

// Известные hex ID и их ожидаемые переводы
const expectedTranslations = {
  '0x0000021398EDF280': 'Регистратор',
  '0x0000021398EDF281': 'Контрагент',
  '0x0000021398EDF282': 'Склад',
  '0x0000021398EDF283': 'Номенклатура',
  '0x0000021398EDF284': 'Договор',
  '0x0000021398EDF285': 'Организация',
  '0x0000021398EDF286': 'ЕдиницаИзмерения',
  '0x0000021398EDF287': 'ГруппаТоваров',
  '0x0000021398EDF288': 'Ответственный',
  '0x0000021398EDF289': 'Подразделение',
  '0x0000021398EDF28A': 'ВидОперации',
};

// Известные каракули и их ожидаемые исправления
const expectedGarbledFixes = {
  '¡Yn6 ìç b!!': 'Регистратор',
  'ìç b!!': 'Регистратор',
  'Yn6 ìç': 'Регистратор',
  'b!!': 'Регистратор',
};

async function testTranslationVerification() {
  const client = new Client(postgresConfig);
  
  try {
    console.log('🔌 Подключение к PostgreSQL...');
    await client.connect();
    console.log('✅ Подключение успешно!');
    
    // 1. Проверяем переводы hex ID
    console.log('\n🔍 Проверка переводов hex ID:');
    console.log('=============================');
    
    let totalHexIds = 0;
    let translatedHexIds = 0;
    let untranslatedHexIds = 0;
    
    for (const [hexId, expectedTranslation] of Object.entries(expectedTranslations)) {
      console.log(`\n🔍 Поиск hex ID: ${hexId}`);
      
      try {
        // Ищем этот hex ID во всех таблицах
        const searchResult = await client.query(`
          SELECT 
            table_name,
            column_name,
            value,
            COUNT(*) as count
          FROM (
            SELECT 
              'table1' as table_name,
              'column1' as column_name,
              'value1' as value
            FROM information_schema.tables 
            WHERE table_schema = 'public'
          ) t
          WHERE value LIKE '%${hexId}%'
          GROUP BY table_name, column_name, value
        `);
        
        // Альтернативный поиск через динамический SQL
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `);
        
        let foundInTables = [];
        
        for (const table of tablesResult.rows) {
          try {
            // Проверяем каждую таблицу на наличие hex ID
            const dataResult = await client.query(`
              SELECT * FROM "${table.table_name}" 
              WHERE EXISTS (
                SELECT 1 FROM (
                  SELECT * FROM "${table.table_name}" LIMIT 100
                ) t
                WHERE t::text LIKE '%${hexId}%'
              )
              LIMIT 5
            `);
            
            if (dataResult.rows.length > 0) {
              foundInTables.push(table.table_name);
              
              // Анализируем найденные данные
              dataResult.rows.forEach(row => {
                Object.entries(row).forEach(([key, value]) => {
                  if (typeof value === 'string' && value.includes(hexId)) {
                    totalHexIds++;
                    
                    if (value === expectedTranslation) {
                      translatedHexIds++;
                      console.log(`  ✅ Найден переведенный: ${value} в ${table.table_name}.${key}`);
                    } else if (value.includes(hexId)) {
                      untranslatedHexIds++;
                      console.log(`  ❌ Найден непереведенный: ${value} в ${table.table_name}.${key}`);
                    }
                  }
                });
              });
            }
          } catch (error) {
            // Игнорируем ошибки поиска в конкретной таблице
          }
        }
        
        if (foundInTables.length > 0) {
          console.log(`  📊 Найден в таблицах: ${foundInTables.join(', ')}`);
        } else {
          console.log(`  📭 Не найден в данных`);
        }
        
      } catch (error) {
        console.log(`  ❌ Ошибка при поиске: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Статистика hex ID:`);
    console.log(`  Всего найдено: ${totalHexIds}`);
    console.log(`  Переведено: ${translatedHexIds}`);
    console.log(`  Не переведено: ${untranslatedHexIds}`);
    console.log(`  Процент перевода: ${totalHexIds > 0 ? Math.round(translatedHexIds / totalHexIds * 100) : 0}%`);
    
    // 2. Проверяем исправления каракулей
    console.log('\n🔍 Проверка исправлений каракулей:');
    console.log('===================================');
    
    let totalGarbled = 0;
    let fixedGarbled = 0;
    let unfixedGarbled = 0;
    
    for (const [garbled, expectedFix] of Object.entries(expectedGarbledFixes)) {
      console.log(`\n🔍 Поиск каракулей: ${garbled}`);
      
      try {
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `);
        
        let foundInTables = [];
        
        for (const table of tablesResult.rows) {
          try {
            const dataResult = await client.query(`
              SELECT * FROM "${table.table_name}" 
              WHERE EXISTS (
                SELECT 1 FROM (
                  SELECT * FROM "${table.table_name}" LIMIT 100
                ) t
                WHERE t::text LIKE '%${garbled}%'
              )
              LIMIT 5
            `);
            
            if (dataResult.rows.length > 0) {
              foundInTables.push(table.table_name);
              
              dataResult.rows.forEach(row => {
                Object.entries(row).forEach(([key, value]) => {
                  if (typeof value === 'string' && value.includes(garbled)) {
                    totalGarbled++;
                    
                    if (value === expectedFix) {
                      fixedGarbled++;
                      console.log(`  ✅ Найден исправленный: ${value} в ${table.table_name}.${key}`);
                    } else if (value.includes(garbled)) {
                      unfixedGarbled++;
                      console.log(`  ❌ Найден неисправленный: ${value} в ${table.table_name}.${key}`);
                    }
                  }
                });
              });
            }
          } catch (error) {
            // Игнорируем ошибки поиска
          }
        }
        
        if (foundInTables.length > 0) {
          console.log(`  📊 Найден в таблицах: ${foundInTables.join(', ')}`);
        } else {
          console.log(`  📭 Не найден в данных`);
        }
        
      } catch (error) {
        console.log(`  ❌ Ошибка при поиске: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Статистика каракулей:`);
    console.log(`  Всего найдено: ${totalGarbled}`);
    console.log(`  Исправлено: ${fixedGarbled}`);
    console.log(`  Не исправлено: ${unfixedGarbled}`);
    console.log(`  Процент исправления: ${totalGarbled > 0 ? Math.round(fixedGarbled / totalGarbled * 100) : 0}%`);
    
    // 3. Общая оценка качества переводов
    console.log('\n📈 Общая оценка качества переводов:');
    console.log('===================================');
    
    const totalIssues = totalHexIds + totalGarbled;
    const totalFixed = translatedHexIds + fixedGarbled;
    const qualityScore = totalIssues > 0 ? Math.round(totalFixed / totalIssues * 100) : 100;
    
    console.log(`  Общее количество проблем: ${totalIssues}`);
    console.log(`  Исправлено: ${totalFixed}`);
    console.log(`  Оценка качества: ${qualityScore}%`);
    
    if (qualityScore >= 90) {
      console.log(`  🎉 Отличное качество переводов!`);
    } else if (qualityScore >= 70) {
      console.log(`  ✅ Хорошее качество переводов`);
    } else if (qualityScore >= 50) {
      console.log(`  ⚠️  Удовлетворительное качество переводов`);
    } else {
      console.log(`  ❌ Низкое качество переводов, требуется доработка`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Соединение с PostgreSQL закрыто');
  }
}

// Запуск теста
console.log('🧪 Тестирование проверки переводов в PostgreSQL');
console.log('================================================');
testTranslationVerification().catch(console.error);
