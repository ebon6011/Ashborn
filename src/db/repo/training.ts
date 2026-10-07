import { getExercise } from '../../config/exercises';
import { addDays, todayKey, weekStartOf } from '../../domain/day';
import { isPersonalRecord } from '../../domain/workout/records';
import { generateWeekPlan, type PlanProfile } from '../../domain/workout/plan';
import { writeTx, type AshbornDB } from '../schema';
import { unlockAchievements } from './player';
import { exerciseBossCategory } from '../../domain/boss';
import { dealTrainingDamage } from './boss';
import { exerciseRank } from '../../domain/workout/exerciseRank';
import { rankIndex } from '../../domain/rank';
import { grantDrop } from './inventory';

export async function ensureWeekPlan(database: AshbornDB, profile: PlanProfile, date: string): Promise<void> {
  const weekStart = weekStartOf(date);
  if (await database.workoutPlans.get(weekStart)) return;
  const previous =
    (await database.workoutPlans.get(addDays(weekStart, -7))) ??
    (await database.workoutPlans.where('weekStart').below(weekStart).last()) ??
    null;
  await database.workoutPlans.put(generateWeekPlan(profile, weekStart, previous));
}

export interface SetInput {
  exerciseId: string;
  reps: number;
  weightKg: number;
}

export async function logSet(database: AshbornDB, input: SetInput, now: Date): Promise<{ isPR: boolean }> {
  const exercise = getExercise(input.exerciseId);
  if (!exercise) throw new Error('Unknown exercise.');
  if (!Number.isInteger(input.reps) || input.reps < 1 || input.reps > 1000) throw new Error('Reps must be a whole number from 1 to 1000.');
  if (!Number.isFinite(input.weightKg) || input.weightKg < 0 || input.weightKg > 1000) throw new Error('Weight must be between 0 and 1000 kg.');
  if (exercise.weighted && input.weightKg <= 0) throw new Error('Enter the weight you lifted.');

  return writeTx(database, async () => {
    const previous = await database.workoutSets.where('exerciseId').equals(exercise.id).toArray();
    // A first set only sets the baseline; any later rise in this exercise's rank earns a drop.
    const rankBefore = exerciseRank(previous, exercise.weighted).rank;
    const set = {
      exerciseId: exercise.id,
      date: todayKey(now),
      reps: input.reps,
      weightKg: exercise.weighted ? input.weightKg : 0,
      at: now.toISOString(),
    };
    await database.workoutSets.add(set);
    const rankAfter = exerciseRank([...previous, set], exercise.weighted).rank;
    if (previous.length > 0 && rankIndex(rankAfter) > rankIndex(rankBefore)) await grantDrop(database, 'rankUp', now);
    await dealTrainingDamage(database, { category: exerciseBossCategory(exercise.category), date: set.date }, now);
    await unlockAchievements(database, now);
    return { isPR: isPersonalRecord(previous, set, exercise.weighted) };
  });
}

export async function deleteSet(database: AshbornDB, id: number): Promise<void> {
  await database.workoutSets.delete(id);
}
