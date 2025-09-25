import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntry } from './log-entry.entity';

@Controller('api/v1/logs')
export class LogsController {
  constructor(
    private logger: LoggingService,
    @InjectRepository(LogEntry, 'users') private repo: Repository<LogEntry>,
  ) {}
  @Post()
  create(@Body() dto: { level:'info'|'warn'|'error'; message:string; flag?:string; meta?:any; toFile?:boolean }) {
    return this.logger.log(dto.level, dto.message, dto.flag, dto.meta, dto.toFile);
  }
  @Get()
  list(@Query('take') take?:number, @Query('skip') skip?:number) {
    return this.repo.find({ take: +(take||100), skip: +(skip||0), order: { createdAt: 'DESC' } });
  }
}
