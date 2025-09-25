import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../users/role.enum';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async validate(email: string, password: string) {
    const user = await this.users.findWithPassword(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { id: user.id, email: user.email, roles: user.roles as Role[] };
  }

  async login(email: string, password: string) {
    const u = await this.validate(email, password);
    const accessToken = await this.jwt.signAsync(
      { sub: u.id, email: u.email, roles: u.roles },
      { secret: process.env.JWT_SECRET, expiresIn: '7d' },
    );
    return { accessToken, user: u };
  }
}
