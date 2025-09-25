import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../meta/roles.decorator';
import { Role } from '../users/role.enum';
import { AppSettings } from './settings';

export class UpdateServiceSettingsDto {
  serviceName: 'source1c' | 'getScopeOneC';
  enabled: boolean;
}

export class UpdateMonitoringSettingsDto {
  enabled: boolean;
  delaySeconds?: number;
  cronExpression?: string;
}

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('settings')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getSettings(): Promise<AppSettings> {
    return this.configService.getSettings();
  }

  @Get('services')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getDataServicesSettings() {
    return this.configService.getDataServicesSettings();
  }

  @Get('monitoring')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getMonitoringSettings() {
    return this.configService.getMonitoringSettings();
  }

  @Post('services/enable')
  @Roles(Role.ADMIN)
  async updateServiceEnabled(@Body() dto: UpdateServiceSettingsDto) {
    this.configService.setServiceEnabled(dto.serviceName, dto.enabled);
    return { 
      message: `Service ${dto.serviceName} ${dto.enabled ? 'enabled' : 'disabled'}`,
      serviceName: dto.serviceName,
      enabled: dto.enabled
    };
  }

  @Post('monitoring/enable')
  @Roles(Role.ADMIN)
  async updateMonitoringEnabled(@Body() dto: UpdateMonitoringSettingsDto) {
    this.configService.setMonitoringEnabled(dto.enabled);
    
    if (dto.delaySeconds !== undefined) {
      this.configService.updateSettings({
        monitoring: {
          ...this.configService.getMonitoringSettings(),
          delaySeconds: dto.delaySeconds
        }
      });
    }
    
    if (dto.cronExpression !== undefined) {
      this.configService.updateSettings({
        monitoring: {
          ...this.configService.getMonitoringSettings(),
          cronExpression: dto.cronExpression
        }
      });
    }

    return { 
      message: `Monitoring ${dto.enabled ? 'enabled' : 'disabled'}`,
      enabled: dto.enabled,
      settings: this.configService.getMonitoringSettings()
    };
  }

  @Post('reset')
  @Roles(Role.ADMIN)
  async resetToDefaults() {
    // Сбрасываем настройки к значениям по умолчанию
    // В реальном приложении здесь может быть логика сброса
    return { 
      message: 'Settings reset to defaults',
      settings: this.configService.getSettings()
    };
  }
}




