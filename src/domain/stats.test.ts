import { describe, expect, it } from 'vitest';
import { addSideQuestProgress, assignStatPoints, initialPlayer } from './stats';

describe('initialPlayer', () => {
  it('starts at level 1 with 10 in every stat', () => {
    const p = initialPlayer();
    expect(p).toMatchObject({ id: 1, level: 1, xp: 0, unspentStatPoints: 0, titleId: null, streak: 0, bestStreak: 0, questsCompleted: 0 });
    expect(Object.values(p.stats)).toEqual([10, 10, 10, 10, 10]);
    expect(Object.values(p.sideQuestStatProgress)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('assignStatPoints', () => {
  const player = { ...initialPlayer(), unspentStatPoints: 3 };

  it('moves points into stats', () => {
    const p = assignStatPoints(player, { strength: 2, agility: 1 });
    expect(p.stats.strength).toBe(12);
    expect(p.stats.agility).toBe(11);
    expect(p.unspentStatPoints).toBe(0);
  });

  it('cannot spend more points than available', () => {
    expect(() => assignStatPoints(player, { strength: 4 })).toThrow('Not enough stat points.');
  });

  it('rejects negative or fractional points', () => {
    expect(() => assignStatPoints(player, { strength: -1 })).toThrow();
    expect(() => assignStatPoints(player, { strength: 0.5 })).toThrow();
  });
});

describe('addSideQuestProgress', () => {
  it('adds +1 to the stat every 5 completions', () => {
    let p = initialPlayer();
    for (let i = 0; i < 4; i++) p = addSideQuestProgress(p, 'discipline');
    expect(p.stats.discipline).toBe(10);
    expect(p.sideQuestStatProgress.discipline).toBe(4);
    p = addSideQuestProgress(p, 'discipline');
    expect(p.stats.discipline).toBe(11);
    expect(p.sideQuestStatProgress.discipline).toBe(0);
  });
});
