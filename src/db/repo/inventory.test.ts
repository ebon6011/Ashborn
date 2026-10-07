import { afterEach, describe, expect, it } from 'vitest';
import { ALL_ITEMS, getItem } from '../../config/items';
import { completeDaily, neverUrgent, setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { getMeta } from '../meta';
import type { AshbornDB } from '../schema';
import { dealBossDamage } from './boss';
import { startDay } from './days';
import { equipFrame, equipTheme, grantDrop, setDropRngForTests } from './inventory';
import { deleteSet, logSet } from './training';

afterEach(() => setDropRngForTests(null));
const drops = async (db: AshbornDB) => ((await getMeta(db, 'pendingEvents')) ?? []).filter((e) => e.type === 'itemObtained');

describe('grantDrop', () => {
  it('stores a new item and queues the reward screen', async () => {
    const db = await setupPlayer('2026-10-05');
    await grantDrop(db, 'boss', at('2026-10-05'), () => 0); // theme, first unowned theme
    expect(await db.inventory.toArray()).toEqual([{ itemId: 'theme-ember', obtainedAt: at('2026-10-05').toISOString(), source: 'boss' }]);
    expect(await drops(db)).toEqual([{ type: 'itemObtained', source: 'boss', itemId: 'theme-ember', shield: false }]);
  });

  it('a Shield drop adds one Shield, never above 2', async () => {
    const db = await setupPlayer('2026-10-05');
    await grantDrop(db, 'streak', at('2026-10-05'), () => 0.99); // shield is the last kind
    expect((await db.player.get(1))!.shields).toBe(1);
    expect((await drops(db))[0]).toEqual({ type: 'itemObtained', source: 'streak', itemId: null, shield: true });
    await db.player.update(1, { shields: 2 });
    await grantDrop(db, 'streak', at('2026-10-05'), () => 0.99); // capped → falls to a collectable
    expect((await db.player.get(1))!.shields).toBe(2);
    expect((await drops(db))[1]).toMatchObject({ shield: false });
  });

  it('with everything owned and 2 Shields it says complete and writes nothing', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.inventory.bulkPut(ALL_ITEMS.map((i) => ({ itemId: i.id, obtainedAt: '2026-10-01T00:00:00.000Z', source: 'boss' as const })));
    await db.player.update(1, { shields: 2 });
    await grantDrop(db, 'boss', at('2026-10-05'), () => 0.5);
    expect(await db.inventory.count()).toBe(60);
    expect((await db.player.get(1))!.shields).toBe(2);
    expect((await drops(db))[0]).toEqual({ type: 'itemObtained', source: 'boss', itemId: null, shield: false });
  });
});

describe('equip', () => {
  it('equips only owned items of the right kind; null restores the default', async () => {
    const db = await setupPlayer('2026-10-05');
    await expect(equipTheme(db, 'theme-ember')).rejects.toThrow('You have not found that item yet.');
    await db.inventory.put({ itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' });
    await expect(equipFrame(db, 'theme-ember')).rejects.toThrow('You have not found that item yet.');
    await equipTheme(db, 'theme-ember');
    expect((await db.player.get(1))!.themeId).toBe('theme-ember');
    await equipTheme(db, null);
    expect((await db.player.get(1))!.themeId).toBeNull();
  });
});

describe('when drops happen', () => {
  it('a Boss win gives exactly one drop', async () => {
    setDropRngForTests(() => 0);
    const db = await setupPlayer('2026-09-28');
    await dealBossDamage(db, { base: 10_000, category: null, date: '2026-09-28' }, at('2026-09-28'));
    await dealBossDamage(db, { base: 10_000, category: null, date: '2026-09-28' }, at('2026-09-28'));
    expect((await db.bosses.get('2026-09-28'))!.defeatedAt).not.toBeNull();
    expect((await drops(db)).map((e) => e.type === 'itemObtained' && e.source)).toEqual(['boss']);
  });

  it('reaching a 7-day streak gives a drop; 6 days does not', async () => {
    setDropRngForTests(() => 0);
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { streak: 5 });
    await completeDaily(db, '2026-10-05'); // streak 6
    expect(await drops(db)).toEqual([]);
    await startDay(db, at('2026-10-06'), neverUrgent);
    await completeDaily(db, '2026-10-06'); // streak 7
    expect((await db.player.get(1))!.streak).toBe(7);
    expect((await drops(db)).map((e) => e.type === 'itemObtained' && e.source)).toEqual(['streak']);
  });

  it('an exercise rank-up gives a drop; a first set or same-rank set does not', async () => {
    setDropRngForTests(() => 0);
    const db = await setupPlayer('2026-10-05');
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-10-05')); // baseline, rank E
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-10-06')); // ratio 1 → still E
    expect(await drops(db)).toEqual([]);
    await logSet(db, { exerciseId: 'pushup', reps: 12, weightKg: 0 }, at('2026-10-06')); // ratio 1.2 → D
    expect((await drops(db)).map((e) => e.type === 'itemObtained' && e.source)).toEqual(['rankUp']);
    expect(getItem((await db.inventory.toArray())[0]!.itemId)).toBeTruthy();
  });

  it('a rank-up drops once per exercise rank, even if the set is deleted and logged again', async () => {
    setDropRngForTests(() => 0);
    const db = await setupPlayer('2026-10-05');
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-10-05')); // baseline
    await logSet(db, { exerciseId: 'pushup', reps: 12, weightKg: 0 }, at('2026-10-06')); // E → D: drop
    const extra = (await db.workoutSets.toArray()).find((s) => s.reps === 12)!;
    await deleteSet(db, extra.id);
    await logSet(db, { exerciseId: 'pushup', reps: 12, weightKg: 0 }, at('2026-10-06')); // D again: no new drop
    expect((await drops(db)).map((e) => e.type === 'itemObtained' && e.source)).toEqual(['rankUp']);
    await logSet(db, { exerciseId: 'pushup', reps: 13, weightKg: 0 }, at('2026-10-06')); // D → C: a new rank, a new drop
    expect((await drops(db)).map((e) => e.type === 'itemObtained' && e.source)).toEqual(['rankUp', 'rankUp']);
  });
});
