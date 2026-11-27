# 0006 Offline tiers: MVP is online-only (T0)

Status: accepted (founder approval, 2026-11-23). Confirms CLAUDE.md §6; changes no rule and adds no dependency.

## Context
CLAUDE.md §6 forbids offline writes in the MVP: offline is an explicit error, never a fake "saved". The founder asked how
the app works offline and whether a local database is needed. The analysis is in `docs/requirements/32-q2-offline-local-db.md`.
Today the app keeps data only in TanStack Query memory, cleared on sign-out; there is no persistent cache or local DB.
Health data (GDPR art. 9) stored on the device widens the risk window after a consent revocation or unlink.

## Decision
Offline support is split into three tiers. The MVP implements T0 only.

| Tier | Behaviour | Status |
|---|---|---|
| T0 | Online writes. Without network: "no connection" banner, retry button, a set shown as "not sent" in screen memory only. Nothing is stored on the device beyond tokens (SecureStore) and preferences. | **In MVP** |
| T1 | Persistent read cache for viewing "Today", the calendar and the plan without network. | Deferred; needs its own ADR (storage, persist plugin, encryption key) and DPIA input |
| T2 | Offline outbox of the client's set logs in an encrypted local DB. | Deferred; needs its own ADR and a founder-approved change of CLAUDE.md §6 |

- CLAUDE.md §6, BR-SYNC-004 and NFR-REL-007 stay unchanged.
- "Saved" is shown only after a server 2xx response (BR-SYNC-002).
- T1 and T2 are revisited after the beta, using measured data: share of sessions started without network and of lost sets.
- Server-side idempotency per `(linkId, clientUuid)` is required already in T0 (BL-OFF-02), so a retry never duplicates a log.

## Consequences
- Journey JRN-13 steps with a persistent queue and a general cache (OF-1, OF-2) describe T1/T2 and do not apply to the MVP.
- No cache purge logic is needed in the MVP beyond the existing in-memory clear on sign-out.
- FR-CAL-102 (plan offline) conflicts with FR-CAL-109 (no cached facts) only while T1 is deferred; it is not an MVP requirement.
- A network detector and the banner (BL-OFF-01) are T0 work and need a justified dependency decision.
- Clients who train without network cannot record sets; the beta must measure how often this happens (BL-OFF-15).
- The architecture stays open for T1/T2: local storage would sit behind the mobile `shared/query` layer, with the same contracts and idempotency keys.
