import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PutPlanRequest } from '@noexcuse/contracts';
import { useApi } from '../../../shared/api/api-context';
import { useIdempotencyKey } from '../../../shared/api/idempotency';
import { coachCalendarQueryKey, coachPlanQuery, coachPlanQueryKey } from '../api/coach-api';

export const useCoachPlan = (clientId: string) => {
  const api = useApi();
  return useQuery(coachPlanQuery(api, clientId));
};

export const usePutPlan = (clientId: string) => {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = useIdempotencyKey();
  return useMutation({
    mutationFn: (body: PutPlanRequest) => api.coach.putPlan(clientId, body, { idempotencyKey: key.keyFor(body) }),
    onSuccess: (plan) => {
      queryClient.setQueryData(coachPlanQueryKey(clientId), plan);
      // Calendar entries resolve against the current plan version, so their workouts may have changed.
      void queryClient.invalidateQueries({ queryKey: coachCalendarQueryKey(clientId) });
    },
    onSettled: (_data, error) => key.settle(error),
  });
};
