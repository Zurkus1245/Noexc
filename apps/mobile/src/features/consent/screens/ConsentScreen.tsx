import { Redirect } from 'expo-router';
import { Screen } from '@noexcuse/ui';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { useAccountGate } from '../../account/hooks/useAccountGate';
import { ConsentForm } from '../components/ConsentForm';

// Reached only through the account gate; once the consents are current the gate passes and this screen leaves.
export function ConsentScreen() {
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
    case 'ready':
      return <Redirect href="/" />;
    case 'consent':
      return <ConsentForm role={gate.role} />;
  }
}
