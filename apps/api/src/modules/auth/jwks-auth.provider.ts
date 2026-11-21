import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { type AppConfig, CONFIG } from '../../config/config';
import { ApiError } from '../../common/errors/api-error';
import type { AuthProvider, VerifiedToken } from './auth.provider';

export const JWT_ALGORITHM = 'RS256';
export const JWKS_KEY_SET = Symbol('JWKS_KEY_SET');

const UNAUTHORIZED_STATUS = 401;
const INVALID_TOKEN_DETAIL = 'Invalid or expired access token';

export const createJwksKeySet = (config: AppConfig): JWTVerifyGetKey =>
  createRemoteJWKSet(new URL(config.auth.jwksUrl));

@Injectable()
export class JwksAuthProvider implements AuthProvider {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(JWKS_KEY_SET) private readonly keySet: JWTVerifyGetKey,
  ) {}

  async verifyAccessToken(token: string): Promise<VerifiedToken> {
    const { payload } = await this.verify(token);
    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw invalidToken();
    }
    return { subject: payload.sub };
  }

  private async verify(token: string) {
    try {
      return await jwtVerify(token, this.keySet, {
        issuer: this.config.auth.issuer,
        audience: this.config.auth.audience,
        algorithms: [JWT_ALGORITHM],
      });
    } catch (error) {
      // JWKS fetch failures are infrastructure faults (500), not a client credential problem (401).
      if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout)) {
        throw invalidToken();
      }
      throw error;
    }
  }
}

function invalidToken(): ApiError {
  return new ApiError(UNAUTHORIZED_STATUS, 'UNAUTHENTICATED', INVALID_TOKEN_DETAIL);
}
