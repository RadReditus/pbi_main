import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';

dotenv.config();

@Module({
  providers: [ConfigService],
  controllers: [ConfigController],
  exports: [ConfigService],
})
export class ConfigModule {}
