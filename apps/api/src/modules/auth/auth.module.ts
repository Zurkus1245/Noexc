import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AUTH_PROVIDER } from './auth.provider';
import { JWKS_KEY_SET, JwksAuthProvider, createJwksKeySet } from './jwks-auth.provider';
import { CONFIG } from '../../config/config';

@Module({
  providers: [
    { provide: JWKS_KEY_SET, useFactory: createJwksKeySet, inject: [CONFIG] },
    { provide: AUTH_PROVIDER, useClass: JwksAuthProvider },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
