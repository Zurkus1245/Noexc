import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiProvider } from '../src/shared/api/api-context';
import { queryClient } from '../src/shared/query/query-client';
import { hydrateSession } from '../src/shared/session/session-store';

export default function RootLayout() {
  useEffect(() => {
    void hydrateSession();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
