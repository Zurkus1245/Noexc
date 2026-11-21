import { Text as RNText, type TextProps } from 'react-native';
import { colors, typography, type TypographyVariant } from '../tokens';

export type TextTone = 'default' | 'muted' | 'danger';

export interface AppTextProps extends TextProps {
  readonly variant?: TypographyVariant;
  readonly tone?: TextTone;
}

const TONE_COLOR = {
  default: colors.text,
  muted: colors.textMuted,
  danger: colors.danger,
} as const satisfies Record<TextTone, string>;

export function Text({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  return <RNText style={[typography[variant], { color: TONE_COLOR[tone] }, style]} {...rest} />;
}
