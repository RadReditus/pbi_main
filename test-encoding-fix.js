// Тест исправления кодировки кириллических данных
const { CompareService } = require('./dist/compare/compare.service');

// Создаем экземпляр сервиса для тестирования
const compareService = new CompareService();

// Тестовые данные с каракулями
const testData = [
  '¡Yn6 ìç b!!',
  'ìç b!!',
  'Yn6 ìç',
  'b!!',
  'Нормальный текст',
  'Смешанный ¡Yn6 ìç b!! текст',
  '123 номе',
  '01 16 регистратор'
];

console.log('🔍 Тестирование исправления кодировки:');
console.log('=====================================');

testData.forEach((text, index) => {
  console.log(`\n${index + 1}. Исходный текст: "${text}"`);
  
  try {
    // Используем приватный метод через рефлексию
    const fixed = compareService.fixCyrillicEncoding(text);
    console.log(`   Исправленный: "${fixed}"`);
    
    if (text !== fixed) {
      console.log('   ✅ Кодировка исправлена');
    } else {
      console.log('   ℹ️  Изменений не требуется');
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }
});

console.log('\n🎯 Тест завершен!');
