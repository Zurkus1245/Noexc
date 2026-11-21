import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/api/api-context';
import { useIdempotencyKey } from '../../../shared/api/idempotency';
import { clientsQuery, coachClientQuery } from '../api/coach-api';

export const useCoachClients = () => {
  const api = useApi();
  return useInfiniteQuery(clientsQuery(api));
};

export const useCoachClient = (clientId: string) => {
  const api = useApi();
  return useQuery(coachClientQuery(api, clientId));
};

export const useCreateInvite = () => {
  const api = useApi();
  const key = useIdempotencyKey();
  return useMutation({
    mutationFn: () => api.invites.create({ idempotencyKey: key.keyFor(null) }),
    onSettled: (_data, error) => key.settle(error),
  });
};
