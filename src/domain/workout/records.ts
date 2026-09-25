import type { WorkoutSet } from '../types';

export type SetResult = Pick<WorkoutSet, 'reps' | 'weightKg'>;

export interface ExerciseRecords {
  heaviestKg: number;
  bestOneRepMax: number;
  bestReps: number;
}

/** Epley B. "Poundage chart." Boyd Epley Workout, 1985: 1RM ≈ w × (1 + reps / 30). */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function performance(set: SetResult, weighted: boolean): number {
  return weighted ? estimateOneRepMax(set.weightKg, set.reps) : set.reps;
}

export function computeRecords(sets: readonly SetResult[]): ExerciseRecords {
  return sets.reduce<ExerciseRecords>(
    (r, s) => ({
      heaviestKg: Math.max(r.heaviestKg, s.weightKg),
      bestOneRepMax: Math.max(r.bestOneRepMax, estimateOneRepMax(s.weightKg, s.reps)),
      bestReps: Math.max(r.bestReps, s.reps),
    }),
    { heaviestKg: 0, bestOneRepMax: 0, bestReps: 0 },
  );
}

export function isPersonalRecord(previous: readonly SetResult[], next: SetResult, weighted: boolean): boolean {
  if (previous.length === 0) return false;
  const best = previous.reduce((m, s) => Math.max(m, performance(s, weighted)), 0);
  return performance(next, weighted) > best;
}
