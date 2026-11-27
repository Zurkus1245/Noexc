import { localDateToUtcMs, type LocalDate } from '@noexcuse/contracts';
import { currentLocale, t } from '../../../shared/i18n';

// Calendar dates are zone-free, so they are formatted in UTC to keep the printed day equal to the stored date.
const formatShortDate = (date: LocalDate, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(currentLocale(), { ...options, timeZone: 'UTC' }).format(localDateToUtcMs(date));

export const formatDayHeading = (date: LocalDate): string =>
  formatShortDate(date, { weekday: 'short', day: 'numeric', month: 'short' });

export const formatWeekRange = (from: LocalDate, to: LocalDate): string =>
  t('clientCalendar.weekRange', {
    from: formatShortDate(from, { day: 'numeric', month: 'short' }),
    to: formatShortDate(to, { day: 'numeric', month: 'short' }),
  });
