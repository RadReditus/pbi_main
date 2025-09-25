import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSyncService } from './data-sync.service';
import { DatasCollectionsModule } from '../datas-collections/datas-collections.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'source1c',
      type: 'postgres',
      host: process.env.PG_HOST,
      port: +(process.env.PG_PORT || 5432),
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB_SOURCE1C || 'source_1c',
      autoLoadEntities: false,
      synchronize: false,
    }),
    TypeOrmModule.forRoot({
      name: 'source_one_c',
      type: 'postgres',
      host: process.env.PG_HOST,
      port: +(process.env.PG_PORT || 5432),
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB_SOURCE_ONE_C || 'source_one_c',
      autoLoadEntities: false,
      synchronize: false,
    }),
    DatasCollectionsModule
  ],
  providers: [DataSyncService],
  exports: [DataSyncService],
})
export class DataSyncModule {}
