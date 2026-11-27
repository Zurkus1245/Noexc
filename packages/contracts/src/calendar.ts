import { z } from 'zod';
import { LocalDateSchema, MS_PER_DAY, UuidSchema, localDateToUtcMs } from './common';
import { WorkoutSchema } from './plan';

export const CALENDAR_MAX_RANGE_DAYS = 62;
// Entries may be scheduled up to this many days before or after the client's local today.
export const CALENDAR_DATE_WINDOW_DAYS = 366;

const CalendarRangeSchema = z.object({
  from: LocalDateSchema,
  to: LocalDateSchema,
});

export const CalendarRangeQuerySchema = CalendarRangeSchema.refine(
  (range) => localDateToUtcMs(range.to) >= localDateToUtcMs(range.from),
  { path: ['to'], error: '"to" must not be before "from"' },
).refine(
  (range) => (localDateToUtcMs(range.to) - localDateToUtcMs(range.from)) / MS_PER_DAY + 1 <= CALENDAR_MAX_RANGE_DAYS,
  { path: ['to'], error: `Range must not exceed ${CALENDAR_MAX_RANGE_DAYS} days` },
);
export type CalendarRangeQuery = z.infer<typeof CalendarRangeQuerySchema>;

// Workout is null only when the referenced key cannot be resolved; the API never produces that state.
export const CalendarEntrySchema = z.object({
  id: UuidSchema,
  linkId: UuidSchema,
  clientId: UuidSchema,
  coachId: UuidSchema.nullable(),
  date: LocalDateSchema,
  workoutKey: UuidSchema,
  blockTitle: z.string().nullable(),
  workout: WorkoutSchema.nullable(),
});
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;

export const CalendarEntriesResponseSchema = z.object({
  items: z.array(CalendarEntrySchema),
});
export type CalendarEntriesResponse = z.infer<typeof CalendarEntriesResponseSchema>;

export const CreateCalendarEntryRequestSchema = z.object({
  id: UuidSchema,
  date: LocalDateSchema,
  workoutKey: UuidSchema,
});
export type CreateCalendarEntryRequest = z.infer<typeof CreateCalendarEntryRequestSchema>;

export const MoveCalendarEntryRequestSchema = z.object({
  date: LocalDateSchema,
});
export type MoveCalendarEntryRequest = z.infer<typeof MoveCalendarEntryRequestSchema>;
