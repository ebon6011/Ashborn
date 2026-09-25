import { describe, expect, it } from 'vitest';
import { applyXp, xpToNext } from './xp';

const fresh = { level: 1, xp: 0, unspentStatPoints: 0 };

describe('xpToNext', () => {
  it('follows round(80 × L^1.3)', () => {
    expect(xpToNext(1)).toBe(80);
    expect(xpToNext(2)).toBe(197);
    expect(xpToNext(5)).toBe(648);
    expect(xpToNext(10)).toBe(1596);
  });
});

describe('applyXp', () => {
  it('adds XP without levelling when below the threshold', () => {
    const r = applyXp(fresh, 50);
    expect(r.player).toEqual({ level: 1, xp: 50, unspentStatPoints: 0 });
    expect(r.levelUp).toBeNull();
  });

  it('levels up exactly at the threshold and grants 3 points', () => {
    const r = applyXp(fresh, 80);
    expect(r.player).toEqual({ level: 2, xp: 0, unspentStatPoints: 3 });
    expect(r.levelUp).toEqual({ fromLevel: 1, toLevel: 2, fromRank: 'E', toRank: 'E', statPointsGained: 3 });
  });

  it('carries overflow across several level-ups', () => {
    const r = applyXp(fresh, xpToNext(1) + xpToNext(2) + 10);
    expect(r.player).toEqual({ level: 3, xp: 10, unspentStatPoints: 6 });
    expect(r.levelUp?.statPointsGained).toBe(6);
  });

  it('adds the rank-up bonus when crossing into a new rank', () => {
    const r = applyXp({ level: 9, xp: 0, unspentStatPoints: 1 }, xpToNext(9));
    expect(r.player.level).toBe(10);
    expect(r.player.unspentStatPoints).toBe(1 + 3 + 5);
    expect(r.levelUp).toMatchObject({ fromRank: 'E', toRank: 'D', statPointsGained: 8 });
  });

  it('ignores negative, fractional-part and non-finite amounts safely', () => {
    expect(applyXp(fresh, -40).player).toEqual(fresh);
    expect(applyXp(fresh, Number.NaN).player).toEqual(fresh);
    expect(applyXp(fresh, Number.POSITIVE_INFINITY).player).toEqual(fresh);
    expect(applyXp(fresh, 10.9).player.xp).toBe(10);
  });

  it('keeps other player fields untouched', () => {
    const r = applyXp({ ...fresh, streak: 4 }, 5);
    expect(r.player.streak).toBe(4);
  });
});
