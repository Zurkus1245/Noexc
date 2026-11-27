import { createPublicKey } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { calculateJwkThumbprint, createLocalJWKSet, exportJWK } from 'jose';
import request from 'supertest';
import { configureApp } from '../src/app-setup';
import { AppModule } from '../src/app.module';
import { type Clock, CLOCK } from '../src/common/clock/clock';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { loadConfig } from '../src/config/config';
import { JWKS_KEY_SET, JWT_ALGORITHM } from '../src/modules/auth/jwks-auth.provider';
import { TEST_DATABASE_SCHEMA } from './database-url';

export type TestAppOptions = {
  env?: Partial<NodeJS.ProcessEnv>;
  clock?: Clock;
};

// Real Nest app over the test schema. Only the JWKS source is replaced: tokens are verified against the
// ephemeral key from the test environment instead of a remote URL that does not exist in tests.
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication> {
  const config = loadConfig({ ...process.env, ...options.env });
  if (config.localAuthPrivateKeyPem === undefined) {
    throw new Error('Test environment must provide LOCAL_AUTH_PRIVATE_KEY_PEM');
  }
  const keySet = await localKeySet(config.localAuthPrivateKeyPem);

  let builder = Test.createTestingModule({ imports: [AppModule.register(config)] }).overrideProvider(JWKS_KEY_SET).useValue(keySet);
  if (options.clock !== undefined) {
    builder = builder.overrideProvider(CLOCK).useValue(options.clock);
  }
  const app = (await builder.compile()).createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

// Same JWK the local issuer publishes: the kid is the RFC 7638 thumbprint of the public key.
export async function localPublicJwk(privateKeyPem: string) {
  const jwk = await exportJWK(createPublicKey(privateKeyPem));
  const kid = await calculateJwkThumbprint(jwk);
  return { ...jwk, kid, alg: JWT_ALGORITHM, use: 'sig' };
}

async function localKeySet(privateKeyPem: string) {
  return createLocalJWKSet({ keys: [await localPublicJwk(privateKeyPem)] });
}

export async function tokenFor(app: INestApplication, subject: string): Promise<string> {
  const response = await request(app.getHttpServer()).post('/v1/auth/local/token').send({ subject }).expect(201);
  return response.body.accessToken as string;
}

// Only the test schema is ever truncated: the guard refuses to run against any other schema.
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const [current] = await prisma.$queryRaw<{ schema: string }[]>`SELECT current_schema() AS schema`;
  if (current?.schema !== TEST_DATABASE_SCHEMA) {
    throw new Error(`Refusing to reset schema "${current?.schema ?? 'unknown'}" outside the test schema`);
  }
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "IdempotencyRecord", "RateLimitHit", "Consent", "Invite", "CalendarEntry", "PlanVersion", "CoachClient", "User" RESTART IDENTITY CASCADE`,
  );
}
