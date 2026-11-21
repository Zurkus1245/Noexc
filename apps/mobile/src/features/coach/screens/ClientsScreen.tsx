import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Screen, Text, spacing } from '@noexcuse/ui';
import type { CoachClientSummary } from '@noexcuse/contracts';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { t } from '../../../shared/i18n';
import { ClientRow } from '../components/ClientRow';
import { useCoachClients } from '../hooks/useCoachActions';

// Fraction of a screen left below the last row when the next page is requested.
const END_REACHED_THRESHOLD = 0.5;

export function ClientsScreen() {
  const router = useRouter();
  const clients = useCoachClients();
  const items = clients.data?.pages.flatMap((page) => page.items) ?? [];

  const openClient = useCallback(
    (client: CoachClientSummary) => router.push({ pathname: '/clients/[clientId]', params: { clientId: client.clientId } }),
    [router],
  );

  const loadMore = () => {
    if (clients.hasNextPage && !clients.isFetchingNextPage) void clients.fetchNextPage();
  };

  return (
    <Screen>
      <Text variant="title">{t('coach.clientsTitle')}</Text>
      {clients.isError ? <ApiErrorBanner error={clients.error} onRetry={() => void clients.refetch()} /> : null}
      <FlatList
        data={items}
        keyExtractor={(client) => client.id}
        renderItem={({ item }) => <ClientRow client={item} onPress={openClient} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        refreshControl={
          <RefreshControl refreshing={clients.isRefetching && !clients.isFetchingNextPage} onRefresh={() => void clients.refetch()} />
        }
        ListEmptyComponent={clients.isSuccess ? <Text tone="muted">{t('coach.clientsEmpty')}</Text> : undefined}
        ListFooterComponent={
          clients.hasNextPage ? (
            <Button label={t('coach.loadMore')} variant="secondary" loading={clients.isFetchingNextPage} onPress={loadMore} />
          ) : undefined
        }
      />
    </Screen>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  separator: { height: spacing.sm },
});
