import { addDays, todayKey, weekStartOf } from '../../domain/day';
import { createDayRecord } from '../../domain/quests/daily';
import { initialPlayer } from '../../domain/stats';
import type { ProfileInput } from '../../domain/types';
import { generateWeekPlan } from '../../domain/workout/plan';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';

export async function registerPlayer(database: AshbornDB, input: ProfileInput, now: Date): Promise<void> {
  const today = todayKey(now);
  await writeTx(database, async () => {
    await database.profile.put({ ...input, id: 1, createdAt: now.toISOString() });
    await database.player.put(initialPlayer());
    await database.days.put(createDayRecord(today, input.experience, 1, null));
    await database.workoutPlans.put(generateWeekPlan(input, weekStartOf(today), null));
    if (!(await getMeta(database, 'installedAt'))) await setMeta(database, 'installedAt', now.toISOString());
    await setMeta(database, 'lastOpenDate', today);
  });
}

/** Saves edited onboarding answers. Progress is kept; the current week's plan is rebuilt within the volume cap. */
export async function updateProfile(database: AshbornDB, input: ProfileInput, now: Date): Promise<void> {
  const weekStart = weekStartOf(todayKey(now));
  await writeTx(database, async () => {
    const existing = await database.profile.get(1);
    if (!existing) throw new Error('Player not registered.');
    await database.profile.put({ ...input, id: 1, createdAt: existing.createdAt });
    const previous =
      (await database.workoutPlans.get(addDays(weekStart, -7))) ?? (await database.workoutPlans.get(weekStart)) ?? null;
    await database.workoutPlans.put(generateWeekPlan(input, weekStart, previous));
  });
}
