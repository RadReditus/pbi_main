import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../meta/roles.decorator';
import { Role } from '../../users/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user as { roles?: Role[] } | undefined;
    if (!user?.roles) throw new ForbiddenException('No roles');
    const ok = required.some(r => user.roles!.includes(r));
    if (!ok) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
