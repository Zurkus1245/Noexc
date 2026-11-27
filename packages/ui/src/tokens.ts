// Single source of visual values. Screens reference these tokens; literals in screens are defects.
// Visual language: GymBro dark-first (docs/adr/0007). Content sits on solid surfaces; orange and blue are accents only.
// Pairs are chosen for WCAG contrast (text 4.5:1, borders 3:1); tokens.test.ts verifies them for both palettes.

export const darkColors = {
  background: '#0B0C0E',
  surface: '#17191E',
  surfaceRaised: '#1F2228',
  text: '#F2EFE6',
  textMuted: '#8E9099',
  primary: '#F2F2F4',
  primaryText: '#111214',
  secondary: '#1F2228',
  secondaryText: '#F2EFE6',
  accent: '#FF7A1A',
  info: '#2E9BFF',
  border: '#6B7079',
  divider: '#2A2D33',
  danger: '#C81E3C',
  dangerContrast: '#FFFFFF',
  dangerSurface: '#371E29',
  dangerText: '#FF6B85',
  disabled: '#1F2228',
  disabledText: '#8E9099',
} as const;

export type Palette = { readonly [K in keyof typeof darkColors]: string };

export const lightColors: Palette = {
  background: '#F2EFE6',
  surface: '#FFFFFF',
  surfaceRaised: '#E9E5DA',
  text: '#121318',
  textMuted: '#5F616B',
  primary: '#121318',
  primaryText: '#FFFFFF',
  secondary: '#E9E5DA',
  secondaryText: '#121318',
  accent: '#B94E00',
  info: '#1559B8',
  border: '#7A7C85',
  divider: '#D9D4C7',
  danger: '#B3122F',
  dangerContrast: '#FFFFFF',
  dangerSurface: '#FBE3E7',
  dangerText: '#9E0F29',
  disabled: '#E9E5DA',
  disabledText: '#55575F',
};

// The app renders the dark palette; the light palette is kept contrast-checked until theme switching lands (ADR 0007).
export const colors = darkColors;
export const COLOR_SCHEME = 'dark' as const;
export const STATUS_BAR_STYLE = 'light' as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 28,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

export const borders = {
  hairline: 1,
  control: 1.5,
} as const;

// Minimum touch target per platform guidance.
export const TOUCH_TARGET_MIN_HEIGHT = 48;

// Floating capsule tab bar: height and gap to the screen edge.
export const tabBar = {
  height: 64,
  inset: spacing.md,
} as const;

export const tokens = { colors, spacing, radii, typography, borders, tabBar, TOUCH_TARGET_MIN_HEIGHT } as const;
export type Tokens = typeof tokens;
export type ColorToken = keyof typeof darkColors;
export type TypographyVariant = keyof typeof typography;
