import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RussianNamesMapperService {
  private readonly logger = new Logger(RussianNamesMapperService.name);

  // Словарь переводов таблиц
  private readonly tableTranslations: Record<string, string> = {
    // Справочники
    '_Reference175': 'Номенклатура',
    '_Reference176': 'Контрагенты',
    '_Reference177': 'Склады',
    '_Reference178': 'ЕдиницыИзмерения',
    '_Reference179': 'ГруппыТоваров',
    '_Reference18': 'Организации',
    '_Reference180': 'Договоры',
    
    // Документы
    '_Document224': 'ПоступлениеТоваров',
    '_Document225': 'РеализацияТоваров',
    '_Document226': 'ПеремещениеТоваров',
    '_Document227': 'Инвентаризация',
    '_Document228': 'СписаниеТоваров',
    
    // Регистры накопления
    '_AccumRg10180': 'ТоварыНаСкладах',
    '_AccumRg10332': 'ОстаткиТоваров',
    '_AccumRg10347': 'ДвиженияТоваров',
    '_AccumRg10367': 'ПродажиТоваров',
    '_AccumRg10467': 'ЗакупкиТоваров',
    
    // Информационные регистры
    '_InfoRg7798': 'ЦеныТоваров',
    '_InfoRg7821': 'ХарактеристикиТоваров',
    '_InfoRg7825': 'СвойстваТоваров',
    
    // Перечисления
    '_Enum337': 'СтатусыДокументов',
    '_Enum338': 'ТипыКонтрагентов',
    '_Enum339': 'ВидыДвижений',
    '_Enum340': 'СтатусыТоваров',
  };

  // Словарь переводов полей
  private readonly fieldTranslations: Record<string, string> = {
    // Системные поля
    '_IDRRef': 'Идентификатор',
    '_Version': 'Версия',
    '_Marked': 'ПометкаУдаления',
    '_PredefinedID': 'ПредопределенныйЭлемент',
    '_ParentIDRRef': 'Родитель',
    '_Folder': 'Папка',
    '_Code': 'Код',
    '_Description': 'Наименование',
    '_Number': 'Номер',
    '_Date': 'Дата',
    '_Period': 'Период',
    '_LineNo': 'НомерСтроки',
    '_Active': 'Активность',
    '_RecordKind': 'ВидЗаписи',
    '_RecorderTRef': 'РегистраторТип',
    '_RecorderRRef': 'Регистратор',
    
    // Поля номенклатуры
    '_Fld3404': 'ПолноеНаименование',
    '_Fld3405RRef': 'ЕдиницаИзмерения',
    '_Fld3406RRef': 'ГруппаТоваров',
    '_Fld3407': 'Артикул',
    '_Fld3408': 'Вес',
    '_Fld3409': 'Объем',
    '_Fld3410': 'ШтрихКод',
    
    // Поля контрагентов
    '_Fld3415RRef': 'ТипКонтрагента',
    '_Fld3416RRef': 'ЮридическоеЛицо',
    '_Fld3417': 'ИНН',
    '_Fld3418': 'КПП',
    '_Fld3419RRef': 'Банк',
    '_Fld3420': 'РасчетныйСчет',
    '_Fld3421': 'КорреспондентскийСчет',
    '_Fld3422': 'БИК',
    '_Fld3423': 'Телефон',
    '_Fld3424': 'Email',
    '_Fld3425': 'Адрес',
    '_Fld3426': 'КонтактноеЛицо',
    '_Fld3427': 'Комментарий',
    '_Fld3428': 'Активность',
    '_Fld3429': 'ВнешнийКод',
    '_Fld3430': 'ДатаСоздания',
    
    // Поля документов
    '_Fld14168RRef': 'Контрагент',
    '_Fld14169': 'Сумма',
    '_Fld14170RRef': 'Склад',
    '_Fld14171': 'Количество',
    '_Fld14172': 'Цена',
    '_Fld14173': 'СуммаНДС',
    '_Fld14174': 'Комментарий',
    '_Fld14175RRef': 'Ответственный',
    '_Fld14176': 'ДатаПроведения',
    '_Fld14177_TYPE': 'ТипОперации',
    '_Fld14178': 'НомерДокумента',
    '_Fld14179RRef': 'СкладОтправитель',
    '_Fld14180RRef': 'СкладПолучатель',
    '_Fld14181': 'Статус',
    '_Fld14182': 'Примечание',
    
    // Поля регистров
    '_Fld10181RRef': 'Номенклатура',
    '_Fld10182_TYPE': 'ТипДвижения',
    '_Fld10183': 'Количество',
    '_Fld10184': 'Сумма',
    '_Fld10333RRef': 'Контрагент',
    '_Fld10334RRef': 'Договор',
    '_Fld10335_TYPE': 'ТипОперации',
    '_Fld10336RRef': 'Склад',
    '_Fld10337': 'ДатаОперации',
    '_Fld10338RRef': 'Ответственный',
    '_Fld10339': 'КоличествоОстаток',
    '_Fld10340': 'СуммаОстаток',
    
    // Поля цен
    '_Fld496': 'ВерсияЗаписи',
    '_Fld495': 'ВерсияОбъекта',
  };

  // Словарь переводов значений перечислений
  private readonly enumValueTranslations: Record<string, Record<string, string>> = {
    '_Enum337': {
      '0': 'Черновик',
      '1': 'Проведен',
      '2': 'Отменен',
    },
    '_Enum338': {
      '0': 'ЮридическоеЛицо',
      '1': 'ФизическоеЛицо',
      '2': 'ИндивидуальныйПредприниматель',
    },
    '_Enum339': {
      '0': 'Приход',
      '1': 'Расход',
      '2': 'Перемещение',
    },
    '_Enum340': {
      '0': 'Активный',
      '1': 'Неактивный',
      '2': 'Архивный',
    },
  };

  /**
   * Получить русское название таблицы
   */
  getTableRussianName(technicalName: string): string {
    const russianName = this.tableTranslations[technicalName];
    if (russianName) {
      this.logger.debug(`Таблица ${technicalName} -> ${russianName}`);
      return russianName;
    }
    
    // Если нет перевода, возвращаем техническое название
    this.logger.warn(`Нет перевода для таблицы: ${technicalName}`);
    return technicalName;
  }

  /**
   * Получить русское название поля
   */
  getFieldRussianName(fieldName: string): string {
    const russianName = this.fieldTranslations[fieldName];
    if (russianName) {
      this.logger.debug(`Поле ${fieldName} -> ${russianName}`);
      return russianName;
    }
    
    // Если нет перевода, возвращаем техническое название
    this.logger.warn(`Нет перевода для поля: ${fieldName}`);
    return fieldName;
  }

  /**
   * Получить русское название значения перечисления
   */
  getEnumValueRussianName(enumTable: string, value: string): string {
    const enumTranslations = this.enumValueTranslations[enumTable];
    if (enumTranslations && enumTranslations[value]) {
      return enumTranslations[value];
    }
    
    return value;
  }

  /**
   * Преобразовать название таблицы для PostgreSQL
   */
  getPostgresTableName(technicalName: string): string {
    const russianName = this.getTableRussianName(technicalName);
    return this.sanitizeForPostgres(russianName);
  }

  /**
   * Преобразовать название поля для PostgreSQL
   */
  getPostgresFieldName(fieldName: string): string {
    const russianName = this.getFieldRussianName(fieldName);
    return this.sanitizeForPostgres(russianName);
  }

  /**
   * Очистить название для использования в PostgreSQL
   */
  private sanitizeForPostgres(name: string): string {
    // Заменяем пробелы на подчеркивания
    let sanitized = name.replace(/\s+/g, '_');
    
    // Убираем специальные символы
    sanitized = sanitized.replace(/[^a-zA-Zа-яА-Я0-9_]/g, '');
    
    // Приводим к нижнему регистру
    sanitized = sanitized.toLowerCase();
    
    // Убираем множественные подчеркивания
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Убираем подчеркивания в начале и конце
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    
    return sanitized;
  }

  /**
   * Получить полный маппинг таблицы
   */
  getTableMapping(technicalName: string): { technical: string; russian: string; postgres: string } {
    return {
      technical: technicalName,
      russian: this.getTableRussianName(technicalName),
      postgres: this.getPostgresTableName(technicalName),
    };
  }

  /**
   * Получить полный маппинг поля
   */
  getFieldMapping(fieldName: string): { technical: string; russian: string; postgres: string } {
    return {
      technical: fieldName,
      russian: this.getFieldRussianName(fieldName),
      postgres: this.getPostgresFieldName(fieldName),
    };
  }

  /**
   * Получить все доступные переводы
   */
  getAllTranslations(): {
    tables: Record<string, string>;
    fields: Record<string, string>;
    enums: Record<string, Record<string, string>>;
  } {
    return {
      tables: { ...this.tableTranslations },
      fields: { ...this.fieldTranslations },
      enums: { ...this.enumValueTranslations },
    };
  }

  /**
   * Добавить новый перевод таблицы
   */
  addTableTranslation(technicalName: string, russianName: string): void {
    this.tableTranslations[technicalName] = russianName;
    this.logger.log(`Добавлен перевод таблицы: ${technicalName} -> ${russianName}`);
  }

  /**
   * Добавить новый перевод поля
   */
  addFieldTranslation(technicalName: string, russianName: string): void {
    this.fieldTranslations[technicalName] = russianName;
    this.logger.log(`Добавлен перевод поля: ${technicalName} -> ${russianName}`);
  }

  /**
   * Добавить новый перевод значения перечисления
   */
  addEnumValueTranslation(enumTable: string, value: string, russianName: string): void {
    if (!this.enumValueTranslations[enumTable]) {
      this.enumValueTranslations[enumTable] = {};
    }
    this.enumValueTranslations[enumTable][value] = russianName;
    this.logger.log(`Добавлен перевод значения: ${enumTable}.${value} -> ${russianName}`);
  }
}
