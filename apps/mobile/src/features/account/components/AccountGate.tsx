import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import type { User } from '@noexcuse/contracts';
import { Screen } from '@noexcuse/ui';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { useAccountGate } from '../hooks/useAccountGate';

interface AccountGateProps {
  readonly children: (user: User) => ReactNode;
}

// Renders its children only for a signed-in user with a profile and current mandatory consents.
export function AccountGate({ children }: AccountGateProps) {
  const gate = useAccountGate();
  switch (gate.status) {
    case 'loading':
      return <LoadingView />;
    case 'signed-out':
      return <Redirect href="/sign-in" />;
    case 'error':
      return (
        <Screen>
          <ApiErrorBanner error={gate.error} onRetry={gate.retry} />
        </Screen>
      );
    case 'onboarding':
      return <Redirect href="/onboarding" />;
    case 'consent':
      return <Redirect href="/consent" />;
    case 'ready':
      return children(gate.user);
  }
}
