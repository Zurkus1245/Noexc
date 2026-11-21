import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

const QUERY_RETRY_COUNT = 1;

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: QUERY_RETRY_COUNT } },
});

// Refetch stale server data when the app returns to the foreground (no realtime in MVP).
focusManager.setEventListener((onFocus) => {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    onFocus(status === 'active');
  });
  return () => {
    subscription.remove();
  };
});
