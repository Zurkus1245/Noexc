// Single source of visual values. Screens reference these tokens; literals in screens are defects.
export const colors = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#111827',
  textMuted: '#4B5563',
  primary: '#1D4ED8',
  primaryText: '#FFFFFF',
  secondary: '#E5E7EB',
  secondaryText: '#111827',
  border: '#9CA3AF',
  danger: '#B91C1C',
  dangerSurface: '#FEE2E2',
  dangerText: '#7F1D1D',
  disabled: '#9CA3AF',
  disabledText: '#F9FAFB',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

// Minimum touch target per platform guidance.
export const TOUCH_TARGET_MIN_HEIGHT = 48;

export const tokens = { colors, spacing, radii, typography, TOUCH_TARGET_MIN_HEIGHT } as const;
export type Tokens = typeof tokens;
export type ColorToken = keyof typeof colors;
export type TypographyVariant = keyof typeof typography;
