import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MssqlService } from './mssql.service';
import { MssqlIncrementalService } from './mssql-incremental.service';
import { MssqlController } from './mssql.controller';
import { MssqlChangeTracker } from './mssql-change-tracker.entity';
import { ConfigModule } from '../config/config.module';
import { HealthModule } from '../health/health.module';
import { RecordsModule } from '../records/records.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    RecordsModule,
    TypeOrmModule.forFeature([MssqlChangeTracker], 'users'),
  ],
  providers: [MssqlService, MssqlIncrementalService],
  controllers: [MssqlController],
  exports: [MssqlService, MssqlIncrementalService],
})
export class MssqlModule {}
