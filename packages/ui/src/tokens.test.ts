import { describe, expect, it } from 'vitest';
import { colors, darkColors, lightColors, type Palette, radii, spacing, typography } from './tokens';

const WCAG_TEXT_MIN = 4.5;
const WCAG_NON_TEXT_MIN = 3;

// WCAG 2.x relative luminance of a #RRGGBB color.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

// Foreground/background pairs the components actually render.
const TEXT_PAIRS = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['primaryText', 'primary'],
  ['secondaryText', 'secondary'],
  ['dangerContrast', 'danger'],
  ['dangerText', 'background'],
  ['dangerText', 'surface'],
  ['dangerText', 'dangerSurface'],
  ['accent', 'surface'],
  ['info', 'surface'],
  ['disabledText', 'disabled'],
] as const satisfies readonly (readonly [keyof Palette, keyof Palette])[];

const NON_TEXT_PAIRS = [
  ['border', 'background'],
  ['border', 'surface'],
] as const satisfies readonly (readonly [keyof Palette, keyof Palette])[];

describe('design tokens', () => {
  it('keeps the spacing scale strictly ascending', () => {
    const values = Object.values(spacing);
    values.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThan(values[index - 1] ?? 0);
    });
  });

  it('renders the dark palette', () => {
    expect(colors).toBe(darkColors);
  });

  describe.each([
    ['dark', darkColors],
    ['light', lightColors],
  ] as const)('%s palette', (_name, palette: Palette) => {
    it('uses only 6-digit hex colors', () => {
      for (const value of Object.values(palette)) {
        expect(value).toMatch(/^#[0-9A-F]{6}$/);
      }
    });

    it.each(TEXT_PAIRS)('keeps %s on %s at WCAG text contrast', (fg, bg) => {
      expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(WCAG_TEXT_MIN);
    });

    it.each(NON_TEXT_PAIRS)('keeps %s on %s at WCAG non-text contrast', (fg, bg) => {
      expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(WCAG_NON_TEXT_MIN);
    });
  });

  it('defines every typography variant with a line height at least its font size', () => {
    for (const variant of Object.values(typography)) {
      expect(variant.lineHeight).toBeGreaterThanOrEqual(variant.fontSize);
    }
  });

  it('exposes positive radii', () => {
    for (const value of Object.values(radii)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});
