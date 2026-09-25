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
}

export type QuestItemKind = 'pushups' | 'situps' | 'squats' | 'cardio';
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
}

export interface SideQuest {
  id: number;
  title: string;
  xp: number;
  stat: StatKey;
  archived: boolean;
  completions: number;
}

export type QuestKind = 'daily' | 'penalty' | 'urgent' | 'side';

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
  | { type: 'achievement'; id: string; title: string };
