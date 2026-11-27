import { QueryClientProvider } from '@tanstack/react-query';
import { STATUS_BAR_STYLE } from '@noexcuse/ui';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiProvider } from '../src/shared/api/api-context';
import { queryClient } from '../src/shared/query/query-client';
import { hydrateSession } from '../src/shared/session/session-store';
import { navigationTheme } from '../src/shared/theme/navigation-theme';

export default function RootLayout() {
  useEffect(() => {
    void hydrateSession();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style={STATUS_BAR_STYLE} />
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
