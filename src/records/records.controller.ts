import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { RecordsService } from './records.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/v1/records')
export class RecordsController {
  constructor(private svc: RecordsService) {}

  @UseGuards(ApiKeyGuard) @Get('filtered') filtered(@Query() q: any) { return this.svc.findFiltered(q); }
  @UseGuards(ApiKeyGuard) @Get('tagged')   tagged(@Query() q: any) { return this.svc.findTagged(q); }

  @Post('ingest')
  ingest(@Body() dto: { items: Array<{ uid: string; type: string; payload: any }> }) {
    return this.svc.upsertFiltered(dto.items);
  }

  @Post('promote')
  async promote(@Body() dto: { ids?: string[] }) {
    const items = dto.ids?.length
      ? await Promise.all(dto.ids.map((id) => (this.svc as any)['filteredRepo'].findOneByOrFail({ id })))
      : await (this.svc as any)['filteredRepo'].find({ take: 1000 });
    return this.svc.applyTagsAndMove(items);
  }
}
