import { describe, expect, it } from 'vitest';
import { BOSSES } from '../config/bosses';
import { ACHIEVEMENTS, ALL_TITLES, newlyUnlocked, titleFor, type AchievementContext } from './achievements';

const zero: AchievementContext = { questsCompleted: 0, bestStreak: 0, level: 1, hasPR: false, hasSRank: false };
const ids = (ctx: AchievementContext, already: string[] = []) => newlyUnlocked(ctx, already).map((a) => a.id);

describe('newlyUnlocked', () => {
  it('unlocks nothing for a new player', () => {
    expect(ids(zero)).toEqual([]);
  });

  it('unlocks each milestone', () => {
    expect(ids({ ...zero, questsCompleted: 1 })).toEqual(['first-quest']);
    expect(ids({ ...zero, bestStreak: 7 })).toEqual(['streak-7']);
    expect(ids({ ...zero, bestStreak: 30 })).toEqual(['streak-7', 'streak-30']);
    expect(ids({ ...zero, hasPR: true })).toEqual(['first-pr']);
    expect(ids({ ...zero, hasSRank: true })).toEqual(['first-s-rank']);
    expect(ids({ ...zero, level: 10 })).toEqual(['level-10']);
    expect(ids({ ...zero, questsCompleted: 100 })).toEqual(['first-quest', 'quests-100']);
  });

  it('skips achievements already unlocked', () => {
    expect(ids({ ...zero, questsCompleted: 100 }, ['first-quest'])).toEqual(['quests-100']);
  });
});

describe('titleFor', () => {
  it('maps achievement ids to titles and falls back to the default', () => {
    expect(titleFor(null)).toBe('Novice');
    expect(titleFor('streak-7')).toBe('Unbroken');
    expect(titleFor('nonsense')).toBe('Novice');
  });

  it('knows the Boss titles too', () => {
    expect(titleFor('boss-mawgrath')).toBe('Colossus Breaker');
    expect(ALL_TITLES.map((t) => t.id)).toEqual([...ACHIEVEMENTS.map((a) => a.id), ...BOSSES.map((b) => `boss-${b.id}`)]);
  });
});
