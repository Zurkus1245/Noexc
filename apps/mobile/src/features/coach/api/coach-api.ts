import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { DEFAULT_PAGE_LIMIT } from '@noexcuse/contracts';
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
