import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { borders, colors, COLOR_SCHEME, radii, spacing, TOUCH_TARGET_MIN_HEIGHT } from '../tokens';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  readonly label: string;
  readonly error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const hasError = error !== undefined && error !== '';
  return (
    <View style={styles.wrapper}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: rest.editable === false }}
        placeholderTextColor={colors.textMuted}
        keyboardAppearance={COLOR_SCHEME}
        style={[styles.input, hasError && styles.inputError, style]}
        {...rest}
      />
      {hasError ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    minHeight: TOUCH_TARGET_MIN_HEIGHT,
    borderRadius: radii.sm,
    borderWidth: borders.control,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
  },
  inputError: { borderColor: colors.dangerText },
});
