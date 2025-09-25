import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { MssqlService } from './mssql.service';
import { MssqlIncrementalService } from './mssql-incremental.service';
import { RussianNamesMapperService } from './russian-names-mapper.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../meta/roles.decorator';
import { Role } from '../users/role.enum';

@Controller('mssql')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MssqlController {
  constructor(
    private readonly mssqlService: MssqlService,
    private readonly mssqlIncrementalService: MssqlIncrementalService,
    private readonly russianNamesMapper: RussianNamesMapperService,
  ) {}

  @Get('status')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getStatus() {
    return {
      message: 'MSSQL loader service status',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('start')
  @Roles(Role.ADMIN)
  async startLoader() {
    // Запуск загрузчика вручную (если нужно)
    return {
      message: 'MSSQL loader started manually',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('incremental/status')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getIncrementalStatus() {
    return {
      message: 'MSSQL incremental loader service status',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('incremental/start')
  @Roles(Role.ADMIN)
  async startIncrementalLoader() {
    return {
      message: 'MSSQL incremental loader started manually',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('trackers')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getChangeTrackers(@Query('database') database?: string) {
    // Получение списка трекеров изменений
    return {
      message: 'MSSQL change trackers',
      database: database || 'all',
      timestamp: new Date().toISOString(),
    };
  }

  // API для работы с русскими названиями
  @Get('russian-names/translations')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getAllTranslations() {
    return {
      message: 'Все доступные переводы названий',
      translations: this.russianNamesMapper.getAllTranslations(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('russian-names/table-mapping')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getTableMapping(@Query('tableName') tableName: string) {
    if (!tableName) {
      return {
        error: 'Не указано название таблицы',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      message: 'Маппинг таблицы',
      mapping: this.russianNamesMapper.getTableMapping(tableName),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('russian-names/field-mapping')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getFieldMapping(@Query('fieldName') fieldName: string) {
    if (!fieldName) {
      return {
        error: 'Не указано название поля',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      message: 'Маппинг поля',
      mapping: this.russianNamesMapper.getFieldMapping(fieldName),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('russian-names/add-table-translation')
  @Roles(Role.ADMIN)
  async addTableTranslation(@Query('technicalName') technicalName: string, @Query('russianName') russianName: string) {
    if (!technicalName || !russianName) {
      return {
        error: 'Не указаны техническое или русское название',
        timestamp: new Date().toISOString(),
      };
    }

    this.russianNamesMapper.addTableTranslation(technicalName, russianName);
    
    return {
      message: 'Перевод таблицы добавлен',
      technicalName,
      russianName,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('russian-names/add-field-translation')
  @Roles(Role.ADMIN)
  async addFieldTranslation(@Query('technicalName') technicalName: string, @Query('russianName') russianName: string) {
    if (!technicalName || !russianName) {
      return {
        error: 'Не указаны техническое или русское название',
        timestamp: new Date().toISOString(),
      };
    }

    this.russianNamesMapper.addFieldTranslation(technicalName, russianName);
    
    return {
      message: 'Перевод поля добавлен',
      technicalName,
      russianName,
      timestamp: new Date().toISOString(),
    };
  }

  // =============================================================================
  // API ДЛЯ РАБОТЫ С HEX ID ПЕРЕВОДАМИ
  // =============================================================================

  @Get('hex-id/translations')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getHexIdTranslations() {
    const translations = this.russianNamesMapper.getAllHexIdTranslations();
    const stats = this.russianNamesMapper.getHexIdTranslationStats();
    
    return {
      message: 'Переводы hex ID получены',
      translations,
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('hex-id/add-translation')
  @Roles(Role.ADMIN)
  async addHexIdTranslation(
    @Query('hexId') hexId: string,
    @Query('russianName') russianName: string,
  ) {
    if (!hexId || !russianName) {
      return {
        error: 'Требуются параметры hexId и russianName',
        timestamp: new Date().toISOString(),
      };
    }

    this.russianNamesMapper.addHexIdTranslation(hexId, russianName);
    
    return {
      message: 'Перевод hex ID добавлен',
      hexId,
      russianName,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('hex-id/load-from-database')
  @Roles(Role.ADMIN)
  async loadHexIdTranslationsFromDatabase() {
    try {
      await this.russianNamesMapper.loadHexIdTranslationsFromDatabase();
      
      return {
        message: 'Переводы hex ID загружены из базы данных',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Ошибка при загрузке переводов hex ID',
        details: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('hex-id/stats')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getHexIdStats() {
    const stats = this.russianNamesMapper.getHexIdTranslationStats();
    
    return {
      message: 'Статистика переводов hex ID',
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('hex-id/translate-data')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async translateDataHexIds(@Query('data') data: string) {
    try {
      const parsedData = JSON.parse(data);
      const translatedData = this.russianNamesMapper.translateDataHexIds(parsedData);
      
      return {
        message: 'Данные переведены',
        originalData: parsedData,
        translatedData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Ошибка при переводе данных',
        details: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}



