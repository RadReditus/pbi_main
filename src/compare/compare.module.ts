import { Module } from '@nestjs/common';
import { CompareService } from './compare.service';
import { ConfigModule } from '../config/config.module';
import { MssqlModule } from '../mssql/mssql.module';
import { RecordsModule } from '../records/records.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule,
    MssqlModule,
    RecordsModule,
    ScheduleModule.forRoot(), // Для работы с cron задачами
  ],
  providers: [CompareService],
  exports: [CompareService],
})
export class CompareModule {}
