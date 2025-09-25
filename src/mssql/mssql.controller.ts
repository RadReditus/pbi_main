import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { MssqlService } from './mssql.service';
import { MssqlIncrementalService } from './mssql-incremental.service';
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
}



