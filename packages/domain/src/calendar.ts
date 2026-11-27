import { MS_PER_DAY, localDateToUtcMs, utcMsToLocalDate, type LocalDate } from '@noexcuse/contracts';

const DAY_PARTS = ['year', 'month', 'day'] as const;

// Wall-clock date of an instant in a named zone; the only place a zone enters date logic.
export function todayInTimeZone(timeZone: string, now: Date): LocalDate {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const [year, month, day] = DAY_PARTS.map((type) => parts.find((part) => part.type === type)?.value ?? '');
  return `${year}-${month}-${day}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return utcMsToLocalDate(localDateToUtcMs(date) + days * MS_PER_DAY);
}

// Signed count of days from `from` to `to`: positive when `to` is later.
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((localDateToUtcMs(to) - localDateToUtcMs(from)) / MS_PER_DAY);
}

// Inclusive on both edges: a date exactly `days` away from `today` is inside the window.
export function isWithinWindow(date: LocalDate, today: LocalDate, days: number): boolean {
  return Math.abs(daysBetween(today, date)) <= days;
}
