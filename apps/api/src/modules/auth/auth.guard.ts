import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiError } from '../../common/errors/api-error';
import type { RequestWithContext } from '../../common/request/request-context';
import { AUTH_PROVIDER, type AuthProvider } from './auth.provider';
import { IS_PUBLIC_KEY } from './public.decorator';

const UNAUTHORIZED_STATUS = 401;
const BEARER_SCHEME = 'bearer';

// Global guard: every route needs a verified token unless marked @Public().
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const token = bearerToken(request.headers.authorization);
    request.auth = await this.auth.verifyAccessToken(token);
    return true;
  }
}

function bearerToken(header: string | undefined): string {
  const [scheme, token, ...rest] = (header ?? '').split(' ');
  if (scheme?.toLowerCase() !== BEARER_SCHEME || !token || rest.length > 0) {
    throw new ApiError(UNAUTHORIZED_STATUS, 'UNAUTHENTICATED', 'Missing bearer token');
  }
  return token;
}
