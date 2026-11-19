import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class TokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const secret = process.env.APP_PASSWORD;
    if (!secret) throw new UnauthorizedException();
    const header: string = ctx.switchToHttp().getRequest().headers['authorization'] ?? '';
    const got = Buffer.from(header.replace(/^Bearer /, ''));
    const want = Buffer.from(secret);
    if (got.length !== want.length || !timingSafeEqual(got, want)) throw new UnauthorizedException();
    return true;
  }
}
