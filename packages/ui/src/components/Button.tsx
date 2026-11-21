import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, TOUCH_TARGET_MIN_HEIGHT } from '../tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly style?: StyleProp<ViewStyle>;
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
}

const VARIANT_STYLE = {
  primary: { backgroundColor: colors.primary, text: colors.primaryText },
  secondary: { backgroundColor: colors.secondary, text: colors.secondaryText },
  danger: { backgroundColor: colors.danger, text: colors.primaryText },
} as const satisfies Record<ButtonVariant, { backgroundColor: string; text: string }>;

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...rest }: ButtonProps) {
  const inactive = disabled === true || loading;
  const palette = VARIANT_STYLE[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: inactive ? colors.disabled : palette.backgroundColor },
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text variant="label" style={{ color: inactive ? colors.disabledText : palette.text }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET_MIN_HEIGHT,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});

