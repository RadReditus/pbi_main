// src/debug/debug.controller.ts
import { Controller, Post, BadRequestException } from '@nestjs/common';
import { SeedService } from '../bootstrap/seed.service';

@Controller('_dev')
export class DebugController {
  constructor(private readonly seed: SeedService) {}
  @Post('seed')
  async seedNow() {
    if (process.env.ALLOW_DEV_SEED !== 'true') throw new BadRequestException('DEV seed disabled');
    await (this.seed as any).onApplicationBootstrap();
    return { ok: true };
  }
}
