import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../meta/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from './role.enum';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(Role.ADMIN, Role.ASSISTANT)
  @Post()
  create(@Body() dto: { email: string; password: string; roles?: Role[] }) {
    return this.users.create(dto.email, dto.password, dto.roles ?? [Role.USER]);
  }

  @Roles(Role.ADMIN, Role.ASSISTANT)
  @Get()
  all() { return this.users.findAll(); }

  @Roles(Role.ADMIN)
  @Patch(':id/roles')
  setRoles(@Param('id') id: string, @Body() dto: { roles: Role[] }) {
    return this.users.setRoles(id, dto.roles);
  }
}
