import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { assignStats, ownedTitleIds, setTitle } from './player';

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

describe('titles from the inventory', () => {
  it('can be equipped once found, and stay locked before', async () => {
    const db = await setupPlayer('2026-10-05');
    await expect(setTitle(db, 'title-ironheart')).rejects.toThrow('That title is still locked.');
    await db.inventory.put({ itemId: 'title-ironheart', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' });
    await setTitle(db, 'title-ironheart');
    expect((await db.player.get(1))!.titleId).toBe('title-ironheart');
    expect(await ownedTitleIds(db)).toContain('title-ironheart');
    await db.inventory.put({ itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' });
    expect(await ownedTitleIds(db)).not.toContain('theme-ember');
    await expect(setTitle(db, 'theme-ember')).rejects.toThrow('That title is still locked.');
  });
});
