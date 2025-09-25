import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { OdataService } from './odata.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/v1/odata')
export class OdataController {
  constructor(private svc: OdataService) {}

  @Post('test')
  test(@Body() dto: { baseUrl: string; username: string; password: string; endpoint?: string; top?: number }) {
    return this.svc.testFetch(dto);
  }

  @UseGuards(ApiKeyGuard) @Post('sources') createSource(@Body() dto: any) { return this.svc.createSource(dto); }
  @UseGuards(ApiKeyGuard) @Get('sources') listSources() { return this.svc.listSources(); }

  @UseGuards(ApiKeyGuard)
  @Get('fetch')
  fetch(
    @Query('sourceId') sourceId: string,
    @Query('endpoint') endpoint: string,
    @Query('mode') mode: 'full' | 'delta' = 'full',
    @Query('since') since?: string,
    @Query('top') top?: number,
  ) {
    return this.svc.fetchAndStore(sourceId, endpoint, mode, since, top);
  }
}
