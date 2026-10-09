import { getClass } from '../config/classes';
import { progression } from '../config/progression';
import { daysBetween } from './day';
import { generateDailyItems } from './quests/daily';
import type { ClassId, Experience, QuestItem, QuestItemKind, StatKey } from './types';

const cfg = progression.classes;

/** Daily-target multiplier for one quest item under a class (1 when no class or balanced). */
export function classMultiplier(classId: ClassId | null, kind: QuestItemKind): number {
  const focus = getClass(classId)?.focus ?? null;
  if (focus === null) return 1;
  return kind === focus ? 1 + cfg.focusBoost : 1 - cfg.otherCut;
}

export function trialAvailable(p: { level: number; trialDone: boolean }): boolean {
  return p.level >= cfg.unlockLevel && !p.trialDone;
}

type ClassState = { trialDone: boolean; classId: ClassId | null; classChosenAt: string | null };

/** 0 when a class may be chosen now. */
export function daysUntilClassChange(p: ClassState, today: string): number {
  if (p.classId === null || p.classChosenAt === null) return 0;
  // A choice date in the future (wrong phone clock) never makes the wait longer than the cooldown.
  return Math.min(cfg.changeCooldownDays, Math.max(0, cfg.changeCooldownDays - daysBetween(p.classChosenAt, today)));
}

export function canChangeClass(p: ClassState, today: string): boolean {
  return p.trialDone && daysUntilClassChange(p, today) === 0;
}

export function sideQuestXp(base: number, stat: StatKey, classId: ClassId | null): number {
  return getClass(classId)?.stat === stat ? Math.round(base * (1 + cfg.sideQuestXpBonus)) : base;
}

/** The Class Change Trial: the player's daily items at trialScale×, no class, no growth cap. */
export function trialItems(experience: Experience, level: number): QuestItem[] {
  return generateDailyItems(experience, level, null).map((item) => ({
    ...item,
    target: Math.max(1, Math.round(item.target * cfg.trialScale)),
    progress: 0,
  }));
}
