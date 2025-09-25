import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { ServiceStatusService } from '../health/service-status.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../meta/roles.decorator';
import { Role } from '../users/role.enum';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly serviceStatusService: ServiceStatusService
  ) {}

  @Get('counters')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getCountersStatus() {
    return this.monitoringService.getCountersStatus();
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getMonitoringStats() {
    return this.monitoringService.getMonitoringStats();
  }

  @Post('force-check')
  @Roles(Role.ADMIN)
  async forceCheckAll() {
    await this.monitoringService.forceCheckAll();
    return { message: 'Force check initiated' };
  }

  @Post('force-sync/:tableName')
  @Roles(Role.ADMIN)
  async forceSyncTable(@Param('tableName') tableName: string) {
    await this.monitoringService.forceSyncTable(tableName);
    return { message: `Force sync initiated for table ${tableName}` };
  }

  @Post('enable')
  @Roles(Role.ADMIN)
  async enableMonitoring() {
    this.monitoringService.enableMonitoring();
    return { message: 'Monitoring enabled' };
  }

  @Post('disable')
  @Roles(Role.ADMIN)
  async disableMonitoring() {
    this.monitoringService.disableMonitoring();
    return { message: 'Monitoring disabled' };
  }

  @Get('status')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getMonitoringStatus() {
    return { 
      enabled: this.monitoringService.isMonitoringEnabled() 
    };
  }

  @Get('services')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getServicesStatus() {
    return this.serviceStatusService.getAllServicesStatus();
  }

  @Get('services/stats')
  @Roles(Role.ADMIN, Role.ASSISTANT)
  async getServicesStats() {
    return this.serviceStatusService.getServicesStats();
  }
}
