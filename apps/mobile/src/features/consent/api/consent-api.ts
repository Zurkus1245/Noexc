import { queryOptions } from '@tanstack/react-query';
import { CONSENT_TYPES, type ConsentType } from '@noexcuse/contracts';
import type { ApiClient } from '@noexcuse/api-client';
import type { ConsentRecord } from '@noexcuse/domain';

export const consentsQueryKey = ['me', 'consents'] as const;

const isKnownConsentType = (value: string): value is ConsentType => (CONSENT_TYPES as readonly string[]).includes(value);

// Server timestamps are ISO strings; the domain rules compare instants. Types this client does not know are dropped.
export const consentsQuery = (api: ApiClient) =>
  queryOptions({
    queryKey: consentsQueryKey,
    queryFn: async (): Promise<ConsentRecord[]> => {
      const consents = await api.consents.list();
      return consents.flatMap((consent) =>
        isKnownConsentType(consent.type)
          ? [{ type: consent.type, version: consent.version, granted: consent.granted, createdAt: new Date(consent.createdAt) }]
          : [],
      );
    },
  });
