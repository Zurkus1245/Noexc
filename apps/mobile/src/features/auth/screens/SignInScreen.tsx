import { Redirect } from 'expo-router';
import { ErrorBanner, Screen, Text } from '@noexcuse/ui';
import { isDevLoginEnabled } from '../../../config/env';
import { t } from '../../../shared/i18n';
import { clearStoredToken, useSession } from '../../../shared/session/session-store';
import { DevLoginForm } from '../components/DevLoginForm';

export function SignInScreen() {
  const token = useSession((state) => state.token);
  const storedTokenNotRemoved = useSession((state) => state.storedTokenNotRemoved);
  if (token !== null) return <Redirect href="/" />;

  return (
    <Screen>
      <Text variant="title">{t('auth.signInTitle')}</Text>
      {storedTokenNotRemoved ? (
        <ErrorBanner
          message={t('session.signOutFailed')}
          retryLabel={t('common.retry')}
          onRetry={() => void clearStoredToken()}
        />
      ) : null}
      {isDevLoginEnabled() ? <DevLoginForm /> : <Text tone="muted">{t('auth.unavailable')}</Text>}
    </Screen>
  );
}
