// Тест перевода шестнадцатеричных идентификаторов
const { RussianNamesMapperService } = require('./dist/mssql/russian-names-mapper.service');

// Создаем экземпляр сервиса для тестирования
const mapper = new RussianNamesMapperService();

// Тестовые данные с hex ID
const testData = [
  '0x0000021398EDF280',
  '0x0000021398EDF281',
  '0x0000021398EDF282',
  '0x0000021398EDF283',
  '0x0000021398EDF284',
  '0x0000021398EDF285',
  '0x0000021398EDF286',
  '0x0000021398EDF287',
  '0x0000021398EDF288',
  '0x0000021398EDF289',
  '0x0000021398EDF28A',
  '0x0000021398EDF28B', // Неизвестный ID
  '0000021398EDF280', // Без префикса 0x
  'Нормальный текст',
  'Смешанный 0x0000021398EDF280 текст',
  '123 номе',
  '01 16 регистратор'
];

console.log('🔍 Тестирование перевода hex ID:');
console.log('=====================================');

testData.forEach((text, index) => {
  console.log(`\n${index + 1}. Исходный текст: "${text}"`);
  
  try {
    // Переводим hex ID
    const translated = mapper.translateDataHexIds(text);
    console.log(`   Переведенный: "${translated}"`);
    
    if (text !== translated) {
      console.log('   ✅ Hex ID переведен');
    } else {
      console.log('   ℹ️  Изменений не требуется');
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
  }
});

// Тестируем сложные объекты
console.log('\n\n🧪 Тестирование сложных объектов:');
console.log('=====================================');

const complexData = {
  id: '0x0000021398EDF280',
  name: 'Тест',
  items: [
    { id: '0x0000021398EDF281', value: 'Значение 1' },
    { id: '0x0000021398EDF282', value: 'Значение 2' }
  ],
  metadata: {
    createdBy: '0x0000021398EDF283',
    updatedBy: '0x0000021398EDF284'
  }
};

console.log('Исходный объект:');
console.log(JSON.stringify(complexData, null, 2));

const translatedComplex = mapper.translateDataHexIds(complexData);
console.log('\nПереведенный объект:');
console.log(JSON.stringify(translatedComplex, null, 2));

// Статистика
console.log('\n📊 Статистика переводов:');
console.log('========================');
const stats = mapper.getHexIdTranslationStats();
console.log(`Всего hex ID: ${stats.total}`);
console.log(`Переведено: ${stats.translated}`);
console.log(`Не переведено: ${stats.untranslated}`);

console.log('\n🎯 Тест завершен!');
