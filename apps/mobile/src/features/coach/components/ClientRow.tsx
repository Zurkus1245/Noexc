import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radii, spacing, Text } from '@noexcuse/ui';
import type { CoachClientSummary } from '@noexcuse/contracts';
import { t } from '../../../shared/i18n';
import { statusLabelKey } from '../../../shared/i18n/link-status';

interface ClientRowProps {
  readonly client: CoachClientSummary;
  readonly onPress: (client: CoachClientSummary) => void;
}

export const ClientRow = memo(function ClientRow({ client, onPress }: ClientRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(client)} style={styles.row}>
      <Text variant="heading">{client.displayName}</Text>
      <Text variant="caption" tone="muted">
        {t(statusLabelKey(client.status))}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
});
