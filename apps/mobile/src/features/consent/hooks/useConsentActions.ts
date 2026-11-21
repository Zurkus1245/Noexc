import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GrantConsentRequest } from '@noexcuse/contracts';
import { useRef } from 'react';
import { useApi } from '../../../shared/api/api-context';
import { useIdempotencyKey } from '../../../shared/api/idempotency';
import { consentsQuery, consentsQueryKey } from '../api/consent-api';

export const useConsents = (enabled: boolean) => {
  const api = useApi();
  return useQuery({ ...consentsQuery(api), enabled });
};

// Each grant is its own POST with its own key. Grants already accepted in a failed batch are not sent again,
// so a retry replays only the remaining ones and each key stays bound to the intent it was created for.
export const useGrantConsents = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = useIdempotencyKey();
  const accepted = useRef(new Set<string>()).current;
  return useMutation({
    mutationFn: async (grants: readonly GrantConsentRequest[]) => {
      for (const grant of grants) {
        const intent = JSON.stringify(grant);
        if (accepted.has(intent)) continue;
        try {
          await api.consents.grant(grant, { idempotencyKey: key.keyFor(grant) });
        } catch (error) {
          key.settle(error);
          throw error;
        }
        key.settle(null);
        accepted.add(intent);
      }
    },
    onSuccess: async () => {
      accepted.clear();
      await queryClient.invalidateQueries({ queryKey: consentsQueryKey });
    },
  });
};
