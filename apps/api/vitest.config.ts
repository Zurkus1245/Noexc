import { generateKeyPairSync } from 'node:crypto';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { toTestDatabaseUrl } from './test/database-url';

// Ephemeral signing key per run: the local issuer and the test token verifier share it, nothing is persisted.
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    // e2e files share one Postgres schema, so they run one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: toTestDatabaseUrl(process.env.DATABASE_URL),
      NODE_ENV: 'test',
      AUTH_MODE: 'local',
      AUTH_ISSUER: 'noexcuse-test',
      AUTH_AUDIENCE: 'noexcuse-api-test',
      // Never fetched: e2e tests replace the JWKS key set with the ephemeral key above.
      AUTH_JWKS_URL: 'http://127.0.0.1:9/v1/auth/local/jwks',
      LOCAL_AUTH_PRIVATE_KEY_PEM: privateKey,
    },
  },
});
