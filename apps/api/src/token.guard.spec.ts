import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenGuard } from './token.guard';

const ctx = (authorization?: string) =>
  ({
    getHandler: () => ({}),
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ headers: authorization ? { authorization } : {} }) }),
  }) as unknown as ExecutionContext;

describe('TokenGuard', () => {
  const guard = new TokenGuard(new Reflector());
  const original = process.env.APP_PASSWORD;

  beforeEach(() => { process.env.APP_PASSWORD = 'secret'; });
  afterAll(() => {
    if (original === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = original;
  });

  it('accepts the correct password', () => {
    expect(guard.canActivate(ctx('Bearer secret'))).toBe(true);
  });
  it('rejects a wrong password of the same length', () => {
    expect(() => guard.canActivate(ctx('Bearer secreX'))).toThrow(UnauthorizedException);
  });
  it('rejects a password of a different length', () => {
    expect(() => guard.canActivate(ctx('Bearer secret-and-more'))).toThrow(UnauthorizedException);
  });
  it('rejects a missing header', () => {
    expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException);
  });
  it('fails closed when APP_PASSWORD is not configured', () => {
    delete process.env.APP_PASSWORD;
    expect(() => guard.canActivate(ctx('Bearer '))).toThrow(UnauthorizedException);
  });

  it('lets @Public routes through without a password', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(new TokenGuard(reflector).canActivate(ctx())).toBe(true);
  });
});
