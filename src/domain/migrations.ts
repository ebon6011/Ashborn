/** Bump when the Dexie schema changes, and add a matching entry to backupMigrations. */
export const SCHEMA_VERSION = 1;

export const BACKUP_TABLES = [
  'profile', 'player', 'days', 'sideQuests', 'questLog',
  'workoutPlans', 'workoutSets', 'foodLog', 'achievements', 'meta',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type TableData = Record<string, unknown[]>;
export type BackupMigration = (data: TableData) => TableData;

/**
 * Key N upgrades backup data from schema N-1 to N.
 * Keep each step identical in effect to the Dexie `.upgrade()` for the same version.
 */
export const backupMigrations: Record<number, BackupMigration> = {};

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
