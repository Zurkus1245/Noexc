import { describe, expect, it } from 'vitest';
import {
  CALENDAR_MAX_RANGE_DAYS,
  CalendarEntrySchema,
  CalendarRangeQuerySchema,
  CreateCalendarEntryRequestSchema,
  MoveCalendarEntryRequestSchema,
} from './calendar';
import { LocalDateSchema } from './common';

const uuid = (n: number) => `123e4567-e89b-42d3-a456-${String(n).padStart(12, '0')}`;

describe('LocalDateSchema', () => {
  it.each(['2026-11-21', '2028-02-29', '2026-12-31', '0001-01-01'])('accepts %s', (date) => {
    expect(LocalDateSchema.parse(date)).toBe(date);
  });

  it.each([
    ['Feb 30', '2026-02-30'],
    ['Feb 29 in a common year', '2027-02-29'],
    ['April 31', '2026-04-31'],
    ['month 13', '2026-13-01'],
    ['month 00', '2026-00-10'],
    ['day 00', '2026-01-00'],
    ['unpadded month', '2026-1-01'],
    ['datetime', '2026-01-01T00:00:00Z'],
    ['empty', ''],
    ['slashes', '2026/01/01'],
  ])('rejects %s (%s)', (_label, date) => {
    expect(LocalDateSchema.safeParse(date).success).toBe(false);
  });
});

describe('CalendarRangeQuerySchema', () => {
  it('accepts a single day range', () => {
    expect(CalendarRangeQuerySchema.parse({ from: '2026-11-21', to: '2026-11-21' })).toEqual({
      from: '2026-11-21',
      to: '2026-11-21',
    });
  });

  it(`accepts exactly ${CALENDAR_MAX_RANGE_DAYS} days inclusive`, () => {
    expect(CalendarRangeQuerySchema.safeParse({ from: '2026-01-01', to: '2026-03-03' }).success).toBe(true);
  });

  it(`rejects ${CALENDAR_MAX_RANGE_DAYS + 1} days inclusive`, () => {
    expect(CalendarRangeQuerySchema.safeParse({ from: '2026-01-01', to: '2026-03-04' }).success).toBe(false);
  });

  it('rejects a range that ends before it starts', () => {
    expect(CalendarRangeQuerySchema.safeParse({ from: '2026-11-21', to: '2026-11-20' }).success).toBe(false);
  });

  it('counts the leap day in the span', () => {
    expect(CalendarRangeQuerySchema.safeParse({ from: '2028-02-01', to: '2028-03-01' }).success).toBe(true);
  });

  it('rejects an impossible date in the range', () => {
    expect(CalendarRangeQuerySchema.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success).toBe(false);
  });
});

describe('CalendarEntrySchema', () => {
  const entry = {
    id: uuid(1),
    linkId: uuid(2),
    clientId: uuid(3),
    coachId: uuid(4),
    date: '2026-11-21',
    workoutKey: uuid(5),
    blockTitle: 'Base',
    workout: { key: uuid(5), title: 'Day A', exercises: [{ key: uuid(6), name: 'Squat', sets: 3, repsMin: 5, repsMax: 8, weightKg: null, restSec: null, note: null }] },
  };

  it('accepts a resolved entry', () => {
    expect(CalendarEntrySchema.safeParse(entry).success).toBe(true);
  });

  it('accepts an entry whose workout is unresolvable', () => {
    expect(CalendarEntrySchema.safeParse({ ...entry, workout: null, blockTitle: null }).success).toBe(true);
  });

  it('accepts a null coach after the coach account was deleted', () => {
    expect(CalendarEntrySchema.safeParse({ ...entry, coachId: null }).success).toBe(true);
  });

  it('rejects an impossible date', () => {
    expect(CalendarEntrySchema.safeParse({ ...entry, date: '2026-02-30' }).success).toBe(false);
  });
});

describe('CreateCalendarEntryRequestSchema', () => {
  it('accepts a client-generated id with a leap-day date', () => {
    expect(
      CreateCalendarEntryRequestSchema.safeParse({ id: uuid(1), date: '2028-02-29', workoutKey: uuid(2) }).success,
    ).toBe(true);
  });

  it('rejects a missing id', () => {
    expect(CreateCalendarEntryRequestSchema.safeParse({ date: '2028-02-29', workoutKey: uuid(2) }).success).toBe(false);
  });

  it('rejects an impossible date', () => {
    expect(
      CreateCalendarEntryRequestSchema.safeParse({ id: uuid(1), date: '2026-02-30', workoutKey: uuid(2) }).success,
    ).toBe(false);
  });
});

describe('MoveCalendarEntryRequestSchema', () => {
  it('accepts a valid date', () => {
    expect(MoveCalendarEntryRequestSchema.parse({ date: '2026-11-22' })).toEqual({ date: '2026-11-22' });
  });

  it('rejects an impossible date', () => {
    expect(MoveCalendarEntryRequestSchema.safeParse({ date: '2026-11-31' }).success).toBe(false);
  });
});
