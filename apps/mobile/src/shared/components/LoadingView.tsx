import { ActivityIndicator } from 'react-native';
import { Screen } from '@noexcuse/ui';
import { t } from '../i18n';

export function LoadingView() {
  return (
    <Screen>
      <ActivityIndicator accessibilityLabel={t('common.loading')} />
    </Screen>
  );
}
