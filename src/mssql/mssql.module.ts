import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MssqlService } from './mssql.service';
import { MssqlController } from './mssql.controller';
import { ConfigModule } from '../config/config.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    // Не создаем подключение заранее - будем создавать динамически
  ],
  providers: [MssqlService],
  controllers: [MssqlController],
  exports: [MssqlService],
})
export class MssqlModule {}
