import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogEntry } from './log-entry.entity';
import { LoggingService } from './logging.service';
import { LogsController } from './logs.controller';
@Module({
  imports: [TypeOrmModule.forFeature([LogEntry], 'users')],
  providers: [LoggingService],
  controllers: [LogsController],
  exports: [LoggingService],
})
export class LoggingModule {}
