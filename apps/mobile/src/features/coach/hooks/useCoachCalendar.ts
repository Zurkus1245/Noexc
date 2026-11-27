import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCalendarEntryRequest, LocalDate } from '@noexcuse/contracts';
import { useApi } from '../../../shared/api/api-context';
import { useIdempotencyKey } from '../../../shared/api/idempotency';
import { coachCalendarQuery, coachCalendarQueryKey } from '../api/coach-api';

export const useCoachCalendar = (clientId: string, range: { from: LocalDate; to: LocalDate }) => {
  const api = useApi();
  return useQuery(coachCalendarQuery(api, clientId, range));
};

// Every calendar write refreshes all loaded weeks of this client, not only the one on screen.
export const useCalendarInvalidation = (clientId: string) => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: coachCalendarQueryKey(clientId) });
};

export const useCreateCalendarEntry = (clientId: string) => {
  const api = useApi();
  const invalidate = useCalendarInvalidation(clientId);
  const key = useIdempotencyKey();
  return useMutation({
    mutationFn: (body: CreateCalendarEntryRequest) =>
      api.coach.createCalendarEntry(clientId, body, { idempotencyKey: key.keyFor(body) }),
    onSuccess: invalidate,
    onSettled: (_data, error) => key.settle(error),
  });
};

export const useMoveCalendarEntry = (clientId: string) => {
  const api = useApi();
  const invalidate = useCalendarInvalidation(clientId);
  return useMutation({
    mutationFn: ({ entryId, date }: { entryId: string; date: LocalDate }) =>
      api.coach.moveCalendarEntry(clientId, entryId, { date }),
    onSuccess: invalidate,
  });
};

export const useDeleteCalendarEntry = (clientId: string) => {
  const api = useApi();
  const invalidate = useCalendarInvalidation(clientId);
  return useMutation({
    mutationFn: (entryId: string) => api.coach.deleteCalendarEntry(clientId, entryId),
    onSuccess: invalidate,
  });
};
