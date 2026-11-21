import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Screen, Text, spacing } from '@noexcuse/ui';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { t } from '../../../shared/i18n';
import { LinkRow } from '../components/LinkRow';
import { useEndLink, useMyLinks } from '../hooks/useClientActions';

export function LinksScreen() {
  const router = useRouter();
  const links = useMyLinks();
  const endLink = useEndLink();

  if (links.isPending) return <LoadingView />;

  const loadMore = () => {
    if (links.hasNextPage && !links.isFetchingNextPage) void links.fetchNextPage();
  };

  return (
    <Screen>
      <Text variant="title">{t('client.linksTitle')}</Text>
      {links.isError && !links.isFetchNextPageError ? (
        <ApiErrorBanner error={links.error} onRetry={() => void links.refetch()} />
      ) : null}
      {links.isFetchNextPageError ? <ApiErrorBanner error={links.error} onRetry={loadMore} /> : null}
      {endLink.isError ? <ApiErrorBanner error={endLink.error} /> : null}
      <FlatList
        data={links.data?.pages.flatMap((page) => page.items) ?? []}
        onEndReached={loadMore}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        keyExtractor={(link) => link.id}
        renderItem={({ item }) => (
          <LinkRow
            link={item}
            endPending={endLink.isPending && endLink.variables === item.id}
            onEnd={(linkId) => endLink.mutate(linkId)}
          />
        )}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={links.isRefetching} onRefresh={() => void links.refetch()} />
        }
        ListEmptyComponent={
          links.isSuccess ? (
            <View style={styles.empty}>
              <Text tone="muted">{t('client.linksEmpty')}</Text>
              <Button label={t('client.joinCta')} onPress={() => router.navigate('/redeem')} />
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}

const END_REACHED_THRESHOLD = 0.5;

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  separator: { height: spacing.sm },
  empty: { gap: spacing.md },
});
