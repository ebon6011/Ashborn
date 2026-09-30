import { ALL_BOSSES } from '../config/bosses';
import { progression } from '../config/progression';

export interface AchievementContext {
  questsCompleted: number;
  bestStreak: number;
  level: number;
  hasPR: boolean;
  hasSRank: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  isUnlocked: (c: AchievementContext) => boolean;
}

/** The achievement id doubles as the id of the title it unlocks. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-quest', title: 'The Awakened', description: 'Complete your first quest.', isUnlocked: (c) => c.questsCompleted >= 1 },
  { id: 'streak-7', title: 'Unbroken', description: 'Reach a 7-day streak.', isUnlocked: (c) => c.bestStreak >= 7 },
  { id: 'streak-30', title: 'Iron Will', description: 'Reach a 30-day streak.', isUnlocked: (c) => c.bestStreak >= 30 },
  { id: 'first-pr', title: 'Limit Breaker', description: 'Beat your starting best on any exercise.', isUnlocked: (c) => c.hasPR },
  { id: 'first-s-rank', title: 'Apex', description: 'Reach S rank on any exercise.', isUnlocked: (c) => c.hasSRank },
  { id: 'level-10', title: 'Gatecrasher', description: 'Reach level 10.', isUnlocked: (c) => c.level >= 10 },
  { id: 'quests-100', title: 'Relentless', description: 'Complete 100 quests.', isUnlocked: (c) => c.questsCompleted >= 100 },
];

export function newlyUnlocked(ctx: AchievementContext, unlockedIds: readonly string[]): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlockedIds.includes(a.id) && a.isUnlocked(ctx));
}

/** Every title a player can earn: achievements, then one per Boss (`boss-<id>`). */
export const ALL_TITLES: ReadonlyArray<{ id: string; title: string; description: string }> = [
  ...ACHIEVEMENTS.map(({ id, title, description }) => ({ id, title, description })),
  ...ALL_BOSSES.map((b) => ({ id: `boss-${b.id}`, title: b.title, description: `Defeat ${b.name}, ${b.epithet}.` })),
];

export function titleFor(titleId: string | null): string {
  return ALL_TITLES.find((t) => t.id === titleId)?.title ?? progression.defaultTitle;
}
