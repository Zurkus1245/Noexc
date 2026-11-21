# Stage 1 spec — Coach ↔ Client link (binding for all agents)

Rules: `CLAUDE.md` (binding). This file fixes names and shapes so parallel work fits together.
Scope: local-only run (Docker Postgres, local auth issuer). No billing, no external vendors.

## Packages and names
| Path | Package name | Notes |
|---|---|---|
| `packages/config` | `@noexcuse/config` | `tsconfig.base.json` (strict, ES2022, moduleResolution bundler), `tsconfig.nest.json` (Bundler resolution + decorators for api), eslint flat config, prettier |
| `packages/contracts` | `@noexcuse/contracts` | zod schemas + inferred types, no IO |
| `packages/domain` | `@noexcuse/domain` | pure rules, depends only on `@noexcuse/contracts` types; clock passed in |
| `packages/api-client` | `@noexcuse/api-client` | typed fetch client over contracts (wave 2) |
| `apps/api` | `@noexcuse/api` | NestJS + Prisma |
| `apps/mobile` | `@noexcuse/mobile` | Expo Router |

Every package: `scripts: { build, typecheck, lint, test }`, `"type": "module"` except where tool requires CJS.
Source in `src/`, entry `src/index.ts`. Internal packages consumed as TS source (`"exports": {".": "./src/index.ts"}`), no build step needed for typecheck/test.
Test runner: Vitest everywhere except mobile (jest-expo).

## Domain model
- **User** `{ id: uuid, authSubject: string, role: 'coach'|'client', displayName: string(1..80), timezone: IANA string, createdAt }`. Role set once at profile creation.
- **Invite** `{ id, coachId, codeHash, expiresAt, usedAt|null, revokedAt|null, createdAt }`.
  Code: 16 random bytes → Crockford base32 (26 chars), shown once, stored as sha256 hex. TTL `INVITE_TTL_HOURS = 168`. Single use.
- **CoachClient** `{ id, coachId, clientId, status: 'active'|'paused'|'ended', createdAt, endedAt|null, endedBy: 'coach'|'client'|'admin'|null }`.
  At most one non-ended link per (coachId, clientId). Ended is terminal; re-invite creates a new link.
  Transitions: active→paused (coach), paused→active (coach), active|paused→ended (coach or client).
- **Consent** (append-only) `{ id, userId, type: 'tos'|'health_data'|'coach_access'|'marketing', version: string, granted: boolean, createdAt }`. Current = latest row per type.
  Current versions in contracts: `CONSENT_VERSIONS = { tos: '2026-11-01', health_data: '2026-11-01', coach_access: '2026-11-01', marketing: '2026-11-01' }`.
  A consent counts as valid only if latest row is `granted=true` with the current version.

## AccessPolicy (domain: pure decision; api: single `AccessPolicy` service in `coaching` module)
`decideClientAccess({ actor, clientId, link, consents, scope })` → `'allow' | 'deny'`
- actor is the client themself → allow.
- actor is coach → allow only if link exists, `link.coachId === actor.id`, status `active` or `paused`,
  client has valid `coach_access`; for `scope === 'health'` also valid `health_data`.
- anything else → deny. API maps deny → **404** `NOT_FOUND` (never 403, no existence leak).

## Redeem rules
Client redeems with `{ code, consents: [{type, version, granted}] }`. Must include granted `tos`, `health_data`, `coach_access` at current versions (explicit consent). `marketing` optional, default not granted.
Errors: invalid/expired/used/revoked code → all the same `INVITE_INVALID` (400) to avoid oracle. Coach cannot redeem. Already linked to that coach → `LINK_EXISTS` (409).

## Rate limits (constants in contracts, enforced in api, stored in Postgres not memory)
- create invite: 10 / hour / coach. Redeem attempts: 5 / 10 min / user. Exceeded → 429 `RATE_LIMITED`.

## REST `/v1` (all bodies validated by contracts schema)
| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/v1/auth/local/token` | anyone | **only when `AUTH_MODE=local`**; body `{subject}` → `{accessToken}`; RS256 key from env |
| GET | `/v1/auth/local/jwks` | anyone | local mode only |
| POST | `/v1/me` | authed, no profile | `{role, displayName, timezone}` → User |
| GET/PATCH | `/v1/me` | authed | patch `{displayName?, timezone?}` |
| GET/POST | `/v1/me/consents` | authed | POST appends one consent |
| GET | `/v1/me/export` | authed | full JSON of own data |
| DELETE | `/v1/me` | authed | deletes account: ends links, revokes invites, removes personal data; 204 |
| POST | `/v1/invites` | coach | → `{id, code, expiresAt}` (code returned once) |
| DELETE | `/v1/invites/:id` | coach owner | revoke; foreign → 404 |
| POST | `/v1/invites/redeem` | client | → CoachClient |
| GET | `/v1/coach/clients` | coach | cursor `{items, nextCursor}`, limit default 20 max 100 |
| GET | `/v1/coach/clients/:clientId` | coach | via AccessPolicy; foreign → 404 |
| GET | `/v1/client/links` | client | own links |
| POST | `/v1/links/:id/pause` `/resume` | coach | |
| POST | `/v1/links/:id/end` | coach or client of link | |

Auth: `Authorization: Bearer <JWT>`; api verifies via JWKS (`AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE`) behind `AuthProvider` interface. Same verification path in local mode — local issuer just serves the JWKS.
Errors: RFC 9457 `application/problem+json` `{ type, title, status, code, detail, requestId, errors? }`.
Error codes enum (contracts): `VALIDATION_FAILED, UNAUTHENTICATED, PROFILE_REQUIRED, PROFILE_EXISTS, FORBIDDEN_ROLE, NOT_FOUND, INVITE_INVALID, LINK_EXISTS, INVALID_TRANSITION, CONSENT_REQUIRED, RATE_LIMITED, IDEMPOTENCY_CONFLICT, INTERNAL`.
Non-safe POSTs accept `Idempotency-Key` (uuid), stored 24h in Postgres.

## Local env
`docker-compose.yml`: postgres:17 on 5432, db `noexcuse`, user/pass from `.env` (`.env.example` committed, `.env` gitignored).
