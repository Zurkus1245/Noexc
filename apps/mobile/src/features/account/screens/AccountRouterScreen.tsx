import { Redirect } from 'expo-router';
import { Screen, Text } from '@noexcuse/ui';
import type { User } from '@noexcuse/contracts';
import { t } from '../../../shared/i18n';
import { AccountGate } from '../components/AccountGate';

// Where each role lands after sign-in. An unknown role (newer server) is not routed: the user updates the app.
const HOME_ROUTE: Record<User['role'], string | null> = {
  coach: '/clients',
  client: '/links',
  unknown: null,
};

export function AccountRouterScreen() {
  return (
    <AccountGate>
      {(user) => {
        const home = HOME_ROUTE[user.role];
        if (home === null) {
          return (
            <Screen>
              <Text tone="muted">{t('account.unsupportedRole')}</Text>
            </Screen>
          );
        }
        return <Redirect href={home} />;
      }}
    </AccountGate>
  );
}
