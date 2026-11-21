import { describe, expect, it } from 'vitest';
import { colors, radii, spacing, typography } from './tokens';

describe('design tokens', () => {
  it('keeps the spacing scale strictly ascending', () => {
    const values = Object.values(spacing);
    values.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThan(values[index - 1] ?? 0);
    });
  });

  it('uses only 6-digit hex colors', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
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
