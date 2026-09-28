import { BOSSES, getBoss, type BossDef } from '../config/bosses';
import { progression } from '../config/progression';
import { daysBetween } from './day';
import type { BossCategory, BossRecord, ExerciseCategory, Experience, WeekPlan } from './types';

/** A Monday; the weekly rotation counts whole weeks from here. */
export const ROSTER_EPOCH = '2026-01-05';

const cfg = progression.boss;

export function bossForWeek(weekStart: string): BossDef {
  const weeks = Math.floor(daysBetween(ROSTER_EPOCH, weekStart) / 7);
  return BOSSES[((weeks % BOSSES.length) + BOSSES.length) % BOSSES.length]!;
}

/** HP and damage both grow by this, so a Boss always takes about the same effort. */
export function bossScale(level: number, experience: Experience): number {
  return cfg.scale.byTier[experience] * (1 + cfg.scale.perLevel * (Math.max(1, level) - 1));
}

/** Rounded DOWN (damage rounds up), so `sessionsToWin` full sessions always win. */
export function bossMaxHp(scale: number): number {
  return Math.floor(cfg.sessionsToWin * cfg.sessionDamage * scale);
}

export function createBossRecord(weekStart: string, level: number, experience: Experience): BossRecord {
  const scale = bossScale(level, experience);
  const maxHp = bossMaxHp(scale);
  return { weekStart, bossId: bossForWeek(weekStart).id, scale, maxHp, hp: maxHp, defeatedAt: null, trainingBase: {} };
}

const ITEM_CATEGORY: Record<string, BossCategory> = { pushups: 'upper', situps: 'core', squats: 'legs', cardio: 'cardio' };

export function questItemCategory(itemId: string): BossCategory | null {
  return ITEM_CATEGORY[itemId] ?? null;
}

export function exerciseBossCategory(category: ExerciseCategory): BossCategory {
  return category === 'push' || category === 'pull' ? 'upper' : category;
}

export function penaltyCategory(label: string): BossCategory {
  return /walk|jog|run/i.test(label) ? 'cardio' : 'legs';
}

/** One hit: base (in session-damage points) × the Boss's scale, doubled on its weakness, rounded UP. */
export function hitDamage(boss: BossRecord, base: number, category: BossCategory | null): number {
  if (base <= 0) return 0;
  // The stored Boss decides the weakness, so a later roster change can't disagree with the saved record.
  const weakness = (getBoss(boss.bossId) ?? bossForWeek(boss.weekStart)).weakness;
  const weak = category !== null && category === weakness;
  return Math.ceil(base * boss.scale * (weak ? cfg.weaknessMultiplier : 1) - 1e-9);
}

export function applyDamage(boss: BossRecord, amount: number, now: Date): { boss: BossRecord; defeatedNow: boolean } {
  if (boss.defeatedAt || amount <= 0) return { boss, defeatedNow: false };
  const hp = Math.max(0, boss.hp - amount);
  return hp === 0 ? { boss: { ...boss, hp, defeatedAt: now.toISOString() }, defeatedNow: true } : { boss: { ...boss, hp }, defeatedNow: false };
}

/** Average planned sets per training day this week; a session of sets deals one session of damage. */
export function plannedSetsPerDay(plan: WeekPlan | undefined): number {
  if (!plan || plan.days.length === 0) return cfg.defaultSetsPerDay;
  const sets = plan.days.reduce((sum, day) => sum + day.exercises.reduce((s, e) => s + e.sets, 0), 0);
  return Math.max(1, Math.round(sets / plan.days.length));
}

/** Base damage for one logged set, respecting the daily training cap (before scale and weakness). */
export function trainingSetBase(plannedPerDay: number, alreadyToday: number): number {
  const cap = cfg.trainingDailyCapSessions * cfg.sessionDamage;
  return Math.max(0, Math.min(cfg.sessionDamage / Math.max(1, plannedPerDay), cap - alreadyToday));
}

export function bossRewardXp(level: number): number {
  return cfg.xpReward.base + cfg.xpReward.perLevel * level;
}

/** Monday = 7 … Sunday = 1. */
export function bossDaysLeft(weekStart: string, today: string): number {
  return Math.max(1, 7 - daysBetween(weekStart, today));
}
