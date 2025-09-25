// Пример использования системы русских названий
const { RussianNamesMapperService } = require('./src/mssql/russian-names-mapper.service');

// Создаем экземпляр сервиса
const mapper = new RussianNamesMapperService();

console.log('🎯 Примеры преобразования названий\n');

// Примеры таблиц
console.log('📋 ТАБЛИЦЫ:');
const tables = ['_Reference175', '_Reference176', '_Document224', '_AccumRg10180'];
tables.forEach(table => {
  const mapping = mapper.getTableMapping(table);
  console.log(`${mapping.technical} → ${mapping.russian} (${mapping.postgres})`);
});

console.log('\n🔧 ПОЛЯ:');
const fields = ['_IDRRef', '_Code', '_Description', '_Fld3405RRef', '_Fld14168RRef'];
fields.forEach(field => {
  const mapping = mapper.getFieldMapping(field);
  console.log(`${mapping.technical} → ${mapping.russian} (${mapping.postgres})`);
});

console.log('\n📊 ПРИМЕР ЗАПИСИ:');
const exampleRecord = {
  '_IDRRef': '0x1234567890ABCDEF',
  '_Code': '000000001',
  '_Description': 'Товар 1',
  '_Fld3405RRef': '0x9876543210FEDCBA',
  '_Fld3406RRef': '0x1111111111111111'
};

console.log('До преобразования:');
console.log(JSON.stringify(exampleRecord, null, 2));

console.log('\nПосле преобразования:');
const convertedRecord = {};
for (const [key, value] of Object.entries(exampleRecord)) {
  const russianFieldName = mapper.getPostgresFieldName(key);
  convertedRecord[russianFieldName] = value;
}
console.log(JSON.stringify(convertedRecord, null, 2));

console.log('\n🗂️ SQL ЗАПРОС:');
console.log('-- Создание таблицы');
console.log('CREATE TABLE "номенклатура" (');
console.log('  "идентификатор" BYTEA NOT NULL,');
console.log('  "код" NUMERIC NOT NULL,');
console.log('  "наименование" VARCHAR NOT NULL,');
console.log('  "единица_измерения" BYTEA,');
console.log('  "группа_товаров" BYTEA');
console.log(');');
console.log('');
console.log('-- Комментарии');
console.log('COMMENT ON TABLE "номенклатура" IS \'Номенклатура\';');
console.log('COMMENT ON COLUMN "номенклатура"."идентификатор" IS \'Идентификатор\';');
console.log('COMMENT ON COLUMN "номенклатура"."код" IS \'Код\';');
console.log('COMMENT ON COLUMN "номенклатура"."наименование" IS \'Наименование\';');

console.log('\n✅ Система русских названий готова к использованию!');
