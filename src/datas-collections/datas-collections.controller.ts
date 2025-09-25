import { Controller, Get, UseGuards } from '@nestjs/common';
import { DatasCollectionsService } from './datas-collections.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('api/v1/datas-collections')
@UseGuards(ApiKeyGuard)
export class DatasCollectionsController {
  constructor(private readonly datasCollectionsService: DatasCollectionsService) {}

  @Get()
  async getAllCollections() {
    return await this.datasCollectionsService.getAllCollectionsMeta();
  }

  @Get('summary')
  async getSummary() {
    const collections = await this.datasCollectionsService.getAllCollectionsMeta();
    
    const summary = {
      totalCollections: collections.length,
      totalRecords: collections.reduce((sum, col) => sum + col.recordsCount, 0),
      lastUpdate: collections.length > 0 
        ? new Date(Math.max(...collections.map(col => new Date(col.lastCheckTime).getTime())))
        : null,
      collectionsByBaseUrl: collections.reduce((acc, col) => {
        if (!acc[col.baseUrl]) acc[col.baseUrl] = [];
        acc[col.baseUrl].push({
          name: col.collectionName,
          recordsCount: col.recordsCount,
          lastCheckTime: col.lastCheckTime
        });
        return acc;
      }, {} as Record<string, any[]>)
    };

    return summary;
  }
}

