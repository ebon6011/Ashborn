import Dexie, { type EntityTable, type Table } from 'dexie';
import type { BackupTable } from '../domain/migrations';
import type {
  AchievementRow, BossRecord, DayRecord, FoodEntry, InventoryRow, MetaRow, Player, Profile, QuestLogEntry, SideQuest, WeekPlan, WorkoutSet,
} from '../domain/types';

/** Version 1 tables (shipped in v1.0.0). Never change. */
export const STORES_V1: Record<Exclude<BackupTable, 'bosses' | 'inventory'>, string> = {
  profile: 'id',
  player: 'id',
  days: 'date',
  sideQuests: '++id',
  questLog: '++id, date, kind',
  workoutPlans: 'weekStart',
  workoutSets: '++id, exerciseId, date',
  foodLog: '++id, date',
  achievements: 'id',
  meta: 'key',
};

/** Version 2 (v1.4.0): adds the weekly Boss history, keyed by the Monday of each week. */
export const STORES_V2: Record<Exclude<BackupTable, 'inventory'>, string> = { ...STORES_V1, bosses: 'weekStart' };

/** Version 3 (v1.6.0): adds the earned-items inventory, keyed by item id. */
export const STORES_V3: Record<BackupTable, string> = { ...STORES_V2, inventory: 'itemId' };

export class AshbornDB extends Dexie {
  declare profile: Table<Profile, number>;
  declare player: Table<Player, number>;
  declare days: Table<DayRecord, string>;
  declare sideQuests: EntityTable<SideQuest, 'id'>;
  declare questLog: EntityTable<QuestLogEntry, 'id'>;
  declare workoutPlans: Table<WeekPlan, string>;
  declare workoutSets: EntityTable<WorkoutSet, 'id'>;
  declare foodLog: EntityTable<FoodEntry, 'id'>;
  declare achievements: Table<AchievementRow, string>;
  declare meta: Table<MetaRow, string>;
  declare bosses: Table<BossRecord, string>;
  declare inventory: Table<InventoryRow, string>;

  constructor(name = 'ashborn') {
    super(name);
    // RULE: never edit or delete a version block once shipped. To change the schema add
    //   this.version(N + 1).stores({...}).upgrade((tx) => ...)
    // plus backupMigrations[N + 1] in src/domain/migrations.ts, and bump SCHEMA_VERSION.
    this.version(1).stores(STORES_V1);
    // v2: new empty `bosses` table; existing tables are untouched (matches backupMigrations[2]).
    this.version(2).stores(STORES_V2);
    // v3: new empty `inventory` table; the player gains default theme/frame and 0 Shields (matches backupMigrations[3]).
    this.version(3)
      .stores(STORES_V3)
      .upgrade((tx) =>
        tx.table('player').toCollection().modify((p: Record<string, unknown>) => {
          p.themeId = p.themeId ?? null;
          p.frameId = p.frameId ?? null;
          p.shields = p.shields ?? 0;
        }),
      );
  }
}

export const db = new AshbornDB();

/** Read-write transaction over every table. Nested calls join the outer transaction. */
export function writeTx<T>(database: AshbornDB, fn: () => Promise<T>): Promise<T> {
  return database.transaction('rw', database.tables, fn);
}
