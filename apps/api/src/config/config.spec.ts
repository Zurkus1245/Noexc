import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const { privateKey: PEM } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const BASE_ENV = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/noexcuse?schema=public',
  AUTH_ISSUER: 'noexcuse-local',
  AUTH_AUDIENCE: 'noexcuse-api',
  AUTH_JWKS_URL: 'http://localhost:3000/v1/auth/local/jwks',
};

describe('loadConfig', () => {
  it('reads the database schema and applies defaults', () => {
    const config = loadConfig({ ...BASE_ENV, AUTH_MODE: 'local', LOCAL_AUTH_PRIVATE_KEY_PEM: PEM });

    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      databaseSchema: 'public',
      auth: { mode: 'local', issuer: 'noexcuse-local', audience: 'noexcuse-api' },
    });
  });

  it('requires NODE_ENV: there is no default environment', () => {
    expect(() => loadConfig({ ...BASE_ENV, NODE_ENV: undefined, AUTH_MODE: 'oidc' })).toThrow(/NODE_ENV/);
  });

  it('does not require a local signing key in managed-OIDC mode', () => {
    const config = loadConfig({ ...BASE_ENV, AUTH_MODE: 'oidc', AUTH_JWKS_URL: 'https://auth.example.eu/jwks' });

    expect(config.auth.mode).toBe('oidc');
  });

  it('allows local auth in test', () => {
    const config = loadConfig({ ...BASE_ENV, NODE_ENV: 'test', AUTH_MODE: 'local', LOCAL_AUTH_PRIVATE_KEY_PEM: PEM });

    expect(config.auth.mode).toBe('local');
  });

  it('refuses local auth in production', () => {
    expect(() =>
      loadConfig({ ...BASE_ENV, NODE_ENV: 'production', AUTH_MODE: 'local', LOCAL_AUTH_PRIVATE_KEY_PEM: PEM }),
    ).toThrow(/AUTH_MODE: local auth is allowed only when NODE_ENV is development or test/);
  });

  it('accepts an https JWKS URL in managed-OIDC mode', () => {
    const config = loadConfig({
      ...BASE_ENV,
      NODE_ENV: 'production',
      AUTH_MODE: 'oidc',
      AUTH_JWKS_URL: 'https://auth.example.eu/.well-known/jwks.json',
    });

    expect(config.auth.jwksUrl).toBe('https://auth.example.eu/.well-known/jwks.json');
  });

  it.each(['http://auth.example.eu/jwks', 'http://localhost:3000/jwks'])(
    'refuses a plain-http JWKS URL in managed-OIDC mode: %s',
    (jwksUrl) => {
      expect(() => loadConfig({ ...BASE_ENV, AUTH_MODE: 'oidc', AUTH_JWKS_URL: jwksUrl })).toThrow(/AUTH_JWKS_URL/);
    },
  );

  it.each(['http://localhost:3000/jwks', 'http://127.0.0.1:3000/jwks', 'http://[::1]:3000/jwks'])(
    'accepts a loopback http JWKS URL in local mode: %s',
    (jwksUrl) => {
      const config = loadConfig({
        ...BASE_ENV,
        AUTH_MODE: 'local',
        AUTH_JWKS_URL: jwksUrl,
        LOCAL_AUTH_PRIVATE_KEY_PEM: PEM,
      });

      expect(config.auth.jwksUrl).toBe(jwksUrl);
    },
  );

  it('reports a JWKS value that is not a URL as configuration, not as a crash', () => {
    expect(() => loadConfig({ ...BASE_ENV, AUTH_MODE: 'oidc', AUTH_JWKS_URL: 'not a url' })).toThrow(
      /Invalid configuration:\nAUTH_JWKS_URL/,
    );
  });

  it('refuses a non-loopback http JWKS URL even in local mode', () => {
    expect(() =>
      loadConfig({
        ...BASE_ENV,
        AUTH_MODE: 'local',
        AUTH_JWKS_URL: 'http://auth.example.eu/jwks',
        LOCAL_AUTH_PRIVATE_KEY_PEM: PEM,
      }),
    ).toThrow(/AUTH_JWKS_URL/);
  });

  it('refuses a local key that is not an RSA private key, without echoing it', () => {
    const notAKey = 'replace-with-generated-rsa-private-key-pem';

    let message = '';
    try {
      loadConfig({ ...BASE_ENV, AUTH_MODE: 'local', LOCAL_AUTH_PRIVATE_KEY_PEM: notAKey });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toMatch(/LOCAL_AUTH_PRIVATE_KEY_PEM: must be an RSA private key PEM/);
    expect(message).not.toContain(notAKey);
  });

  it('refuses a database URL that is not PostgreSQL', () => {
    expect(() =>
      loadConfig({ ...BASE_ENV, DATABASE_URL: 'mysql://localhost/db', AUTH_MODE: 'oidc', AUTH_JWKS_URL: 'https://auth.example.eu/jwks' }),
    ).toThrow(
      /DATABASE_URL/,
    );
  });
});
