import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetScopeOneCService } from './get-scope-one-c.service';
import { DatasCollectionsModule } from '../datas-collections/datas-collections.module';
import { HealthModule } from '../health/health.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([], 'source_one_c'),
    DatasCollectionsModule,
    HealthModule,
    ConfigModule
  ],
  providers: [GetScopeOneCService],
})
export class GetScopeOneCModule {}


