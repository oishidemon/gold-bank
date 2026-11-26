import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import { IS_PUBLIC } from './public.decorator';

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const secret = process.env.APP_PASSWORD;
    if (!secret) throw new UnauthorizedException();
    const header: string = ctx.switchToHttp().getRequest().headers['authorization'] ?? '';
    const got = Buffer.from(header.replace(/^Bearer /, ''));
    const want = Buffer.from(secret);
    if (got.length !== want.length || !timingSafeEqual(got, want)) throw new UnauthorizedException();
    return true;
  }
}
