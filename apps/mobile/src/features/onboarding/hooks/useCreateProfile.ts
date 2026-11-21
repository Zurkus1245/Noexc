import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateProfileRequest } from '@noexcuse/contracts';
import { meQueryKey } from '../../account/api/me';
import { useApi } from '../../../shared/api/api-context';
import { useIdempotencyKey } from '../../../shared/api/idempotency';

export const useCreateProfile = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = useIdempotencyKey();
  return useMutation({
    mutationFn: (body: CreateProfileRequest) => api.me.create(body, { idempotencyKey: key.keyFor(body) }),
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, user);
    },
    onSettled: (_data, error) => key.settle(error),
  });
};
