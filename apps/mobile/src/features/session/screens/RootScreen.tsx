import { Redirect } from 'expo-router';
import { ErrorBanner, Screen } from '@noexcuse/ui';
import { AccountRouterScreen } from '../../account/screens/AccountRouterScreen';
import { LoadingView } from '../../../shared/components/LoadingView';
import { t } from '../../../shared/i18n';
import { hydrateSession, useSession } from '../../../shared/session/session-store';

// Entry point: restores the stored session, then routes to sign-in or to the account router.
export function RootScreen() {
  const hydration = useSession((state) => state.hydration);
  const token = useSession((state) => state.token);

  if (hydration === 'loading') return <LoadingView />;
  if (hydration === 'failed') {
    return (
      <Screen>
        <ErrorBanner
          message={t('session.restoreFailed')}
          retryLabel={t('common.retry')}
          onRetry={() => void hydrateSession()}
        />
      </Screen>
    );
  }
  if (token === null) return <Redirect href="/sign-in" />;
  return <AccountRouterScreen />;
}
