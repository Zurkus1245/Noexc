import { queryOptions } from '@tanstack/react-query';
import type { ApiClient } from '@noexcuse/api-client';

export const meQueryKey = ['me'] as const;

export const meQuery = (api: ApiClient) =>
  queryOptions({
    queryKey: meQueryKey,
    queryFn: () => api.me.get(),
  });
