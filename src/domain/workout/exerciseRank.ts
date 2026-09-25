import { progression } from '../../config/progression';
import type { Rank, WorkoutSet } from '../types';
import { performance } from './records';

type RankedSet = Pick<WorkoutSet, 'date' | 'reps' | 'weightKg'>;

/** Rank from your own progress: best result ÷ best result on your first logged day. */
export function exerciseRank(sets: readonly RankedSet[], weighted: boolean): { rank: Rank; ratio: number } {
  if (sets.length === 0) return { rank: 'E', ratio: 0 };
  const firstDate = sets.reduce((min, s) => (s.date < min ? s.date : min), sets[0]!.date);
  const baseline = sets.filter((s) => s.date === firstDate).reduce((m, s) => Math.max(m, performance(s, weighted)), 0);
  if (baseline <= 0) return { rank: 'E', ratio: 0 };
  const best = sets.reduce((m, s) => Math.max(m, performance(s, weighted)), 0);
  const ratio = best / baseline;
  const rank = progression.exerciseRank.find((t) => ratio + 1e-9 >= t.minRatio)?.rank ?? 'E';
  return { rank, ratio };
}

export function summarizeProgress(
  sets: readonly WorkoutSet[],
  isWeighted: (exerciseId: string) => boolean,
): { hasPR: boolean; hasSRank: boolean } {
  const byExercise = new Map<string, WorkoutSet[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  let hasPR = false;
  let hasSRank = false;
  for (const [id, list] of byExercise) {
    const { rank, ratio } = exerciseRank(list, isWeighted(id));
    if (ratio > 1) hasPR = true;
    if (rank === 'S') hasSRank = true;
  }
  return { hasPR, hasSRank };
}
