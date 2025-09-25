import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const key = req.header('x-api-key');
    if (!key || key !== process.env.API_KEY_PBI) throw new UnauthorizedException('Invalid or missing API key');
    return true;
  }
}
