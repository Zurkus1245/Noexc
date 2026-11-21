import { createPrivateKey } from 'node:crypto';
import { z } from 'zod';

const DEFAULT_API_PORT = 3000;
const DEFAULT_DATABASE_SCHEMA = 'public';
const SCHEMA_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/;
const ASYMMETRIC_KEY_TYPE_RSA = 'rsa';
const HTTPS_PROTOCOL = 'https:';
const HTTP_PROTOCOL = 'http:';
// Loopback only: a plain-HTTP JWKS on a remote host would let anyone on the path forge tokens.
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);
const LOCAL_AUTH_ENVIRONMENTS: ReadonlySet<string> = new Set(['development', 'test']);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_API_PORT),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    AUTH_MODE: z.enum(['local', 'oidc']),
    AUTH_ISSUER: z.string().min(1),
    AUTH_AUDIENCE: z.string().min(1),
    AUTH_JWKS_URL: z.url({ protocol: /^https?$/ }),
    LOCAL_AUTH_PRIVATE_KEY_PEM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (!isAllowedJwksUrl(env.AUTH_JWKS_URL, env.AUTH_MODE)) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_JWKS_URL'],
        message: 'must be https (plain http only for localhost, 127.0.0.1 or [::1] when AUTH_MODE=local)',
      });
    }
    if (env.AUTH_MODE !== 'local') return;
    if (!LOCAL_AUTH_ENVIRONMENTS.has(env.NODE_ENV)) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_MODE'],
        message: 'local auth is allowed only when NODE_ENV is development or test',
      });
    }
    if (!isRsaPrivateKeyPem(env.LOCAL_AUTH_PRIVATE_KEY_PEM)) {
      ctx.addIssue({
        code: 'custom',
        path: ['LOCAL_AUTH_PRIVATE_KEY_PEM'],
        message: 'must be an RSA private key PEM when AUTH_MODE=local (run pnpm auth:keygen)',
      });
    }
  });

// The JWKS is fetched on every verification path, so its transport must be TLS unless it is a local issuer.
function isAllowedJwksUrl(raw: string, mode: 'local' | 'oidc'): boolean {
  // A value that is not a URL at all is already reported by the base URL check.
  if (!URL.canParse(raw)) return true;
  const url = new URL(raw);
  if (url.protocol === HTTPS_PROTOCOL) return true;
  return url.protocol === HTTP_PROTOCOL && mode === 'local' && LOOPBACK_HOSTS.has(url.hostname);
}

// Never echoes the value: a malformed key must not end up in logs.
function isRsaPrivateKeyPem(pem: string | undefined): pem is string {
  if (pem === undefined) return false;
  try {
    return createPrivateKey(pem).asymmetricKeyType === ASYMMETRIC_KEY_TYPE_RSA;
  } catch {
    return false;
  }
}

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  databaseSchema: string;
  auth: {
    mode: 'local' | 'oidc';
    issuer: string;
    audience: string;
    jwksUrl: string;
  };
  localAuthPrivateKeyPem: string | undefined;
};

export const CONFIG = Symbol('CONFIG');

// The schema name is interpolated into the connection's search_path, so it is restricted to plain identifiers.
function databaseSchema(databaseUrl: string): string {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? DEFAULT_DATABASE_SCHEMA;
  if (!SCHEMA_NAME_PATTERN.test(schema)) {
    throw new Error('DATABASE_URL schema parameter must be a plain identifier');
  }
  return schema;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid configuration:\n${problems.join('\n')}`);
  }
  const data = parsed.data;
  return {
    nodeEnv: data.NODE_ENV,
    port: data.API_PORT,
    databaseUrl: data.DATABASE_URL,
    databaseSchema: databaseSchema(data.DATABASE_URL),
    auth: {
      mode: data.AUTH_MODE,
      issuer: data.AUTH_ISSUER,
      audience: data.AUTH_AUDIENCE,
      jwksUrl: data.AUTH_JWKS_URL,
    },
    localAuthPrivateKeyPem: data.LOCAL_AUTH_PRIVATE_KEY_PEM,
  };
}
