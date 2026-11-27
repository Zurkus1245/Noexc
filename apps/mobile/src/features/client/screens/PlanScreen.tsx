import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Screen, Text, spacing } from '@noexcuse/ui';
import type { ClientLinkSummary } from '@noexcuse/contracts';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { t } from '../../../shared/i18n';
import { PlanCard } from '../components/PlanCard';
import { useMyLinks, useMyPlans } from '../hooks/useClientActions';

export function PlanScreen() {
  const plans = useMyPlans();
  // Links only supply coach names for the plan titles; the plan list does not wait on them.
  const links = useMyLinks();

  // The coach may change the plan while the app is in the background or on another screen, so each focus refetches it.
  useFocusEffect(
    useCallback(() => {
      void plans.refetch();
    }, [plans.refetch]),
  );

  if (plans.isPending) return <LoadingView />;

  const coachNames = coachNamesByLinkId(links.data?.pages.flatMap((page) => page.items) ?? []);
  const items = plans.data?.items ?? [];

  return (
    <Screen>
      {plans.isError ? <ApiErrorBanner error={plans.error} onRetry={() => void plans.refetch()} /> : null}
      <FlatList
        data={items}
        keyExtractor={(plan) => plan.linkId}
        renderItem={({ item }) => <PlanCard plan={item} coachName={coachNames.get(item.linkId)} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={plans.isRefetching} onRefresh={() => void plans.refetch()} />
        }
        ListEmptyComponent={
          plans.isSuccess ? <Text tone="muted">{t('clientPlan.empty')}</Text> : undefined
        }
      />
    </Screen>
  );
}

function coachNamesByLinkId(links: readonly ClientLinkSummary[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const link of links) {
    if (link.coachDisplayName !== null) names.set(link.id, link.coachDisplayName);
  }
  return names;
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg, paddingBottom: spacing.xl },
});
