import {
  type CalendarEntry,
  type Plan,
  type PlanContent,
  type PlanVersionSummary,
  type LocalDate,
  localDateToUtcMs,
  utcMsToLocalDate,
} from '@noexcuse/contracts';
import type { WorkoutLocation } from '@noexcuse/domain';
import type { CalendarEntry as CalendarEntryRow, PlanVersion as PlanVersionRow } from '../../generated/prisma/client';

export const EMPTY_PLAN_CONTENT: PlanContent = { blocks: [] };

// Who owns a link as seen by the calendar: coach may be gone (null), client is always present on an entry.
export type LinkParty = { coachId: string | null; clientId: string };

// Version 0 is the empty plan and has no row.
export const contentOf = (row: Pick<PlanVersionRow, 'content'> | null): PlanContent =>
  row === null ? EMPTY_PLAN_CONTENT : (row.content as PlanContent);

// Stored content was validated by the contract on write; the JSON column is read back, not re-validated.
export const toPlan = (
  linkId: string,
  clientId: string,
  row: Pick<PlanVersionRow, 'version' | 'content' | 'createdAt'> | null,
): Plan => ({
  linkId,
  clientId,
  version: row?.version ?? 0,
  content: contentOf(row),
  updatedAt: row?.createdAt.toISOString() ?? null,
});

export const toPlanVersionSummary = (row: Pick<PlanVersionRow, 'version' | 'createdAt'>): PlanVersionSummary => ({
  version: row.version,
  createdAt: row.createdAt.toISOString(),
});

// Calendar dates are stored as @db.Date: midnight UTC of the local calendar date.
export const toDbDate = (date: LocalDate): Date => new Date(localDateToUtcMs(date));

export const toCalendarEntry = (
  row: CalendarEntryRow,
  party: LinkParty,
  location: WorkoutLocation | null,
): CalendarEntry => ({
  id: row.id,
  linkId: row.linkId,
  clientId: party.clientId,
  coachId: party.coachId,
  date: utcMsToLocalDate(row.date.getTime()),
  workoutKey: row.workoutKey,
  blockTitle: location?.blockTitle ?? null,
  workout: location?.workout ?? null,
});
