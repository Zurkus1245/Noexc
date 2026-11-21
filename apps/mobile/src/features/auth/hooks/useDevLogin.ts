import { useMutation } from '@tanstack/react-query';
import { useApi } from '../../../shared/api/api-context';
import { useIdempotencyKey } from '../../../shared/api/idempotency';
import { startSession } from '../../../shared/session/session-store';

export const useDevLogin = () => {
  const api = useApi();
  const key = useIdempotencyKey();
  return useMutation({
    mutationFn: (subject: string) => api.localAuth.token({ subject }, { idempotencyKey: key.keyFor(subject) }),
    onSuccess: ({ accessToken }) => startSession(accessToken),
    onSettled: (_data, error) => key.settle(error),
  });
};
