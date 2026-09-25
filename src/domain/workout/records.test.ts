import { describe, expect, it } from 'vitest';
import { computeRecords, estimateOneRepMax, isPersonalRecord } from './records';

describe('estimateOneRepMax (Epley)', () => {
  it('computes w × (1 + reps / 30)', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.333, 2);
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe('computeRecords', () => {
  it('finds heaviest weight, best estimated 1RM and best reps', () => {
    const r = computeRecords([{ weightKg: 50, reps: 10 }, { weightKg: 60, reps: 5 }, { weightKg: 55, reps: 8 }]);
    expect(r.heaviestKg).toBe(60);
    expect(r.bestOneRepMax).toBeCloseTo(70, 5);
    expect(r.bestReps).toBe(10);
  });

  it('returns zeros for no sets', () => {
    expect(computeRecords([])).toEqual({ heaviestKg: 0, bestOneRepMax: 0, bestReps: 0 });
  });
});

describe('isPersonalRecord', () => {
  const previous = [{ weightKg: 60, reps: 5 }];
  it('is never a PR on the first ever set', () => {
    expect(isPersonalRecord([], { weightKg: 60, reps: 5 }, true)).toBe(false);
  });
  it('must strictly beat the previous best', () => {
    expect(isPersonalRecord(previous, { weightKg: 60, reps: 6 }, true)).toBe(true);
    expect(isPersonalRecord(previous, { weightKg: 60, reps: 5 }, true)).toBe(false);
  });
  it('uses reps for bodyweight exercises', () => {
    expect(isPersonalRecord([{ weightKg: 0, reps: 10 }], { weightKg: 0, reps: 11 }, false)).toBe(true);
  });
});
