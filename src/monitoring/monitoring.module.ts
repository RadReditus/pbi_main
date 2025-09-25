import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { TableCounter } from './table-counter.entity';
import { DatasCollectionsModule } from '../datas-collections/datas-collections.module';
import { SyncModule } from '../sync/sync.module';
import { HealthModule } from '../health/health.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TableCounter], 'users'),
    ScheduleModule.forRoot(),
    DatasCollectionsModule,
    SyncModule,
    HealthModule,
    ConfigModule,
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
