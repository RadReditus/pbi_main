import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SmartSyncService, SyncOptions } from './smart-sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../meta/roles.decorator';
import { Role } from '../users/role.enum';

export class SyncTableDto {
  tableName: string;
  baseUrl: string;
  collectionName: string;
  options?: SyncOptions;
}

export class SyncAllDto {
  options?: SyncOptions;
}

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly smartSyncService: SmartSyncService) {}

  @Post('table')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async syncTable(@Body() dto: SyncTableDto) {
    return this.smartSyncService.syncTable(
      dto.tableName,
      dto.baseUrl,
      dto.collectionName,
      dto.options || {}
    );
  }

  @Post('all')
  @Roles(Role.ADMIN)
  async syncAll(@Body() dto: SyncAllDto) {
    // Получаем список всех коллекций
    // В реальной реализации здесь должен быть вызов сервиса для получения коллекций
    const collections = [
      // Пример коллекций - в реальности получать из DatasCollectionsService
    ];
    
    return this.smartSyncService.syncAllTables(collections, dto.options || {});
  }
}




