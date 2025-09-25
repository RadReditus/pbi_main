import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnecRecord } from './onec-record.entity';
import { OnecRecordTagged } from './onec-record-tagged.entity';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnecRecord], 'filtered'),
    TypeOrmModule.forFeature([OnecRecordTagged], 'tagged'),
    TagsModule,
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
