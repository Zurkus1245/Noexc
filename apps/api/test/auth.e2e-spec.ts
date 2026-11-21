import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ProblemDetailsSchema, RATE_LIMITS } from '@noexcuse/contracts';
import { SignJWT, generateKeyPair, importPKCS8 } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, localPublicJwk, resetDatabase, tokenFor } from './support';

const PRIVATE_KEY_PEM = process.env.LOCAL_AUTH_PRIVATE_KEY_PEM ?? '';
const ISSUER = process.env.AUTH_ISSUER ?? '';
const AUDIENCE = process.env.AUTH_AUDIENCE ?? '';

describe('auth', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  it('rejects requests without a bearer token with a problem response and request id', async () => {
    const response = await request(app.getHttpServer()).get('/v1/me').expect(401);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(ProblemDetailsSchema.parse(response.body)).toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      requestId: response.headers['x-request-id'],
    });
  });

  it('rejects a malformed Authorization header', async () => {
    await request(app.getHttpServer()).get('/v1/me').set('Authorization', 'Basic abc').expect(401);
    await request(app.getHttpServer()).get('/v1/me').set('Authorization', 'Bearer').expect(401);
  });

  it('accepts a token issued by the local issuer, then reports the missing profile', async () => {
    const token = await tokenFor(app, `subject-${randomUUID()}`);

    const response = await request(app.getHttpServer()).get('/v1/me').set('Authorization', `Bearer ${token}`).expect(403);

    expect(response.body).toMatchObject({ code: 'PROFILE_REQUIRED' });
  });

  it('rejects an expired token', async () => {
    const token = await signToken({ expiresAt: Math.floor(Date.now() / 1000) - 60 });

    await request(app.getHttpServer()).get('/v1/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('rejects a token issued for another audience', async () => {
    const token = await signToken({ audience: 'some-other-api' });

    await request(app.getHttpServer()).get('/v1/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('rejects a token signed by a key the API does not trust', async () => {
    const { privateKey: foreignKey } = await generateKeyPair('RS256');
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('someone')
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('5m')
      .sign(foreignKey);

    await request(app.getHttpServer()).get('/v1/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('serves the local JWKS with the public key only', async () => {
    const response = await request(app.getHttpServer()).get('/v1/auth/local/jwks').expect(200);

    expect(response.body.keys).toHaveLength(1);
    expect(response.body.keys[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
    expect(response.body.keys[0]).not.toHaveProperty('d');
  });

  it('rejects a token request without a subject as VALIDATION_FAILED', async () => {
    const response = await request(app.getHttpServer()).post('/v1/auth/local/token').send({}).expect(400);

    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED', errors: [{ path: 'subject' }] });
  });

  it('rate limits token issuance per client address', async () => {
    for (let index = 0; index < RATE_LIMITS.localTokenIssue.limit; index += 1) {
      await request(app.getHttpServer()).post('/v1/auth/local/token').send({ subject: `subject-${index}` }).expect(201);
    }

    const response = await request(app.getHttpServer()).post('/v1/auth/local/token').send({ subject: 'one-more' }).expect(429);

    expect(ProblemDetailsSchema.parse(response.body)).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });
});

describe('auth in managed-OIDC mode', () => {
  it('does not expose the local issuer routes', async () => {
    const app = await createTestApp({ env: { AUTH_MODE: 'oidc', AUTH_JWKS_URL: 'https://auth.example.eu/jwks' } });
    try {
      const response = await request(app.getHttpServer()).post('/v1/auth/local/token').send({ subject: 'x' }).expect(404);

      expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
    } finally {
      await app.close();
    }
  });
});

// Signed with the test issuer key so that only the claim under test is wrong.
async function signToken({ expiresAt, audience = AUDIENCE }: { expiresAt?: number; audience?: string }): Promise<string> {
  const { kid } = await localPublicJwk(PRIVATE_KEY_PEM);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setSubject('someone')
    .setIssuedAt()
    .setExpirationTime(expiresAt ?? '5m')
    .sign(await importPKCS8(PRIVATE_KEY_PEM, 'RS256'));
}
