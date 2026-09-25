import Dexie, { type EntityTable, type Table } from 'dexie';
import type { BackupTable } from '../domain/migrations';
import type {
  AchievementRow, DayRecord, FoodEntry, MetaRow, Player, Profile, QuestLogEntry, SideQuest, WeekPlan, WorkoutSet,
} from '../domain/types';

export const STORES_V1: Record<BackupTable, string> = {
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

  constructor(name = 'ashborn') {
    super(name);
    // RULE: never edit or delete a version block once shipped. To change the schema add
    //   this.version(N + 1).stores({...}).upgrade((tx) => ...)
    // plus backupMigrations[N + 1] in src/domain/migrations.ts, and bump SCHEMA_VERSION.
    this.version(1).stores(STORES_V1);
  }
}

export const db = new AshbornDB();

/** Read-write transaction over every table. Nested calls join the outer transaction. */
export function writeTx<T>(database: AshbornDB, fn: () => Promise<T>): Promise<T> {
  return database.transaction('rw', database.tables, fn);
}
