import { Pressable, StyleSheet, View } from 'react-native';
import { borders, colors, spacing, TOUCH_TARGET_MIN_HEIGHT } from '../tokens';
import { Text } from './Text';

const BOX_SIZE = 24;
const BOX_RADIUS = 7;
const CHECK_MARK = '\u2713';

export interface CheckboxProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, disabled = false }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text variant="label" style={styles.mark}>{CHECK_MARK}</Text> : null}
      </View>
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: BOX_RADIUS,
    borderWidth: borders.control,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  mark: { color: colors.primaryText },
  label: { flex: 1 },
});
