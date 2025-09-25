import { Module } from '@nestjs/common';
import { ServiceStatusService } from './service-status.service';

@Module({
  providers: [ServiceStatusService],
  exports: [ServiceStatusService],
})
export class HealthModule {}




