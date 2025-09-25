// Запуск всех тестов PostgreSQL
const { exec } = require('child_process');
const path = require('path');

const tests = [
  {
    name: 'Быстрая проверка',
    file: 'quick-postgres-check.js',
    description: 'Быстрая проверка структуры и данных'
  },
  {
    name: 'Полный анализ данных',
    file: 'test-postgres-data.js',
    description: 'Полный анализ всех таблиц и данных'
  },
  {
    name: 'Проверка конкретных таблиц',
    file: 'test-specific-tables.js',
    description: 'Анализ целевых таблиц с hex ID'
  },
  {
    name: 'Проверка переводов',
    file: 'test-translation-verification.js',
    description: 'Верификация качества переводов'
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Запуск теста: ${test.name}`);
    console.log(`📝 Описание: ${test.description}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    exec(`node ${test.file}`, (error, stdout, stderr) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (error) {
        console.log(`❌ Тест завершился с ошибкой: ${error.message}`);
        console.log(`⏱️  Время выполнения: ${duration}ms`);
        resolve({ success: false, error: error.message, duration });
        return;
      }
      
      console.log(stdout);
      if (stderr) {
        console.log('⚠️  Предупреждения:');
        console.log(stderr);
      }
      
      console.log(`✅ Тест завершен успешно`);
      console.log(`⏱️  Время выполнения: ${duration}ms`);
      resolve({ success: true, duration });
    });
  });
}

async function runAllTests() {
  console.log('🚀 Запуск всех тестов PostgreSQL');
  console.log('================================');
  console.log(`📅 Время запуска: ${new Date().toLocaleString()}`);
  
  const results = [];
  const startTime = Date.now();
  
  for (const test of tests) {
    try {
      const result = await runTest(test);
      results.push({ ...test, ...result });
    } catch (error) {
      console.log(`❌ Критическая ошибка в тесте ${test.name}: ${error.message}`);
      results.push({ ...test, success: false, error: error.message, duration: 0 });
    }
  }
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  // Сводка результатов
  console.log('\n📊 Сводка результатов тестирования');
  console.log('===================================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Успешных тестов: ${successful}`);
  console.log(`❌ Неудачных тестов: ${failed}`);
  console.log(`⏱️  Общее время: ${totalDuration}ms`);
  
  console.log('\n📋 Детали по тестам:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`${index + 1}. ${status} ${result.name} (${duration})`);
    if (result.error) {
      console.log(`   Ошибка: ${result.error}`);
    }
  });
  
  // Рекомендации
  console.log('\n💡 Рекомендации:');
  if (failed === 0) {
    console.log('🎉 Все тесты прошли успешно! Качество данных отличное.');
  } else if (failed <= 2) {
    console.log('⚠️  Некоторые тесты не прошли. Проверьте логи и исправьте проблемы.');
  } else {
    console.log('❌ Много тестов не прошло. Требуется серьезная доработка системы.');
  }
  
  console.log('\n🔧 Для исправления проблем:');
  console.log('1. Проверьте подключение к PostgreSQL');
  console.log('2. Убедитесь, что база данных создана и заполнена');
  console.log('3. Проверьте настройки кодировки');
  console.log('4. Обновите словари переводов');
  
  console.log(`\n📅 Время завершения: ${new Date().toLocaleString()}`);
}

// Запуск всех тестов
runAllTests().catch(console.error);
