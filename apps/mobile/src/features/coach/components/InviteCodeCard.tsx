import * as Clipboard from 'expo-clipboard';
import { formatInviteCode } from '@noexcuse/contracts';
import { useState } from 'react';
import { Button, ErrorBanner, Text, spacing } from '@noexcuse/ui';
import { StyleSheet, View } from 'react-native';
import { t } from '../../../shared/i18n';

interface InviteCodeCardProps {
  readonly code: string;
  readonly expiresAt: string;
}

// The code exists only in this component's state: it is shown once and is gone when the screen re-mounts.
export function InviteCodeCard({ code, expiresAt }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const displayCode = formatInviteCode(code);
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(displayCode);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };
  const expires = new Date(expiresAt).toLocaleString();

  return (
    <View style={styles.card}>
      <Text variant="label">{t('coach.codeLabel')}</Text>
      <Text variant="title" selectable accessibilityLabel={t('coach.codeLabel')}>
        {displayCode}
      </Text>
      <Text variant="caption" tone="muted">
        {t('coach.expires', { date: expires })}
      </Text>
      <Button label={copied ? t('common.copied') : t('common.copy')} variant="secondary" onPress={() => void copy()} />
      {copyFailed ? <ErrorBanner message={t('common.copyFailed')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
});
