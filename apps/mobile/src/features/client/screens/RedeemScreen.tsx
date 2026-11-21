import { useRouter } from 'expo-router';
import { Screen, Text } from '@noexcuse/ui';
import { t } from '../../../shared/i18n';
import { RedeemForm } from '../components/RedeemForm';
import { useRedeemInvite } from '../hooks/useClientActions';

export function RedeemScreen() {
  const redeem = useRedeemInvite();
  const router = useRouter();

  return (
    <Screen scroll>
      <Text variant="title">{t('client.redeemTitle')}</Text>
      <RedeemForm
        pending={redeem.isPending}
        error={redeem.error}
        onSubmit={(body) => redeem.mutate(body, { onSuccess: () => router.replace('/links') })}
      />
    </Screen>
  );
}
