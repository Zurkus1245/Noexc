import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RedeemInviteRequest } from '@noexcuse/contracts';
import { useApi } from '../../../shared/api/api-context';
import { useIdempotencyKey } from '../../../shared/api/idempotency';
import { calendarQuery, linksQuery, linksQueryKey, plansQuery, type CalendarRange } from '../api/client-api';

export const useMyLinks = () => {
  const api = useApi();
  return useInfiniteQuery(linksQuery(api));
};

export const useMyCalendar = (range: CalendarRange) => {
  const api = useApi();
  return useQuery(calendarQuery(api, range));
};

export const useMyPlans = () => {
  const api = useApi();
  return useQuery(plansQuery(api));
};

export const useRedeemInvite = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = useIdempotencyKey();
  return useMutation({
    mutationFn: (body: RedeemInviteRequest) => api.invites.redeem(body, { idempotencyKey: key.keyFor(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksQueryKey }),
    onSettled: (_data, error) => key.settle(error),
  });
};

export const useEndLink = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = useIdempotencyKey();
  return useMutation({
    mutationFn: (linkId: string) => api.links.end(linkId, { idempotencyKey: key.keyFor(linkId) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksQueryKey }),
    onSettled: (_data, error) => key.settle(error),
  });
};
