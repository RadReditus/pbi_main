import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatasCollectionsService } from './datas-collections.service';
import { DatasCollectionsController } from './datas-collections.controller';

@Module({
  imports: [
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
    })
  ],
  controllers: [DatasCollectionsController],
  providers: [DatasCollectionsService],
  exports: [DatasCollectionsService],
})
export class DatasCollectionsModule {}
