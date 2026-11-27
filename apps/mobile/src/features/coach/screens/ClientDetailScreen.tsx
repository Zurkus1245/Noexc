import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Screen, Text, spacing } from '@noexcuse/ui';
import { StyleSheet, View } from 'react-native';
import { isNotFoundError } from '../../../shared/api/api-error';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { t } from '../../../shared/i18n';
import { statusLabelKey } from '../../../shared/i18n/link-status';
import { useCoachClient } from '../hooks/useCoachActions';

export function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();
  const detail = useCoachClient(clientId);
  const goBack = () => router.back();

  if (detail.isPending) return <LoadingView />;
  if (detail.isError) {
    if (isNotFoundError(detail.error)) {
      return (
        <Screen>
          <Text tone="muted">{t('coach.detailGone')}</Text>
          <Button label={t('common.back')} variant="secondary" onPress={goBack} />
        </Screen>
      );
    }
    return (
      <Screen>
        <ApiErrorBanner error={detail.error} onRetry={() => void detail.refetch()} />
        <Button label={t('common.back')} variant="secondary" onPress={goBack} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">{detail.data.client.displayName}</Text>
      <Text tone="muted">{t(statusLabelKey(detail.data.link.status))}</Text>
      <View style={styles.actions}>
        <Button
          label={t('plan.open')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/clients/[clientId]/plan', params: { clientId } })}
        />
        <Button
          label={t('coachCalendar.open')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/clients/[clientId]/calendar', params: { clientId } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
