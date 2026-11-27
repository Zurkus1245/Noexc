import { colors } from '@noexcuse/ui';
import { DarkTheme, type Theme } from 'expo-router';

// Navigator chrome (scene background, headers, tab bar defaults) follows the design tokens, not the library palette.
export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.divider,
    notification: colors.accent,
  },
};
