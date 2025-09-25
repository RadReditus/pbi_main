import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MssqlService } from './mssql.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../meta/roles.decorator';
import { Role } from '../users/role.enum';

@Controller('mssql')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MssqlController {
  constructor(private readonly mssqlService: MssqlService) {}

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
}



