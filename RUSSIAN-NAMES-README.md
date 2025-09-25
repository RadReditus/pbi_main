# Система русских названий для MSSQL → PostgreSQL

## 🎯 Цель
Преобразовать технические названия таблиц и полей из базы данных 1С в понятные русские названия в PostgreSQL.

## 📋 Что преобразуется

### Таблицы
- `_Reference175` → `номенклатура` (Номенклатура)
- `_Reference176` → `контрагенты` (Контрагенты)
- `_Document224` → `поступление_товаров` (ПоступлениеТоваров)

### Поля
- `_IDRRef` → `идентификатор` (Идентификатор)
- `_Code` → `код` (Код)
- `_Description` → `наименование` (Наименование)
- `_Fld3405RRef` → `единица_измерения` (ЕдиницаИзмерения)

## 🔧 Компоненты системы

### 1. RussianNamesMapperService
Основной сервис для преобразования названий.

**Методы:**
- `getTableRussianName(technicalName)` - получить русское название таблицы
- `getFieldRussianName(fieldName)` - получить русское название поля
- `getPostgresTableName(technicalName)` - получить название для PostgreSQL
- `getPostgresFieldName(fieldName)` - получить название поля для PostgreSQL

### 2. Обновленный MSSQL сервис
- Создает таблицы с русскими названиями
- Добавляет комментарии к таблицам и полям
- Преобразует данные при вставке

### 3. Обновленный инкрементальный сервис
- Использует русские названия при синхронизации
- Преобразует поля в записях

### 4. API endpoints
- `GET /mssql/russian-names/translations` - все переводы
- `GET /mssql/russian-names/table-mapping?tableName=_Reference175` - маппинг таблицы
- `GET /mssql/russian-names/field-mapping?fieldName=_Code` - маппинг поля
- `POST /mssql/russian-names/add-table-translation` - добавить перевод таблицы
- `POST /mssql/russian-names/add-field-translation` - добавить перевод поля

## 📊 Примеры преобразования

### До преобразования (MSSQL)
```sql
-- Таблица
_Reference175

-- Поля
_IDRRef, _Code, _Description, _Fld3405RRef, _Fld3406RRef

-- Данные
{
  "_IDRRef": "0x1234567890ABCDEF",
  "_Code": "000000001", 
  "_Description": "Товар 1",
  "_Fld3405RRef": "0x9876543210FEDCBA"
}
```

### После преобразования (PostgreSQL)
```sql
-- Таблица с комментарием
CREATE TABLE "номенклатура" (
  "идентификатор" BYTEA NOT NULL,
  "код" NUMERIC NOT NULL,
  "наименование" VARCHAR NOT NULL,
  "единица_измерения" BYTEA,
  "группа_товаров" BYTEA
);

COMMENT ON TABLE "номенклатура" IS 'Номенклатура';
COMMENT ON COLUMN "номенклатура"."идентификатор" IS 'Идентификатор';
COMMENT ON COLUMN "номенклатура"."код" IS 'Код';
COMMENT ON COLUMN "номенклатура"."наименование" IS 'Наименование';
COMMENT ON COLUMN "номенклатура"."единица_измерения" IS 'ЕдиницаИзмерения';
COMMENT ON COLUMN "номенклатура"."группа_товаров" IS 'ГруппаТоваров';

-- Данные
{
  "идентификатор": "0x1234567890ABCDEF",
  "код": "000000001",
  "наименование": "Товар 1", 
  "единица_измерения": "0x9876543210FEDCBA"
}
```

## 🗂️ Словарь переводов

### Справочники
| Техническое название | Русское название | PostgreSQL название |
|---------------------|------------------|-------------------|
| _Reference175 | Номенклатура | номенклатура |
| _Reference176 | Контрагенты | контрагенты |
| _Reference177 | Склады | склады |
| _Reference178 | ЕдиницыИзмерения | единицы_измерения |
| _Reference179 | ГруппыТоваров | группы_товаров |

### Документы
| Техническое название | Русское название | PostgreSQL название |
|---------------------|------------------|-------------------|
| _Document224 | ПоступлениеТоваров | поступление_товаров |
| _Document225 | РеализацияТоваров | реализация_товаров |
| _Document226 | ПеремещениеТоваров | перемещение_товаров |

### Поля
| Техническое название | Русское название | PostgreSQL название |
|---------------------|------------------|-------------------|
| _IDRRef | Идентификатор | идентификатор |
| _Code | Код | код |
| _Description | Наименование | наименование |
| _Number | Номер | номер |
| _Date | Дата | дата |
| _Fld3405RRef | ЕдиницаИзмерения | единица_измерения |
| _Fld14168RRef | Контрагент | контрагент |
| _Fld14169 | Сумма | сумма |

## 🔄 Процесс преобразования

### 1. Создание таблицы
```typescript
// Получаем русские названия
const russianTableName = this.russianNamesMapper.getPostgresTableName(tableName);
const russianTableDisplayName = this.russianNamesMapper.getTableRussianName(tableName);

// Создаем таблицу с русскими названиями полей
const columnDefinitions = columns.map(col => {
  const russianFieldName = this.russianNamesMapper.getPostgresFieldName(col.COLUMN_NAME);
  const russianFieldDisplayName = this.russianNamesMapper.getFieldRussianName(col.COLUMN_NAME);
  
  return `"${russianFieldName}" ${pgType} ${nullable}`;
}).join(',\n  ');

// Добавляем комментарии
const tableCommentSql = `COMMENT ON TABLE "${russianTableName}" IS '${russianTableDisplayName}'`;
const fieldCommentSql = `COMMENT ON COLUMN "${russianTableName}"."${russianFieldName}" IS '${russianFieldDisplayName}'`;
```

### 2. Вставка данных
```typescript
// Преобразуем названия полей в записи
const russianRecord = {};
for (const [key, value] of Object.entries(record)) {
  const russianFieldName = this.russianNamesMapper.getPostgresFieldName(key);
  russianRecord[russianFieldName] = value;
}
```

## 🎨 Преимущества

### 1. Читаемость
- Понятные названия таблиц и полей
- Комментарии к таблицам и полям
- Логичная структура данных

### 2. Удобство работы
- Легко писать SQL запросы
- Понятно что содержит каждое поле
- Удобно для аналитики и отчетов

### 3. Совместимость
- Сохраняется связь с исходными данными
- Можно добавлять новые переводы
- Гибкая система маппинга

## 🚀 Использование

### 1. Автоматическое преобразование
Система автоматически преобразует все названия при:
- Создании таблиц
- Загрузке данных
- Инкрементальной синхронизации

### 2. Ручное управление
```typescript
// Добавить новый перевод таблицы
this.russianNamesMapper.addTableTranslation('_Reference180', 'Договоры');

// Добавить новый перевод поля
this.russianNamesMapper.addFieldTranslation('_Fld12345', 'НовоеПоле');

// Получить маппинг
const mapping = this.russianNamesMapper.getTableMapping('_Reference175');
// { technical: '_Reference175', russian: 'Номенклатура', postgres: 'номенклатура' }
```

### 3. API управление
```bash
# Получить все переводы
GET /mssql/russian-names/translations

# Получить маппинг таблицы
GET /mssql/russian-names/table-mapping?tableName=_Reference175

# Добавить перевод
POST /mssql/russian-names/add-table-translation?technicalName=_Reference180&russianName=Договоры
```

## 📝 Примечания

- Все названия в PostgreSQL приводятся к нижнему регистру
- Пробелы заменяются на подчеркивания
- Специальные символы удаляются
- Сохраняется связь с исходными техническими названиями
- Комментарии содержат оригинальные русские названия

## 🔧 Настройка

Система работает "из коробки" с предустановленными переводами. Для добавления новых переводов используйте API или методы сервиса.

## 📊 Результат

Теперь при работе с PostgreSQL базой вы увидите:
- `номенклатура` вместо `_Reference175`
- `контрагенты` вместо `_Reference176`
- `идентификатор` вместо `_IDRRef`
- `наименование` вместо `_Description`

И все это с понятными комментариями! 🎉
