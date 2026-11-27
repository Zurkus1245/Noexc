import { z } from 'zod';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const UNKNOWN_ENUM_VALUE = 'unknown';

export const UuidSchema = z.uuid();
export type Uuid = z.infer<typeof UuidSchema>;

// UTC only: the API stores and returns timestamps as UTC ISO-8601 with a Z suffix.
export const IsoDateTimeSchema = z.iso.datetime();
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

// Intl accepts "+05:00"-style offsets in some engines; those are not IANA names, so they are rejected up front.
const isIanaTimeZone = (value: string): boolean => {
  if (!/^[A-Za-z]/.test(value)) return false;
  try {
    return Boolean(new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone);
  } catch {
    return false;
  }
};

export const IanaTimezoneSchema = z.string().min(1).max(64).refine(isIanaTimeZone);
export type IanaTimezone = z.infer<typeof IanaTimezoneSchema>;

export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  cursor: z.string().min(1).optional(),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;

export const cursorPage = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

// Response enums are tolerant: a value this client does not know maps to 'unknown' instead of failing the response.
export const tolerantEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal(UNKNOWN_ENUM_VALUE)]).catch(UNKNOWN_ENUM_VALUE);

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Calendar dates are UTC-based arithmetic: a date never picks up the server's or device's local offset.
export const localDateToUtcMs = (date: string): number => new Date(`${date}T00:00:00.000Z`).getTime();
export const utcMsToLocalDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

// Rejects impossible dates by round-tripping: 2026-02-30 normalizes to 2026-03-02 and no longer matches.
const isRealCalendarDate = (value: string): boolean => {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const ms = localDateToUtcMs(value);
  return Number.isFinite(ms) && utcMsToLocalDate(ms) === value;
};

export const LocalDateSchema = z.string().refine(isRealCalendarDate, { error: 'Must be a real calendar date (YYYY-MM-DD)' });
export type LocalDate = z.infer<typeof LocalDateSchema>;
