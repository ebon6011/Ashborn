import { describe, expect, it } from 'vitest';
import { rollUrgent } from './urgent';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

describe('rollUrgent', () => {
  it('appears when the roll is under the 30 % chance', () => {
    expect(rollUrgent(seq(0.1, 0), '2026-09-25', null)).toEqual({
      id: 'urgent-2026-09-25', label: 'Hold a plank for 30 seconds', xp: 25, done: false,
    });
  });

  it('picks the task from the second roll', () => {
    expect(rollUrgent(seq(0.1, 0.99), '2026-09-25', null)?.label).toBe('Do 10 slow squats');
  });

  it('does not appear when the roll misses', () => {
    expect(rollUrgent(seq(0.5), '2026-09-25', null)).toBeNull();
  });

  it('appears at most once per day', () => {
    expect(rollUrgent(seq(0), '2026-09-25', '2026-09-25')).toBeNull();
  });
});
