import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntry } from './log-entry.entity';
import * as fs from 'fs'; import * as path from 'path';

@Injectable()
export class LoggingService {
  constructor(@InjectRepository(LogEntry, 'users') private repo: Repository<LogEntry>) {}
  async log(level:'info'|'warn'|'error', message:string, flag?:string, meta?:any, toFile?:boolean) {
    const saved = await this.repo.save(this.repo.create({ level, message, flag, meta }));
    if (toFile ?? (process.env.FILE_LOGGING === 'true')) {
      const p = process.env.LOG_FILE_PATH || '/app/logs/app.log';
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.appendFileSync(p, `${new Date().toISOString()} [${level}] ${message} flag=${flag||''} ${JSON.stringify(meta||{})}\n`);
    }
    return saved;
  }
}
