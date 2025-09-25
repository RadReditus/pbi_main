import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Source1cService } from './source1c.service';
import { DatasCollectionsModule } from '../datas-collections/datas-collections.module';
import { HealthModule } from '../health/health.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    // Uses a dedicated TypeORM connection named 'source1c' configured in AppModule
    TypeOrmModule.forFeature([], 'source1c'),
    DatasCollectionsModule,
    HealthModule,
    ConfigModule
  ],
  providers: [Source1cService],
})
export class Source1cModule {}


