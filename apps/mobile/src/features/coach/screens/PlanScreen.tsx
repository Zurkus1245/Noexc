import { useLocalSearchParams } from 'expo-router';
import { Screen, Text } from '@noexcuse/ui';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { t } from '../../../shared/i18n';
import { PlanEditor } from '../components/PlanEditor';
import { useCoachPlan } from '../hooks/useCoachPlan';

export function PlanScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const plan = useCoachPlan(clientId);

  if (plan.isPending) return <LoadingView />;
  if (plan.isError) {
    return (
      <Screen>
        <ApiErrorBanner error={plan.error} onRetry={() => void plan.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('plan.title')}</Text>
      <Text variant="caption" tone="muted">
        {plan.data.version === 0 ? t('plan.new') : t('plan.version', { version: String(plan.data.version) })}
      </Text>
      <PlanEditor
        clientId={clientId}
        plan={plan.data}
        onReload={() => void plan.refetch()}
      />
    </Screen>
  );
}
