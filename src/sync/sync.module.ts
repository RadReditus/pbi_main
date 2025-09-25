import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartSyncService } from './smart-sync.service';
import { SyncController } from './sync.controller';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([], 'source1c'),
    TypeOrmModule.forFeature([], 'source_one_c'),
  ],
  controllers: [SyncController],
  providers: [SmartSyncService],
  exports: [SmartSyncService],
})
export class SyncModule {}
