import { ApiError, createApiClient, type ApiClient } from '@noexcuse/api-client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getApiBaseUrl } from '../../config/env';
import { endSession, useSession } from '../session/session-store';

const HTTP_UNAUTHORIZED = 401;

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({ children }: { readonly children: ReactNode }) {
  const client = useMemo(() => {
    // A 401 for a token that has since been replaced belongs to a past session and must not end the current one;
    // the single retry then runs with the current token. No refresh token exists yet (local mode), so an expired
    // session ends here; the caller sees UNAUTHENTICATED.
    const expireSession = async (rejectedToken: string | null): Promise<void> => {
      if (useSession.getState().token !== rejectedToken) return;
      await endSession();
      throw new ApiError({ code: 'UNAUTHENTICATED', status: HTTP_UNAUTHORIZED, requestId: null, detail: 'Session expired' });
    };

    return createApiClient({
      baseUrl: getApiBaseUrl(),
      getAccessToken: async () => useSession.getState().token,
      onRefresh: expireSession,
      fetch,
    });
  }, []);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export const useApi = (): ApiClient => {
  const client = useContext(ApiContext);
  if (client === null) throw new Error('useApi must be used inside ApiProvider');
  return client;
};
