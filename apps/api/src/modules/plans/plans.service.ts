import { Inject, Injectable } from '@nestjs/common';
import {
  type AccountExport,
  type CalendarEntriesResponse,
  type CalendarEntry,
  type CalendarRangeQuery,
  type ClientPlansResponse,
  type CreateCalendarEntryRequest,
  type LocalDate,
  type MoveCalendarEntryRequest,
  type PageQuery,
  type Plan,
  type PlanContent,
  type PlanVersionsPage,
  type PutPlanRequest,
  type User,
  CALENDAR_DATE_WINDOW_DAYS,
} from '@noexcuse/contracts';
import { findWorkout, isWithinWindow, missingScheduledKeys, todayInTimeZone, workoutKeys } from '@noexcuse/domain';
import { ApiError } from '../../common/errors/api-error';
import { CLOCK, type Clock } from '../../common/clock/clock';
import { assertRole } from '../../common/request/assert-role';
import { isUniqueViolation } from '../../common/prisma/prisma-errors';
import { AccessPolicy, type EndedLink, type LinkLifecycleHook } from '../coaching';
import { type DateRange, type Db, PlansRepository, type PlanVersionHead } from './plans.repository';
import { type LinkParty, contentOf, toCalendarEntry, toDbDate, toPlan, toPlanVersionSummary } from './plans.mapper';
import { decodeVersionCursor, encodeVersionCursor } from './version-cursor';

const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const EMPTY_PLAN_VERSION = 0;

// The coach side of a link as AccessPolicy returns it (health scope): the client profile is always present.
export type CoachLink = { id: string; coachId: string | null; client: { id: string; timezone: string } };

// A link as the client sees it. The client id is the caller, so only the coach and the status matter here.
export type OwnLink = { id: string; coachId: string | null; clientId: string | null; status: string };

type CalendarEntryRowLike = Parameters<typeof toCalendarEntry>[0];

// Plans and calendar. Coach routes reach a link through AccessPolicy; client routes take the caller's own links.
// Implements the coaching port: link end and account deletion clean up through it.
@Injectable()
export class PlansService implements LinkLifecycleHook {
  constructor(
    private readonly repo: PlansRepository,
    private readonly access: AccessPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getPlan(coach: User, clientId: string): Promise<Plan> {
    const link = await this.coachLink(coach, clientId);
    return toPlan(link.id, link.client.id, await this.repo.currentVersion(link.id));
  }

  // The link lock (taken by the access check) serializes writers: the base version and the scheduled keys are read
  // under it. The unique (linkId, version) index stays as the last guard.
  async putPlan(coach: User, clientId: string, body: PutPlanRequest): Promise<Plan> {
    try {
      return await this.repo.transaction(async (tx) => {
        const link = await this.lockedCoachLink(tx, coach, clientId);
        const current = await this.repo.currentVersion(link.id, tx);
        const currentVersion = current?.version ?? EMPTY_PLAN_VERSION;
        if (body.baseVersion !== currentVersion) throw versionConflict();

        const scheduled = await this.repo.scheduledWorkoutKeys(link.id, tx);
        const missing = missingScheduledKeys(body.content, scheduled);
        if (missing.length > 0) throw workoutScheduled(missing);

        const row = await this.repo.insertVersion(tx, {
          linkId: link.id,
          version: currentVersion + 1,
          content: body.content,
          createdById: coach.id,
        });
        return toPlan(link.id, link.client.id, row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw versionConflict();
      throw error;
    }
  }

  async listVersions(coach: User, clientId: string, query: PageQuery): Promise<PlanVersionsPage> {
    const link = await this.coachLink(coach, clientId);
    const before = query.cursor === undefined ? null : decodeVersionCursor(query.cursor);
    // One row past the limit answers "is there a next page" without a count query.
    const rows = await this.repo.listVersions(link.id, before, query.limit + 1);
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map(toPlanVersionSummary),
      nextCursor: rows.length > query.limit && last !== undefined ? encodeVersionCursor(last.version) : null,
    };
  }

  async getVersion(coach: User, clientId: string, version: number): Promise<Plan> {
    const link = await this.coachLink(coach, clientId);
    const row = await this.repo.findVersion(link.id, version);
    if (row === null) throw notFound();
    return toPlan(link.id, link.client.id, row);
  }

  async listEntries(coach: User, clientId: string, range: CalendarRangeQuery): Promise<CalendarEntriesResponse> {
    const link = await this.coachLink(coach, clientId);
    const rows = await this.repo.listEntriesOfLink(link.id, toRange(range));
    return { items: await this.toEntries(rows, new Map([[link.id, partyOf(link)]])) };
  }

  // A repeated id with the same link, date and workout is the same entry: the create is idempotent.
  async createEntry(coach: User, clientId: string, body: CreateCalendarEntryRequest): Promise<CalendarEntry> {
    try {
      return await this.repo.transaction(async (tx) => {
        const link = await this.lockedCoachLink(tx, coach, clientId);
        this.assertDateInWindow(body.date, link.client.timezone);
        const content = contentOf(await this.repo.currentVersion(link.id, tx));

        const existing = await this.repo.findEntry(body.id, tx);
        if (existing !== null) return this.replayEntry(existing, link, body, content);

        if (!workoutKeys(content).has(body.workoutKey)) throw workoutNotInPlan();
        const row = await this.repo.createEntry(tx, {
          id: body.id,
          linkId: link.id,
          clientId: link.client.id,
          date: toDbDate(body.date),
          workoutKey: body.workoutKey,
        });
        return toCalendarEntry(row, partyOf(link), findWorkout(content, body.workoutKey));
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw entryIdConflict();
      throw error;
    }
  }

  async moveEntry(coach: User, clientId: string, entryId: string, body: MoveCalendarEntryRequest): Promise<CalendarEntry> {
    return this.repo.transaction(async (tx) => {
      const link = await this.lockedCoachLink(tx, coach, clientId);
      this.assertDateInWindow(body.date, link.client.timezone);
      const entry = await this.repo.findEntryOfLink(entryId, link.id, tx);
      if (entry === null) throw notFound();

      const content = contentOf(await this.repo.currentVersion(link.id, tx));
      if (!workoutKeys(content).has(entry.workoutKey)) throw workoutNotInPlan();

      const date = toDbDate(body.date);
      if ((await this.repo.moveEntry(tx, entryId, link.id, date)) === 0) throw notFound();
      return toCalendarEntry({ ...entry, date }, partyOf(link), findWorkout(content, entry.workoutKey));
    });
  }

  async deleteEntry(coach: User, clientId: string, entryId: string): Promise<void> {
    await this.repo.transaction(async (tx) => {
      const link = await this.lockedCoachLink(tx, coach, clientId);
      if ((await this.repo.deleteEntry(entryId, link.id, tx)) === 0) throw notFound();
    });
  }

  async listClientCalendar(client: User, range: CalendarRangeQuery, links: readonly OwnLink[]): Promise<CalendarEntriesResponse> {
    assertRole(client, 'client');
    const rows = await this.repo.listEntriesOfClient(client.id, toRange(range));
    return { items: await this.toEntries(rows, partiesOf(links, client.id)) };
  }

  // Open links only: an ended link's plan is no longer part of the client's training.
  async listClientPlans(client: User, links: readonly OwnLink[]): Promise<ClientPlansResponse> {
    assertRole(client, 'client');
    const open = links.filter((link) => link.status !== 'ended');
    const byLink = await this.latestVersions(open.map((link) => link.id));
    return { items: open.map((link) => toPlan(link.id, client.id, byLink.get(link.id) ?? null)) };
  }

  // The client's own health data across all their links: the current plan of each link that has one, and every entry.
  async exportClientData(clientId: string, links: readonly OwnLink[]): Promise<Pick<AccountExport, 'plans' | 'calendarEntries'>> {
    const own = links.filter((link) => link.clientId === clientId);
    const byLink = await this.latestVersions(own.map((link) => link.id));
    const plans = own.flatMap((link) => {
      const row = byLink.get(link.id);
      return row === undefined ? [] : [toPlan(link.id, clientId, row)];
    });
    const rows = await this.repo.listEntriesOfClient(clientId, null);
    return { plans, calendarEntries: await this.toEntries(rows, partiesOf(own, clientId)) };
  }

  // LinkLifecycleHook: link end (coach, client, or account deletion), inside the caller's transaction with the link
  // locks held. Each link keeps its entries dated before the client's local today; the rest are removed.
  async onLinksClosed(tx: Db, links: readonly EndedLink[]): Promise<void> {
    const now = this.clock.now();
    await this.repo.deleteFutureEntries(
      tx,
      links.map(({ linkId, clientTimezone }) => ({ linkId, from: toDbDate(todayInTimeZone(clientTimezone, now)) })),
    );
  }

  // LinkLifecycleHook: account deletion of a client, in the caller's transaction.
  async onClientDeleted(tx: Db, clientId: string): Promise<void> {
    await this.repo.deleteClientData(tx, clientId);
  }

  // Coach access to a client's health data, decided under the link lock: writers see the link as it is now.
  private lockedCoachLink(tx: Db, coach: User, clientId: string): Promise<CoachLink> {
    assertRole(coach, 'coach');
    return this.access.assertClientAccessLocked(tx, { id: coach.id, role: 'coach' }, clientId, 'health');
  }

  private async coachLink(coach: User, clientId: string): Promise<CoachLink> {
    assertRole(coach, 'coach');
    return this.access.assertClientAccess({ id: coach.id, role: 'coach' }, clientId, 'health');
  }

  private assertDateInWindow(date: LocalDate, timezone: string): void {
    const today = todayInTimeZone(timezone, this.clock.now());
    if (isWithinWindow(date, today, CALENDAR_DATE_WINDOW_DAYS)) return;
    throw new ApiError(BAD_REQUEST_STATUS, 'VALIDATION_FAILED', 'Request validation failed', [
      { path: 'date', message: `must be within ${CALENDAR_DATE_WINDOW_DAYS} days of today` },
    ]);
  }

  // A stored entry answers a repeated create only for the same slot; the id is then a retry, not a clash.
  private replayEntry(
    existing: CalendarEntryRowLike,
    link: CoachLink,
    body: CreateCalendarEntryRequest,
    content: PlanContent,
  ): CalendarEntry {
    if (existing.linkId !== link.id) throw notFound();
    const sameSlot = existing.date.getTime() === toDbDate(body.date).getTime() && existing.workoutKey === body.workoutKey;
    if (!sameSlot) throw entryIdConflict();
    return toCalendarEntry(existing, partyOf(link), findWorkout(content, existing.workoutKey));
  }

  // Latest version per link in one statement; links without a plan are absent from the map.
  private async latestVersions(linkIds: readonly string[]): Promise<Map<string, PlanVersionHead>> {
    const rows = await this.repo.currentVersions(linkIds);
    return new Map(rows.map((row) => [row.linkId, row]));
  }

  // One grouped read for the current content of every link in the response; entries resolve in memory.
  private async toEntries(
    rows: readonly CalendarEntryRowLike[],
    parties: ReadonlyMap<string, LinkParty>,
  ): Promise<CalendarEntry[]> {
    const latest = await this.latestVersions([...parties.keys()]);
    return rows.map((row) => {
      const party = parties.get(row.linkId);
      if (party === undefined) throw new Error(`calendar entry ${row.id} belongs to a link outside the response`);
      const content = contentOf(latest.get(row.linkId) ?? null);
      return toCalendarEntry(row, party, findWorkout(content, row.workoutKey));
    });
  }
}

function partyOf(link: CoachLink): LinkParty {
  return { coachId: link.coachId, clientId: link.client.id };
}

function partiesOf(links: readonly OwnLink[], clientId: string): Map<string, LinkParty> {
  return new Map(links.map((link) => [link.id, { coachId: link.coachId, clientId }]));
}

function toRange(range: CalendarRangeQuery): DateRange {
  return { from: toDbDate(range.from), to: toDbDate(range.to) };
}

function versionConflict(): ApiError {
  return new ApiError(CONFLICT_STATUS, 'VERSION_CONFLICT', 'The plan changed since it was loaded; reload and retry');
}

function workoutScheduled(keys: readonly string[]): ApiError {
  return new ApiError(
    CONFLICT_STATUS,
    'WORKOUT_SCHEDULED',
    'Scheduled workouts cannot be removed from the plan',
    keys.map((key) => ({ path: 'content', message: key })),
  );
}

function workoutNotInPlan(): ApiError {
  return new ApiError(UNPROCESSABLE_STATUS, 'WORKOUT_NOT_IN_PLAN', 'Workout is not in the current plan');
}

// The client-generated entry id is the entry's identity: reused for another slot it is a conflict.
function entryIdConflict(): ApiError {
  return new ApiError(CONFLICT_STATUS, 'ENTRY_ID_CONFLICT', 'Calendar entry id is already used for another entry');
}

function notFound(): ApiError {
  return new ApiError(NOT_FOUND_STATUS, 'NOT_FOUND', 'Not found');
}
