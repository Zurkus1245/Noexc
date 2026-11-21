import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text, colors, radii, spacing } from '@noexcuse/ui';
import type { ClientLinkSummary } from '@noexcuse/contracts';
import { t } from '../../../shared/i18n';
import { statusLabelKey } from '../../../shared/i18n/link-status';

interface LinkRowProps {
  readonly link: ClientLinkSummary;
  readonly endPending: boolean;
  readonly onEnd: (linkId: string) => void;
}

export function LinkRow({ link, endPending, onEnd }: LinkRowProps) {
  const canEnd = link.status !== 'ended';

  const confirmEnd = () => {
    Alert.alert(t('client.endLinkTitle'), t('client.endLinkBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('client.endLink'), style: 'destructive', onPress: () => onEnd(link.id) },
    ]);
  };

  return (
    <View style={styles.row}>
      <Text variant="heading">{link.coachDisplayName ?? t('client.deletedCoach')}</Text>
      <Text variant="caption" tone="muted">
        {t(statusLabelKey(link.status))}
      </Text>
      {canEnd ? (
        <Button label={t('client.endLink')} variant="danger" loading={endPending} onPress={confirmEnd} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
});
