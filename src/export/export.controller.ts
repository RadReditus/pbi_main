import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ExportService } from './export.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/v1/export')
@UseGuards(ApiKeyGuard)
export class ExportController {
  constructor(private svc: ExportService) {}
  @Get('json') json(@Query() q:any){ return this.svc.asJson(q); }
  @Get('sql') @Header('Content-Type','text/sql; charset=utf-8') sql(@Query() q:any){ return this.svc.asSql(q); }
}
