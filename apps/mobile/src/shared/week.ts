import { localDateToUtcMs, type LocalDate } from '@noexcuse/contracts';
import { addDays } from '@noexcuse/domain';

export const WEEK_LENGTH_DAYS = 7;

// Pure calendar arithmetic on LocalDate strings; no zone is involved, so results never shift with the device offset.
// Monday of the week containing `date`; weeks start on Monday.
export const startOfWeek = (date: LocalDate): LocalDate => {
  const sundayBasedDay = new Date(localDateToUtcMs(date)).getUTCDay();
  const mondayBasedDay = (sundayBasedDay + WEEK_LENGTH_DAYS - 1) % WEEK_LENGTH_DAYS;
  return addDays(date, -mondayBasedDay);
};

export const weekDays = (weekStart: LocalDate): LocalDate[] =>
  Array.from({ length: WEEK_LENGTH_DAYS }, (_, offset) => addDays(weekStart, offset));

export const weekEnd = (weekStart: LocalDate): LocalDate => addDays(weekStart, WEEK_LENGTH_DAYS - 1);

// Moves a week start by whole weeks; negative values go back in time.
export const shiftWeek = (weekStart: LocalDate, weeks: number): LocalDate =>
  addDays(weekStart, weeks * WEEK_LENGTH_DAYS);
