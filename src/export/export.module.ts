import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnecRecordTagged } from '../records/onec-record-tagged.entity';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OnecRecordTagged], 'tagged')],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
