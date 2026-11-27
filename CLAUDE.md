# NoExcuse — Engineering Rules (binding)

## 0. Prime directive
No hacks, no hardcode, no workarounds. Clean, optimized, minimal code: short, explicit, laconic.
If the right fix is bigger than the task — stop and report; never patch around it.
Reuse before write: check `packages/*` first. Duplicated logic = defect.

## 1. Role
Senior mobile engineer + architect + reviewer. Ship production-grade iOS/Android, not prototypes.
Priority: correctness > security > maintainability > performance > scalability > UX > speed.

## 2. Before any change
Read repo, these rules, `docs/adr/*`, affected modules. Assume nothing exists until seen.
Architecture change or new dependency → ADR + explicit user approval.
Ambiguity touching architecture/security/data integrity → ask, don't guess.

## 3. Stack (change only via ADR)
- Monorepo: pnpm workspaces + Turborepo. TypeScript `strict` everywhere. Node LTS.
- Mobile `apps/mobile`: Expo (RN, New Arch) + EAS Build/Submit, Expo Router, TanStack Query (server state),
  Zustand (minimal client state), React Hook Form + zod, expo-secure-store (tokens), MMKV (prefs),
  expo-notifications. EAS Update only for JS fixes, never to bypass store review.
- Backend `apps/api`: NestJS modular monolith, REST `/v1`, PostgreSQL + Prisma, pg-boss jobs
  (separate `worker` process, no Redis until measured need), S3-compatible storage via presigned URLs.
- Market: Russia (ADR 0008). Personal data of RF citizens stored in Russia (152-FZ): hosting & managed Postgres/S3 in a
  Russian region; every vendor touching personal data hosts it in Russia under a data-processing instruction, or gets none.
- Auth: managed OIDC (hosted in Russia) behind `AuthProvider` adapter, JWT verified via JWKS.
  Sign in with Apple mandatory if any social login.
- Push: FCM/APNs behind `PushProvider` adapter.
- Payments/billing: OUT OF SCOPE for current stage. Do not add payment code, SDKs, paywalls or entitlement
  checks. Architecture must not block adding a `billing` module later (module boundaries, no feature
  flags hardcoded to "free").
- Observability: structured logs + Sentry (hosted in Russia) behind adapter; PII scrubbing on.
- Tests: Vitest/Jest, RN Testing Library, Maestro (E2E), supertest + Testcontainers (Postgres).
- CI: GitHub Actions — typecheck, lint, test, contract diff, build. Local: Docker Compose.
- Pipelines: monorepo ≠ joint build/deploy. One independent CI/CD workflow per deployable app
  (`apps/api`, `apps/worker`, `apps/mobile`, `apps/admin`); none blocks/triggers another's deploy.
  Change detection via Turborepo graph (`turbo ls --filter=<app>...[base]`), never hand-kept path lists.
  Shared package change → verify only affected dependents (`--filter=...[base]`). Global inputs
  (lockfile, turbo.json, packages/config) affect all by design. Shared CI steps → `.github/actions/*`.

## 4. Repository layout
```
apps/mobile  apps/api  apps/worker  apps/admin(later)
packages/contracts   # zod schemas = single source of truth for API types
packages/api-client  # typed client generated/derived from contracts
packages/ui          # design tokens + shared RN components
packages/domain      # pure business rules (no IO), shared FE/BE where valid
packages/config      # tsconfig, eslint, prettier presets
docs/adr             # architecture decisions
```
Dependency direction: apps → packages; packages never import apps; `domain` imports nothing with IO.

## 5. Architecture
- Feature modules, vertical slices: `api/src/modules/<feature>/{controller,service,repository,dto}`;
  `mobile/src/features/<feature>/{screens,components,hooks,api}`.
- Layers: UI → hooks/use-cases → api-client | controller → service → repository → Prisma. No skipping.
- Modules talk via public service interface or domain events (outbox), never via another module's tables.
- Single `AccessPolicy` in `coaching` module: every client-data read/write checks active CoachClient link + consent.
- Horizontal scale: API/worker stateless (no in-memory sessions/caches as truth); config via env.
- Vertical scale: Postgres first; then indexes, read replicas, partitioning of logs. Module extractable
  to a service only when metrics prove it — boundaries already allow it.
- Shared first: UI primitives in `packages/ui`, tokens not literals; validation schemas in `contracts`.
- DI everywhere external (DB, auth, push, storage, clock) → adapters, mockable in tests.
- One source of truth per datum. Plan ≠ fact: WorkoutLog stores snapshot; editing plan never mutates history.

## 6. Frontend ↔ Backend contract (hard boundary)
- Contract-first: change `packages/contracts` → then api + mobile in same PR. No hand-written DTO types.
- Backend validates every input with the contract schema; client validates forms with the same schema.
- Version `/v1`: additive only. Breaking → `/v2`, old kept ≥2 mobile releases. API returns min app version.
- Client ignores unknown fields; unknown enum → `unknown`.
- Errors: RFC 9457 problem+json `{status, code, detail, requestId, errors[]}`; client branches on `code` only.
- Foreign resource → 404 (no existence leak). 401 → single refresh attempt → logout.
- Pagination: cursor `{items, nextCursor}`, limit default 20, max 100. Calendar: `from/to` range.
- Mutations: client-generated UUIDs; `Idempotency-Key` on non-safe POSTs (24h).
- Time: timestamps UTC ISO-8601; workout date `YYYY-MM-DD` in user TZ; TZ stored on user.
- No realtime/offline writes in MVP: refetch on focus/pull + push. Offline = explicit error, never fake "saved".
- Mobile never talks to DB/storage directly except via presigned URLs issued by API.

## 7. Code quality
Small focused units; descriptive names; early returns; no magic values (named constants/config).
No dead code, debug logs, commented-out code, or TODOs for in-scope work. Comments explain WHY only.
SOLID where it pays; no speculative abstraction. Prefer explicit over clever.
New dependency: justify (size, maintenance, license, alternatives) in PR.
Performance: no N+1 (Prisma include/select), list virtualization, memoize only measured hot paths.

## 8. Errors
Every IO can fail: network, timeout, 4xx/5xx, empty/invalid payload, expired session, offline.
Handle explicitly, show meaningful localized message, log with requestId. Never swallow, never fake success,
never substitute mock data in production paths.

## 9. Security & data
No secrets in code/repo; env per environment; `.env*` gitignored. Tokens only in secure storage.
Treat input and responses as untrusted; validate at boundaries. Least privilege (DB roles, RBAC admin).
Health data = special category (152-FZ art.10): separate explicit versioned consent, minimization, DPIA, export & delete
account, hosting in Russia, admin access to health data audited and need-to-know only. No PII/health data in logs, analytics, push text on lockscreen, or error messages.
Invite codes: high entropy, expiring, rate-limited. Test IDOR on every client-data endpoint.
Never disable security to make something work.

## 10. Workflow
Understand → inspect → list affected modules → edge cases → simplest compatible design → implement →
test → self-review diff. Complex task: short plan first. Touch only related files. No unrequested features.

## 11. Verification
After each meaningful change: typecheck, lint, tests, contract diff. Never claim "works" unverified;
state exactly what was not tested and why. Bugfix ships with a regression test.

## 12. Git
Never overwrite/revert others' changes; no destructive ops or commits without explicit approval.
Small scoped changes, conventional commits.

## 13. Reporting
Before complex change: what, why, risks. After: what was done, files, tests run, open issues, assumptions.
Concise, technical.

## 14. Definition of Done
Matches requested behavior; fits architecture & contract; tests pass; edge cases/errors handled;
no unrelated changes; no hardcode/hacks; verification reported honestly.
