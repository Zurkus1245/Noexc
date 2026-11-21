import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { queryClient } from '../query/query-client';

const TOKEN_KEY = 'noexcuse.accessToken';

export type HydrationStatus = 'loading' | 'ready' | 'failed';

interface SessionState {
  readonly token: string | null;
  readonly hydration: HydrationStatus;
  // True when the stored token could not be removed after sign-out; the sign-in screen offers a retry.
  readonly storedTokenNotRemoved: boolean;
}

// Memory copy of the secure-store token. The token is persisted only in SecureStore.
export const useSession = create<SessionState>(() => ({
  token: null,
  hydration: 'loading',
  storedTokenNotRemoved: false,
}));

// Never rejects: a failed read is the 'failed' state, which the root screen shows with a retry.
export const hydrateSession = async (): Promise<void> => {
  useSession.setState({ hydration: 'loading' });
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    useSession.setState({ token, hydration: 'ready' });
  } catch {
    useSession.setState({ hydration: 'failed' });
  }
};

export const startSession = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  useSession.setState({ token });
};

// Removes the persisted token. A failure is kept in state (not thrown) because the session has already ended
// in memory and the screen that started the sign-out is gone by the time the delete settles.
export const clearStoredToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useSession.setState({ storedTokenNotRemoved: false });
  } catch {
    useSession.setState({ storedTokenNotRemoved: true });
  }
};

// Memory is cleared first so no request in flight can pick up the old token; cached server data goes too.
export const endSession = async (): Promise<void> => {
  useSession.setState({ token: null });
  queryClient.clear();
  await clearStoredToken();
};
