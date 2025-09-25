// src/bootstrap/bootstrap.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ⚠️ проверь путь к сущности пользователя в твоём проекте
import { User } from '../users/user.entity';

import { SeedService } from './seed.service';

@Module({
  // даём SeedService доступ к репозиторию User в коннекте 'users'
  imports: [TypeOrmModule.forFeature([User], 'users')],
  providers: [SeedService],
})
export class BootstrapModule {}
