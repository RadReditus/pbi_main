import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { OdataService } from './odata.service';
import { OdataController } from './odata.controller';
import { OdataSource } from './odata-source.entity';
import { OdataRaw, OdataRawSchema } from './odata-raw.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([OdataSource], 'users'),
    MongooseModule.forFeature([{ name: OdataRaw.name, schema: OdataRawSchema }]),
  ],
  controllers: [OdataController],
  providers: [OdataService],
  exports: [OdataService],
})
export class OdataModule {}
