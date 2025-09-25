import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User, 'users') private repo: Repository<User>) {}

  async create(email: string, password: string, roles: Role[] = [Role.USER]) {
    const exists = await this.repo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.repo.create({ email, passwordHash, roles });
    return this.repo.save(user);
  }

  findAll() { return this.repo.find(); }
  findById(id: string) { return this.repo.findOne({ where: { id } }); }

  async findWithPassword(email: string) {
    return this.repo.createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne();
  }

  async setRoles(id: string, roles: Role[]) {
    await this.repo.update({ id }, { roles });
    return this.findById(id);
  }
}
