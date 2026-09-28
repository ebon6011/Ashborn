/** Bump when the Dexie schema changes, and add a matching entry to backupMigrations. */
export const SCHEMA_VERSION = 2;

export const BACKUP_TABLES = [
  'profile', 'player', 'days', 'sideQuests', 'questLog',
  'workoutPlans', 'workoutSets', 'foodLog', 'achievements', 'meta', 'bosses',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type TableData = Record<string, unknown[]>;
export type BackupMigration = (data: TableData) => TableData;

/**
 * Key N upgrades backup data from schema N-1 to N.
 * Keep each step identical in effect to the Dexie `.upgrade()` for the same version.
 */
export const backupMigrations: Record<number, BackupMigration> = {
  // v2 adds the weekly Boss history (same as the Dexie version 2 block: a new, empty table).
  2: (data) => ({ ...data, bosses: Array.isArray(data.bosses) ? data.bosses : [] }),
};

export function migrateBackupData(
  data: TableData,
  fromVersion: number,
  toVersion: number = SCHEMA_VERSION,
  migrations: Record<number, BackupMigration> = backupMigrations,
): TableData {
  let out = data;
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    const step = migrations[version];
    if (!step) throw new Error(`No migration to schema version ${version}.`);
    out = step(out);
  }
  return out;
}
