import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorBannerProps {
  readonly message: string;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
}

export function ErrorBanner({ message, retryLabel, onRetry }: ErrorBannerProps) {
  return (
    <View accessibilityRole="alert" style={styles.box}>
      <Text tone="danger">{message}</Text>
      {onRetry !== undefined && retryLabel !== undefined ? (
        <Button label={retryLabel} variant="secondary" onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.dangerSurface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
