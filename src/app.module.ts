import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { SeedService } from './bootstrap/seed.service';
import { BootstrapModule } from './bootstrap/bootstrap.module'; 

const pg = (db: string, name: string) =>
  TypeOrmModule.forRoot({
    name,
    type: 'postgres',
    host: process.env.PG_HOST,
    port: +(process.env.PG_PORT || 5432),
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: db,
    autoLoadEntities: true,
    synchronize: true,
    retryAttempts: 20,
    retryDelay: 3000,
  });

import { ConfigModule } from './config/config.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggingModule } from './logging/logging.module';
import { TagsModule } from './tags/tags.module';
import { RecordsModule } from './records/records.module';
import { ExportModule } from './export/export.module';
import { OdataModule } from './odata/odata.module';
import { Source1cModule } from './source1c/source1c.module';
import { GetScopeOneCModule } from './get_scope_one_c/get-scope-one-c.module';
import { DatasCollectionsModule } from './datas-collections/datas-collections.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SyncModule } from './sync/sync.module';
import { HealthModule } from './health/health.module';
import { MssqlModule } from './mssql/mssql.module';
import { CompareModule } from './compare/compare.module';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule,
    pg(process.env.PG_DB_USERS!, 'users'),
    pg(process.env.PG_DB_FILTERED!, 'filtered'),
    pg(process.env.PG_DB_TAGGED!, 'tagged'),
    // Dedicated connection for Source1c module
    TypeOrmModule.forRoot({
      name: 'source1c',
      type: 'postgres',
      host: process.env.SOURCE1C_PG_HOST || process.env.PG_HOST,
      port: +(process.env.SOURCE1C_PG_PORT || process.env.PG_PORT || 5432),
      username: process.env.SOURCE1C_PG_USER || process.env.PG_USER,
      password: process.env.SOURCE1C_PG_PASSWORD || process.env.PG_PASSWORD,
      database: process.env.SOURCE1C_PG_DB || 'source_1c',
      autoLoadEntities: false,
      synchronize: false,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    TypeOrmModule.forRoot({
      name: 'source_one_c',
      type: 'postgres',
      host: process.env.GET_SCOPE_ONEC_PG_HOST || process.env.PG_HOST,
      port: +(process.env.GET_SCOPE_ONEC_PG_PORT || process.env.PG_PORT || 5432),
      username: process.env.GET_SCOPE_ONEC_PG_USER || process.env.PG_USER,
      password: process.env.GET_SCOPE_ONEC_PG_PASSWORD || process.env.PG_PASSWORD,
      database: process.env.GET_SCOPE_ONEC_PG_DB || 'source_one_c',
      autoLoadEntities: false,
      synchronize: false,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    UsersModule,
    AuthModule,
    LoggingModule,
    TagsModule,
    RecordsModule,
    ExportModule,
    OdataModule,
    Source1cModule,
    GetScopeOneCModule,
    DatasCollectionsModule,
    MonitoringModule,
    SyncModule,
    HealthModule,
    MssqlModule,
    CompareModule,
    BootstrapModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
