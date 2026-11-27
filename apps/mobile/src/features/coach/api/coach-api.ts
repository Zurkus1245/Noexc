import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { DEFAULT_PAGE_LIMIT, type LocalDate } from '@noexcuse/contracts';
import type { ApiClient } from '@noexcuse/api-client';

export const clientsQueryKey = ['coach', 'clients'] as const;

export const clientsQuery = (api: ApiClient) =>
  infiniteQueryOptions({
    queryKey: clientsQueryKey,
    queryFn: ({ pageParam }) => api.coach.listClients({ limit: DEFAULT_PAGE_LIMIT, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

export const coachClientQueryKey = (clientId: string) => ['coach', 'client', clientId] as const;

export const coachClientQuery = (api: ApiClient, clientId: string) =>
  queryOptions({
    queryKey: coachClientQueryKey(clientId),
    queryFn: () => api.coach.getClient(clientId),
  });

export const coachPlanQueryKey = (clientId: string) => ['coach', 'plan', clientId] as const;

export const coachPlanQuery = (api: ApiClient, clientId: string) =>
  queryOptions({
    queryKey: coachPlanQueryKey(clientId),
    queryFn: () => api.coach.getPlan(clientId),
  });

export const coachCalendarQueryKey = (clientId: string) => ['coach', 'calendar', clientId] as const;

export const coachCalendarQuery = (api: ApiClient, clientId: string, range: { from: LocalDate; to: LocalDate }) =>
  queryOptions({
    queryKey: [...coachCalendarQueryKey(clientId), range.from, range.to] as const,
    queryFn: () => api.coach.getCalendar(clientId, range),
  });
