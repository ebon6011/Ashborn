import type { BackupData } from '../domain/backup';
import { writeTx, type AshbornDB } from './schema';

const TRANSIENT_META = new Set(['pendingEvents']);

export async function exportData(database: AshbornDB): Promise<BackupData> {
  const [profile, player, days, sideQuests, questLog, workoutPlans, workoutSets, foodLog, achievements, meta, bosses, inventory] = await database.transaction(
    'r',
    database.tables,
    () =>
      Promise.all([
        database.profile.toArray(),
        database.player.toArray(),
        database.days.toArray(),
        database.sideQuests.toArray(),
        database.questLog.toArray(),
        database.workoutPlans.toArray(),
        database.workoutSets.toArray(),
        database.foodLog.toArray(),
        database.achievements.toArray(),
        database.meta.toArray(),
        database.bosses.toArray(),
        database.inventory.toArray(),
      ]),
  );
  return {
    profile, player, days, sideQuests, questLog, workoutPlans, workoutSets, foodLog, achievements,
    meta: meta.filter((row) => !TRANSIENT_META.has(row.key)),
    bosses,
    inventory,
  };
}

/** Replaces ALL local data with the backup, atomically. Validate with parseBackup first. */
export async function importData(database: AshbornDB, data: BackupData): Promise<void> {
  await writeTx(database, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
    await database.profile.bulkPut(data.profile);
    await database.player.bulkPut(data.player);
    await database.days.bulkPut(data.days);
    await database.sideQuests.bulkPut(data.sideQuests);
    await database.questLog.bulkPut(data.questLog);
    await database.workoutPlans.bulkPut(data.workoutPlans);
    await database.workoutSets.bulkPut(data.workoutSets);
    await database.foodLog.bulkPut(data.foodLog);
    await database.achievements.bulkPut(data.achievements);
    await database.meta.bulkPut(data.meta);
    await database.bosses.bulkPut(data.bosses);
    await database.inventory.bulkPut(data.inventory);
  });
}
