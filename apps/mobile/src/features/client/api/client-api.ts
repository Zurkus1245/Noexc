import { infiniteQueryOptions } from '@tanstack/react-query';
import type { ApiClient } from '@noexcuse/api-client';

export const linksQueryKey = ['client', 'links'] as const;

export const linksQuery = (api: ApiClient) =>
  infiniteQueryOptions({
    queryKey: linksQueryKey,
    queryFn: ({ pageParam }) => api.links.listOwn({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
