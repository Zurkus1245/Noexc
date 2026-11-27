# 0002 Local-first hosting

Status: accepted for the local stage. EU hosting superseded by ADR 0008 (market Russia, hosting in Russia).

## Context
The market is EU and health data is GDPR art. 9 special category, so production hosting, managed Postgres
and S3-compatible storage must be in an EU region under a DPA. Stage 1 is a local-only run with no vendors.

## Decision
- Stage 1 runs locally: PostgreSQL 17 (`postgres:17-alpine`) via `docker-compose.yml` on `127.0.0.1:5432`.
- Production hosting is EU-region only. The specific vendors (managed Postgres, object storage, OIDC, Sentry,
  push) are chosen in a follow-up ADR with DPA and data-residency evidence.

## Consequences
- Local data is disposable and stays on the developer machine.
- No production vendor is referenced in code or config until the follow-up ADR is accepted.
