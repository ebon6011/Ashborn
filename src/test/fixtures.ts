import { AshbornDB } from '../db/schema';
import type { BackupData } from '../domain/backup';
import { createDayRecord } from '../domain/quests/daily';
import { initialPlayer } from '../domain/stats';
import type { ProfileInput } from '../domain/types';
import { generateWeekPlan } from '../domain/workout/plan';

export const sampleProfileInput: ProfileInput = {
  name: 'Kai',
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  goal: 'get_fit',
  experience: 'beginner',
  daysPerWeek: 3,
  minutesPerSession: 30,
  equipment: 'none',
};

/** Local-time Date for a YYYY-MM-DD key, e.g. at('2026-09-25', '23:59'). */
export function at(date: string, time = '09:00'): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, h, min);
}

/** A brand-new, empty database with a unique name (fake-indexeddb in tests). */
export function freshDb(): AshbornDB {
  return new AshbornDB(`test-${crypto.randomUUID()}`);
}

export function sampleBackupData(): BackupData {
  return {
    profile: [{ ...sampleProfileInput, id: 1, createdAt: '2026-09-01T08:00:00.000Z' }],
    player: [{ ...initialPlayer(), level: 7, xp: 120, streak: 3, bestStreak: 5, questsCompleted: 12 }],
    days: [createDayRecord('2026-09-24', 'beginner', 7, null)],
    sideQuests: [{ id: 1, title: 'Read 10 pages', xp: 20, stat: 'discipline', archived: false, completions: 2 }],
    questLog: [{ id: 1, date: '2026-09-24', kind: 'side', refId: '1', xp: 20, at: '2026-09-24T18:00:00.000Z' }],
    workoutPlans: [generateWeekPlan(sampleProfileInput, '2026-09-21', null)],
    workoutSets: [{ id: 1, exerciseId: 'pushup', date: '2026-09-22', reps: 12, weightKg: 0, at: '2026-09-22T07:30:00.000Z' }],
    foodLog: [{ id: 1, date: '2026-09-24', kcal: 650, proteinG: 40, waterMl: 500, note: 'Lunch', at: '2026-09-24T12:30:00.000Z' }],
    achievements: [{ id: 'first-quest', unlockedAt: '2026-09-02T09:00:00.000Z' }],
    // sorted by key, the order Dexie returns them in
    meta: [
      { key: 'installedAt', value: '2026-09-01T08:00:00.000Z' },
      { key: 'lastOpenDate', value: '2026-09-24' },
    ],
    bosses: [],
  };
}
