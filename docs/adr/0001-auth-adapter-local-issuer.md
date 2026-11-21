# 0001 Auth adapter with local issuer

Status: accepted (local stage). Production OIDC vendor pending (see 0002).

## Context
CLAUDE.md mandates managed OIDC behind an `AuthProvider` adapter with JWT verified via JWKS. Stage 1 runs
fully local with no external vendors, so a real identity provider cannot be used yet.

## Decision
- The API verifies every bearer JWT through one path: JWKS at `AUTH_JWKS_URL`, checked against `AUTH_ISSUER`
  and `AUTH_AUDIENCE`.
- `AUTH_MODE=local` makes the API serve a local issuer: `POST /v1/auth/local/token` and
  `GET /v1/auth/local/jwks`, signing RS256 tokens with `LOCAL_AUTH_PRIVATE_KEY_PEM`.
- Production sets `AUTH_MODE` to the managed provider; the local issuer endpoints do not exist there.

## Consequences
- Local and production share the verification code; only key source and issuer change.
- The API must refuse to start with `AUTH_MODE=local` outside a local environment.
- The private key lives only in `.env` (gitignored); it is never committed or logged.
