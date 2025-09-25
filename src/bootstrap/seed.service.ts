// src/bootstrap/seed.service.ts
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

// Импортируй ТВОЮ сущность пользователя (путь оставь как в проекте)
import { User } from '../users/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger('SeedService');

  // ВАЖНО: репозиторий берём как Repository<any>, чтобы не было TS-ошибок из-за расхождения полей
  constructor(
    @InjectRepository(User, 'users')
    private readonly usersRepo: Repository<any>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_ON_BOOT === 'false') {
      this.log.log('SEED_ON_BOOT=false — пропускаю сидинг');
      return;
    }

    await this.ensure('admin@local',     'admin123',     ['ADMIN']);
    await this.ensure('assistant@local', 'assistant123', ['ASSISTANT']);
    await this.ensure('user@local',      'user123',      ['USER']);
  }

  private async ensure(email: string, password: string, roles: string[]) {
    // ищем по email (подстрой, если у тебя username/login)
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      this.log.log(`Пользователь ${email} уже существует — ок`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Готовим DTO под разные схемы (чтобы компиляция точно прошла)
    const dto: any = {
      email,
      enabled: true,
      roles,              // если у тебя одно поле role — можешь использовать role: roles[0]
      passwordHash,       // если у тебя поле password — можно продублировать
      // password: passwordHash,
      // role: roles[0],
    };

    const u = this.usersRepo.create(dto);
    await this.usersRepo.save(u);
    this.log.warn(`Создан ${email} с ролями [${roles.join(', ')}] (пароль: ${password})`);
  }
}
