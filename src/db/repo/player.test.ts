import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { assignStats, setTitle } from './player';

describe('player actions', () => {
  it('assigns stat points and refuses to overspend', async () => {
    const db = await setupPlayer();
    await db.player.update(1, { unspentStatPoints: 3 });
    await assignStats(db, { strength: 3 });
    expect(await db.player.get(1)).toMatchObject({ unspentStatPoints: 0, stats: { strength: 13 } });
    await expect(assignStats(db, { strength: 1 })).rejects.toThrow('Not enough stat points.');
  });

  it('only equips unlocked titles', async () => {
    const db = await setupPlayer();
    await expect(setTitle(db, 'streak-7')).rejects.toThrow('That title is still locked.');
    await db.achievements.put({ id: 'streak-7', unlockedAt: '2026-09-21T09:00:00.000Z' });
    await setTitle(db, 'streak-7');
    expect((await db.player.get(1))?.titleId).toBe('streak-7');
    await setTitle(db, null);
    expect((await db.player.get(1))?.titleId).toBeNull();
  });
});
