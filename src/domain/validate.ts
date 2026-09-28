import { isDateKey } from './day';
import type { BackupTable } from './migrations';
import { STAT_KEYS } from './types';

type Check = (value: unknown) => boolean;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const str: Check = (v) => typeof v === 'string';
const bool: Check = (v) => typeof v === 'boolean';
const nonNeg: Check = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const intIn = (min: number, max: number): Check => (v) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const count = intIn(0, Number.MAX_SAFE_INTEGER);
const oneOf = (...allowed: readonly unknown[]): Check => (v) => allowed.includes(v);
const nullable = (check: Check): Check => (v) => v === null || check(v);
const arrayOf = (check: Check): Check => (v) => Array.isArray(v) && v.every(check);
const shape = (spec: Record<string, Check>): Check => (v) => isRecord(v) && Object.entries(spec).every(([key, check]) => check(v[key]));
const both = (a: Check, b: Check): Check => (v) => a(v) && b(v);

const stats = shape(Object.fromEntries(STAT_KEYS.map((k) => [k, nonNeg])));
const questItem = shape({ id: str, label: str, easier: str, target: nonNeg, unit: oneOf('reps', 'min'), progress: nonNeg });
const penalty = both(questItem, shape({ xp: nonNeg, done: bool }));
const urgent = shape({ id: str, label: str, xp: nonNeg, done: bool });

export const rowValidators: Record<BackupTable, Check> = {
  profile: shape({
    id: oneOf(1), name: str, age: count, sex: oneOf('male', 'female'), heightCm: nonNeg, weightKg: nonNeg,
    goal: oneOf('lose_fat', 'build_muscle', 'get_fit'), experience: oneOf('never', 'beginner', 'intermediate', 'advanced'),
    daysPerWeek: intIn(1, 7), minutesPerSession: count, equipment: oneOf('none', 'dumbbells', 'gym'), createdAt: str,
  }),
  player: shape({
    id: oneOf(1), level: intIn(1, Number.MAX_SAFE_INTEGER), xp: nonNeg, unspentStatPoints: count, stats,
    titleId: nullable(str), streak: count, bestStreak: count, questsCompleted: count, sideQuestStatProgress: stats,
  }),
  days: shape({
    date: isDateKey, items: arrayOf(questItem), status: oneOf('open', 'partial', 'done', 'missed', 'rest'),
    penalty: nullable(penalty), urgent: nullable(urgent), xpAwarded: nonNeg,
  }),
  sideQuests: shape({ id: count, title: str, xp: nonNeg, stat: oneOf(...STAT_KEYS), archived: bool, completions: count }),
  questLog: shape({ id: count, date: isDateKey, kind: oneOf('daily', 'penalty', 'urgent', 'side', 'boss'), refId: str, xp: nonNeg, at: str }),
  workoutPlans: shape({
    weekStart: isDateKey,
    days: arrayOf(shape({
      weekday: intIn(1, 7), focus: oneOf('full', 'upper', 'lower'),
      exercises: arrayOf(shape({ exerciseId: str, sets: count, reps: count })),
    })),
  }),
  workoutSets: shape({ id: count, exerciseId: str, date: isDateKey, reps: count, weightKg: nonNeg, at: str }),
  foodLog: shape({ id: count, date: isDateKey, kcal: nonNeg, proteinG: nonNeg, waterMl: nonNeg, note: str, at: str }),
  achievements: shape({ id: str, unlockedAt: str }),
  meta: (v) => isRecord(v) && typeof v.key === 'string' && v.value !== undefined,
  bosses: shape({
    weekStart: isDateKey, bossId: str, scale: nonNeg, maxHp: count, hp: count,
    defeatedAt: nullable(str), trainingBase: isRecord,
  }),
};
