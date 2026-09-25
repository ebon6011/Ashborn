import { describe, expect, it } from 'vitest';
import { at } from '../test/fixtures';
import { addDays, dateRange, daysBetween, isDateKey, isoWeekday, shouldRollOver, todayKey, weekStartOf } from './day';

describe('todayKey', () => {
  it('uses the local calendar date', () => {
    expect(todayKey(at('2026-03-08', '23:59'))).toBe('2026-03-08');
    expect(todayKey(at('2026-03-09', '00:00'))).toBe('2026-03-09');
  });
});

describe('addDays / daysBetween / dateRange', () => {
  it('crosses month, year, leap-day and DST boundaries by calendar', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09'); // US DST starts 2026-03-08
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26'); // EU DST ends 2026-10-25
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-09-25', '2026-09-25')).toBe(0);
  });

  it('lists dates in [from, to)', () => {
    expect(dateRange('2026-09-20', '2026-09-23')).toEqual(['2026-09-20', '2026-09-21', '2026-09-22']);
    expect(dateRange('2026-09-20', '2026-09-20')).toEqual([]);
  });
});

describe('weeks', () => {
  it('uses ISO weekdays and Monday week starts', () => {
    expect(isoWeekday('2026-09-21')).toBe(1); // Monday
    expect(isoWeekday('2026-09-27')).toBe(7); // Sunday
    expect(weekStartOf('2026-09-25')).toBe('2026-09-21');
    expect(weekStartOf('2026-09-27')).toBe('2026-09-21');
    expect(weekStartOf('2026-09-21')).toBe('2026-09-21');
  });
});

describe('isDateKey', () => {
  it('accepts real dates only', () => {
    expect(isDateKey('2026-09-25')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('26-9-25')).toBe(false);
    expect(isDateKey(20260925)).toBe(false);
  });
});

describe('shouldRollOver', () => {
  it('rolls over on first run and after local midnight only', () => {
    expect(shouldRollOver(null, at('2026-09-25'))).toBe(true);
    expect(shouldRollOver('2026-09-25', at('2026-09-25', '23:59'))).toBe(false);
    expect(shouldRollOver('2026-09-25', at('2026-09-26', '00:00'))).toBe(true);
  });

  it('does not roll over when the clock moved backwards', () => {
    expect(shouldRollOver('2026-09-25', at('2026-09-24', '22:00'))).toBe(false);
  });
});
