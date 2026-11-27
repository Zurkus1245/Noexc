# Stage 2 spec — Plan and calendar (binding for all agents)

Exit criterion: the coach changes the plan; the client sees the change after refreshing the screen.
Stage 1 rules, `CLAUDE.md`, and `docs/stage1-spec.md` still apply (problem+json, 404 for foreign resources, Idempotency-Key, cursor pagination).

## Decisions
- One plan per CoachClient link. The plan is a chain of **immutable versions**; each edit is a full new version (whole-document replace). There are no partial patches.
- Optimistic concurrency: a write carries `baseVersion`. If it does not match the current version: 409 `VERSION_CONFLICT`. An empty plan is version 0 and has no row.
- Calendar entries reference a workout by a stable `workoutKey` (uuid inside the content) and always resolve against the **current** version. That is how the client sees the coach's edits. Stage 3 snapshots the plan into the log; nothing here mutates history.
- A new version must still contain every `workoutKey` referenced by an existing calendar entry. Otherwise: 409 `WORKOUT_SCHEDULED`, with `errors[]` listing the keys.
- Access: every coach route goes through `AccessPolicy.assertClientAccess(actor, clientId, 'health')`. Training data is treated as health data. Paused links count as open (reads and writes allowed, same as stage 1). Ended or foreign links: 404.
- Ending a link (by coach, client, or account deletion) deletes that link's calendar entries dated on or after the client's local today, in the **same transaction**. Past entries and plan versions remain, and the client still sees them.
- Dates are `YYYY-MM-DD` in the client's TZ (`User.timezone`). "Today" is computed by the domain function `todayInTimeZone(tz, now)` with an injected clock. Never use the server-local date.

## Contracts (`packages/contracts/src/plan.ts`, `calendar.ts`; export from index)
```
ExerciseSchema  { key: uuid, name: str 1..80 trimmed, sets: int 1..20, repsMin: int 1..100, repsMax: int 1..100 (>= repsMin),
                  weightKg: number 0..500 multipleOf 0.25 | null, restSec: int 0..900 | null, note: str ..280 | null }
WorkoutSchema   { key: uuid, title: str 1..80, exercises: Exercise[1..30] }
BlockSchema     { key: uuid, title: str 1..80, workouts: Workout[0..14] }
PlanContentSchema { blocks: Block[0..20] }  // refine: every key unique across the whole document
PlanSchema      { linkId: uuid, clientId: uuid, version: int >= 0, content: PlanContent, updatedAt: iso | null }
PutPlanRequestSchema { baseVersion: int >= 0, content: PlanContent }
PlanVersionSummarySchema { version: int >= 1, createdAt: iso }
LocalDateSchema  'YYYY-MM-DD', a real calendar date (reuse it if common.ts already has one)
CalendarRangeQuerySchema { from: LocalDate, to: LocalDate }  // to >= from, span <= 62 days inclusive
CalendarEntrySchema { id: uuid, linkId: uuid, clientId: uuid, coachId: uuid | null, date: LocalDate, workoutKey: uuid,
                      blockTitle: str | null, workout: Workout | null }  // null only if unresolvable (defensive; must not happen)
CreateCalendarEntryRequestSchema { id: uuid (client-generated), date: LocalDate, workoutKey: uuid }
MoveCalendarEntryRequestSchema { date: LocalDate }
```
- Add error codes: `VERSION_CONFLICT`, `WORKOUT_SCHEDULED`, `WORKOUT_NOT_IN_PLAN`.
- Constants: `PLAN_LIMITS`, `CALENDAR_MAX_RANGE_DAYS = 62`, `CALENDAR_DATE_WINDOW_DAYS = 366` (entries must fall within ±366 days of the client's today).

## Domain (`packages/domain/src/plan.ts`, `calendar.ts`; pure, no IO)
- `workoutKeys(content): Set<string>`; `findWorkout(content, key): { workout, blockTitle } | null`.
- `missingScheduledKeys(newContent, scheduledKeys): string[]`.
- `todayInTimeZone(tz, now: Date): LocalDate` (via `Intl`), `addDays(date, n)`, `daysBetween(a, b)`, `isWithinWindow(date, today, days)`.
- Tests: DST edges (Europe/Berlin), UTC±14 zones, the leap day, duplicate keys rejected, conflict detection.

## API module `apps/api/src/modules/plans/{plans.controller,calendar.controller,plans.service,plans.repository,plans.mapper,plans.module}.ts`
Prisma:
```
model PlanVersion { id uuid, linkId uuid FK CoachClient onDelete Cascade, version Int, content Json, createdById uuid?, createdAt;
                    @@unique([linkId, version]) }
model CalendarEntry { id uuid (client-supplied), linkId uuid FK CoachClient onDelete Cascade, clientId uuid? FK User SetNull,
                      date @db.Date, workoutKey uuid, createdAt, updatedAt; @@index([clientId, date]) @@index([linkId, date]) }
```
- The current version is `max(version)` per link. A version insert relies on the unique constraint to catch races: a unique-constraint violation maps to 409 `VERSION_CONFLICT`.
- Client account deletion: `clientId` is set to NULL, rows are kept only if the plan module needs them. Simplest correct option: account deletion deletes that client's CalendarEntry rows and PlanVersions (personal health data). Coach deletion: the link ends, so future entries are deleted.
- `plans` is a separate module. It calls `coaching` only via exported `AccessPolicy` and a `CoachingService` public method (e.g. `findClientOpenLinks`). Link-end cleanup: `coaching` calls `PlansService.removeFutureEntries(tx, linkId, clientTz)` inside the end-link transaction. Do not touch tables across modules.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/v1/coach/clients/:clientId/plan` | coach | → Plan (version 0 empty if none) |
| PUT | `/v1/coach/clients/:clientId/plan` | coach | Idempotency-Key; PutPlanRequest → Plan; 409 VERSION_CONFLICT / WORKOUT_SCHEDULED |
| GET | `/v1/coach/clients/:clientId/plan/versions` | coach | cursor `{items: PlanVersionSummary[], nextCursor}` desc |
| GET | `/v1/coach/clients/:clientId/plan/versions/:version` | coach | → Plan for that version; missing → 404 |
| GET | `/v1/coach/clients/:clientId/calendar?from&to` | coach | → `{items: CalendarEntry[]}` sorted by (date, createdAt) |
| POST | `/v1/coach/clients/:clientId/calendar` | coach | Idempotency-Key; 201 CalendarEntry; 422 WORKOUT_NOT_IN_PLAN; date outside the window → 400 VALIDATION_FAILED |
| PATCH | `/v1/coach/clients/:clientId/calendar/:entryId` | coach | move date; entry of another link → 404 |
| DELETE | `/v1/coach/clients/:clientId/calendar/:entryId` | coach | 204 |
| GET | `/v1/client/calendar?from&to` | client | own entries across all links (open, plus the past of ended links), resolved against each link's current version |
| GET | `/v1/client/plans` | client | `{items: Plan[]}` for own open links |

The client cannot write in stage 2.

## api-client
Typed methods for every route above, parsed with the contract schemas. Unknown enum → `unknown` as before.

## Mobile
- Coach: client detail → "Plan" screen (blocks → workouts → exercises editor; RHF + `PutPlanRequestSchema`; save sends `baseVersion`; on VERSION_CONFLICT show a localized message and reload) and "Calendar" screen (week view with prev/next, list per day, assign a workout from the current plan to a date, move to another date via a date-picker-free day stepper, remove).
- Client: new tab "Calendar" (week view, pull to refresh, refetch on focus, read-only workout details).
- All strings in `en.ts` and `ru.ts`; tokens from `@noexcuse/ui`; no literals.

## Tests
- Domain unit tests, contract tests, API service unit tests.
- E2E: extend `apps/api/test/idor.e2e-spec.ts` with every new route × caller types × link states. Concurrency: two PUTs with the same baseVersion → one 200, one 409. Link end removes future entries and keeps past ones.
- Mobile RNTL tests for the editor save/conflict and the client calendar.
