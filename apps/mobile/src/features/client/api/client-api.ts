import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ApiClient } from '@noexcuse/api-client';
import type { LocalDate } from '@noexcuse/contracts';

export const linksQueryKey = ['client', 'links'] as const;
export const calendarQueryKey = ['client', 'calendar'] as const;
export const plansQueryKey = ['client', 'plans'] as const;

export interface CalendarRange {
  readonly from: LocalDate;
  readonly to: LocalDate;
}

export const calendarQuery = (api: ApiClient, range: CalendarRange) =>
  queryOptions({
    queryKey: [...calendarQueryKey, range.from, range.to],
    queryFn: () => api.client.getCalendar(range),
  });

export const plansQuery = (api: ApiClient) =>
  queryOptions({
    queryKey: plansQueryKey,
    queryFn: () => api.client.listPlans(),
  });

export const linksQuery = (api: ApiClient) =>
  infiniteQueryOptions({
    queryKey: linksQueryKey,
    queryFn: ({ pageParam }) => api.links.listOwn({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
