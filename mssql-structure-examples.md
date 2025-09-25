# Примеры структуры данных MSSQL базы 1С

## Ожидаемые результаты анализа

### 1. Системные таблицы метаданных

В базе 1С должны быть таблицы, содержащие метаданные:

```sql
-- Таблица метаданных объектов
dbo._Metadata
  _ID (binary) - ID объекта
  _Name (nvarchar) - Название объекта
  _Type (int) - Тип объекта (справочник, документ, регистр)
  _Description (nvarchar) - Описание объекта

-- Таблица метаданных полей
dbo._FieldMetadata
  _ID (binary) - ID поля
  _ObjectID (binary) - ID объекта-владельца
  _Name (nvarchar) - Название поля
  _Type (int) - Тип поля
  _Description (nvarchar) - Описание поля
```

### 2. Примеры данных справочников

```sql
-- Справочник "Номенклатура" (_Reference175)
_IDRRef: 0x1234567890ABCDEF
_Code: "000000001"
_Description: "Товар 1"
_Fld3404: [данные о товаре]
_Fld3405RRef: 0x9876543210FEDCBA -- ссылка на единицу измерения
_Fld3406RRef: 0x1111111111111111 -- ссылка на группу товаров

-- Справочник "Контрагенты" (_Reference176)
_IDRRef: 0x2222222222222222
_Code: "000000001"
_Description: "ООО Ромашка"
_Fld3415RRef: 0x3333333333333333 -- ссылка на тип контрагента
_Fld3420: "1234567890" -- ИНН
_Fld3421: "123456789" -- КПП
```

### 3. Примеры данных документов

```sql
-- Документ "Поступление товаров" (_Document224)
_IDRRef: 0x4444444444444444
_Number: "000000001"
_Date: 2024-01-15
_Fld14168RRef: 0x2222222222222222 -- ссылка на контрагента
_Fld14169: 1000.00 -- сумма документа
_Fld14170RRef: 0x5555555555555555 -- ссылка на склад
```

### 4. Связи между объектами

```sql
-- Таблица связей полей с объектами
dbo._FieldObjectLinks
  _FieldID (binary) -- ID поля
  _ObjectID (binary) -- ID объекта
  _FieldName (nvarchar) -- Название поля
  _ObjectName (nvarchar) -- Название объекта

-- Примеры связей:
-- _Fld3405RRef -> Справочник "ЕдиницыИзмерения"
-- _Fld14168RRef -> Справочник "Контрагенты"
-- _Fld14170RRef -> Справочник "Склады"
```

## Алгоритм преобразования данных

### 1. Получение метаданных
```javascript
// Получить все таблицы метаданных
const metadataTables = await getMetadataTables();

// Получить маппинг полей
const fieldMapping = await getFieldMapping();

// Получить маппинг объектов
const objectMapping = await getObjectMapping();
```

### 2. Преобразование полей
```javascript
// Преобразование _Fld* в читаемые названия
function convertFieldName(fieldName, objectType) {
    const fieldId = extractFieldId(fieldName); // извлекаем ID из _Fld12345
    const fieldInfo = fieldMapping[fieldId];
    return fieldInfo ? fieldInfo.name : fieldName;
}

// Примеры:
// _Fld3405RRef -> "ЕдиницаИзмерения"
// _Fld14168RRef -> "Контрагент"
// _Fld14169 -> "Сумма"
```

### 3. Преобразование ссылок
```javascript
// Преобразование ссылок в читаемые значения
function convertReference(refValue, fieldName) {
    if (!refValue || !Buffer.isBuffer(refValue)) return refValue;
    
    const objectType = getObjectTypeByField(fieldName);
    const objectInfo = objectMapping[refValue.toString('hex')];
    return objectInfo ? objectInfo.description : refValue.toString('hex');
}

// Примеры:
// 0x2222222222222222 -> "ООО Ромашка"
// 0x5555555555555555 -> "Основной склад"
```

### 4. Создание читаемых записей
```javascript
// Преобразование записи в читаемый вид
function convertRecordToReadable(record, objectType) {
    const readableRecord = {};
    
    for (const [fieldName, value] of Object.entries(record)) {
        const readableFieldName = convertFieldName(fieldName, objectType);
        const readableValue = convertReference(value, fieldName);
        readableRecord[readableFieldName] = readableValue;
    }
    
    return readableRecord;
}
```

## Результат преобразования

### До преобразования:
```json
{
    "_IDRRef": "0x1234567890ABCDEF",
    "_Code": "000000001",
    "_Description": "Товар 1",
    "_Fld3405RRef": "0x9876543210FEDCBA",
    "_Fld3406RRef": "0x1111111111111111"
}
```

### После преобразования:
```json
{
    "ID": "0x1234567890ABCDEF",
    "Код": "000000001",
    "Наименование": "Товар 1",
    "ЕдиницаИзмерения": "шт",
    "ГруппаТоваров": "Основные товары"
}
```

## Следующие шаги

1. **Подключиться к реальной MSSQL базе** и выполнить анализ
2. **Найти таблицы метаданных** в конкретной базе
3. **Создать маппинг** полей и объектов
4. **Интегрировать** в MSSQL сервис
5. **Добавить кэширование** для производительности
6. **Создать API** для получения читаемых данных
