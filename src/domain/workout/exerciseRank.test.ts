import { describe, expect, it } from 'vitest';
import type { WorkoutSet } from '../types';
import { exerciseRank, summarizeProgress } from './exerciseRank';

const set = (date: string, reps: number, weightKg = 0, exerciseId = 'pushup'): WorkoutSet => ({ id: 0, exerciseId, date, reps, weightKg, at: `${date}T09:00:00.000Z` });

describe('exerciseRank', () => {
  it('is E with no sets', () => {
    expect(exerciseRank([], false)).toEqual({ rank: 'E', ratio: 0 });
  });

  it.each([[10, 'E'], [11, 'D'], [13, 'C'], [15, 'B'], [18, 'A'], [20, 'S']])(
    'bodyweight: from 10 reps to %i reps is rank %s', (best, rank) => {
      expect(exerciseRank([set('2026-09-01', 10), set('2026-09-20', best)], false).rank).toBe(rank);
    },
  );

  it('uses the best set of the first day as the baseline', () => {
    const sets = [set('2026-09-01', 8), set('2026-09-01', 10), set('2026-09-10', 15)];
    expect(exerciseRank(sets, false)).toEqual({ rank: 'B', ratio: 1.5 });
  });

  it('uses estimated 1RM for weighted exercises', () => {
    expect(exerciseRank([set('2026-09-01', 10, 50), set('2026-10-01', 10, 100)], true).rank).toBe('S');
  });
});

describe('summarizeProgress', () => {
  it('detects improvement and S ranks across exercises', () => {
    const sets = [set('2026-09-01', 10), set('2026-09-02', 12), set('2026-09-01', 10, 40, 'goblet-squat')];
    expect(summarizeProgress(sets, (id) => id === 'goblet-squat')).toEqual({ hasPR: true, hasSRank: false });
    expect(summarizeProgress([...sets, set('2026-09-03', 20)], () => false).hasSRank).toBe(true);
    expect(summarizeProgress([], () => false)).toEqual({ hasPR: false, hasSRank: false });
  });
});
