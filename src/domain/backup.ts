import { getItem } from '../config/items';
import { todayKey } from './day';
import { BACKUP_TABLES, SCHEMA_VERSION, backupMigrations, migrateBackupData, type BackupMigration, type TableData } from './migrations';
import { rankForLevel } from './rank';
import type {
  AchievementRow, BossRecord, DayRecord, FoodEntry, InventoryRow, MetaRow, Player, Profile, QuestLogEntry, Rank, SideQuest, WeekPlan, WorkoutSet,
} from './types';
import { isRecord, rowValidators } from './validate';

export interface BackupData {
  profile: Profile[];
  player: Player[];
  days: DayRecord[];
  sideQuests: SideQuest[];
  questLog: QuestLogEntry[];
  workoutPlans: WeekPlan[];
  workoutSets: WorkoutSet[];
  foodLog: FoodEntry[];
  achievements: AchievementRow[];
  meta: MetaRow[];
  bosses: BossRecord[];
  inventory: InventoryRow[];
}

export interface BackupFile {
  app: 'ashborn';
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

export interface BackupSummary {
  playerName: string;
  level: number;
  rank: Rank;
  daysOfHistory: number;
  setsLogged: number;
  exportedAt: string;
}

export type ParseResult = { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; error: string };

export const BACKUP_REMINDER_DAYS = 7;

const fail = (error: string): ParseResult => ({ ok: false, error });

export function buildBackup(data: BackupData, now: Date): BackupFile {
  return { app: 'ashborn', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data };
}

export function backupFileName(now: Date): string {
  return `ashborn-backup-${todayKey(now)}.json`;
}

export function parseBackup(
  text: string,
  currentVersion: number = SCHEMA_VERSION,
  migrations: Record<number, BackupMigration> = backupMigrations,
): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('This file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.app !== 'ashborn') return fail('This file is not an Ashborn backup.');

  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return fail('This backup has an unknown format version.');
  if (version > currentVersion) return fail('This backup was made by a newer version of Ashborn. Update the app, then try again.');
  if (!isRecord(raw.data)) return fail('This backup has no data.');

  let data: TableData;
  try {
    data = migrateBackupData(raw.data as TableData, version, currentVersion, migrations);
  } catch {
    return fail('This backup could not be upgraded to the current version.');
  }

  for (const table of BACKUP_TABLES) {
    const rows = data[table];
    if (!Array.isArray(rows)) return fail(`This backup is missing "${table}".`);
    const bad = rows.findIndex((row) => !rowValidators[table](row));
    if (bad !== -1) return fail(`This backup has an invalid entry in "${table}" (item ${bad + 1}).`);
  }

  const typed = data as unknown as BackupData;
  if (typed.profile.length !== 1 || typed.player.length !== 1) return fail('This backup has no player data.');

  const owned = new Set<string>();
  for (const row of typed.inventory) {
    if (owned.has(row.itemId)) return fail('This backup lists the same item twice.');
    owned.add(row.itemId);
  }
  const equipped = typed.player[0]!;
  const ownsKind = (id: string | null, kind: 'theme' | 'frame') => id === null || (owned.has(id) && getItem(id)?.kind === kind);
  if (!ownsKind(equipped.themeId, 'theme') || !ownsKind(equipped.frameId, 'frame')) return fail('This backup equips an item it does not own.');

  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : '';
  const player = typed.player[0]!;
  const clean = Object.fromEntries(BACKUP_TABLES.map((t) => [t, typed[t]])) as unknown as BackupData;
  return {
    ok: true,
    backup: { app: 'ashborn', schemaVersion: currentVersion, exportedAt, data: clean },
    summary: {
      playerName: typed.profile[0]!.name,
      level: player.level,
      rank: rankForLevel(player.level),
      daysOfHistory: typed.days.length,
      setsLogged: typed.workoutSets.length,
      exportedAt,
    },
  };
}

export function needsBackupReminder(now: Date, lastBackupAt: string | undefined, installedAt: string | undefined): boolean {
  const reference = lastBackupAt ?? installedAt;
  if (!reference) return false;
  const time = Date.parse(reference);
  if (Number.isNaN(time)) return true;
  return now.getTime() - time > BACKUP_REMINDER_DAYS * 86_400_000;
}
