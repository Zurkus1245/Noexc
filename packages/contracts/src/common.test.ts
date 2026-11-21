import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_LIMIT, IanaTimezoneSchema, MAX_PAGE_LIMIT, PageQuerySchema, tolerantEnum } from './common';

describe('IanaTimezoneSchema', () => {
  it.each(['Europe/Berlin', 'America/New_York', 'UTC'])('accepts %s', (timezone) => {
    expect(IanaTimezoneSchema.safeParse(timezone).success).toBe(true);
  });

  it.each(['Mars/Olympus', 'Europe/Berln', '+05:00', ''])('rejects %j', (timezone) => {
    expect(IanaTimezoneSchema.safeParse(timezone).success).toBe(false);
  });
});

describe('PageQuerySchema', () => {
  it('applies the default limit when none is given', () => {
    expect(PageQuerySchema.parse({})).toEqual({ limit: DEFAULT_PAGE_LIMIT });
  });

  it('coerces a numeric query string and accepts the maximum', () => {
    expect(PageQuerySchema.parse({ limit: String(MAX_PAGE_LIMIT) }).limit).toBe(MAX_PAGE_LIMIT);
  });

  it.each(['0', '101', '1.5', 'abc'])('rejects limit %s', (limit) => {
    expect(PageQuerySchema.safeParse({ limit }).success).toBe(false);
  });
});

describe('tolerantEnum', () => {
  const Status = tolerantEnum(['active', 'paused', 'ended']);

  it('passes known values through', () => {
    expect(Status.parse('paused')).toBe('paused');
  });

  it.each(['archived', 42, null, undefined])('maps %j to unknown', (value) => {
    expect(Status.parse(value)).toBe('unknown');
  });
});
