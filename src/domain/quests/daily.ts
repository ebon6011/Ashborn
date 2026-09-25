import { progression } from '../../config/progression';
import type { DayRecord, Experience, QuestItem } from '../types';

export function dailyQuestXp(level: number): number {
  const { baseXp, xpPerLevel } = progression.dailyQuest;
  return baseXp + xpPerLevel * level;
}

export function targetScale(level: number): number {
  const { scalePerLevel, maxScale } = progression.dailyQuest;
  return Math.min(maxScale, 1 + scalePerLevel * (level - 1));
}

export function generateDailyItems(experience: Experience, level: number, reference: QuestItem[] | null): QuestItem[] {
  const scale = targetScale(level);
  return progression.tiers[experience].map((tier) => {
    let target = Math.max(1, Math.round(tier.target * scale));
    const previous = reference?.find((r) => r.id === tier.kind);
    if (previous) {
      const cap = previous.target + Math.max(1, Math.floor(previous.target * progression.dailyQuest.weeklyGrowthCap));
      target = Math.min(target, cap);
    }
    return { id: tier.kind, label: tier.label, easier: tier.easier, target, unit: tier.unit, progress: 0 };
  });
}

export function createDayRecord(date: string, experience: Experience, level: number, reference: QuestItem[] | null): DayRecord {
  return {
    date,
    items: generateDailyItems(experience, level, reference),
    status: 'open',
    penalty: null,
    urgent: null,
    xpAwarded: 0,
  };
}

export function completionFraction(items: QuestItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + (item.target > 0 ? Math.min(1, item.progress / item.target) : 1), 0);
  return total / items.length;
}

export function isDailyComplete(items: QuestItem[]): boolean {
  return items.length > 0 && items.every((item) => item.progress >= item.target);
}

export function partialXp(items: QuestItem[], level: number): number {
  return Math.floor(dailyQuestXp(level) * completionFraction(items));
}
