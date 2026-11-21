# 0005 Stage 1 dependencies

Status: accepted (founder approval, 2026-11-21). Lists the direct runtime and build/test dependencies of `apps/api` and
`apps/mobile` at stage 1. Every package is MIT or Apache-2.0. Versions come from the pnpm `catalog`.

## Context
CLAUDE.md requires a new dependency to be justified and approved through an ADR. This records the stage-1 set after
the fact so the founder can approve or reject it in one place.

## Backend `apps/api`

Runtime:

| Package | Version | License | Why |
|---|---|---|---|
| @nestjs/common, @nestjs/core, @nestjs/platform-express | 12.6.0 | MIT | Modular monolith framework (CLAUDE.md stack): DI, guards, pipes, interceptors. |
| @prisma/client, @prisma/adapter-pg | 7.10.1 | Apache-2.0 | Typed Postgres access (CLAUDE.md stack). The pg adapter keeps the query engine out of the runtime. |
| pg | 8.23.1 | MIT | Postgres driver used by the Prisma adapter. |
| jose | 6.2.18 | MIT | JWT verification via JWKS (ADR 0001); no native code. |
| zod | 4.6.7 | MIT | Contract schemas shared with mobile (`packages/contracts`). |
| rxjs | 7.8.2 | Apache-2.0 | Required by NestJS for interceptors. |

Build and test:

| Package | Version | License | Why |
|---|---|---|---|
| vite | 8.3.8 | MIT | SSR build to one file (ADR 0004). |
| unplugin-swc, @swc/core | 2.0.0, 1.16.22 | MIT, Apache-2.0 | Decorator metadata for Nest DI, shared by build and tests (ADR 0004). |
| vitest | 5.1.1 | MIT | Unit and e2e test runner (CLAUDE.md stack). |
| supertest, @nestjs/testing | 7.3.2, 12.6.0 | MIT | HTTP e2e tests and Nest test module. |
| prisma | 7.10.1 | Apache-2.0 | Migrations and client generation (CLAUDE.md stack). |
| typescript | 6.0.3 | Apache-2.0 | `strict` type checking (ADR 0003 pins 6.0.x). |
| @types/node, @types/express, @types/pg, @types/supertest | 24.19.2, 5.0.6, 8.23.1, 7.2.1 | MIT | Type definitions only. |

## Mobile `apps/mobile`

Runtime:

| Package | Version | License | Why |
|---|---|---|---|
| expo, expo-router | 58.0.26, 58.0.32 | MIT | Expo SDK and file-based routing (CLAUDE.md stack). |
| react, react-native | 19.3.0, 0.88.1 | MIT | UI runtime (New Architecture). |
| @tanstack/react-query | 5.108.2 | MIT | Server state (CLAUDE.md stack). |
| zustand | 5.1.0 | MIT | Minimal client state (CLAUDE.md stack). |
| react-hook-form, @hookform/resolvers | 7.92.0, 7.0.8 | MIT | Forms validated with the contract zod schemas (CLAUDE.md stack). |
| zod | 4.6.7 | MIT | Same schemas as the API. |
| expo-secure-store | 58.0.3 | MIT | Access token storage (CLAUDE.md: tokens only in secure storage). |
| expo-crypto | 58.0.8 | MIT | `randomUUID` for client-generated ids and idempotency keys. |
| expo-localization | 58.0.5 | MIT | Device locale and timezone for the profile form. |
| expo-clipboard | 58.0.4 | MIT | Copy of the invite code. |
| expo-status-bar | 58.0.5 | MIT | Status bar style. |
| react-native-safe-area-context | 5.11.1 | MIT | Safe areas; also used by `packages/ui`. |
| expo-constants, expo-linking, react-native-screens, @expo/log-box, @expo/metro-runtime | 58.0.16, 58.0.17, 4.30.1, 58.0.15, 58.0.17 | MIT | Required peers of `expo-router` (not imported directly by app code). |

Build and test:

| Package | Version | License | Why |
|---|---|---|---|
| jest, jest-expo | 30.5.2, 58.0.15 | MIT | Mobile unit tests with the Expo preset. |
| @testing-library/react-native | 14.1.0 | MIT | Component and hook tests (CLAUDE.md stack). |
| test-renderer | 1.3.1 | MIT | Peer of `@testing-library/react-native` (declared peer range `^1.0.0`). |
| @types/jest, @types/react, @types/node | 30.0.0, 19.3.0, 24.19.2 | MIT | Type definitions only. |
| typescript | 6.0.3 | Apache-2.0 | `strict` type checking. |

## Not in stage 1
CLAUDE.md names these, but they are not added yet and each needs its own ADR and approval when introduced:
MMKV (preferences), expo-notifications and FCM/APNs (push), pg-boss (jobs), S3 SDK (presigned storage),
Sentry (observability), Testcontainers and Maestro (test infrastructure), EAS Build/Submit/Update.

## Consequences
- Each new runtime dependency changes the review surface; the table above is the baseline to diff against.
- Versions are pinned via the catalog, so one edit upgrades every consumer.
- Packages listed as "Required peers" stay until `expo-router` drops them; removing them earlier breaks the app.
