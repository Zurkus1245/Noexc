import { shiftWeek, startOfWeek, weekDays, weekEnd } from './week';

describe('week helpers', () => {
  it('maps any day of the week to its Monday', () => {
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16');
    expect(startOfWeek('2026-11-18')).toBe('2026-11-16');
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
  });

  it('maps Sunday to the Monday six days earlier', () => {
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09');
  });

  it('lists seven consecutive days from Monday to Sunday', () => {
    expect(weekDays('2026-11-30')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ]);
    expect(weekEnd('2026-11-30')).toBe('2026-12-06');
  });

  it('shifts by whole weeks across month and year boundaries', () => {
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
    expect(shiftWeek('2027-01-04', -1)).toBe('2026-12-28');
  });
});
