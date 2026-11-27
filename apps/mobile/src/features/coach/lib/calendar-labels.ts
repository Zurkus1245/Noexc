import { localDateToUtcMs, type LocalDate } from '@noexcuse/contracts';

// Dates are wall-clock strings: formatting in UTC keeps the printed day equal to the stored day on every device.
export const dayLabel = (date: LocalDate): string =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(localDateToUtcMs(date)),
  );
