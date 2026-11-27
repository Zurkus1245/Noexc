import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isWithinWindow, todayInTimeZone } from './calendar';

describe('todayInTimeZone', () => {
  it('reads the wall-clock date in the given zone, not UTC', () => {
    // 2026-11-21T23:30Z is already 2026-11-22 in Berlin (UTC+1 in November).
    expect(todayInTimeZone('Europe/Berlin', new Date('2026-11-21T23:30:00Z'))).toBe('2026-11-22');
    expect(todayInTimeZone('UTC', new Date('2026-11-21T23:30:00Z'))).toBe('2026-11-21');
  });

  it('switches the date exactly at the Berlin spring-forward DST boundary', () => {
    // 2026-03-29: clocks jump 02:00 -> 03:00 CET -> CEST. 22:59Z is 23:59 on the 28th; 23:00Z is 00:00 on the 29th.
    expect(todayInTimeZone('Europe/Berlin', new Date('2026-03-28T22:59:59Z'))).toBe('2026-03-28');
    expect(todayInTimeZone('Europe/Berlin', new Date('2026-03-28T23:00:00Z'))).toBe('2026-03-29');
  });

  it('keeps the date correct on the autumn fall-back day in Berlin', () => {
    // 2026-10-25: clocks go 03:00 CEST -> 02:00 CET; the local date is the 25th all day.
    expect(todayInTimeZone('Europe/Berlin', new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
    expect(todayInTimeZone('Europe/Berlin', new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-25');
  });

  it('handles the UTC+14 zone ahead of UTC', () => {
    expect(todayInTimeZone('Pacific/Kiritimati', new Date('2026-11-21T12:00:00Z'))).toBe('2026-11-22');
  });

  it('handles the UTC-12 zone behind UTC', () => {
    expect(todayInTimeZone('Etc/GMT+12', new Date('2026-11-21T11:00:00Z'))).toBe('2026-11-20');
  });

  it('returns a zero-padded YYYY-MM-DD', () => {
    expect(todayInTimeZone('UTC', new Date('2026-01-02T12:00:00Z'))).toBe('2026-01-02');
  });

  it('throws on an unknown zone instead of guessing', () => {
    expect(() => todayInTimeZone('Mars/Olympus', new Date())).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it('moves across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('moves backward across a year boundary', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('lands on the leap day in a leap year', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('skips the nonexistent day in a common year', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('adds zero days as identity', () => {
    expect(addDays('2026-11-21', 0)).toBe('2026-11-21');
  });

  it('adds a full year in a common year without drift', () => {
    expect(addDays('2026-03-01', 365)).toBe('2027-03-01');
  });

  it('is not affected by DST: whole days stay whole days across the transition', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
  });
});

describe('daysBetween', () => {
  it('is zero for the same day', () => {
    expect(daysBetween('2026-11-21', '2026-11-21')).toBe(0);
  });

  it('is positive when the second date is later', () => {
    expect(daysBetween('2026-11-21', '2026-11-25')).toBe(4);
  });

  it('is negative when the second date is earlier', () => {
    expect(daysBetween('2026-11-25', '2026-11-21')).toBe(-4);
  });

  it('counts the leap day', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
  });

  it('counts across the Berlin DST change as exact calendar days', () => {
    expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1);
    expect(daysBetween('2026-10-24', '2026-10-25')).toBe(1);
  });

  it('inverts addDays', () => {
    expect(daysBetween('2026-11-21', addDays('2026-11-21', 366))).toBe(366);
  });
});

describe('isWithinWindow', () => {
  const TODAY = '2026-11-21';

  it('accepts today itself', () => {
    expect(isWithinWindow(TODAY, TODAY, 366)).toBe(true);
  });

  it('accepts the exact edges of the window on both sides', () => {
    expect(isWithinWindow(addDays(TODAY, 366), TODAY, 366)).toBe(true);
    expect(isWithinWindow(addDays(TODAY, -366), TODAY, 366)).toBe(true);
  });

  it('rejects one day beyond either edge', () => {
    expect(isWithinWindow(addDays(TODAY, 367), TODAY, 366)).toBe(false);
    expect(isWithinWindow(addDays(TODAY, -367), TODAY, 366)).toBe(false);
  });

  it('measures the leap day inside the window correctly', () => {
    expect(isWithinWindow('2028-02-29', '2027-03-01', 366)).toBe(true);
    expect(isWithinWindow('2028-03-02', '2027-03-01', 366)).toBe(false);
  });
});
