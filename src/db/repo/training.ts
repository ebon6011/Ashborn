import { addDays, weekStartOf } from '../../domain/day';
import { generateWeekPlan, type PlanProfile } from '../../domain/workout/plan';
import type { AshbornDB } from '../schema';

export async function ensureWeekPlan(database: AshbornDB, profile: PlanProfile, date: string): Promise<void> {
  const weekStart = weekStartOf(date);
  if (await database.workoutPlans.get(weekStart)) return;
  const previous =
    (await database.workoutPlans.get(addDays(weekStart, -7))) ??
    (await database.workoutPlans.where('weekStart').below(weekStart).last()) ??
    null;
  await database.workoutPlans.put(generateWeekPlan(profile, weekStart, previous));
}
