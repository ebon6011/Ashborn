export type Sex = 'male' | 'female';
export type Goal = 'lose_fat' | 'build_muscle' | 'get_fit';
export type Experience = 'never' | 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'none' | 'dumbbells' | 'gym';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const RANKS: readonly Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export type StatKey = 'strength' | 'agility' | 'vitality' | 'endurance' | 'discipline';
export const STAT_KEYS: readonly StatKey[] = ['strength', 'agility', 'vitality', 'endurance', 'discipline'];
export type Stats = Record<StatKey, number>;

export interface Profile {
  id: 1;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  minutesPerSession: number;
  equipment: Equipment;
  createdAt: string;
}
export type ProfileInput = Omit<Profile, 'id' | 'createdAt'>;

export interface Player {
  id: 1;
  level: number;
  xp: number;
  unspentStatPoints: number;
  stats: Stats;
  titleId: string | null;
  streak: number;
  bestStreak: number;
  questsCompleted: number;
  sideQuestStatProgress: Stats;
  /** Equipped window theme; null = the default. */
  themeId: string | null;
  /** Equipped emblem frame; null = the default. */
  frameId: string | null;
  /** Streak Shields held (0 … progression.items.maxShields). */
  shields: number;
  /** Chosen class; null until the player picks one. */
  classId: ClassId | null;
  /** Date key of the last class choice (starts the change cooldown). */
  classChosenAt: string | null;
  /** The one-time Class Change Trial is finished. */
  trialDone: boolean;
}

export type QuestItemKind = 'pushups' | 'situps' | 'squats' | 'cardio';
export type ClassId = 'ironclad' | 'galestrider' | 'bulwark' | 'wayfarer';
export type QuestUnit = 'reps' | 'min';

export interface QuestItem {
  id: string;
  label: string;
  easier: string;
  target: number;
  unit: QuestUnit;
  progress: number;
}

export interface PenaltyQuest extends QuestItem {
  xp: number;
  done: boolean;
}

export interface UrgentQuest {
  id: string;
  label: string;
  xp: number;
  done: boolean;
}

export type DayStatus = 'open' | 'partial' | 'done' | 'missed' | 'rest';

export interface DayRecord {
  date: string;
  items: QuestItem[];
  status: DayStatus;
  penalty: PenaltyQuest | null;
  urgent: UrgentQuest | null;
  xpAwarded: number;
  /** A missed day covered by a Streak Shield. */
  shielded?: true;
}

export interface SideQuest {
  id: number;
  title: string;
  xp: number;
  stat: StatKey;
  archived: boolean;
  completions: number;
}

export type QuestKind = 'daily' | 'penalty' | 'urgent' | 'side' | 'boss' | 'trial';

export interface QuestLogEntry {
  id: number;
  date: string;
  kind: QuestKind;
  refId: string;
  xp: number;
  at: string;
}

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core';
export type PlanFocus = 'full' | 'upper' | 'lower';

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: number;
}

export interface PlanDay {
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  weekday: number;
  focus: PlanFocus;
  exercises: PlannedExercise[];
}

export interface WeekPlan {
  weekStart: string;
  days: PlanDay[];
}

export interface WorkoutSet {
  id: number;
  exerciseId: string;
  date: string;
  reps: number;
  weightKg: number;
  at: string;
}

export interface FoodEntry {
  id: number;
  date: string;
  kcal: number;
  proteinG: number;
  waterMl: number;
  note: string;
  at: string;
}

export interface AchievementRow {
  id: string;
  unlockedAt: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export type PersistResult = 'granted' | 'denied' | 'unsupported';

export interface LevelUpEvent {
  fromLevel: number;
  toLevel: number;
  fromRank: Rank;
  toRank: Rank;
  statPointsGained: number;
}

export type GameEvent =
  | ({ type: 'levelUp' } & LevelUpEvent)
  | { type: 'achievement'; id: string; title: string }
  | { type: 'bossDefeated'; bossId: string; xp: number; title: string | null }
  | { type: 'bossAppeared'; weekStart: string; bossId: string }
  | { type: 'shieldUsed'; count: number; streak: number }
  /** itemId null = a Shield (shield: true) or "collection complete" (shield: false). */
  | { type: 'itemObtained'; source: ItemSource; itemId: string | null; shield: boolean }
  /** The Class Change Trial is finished: offer the class choice. */
  | { type: 'classChoice' };

export type BossCategory = 'legs' | 'core' | 'cardio' | 'upper';

/** One week's Boss. HP scale is fixed when the Boss appears. */
export interface BossRecord {
  /** Monday of the Boss's week, YYYY-MM-DD (local) */
  weekStart: string;
  bossId: string;
  scale: number;
  maxHp: number;
  hp: number;
  defeatedAt: string | null;
  /** Base training damage already dealt per day (for the daily cap) */
  trainingBase: Record<string, number>;
}

export type ItemSource = 'boss' | 'streak' | 'rankUp';

/** One earned item (theme, frame or title). Streak Shields are counted on the player instead. */
export interface InventoryRow {
  itemId: string;
  /** ISO time it was earned */
  obtainedAt: string;
  source: ItemSource;
}
