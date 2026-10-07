import { describe, expect, it } from 'vitest';
import { BOSSES } from '../../config/bosses';
import { bossForWeek, hitDamage, penaltyCategory, questItemCategory } from '../../domain/boss';
import { xpToNext } from '../../domain/xp';
import { completeDaily, neverUrgent, setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { getMeta, setMeta } from '../meta';
import { dropStaleBossAlerts } from './boss';
import { pushEvents } from './player';
import { setItemProgress, setPenaltyProgress, startDay } from './days';
import { completeSideQuest, createSideQuest } from './sideQuests';
import { logSet } from './training';

const MONDAY = '2026-09-28';

describe('weekly boss', () => {
  it('creates this week’s boss on registration and on the first open of a later week', async () => {
    const db = await setupPlayer(MONDAY);
    expect(await db.bosses.get(MONDAY)).toMatchObject({ bossId: bossForWeek(MONDAY).id, hp: 360, maxHp: 360, defeatedAt: null });
    await startDay(db, at('2026-10-08'), neverUrgent); // a Thursday; its week starts 2026-10-05
    expect(await db.bosses.get('2026-10-05')).toMatchObject({ bossId: bossForWeek('2026-10-05').id, defeatedAt: null });
  });

  it('each daily item deals damage once when it reaches its target, weakness double', async () => {
    const db = await setupPlayer(MONDAY);
    const boss = (await db.bosses.get(MONDAY))!;
    const items = (await db.days.get(MONDAY))!.items;

    await setItemProgress(db, MONDAY, items[0]!.id, items[0]!.target - 1, at(MONDAY));
    expect((await db.bosses.get(MONDAY))!.hp).toBe(360);

    let expected = 360;
    for (const item of items) {
      await setItemProgress(db, MONDAY, item.id, item.target, at(MONDAY));
      expected -= hitDamage(boss, 25, questItemCategory(item.id));
      expect((await db.bosses.get(MONDAY))!.hp).toBe(expected);
    }
    await setItemProgress(db, MONDAY, items[0]!.id, items[0]!.target + 5, at(MONDAY));
    expect((await db.bosses.get(MONDAY))!.hp).toBe(expected);
  });

  it('a beginner defeats the boss with 3 full daily quests and is rewarded once', async () => {
    const db = await setupPlayer(MONDAY);
    for (const day of [MONDAY, '2026-09-29', '2026-09-30']) {
      await startDay(db, at(day), neverUrgent);
      await completeDaily(db, day);
    }
    const boss = (await db.bosses.get(MONDAY))!;
    expect(boss.hp).toBe(0);
    expect(boss.defeatedAt).not.toBeNull();

    const def = bossForWeek(MONDAY);
    expect(await db.achievements.get(`boss-${def.id}`)).toBeTruthy();
    const bossXp = (await db.questLog.toArray()).filter((e) => e.kind === 'boss');
    expect(bossXp).toHaveLength(1);
    const events = (await getMeta(db, 'pendingEvents')) ?? [];
    expect(events.filter((e) => e.type === 'bossDefeated')).toEqual([{ type: 'bossDefeated', bossId: def.id, xp: bossXp[0]!.xp, title: def.title }]);

    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-10-01'));
    await startDay(db, at('2026-10-01'), neverUrgent);
    await completeDaily(db, '2026-10-01');
    expect((await db.questLog.toArray()).filter((e) => e.kind === 'boss')).toHaveLength(1);
  });

  it('training sets deal damage up to one session per day', async () => {
    const db = await setupPlayer(MONDAY);
    const boss = (await db.bosses.get(MONDAY))!;
    for (let i = 0; i < 40; i++) await logSet(db, { exerciseId: 'pushup', reps: 10 + (i % 3), weightKg: 0 }, at(MONDAY));
    // beginner plan: 4 exercises × 2 sets per day → 8 sets = one session; set base 12.5
    expect((await db.bosses.get(MONDAY))!.hp).toBe(360 - 8 * hitDamage(boss, 12.5, 'upper'));
    expect((await db.bosses.get(MONDAY))!.trainingBase[MONDAY]).toBe(100);
  });

  it('side quests and the penalty quest chip the boss', async () => {
    const db = await setupPlayer(MONDAY);
    const boss = (await db.bosses.get(MONDAY))!;
    const id = await createSideQuest(db, { title: 'Drink water', xp: 10, stat: 'vitality' });
    await completeSideQuest(db, id, at(MONDAY));
    let expected = 360 - hitDamage(boss, 10, null);
    expect((await db.bosses.get(MONDAY))!.hp).toBe(expected);

    await startDay(db, at('2026-09-29'), neverUrgent); // Monday was left open → penalty on Tuesday
    const penalty = (await db.days.get('2026-09-29'))!.penalty!;
    await setPenaltyProgress(db, '2026-09-29', penalty.target, at('2026-09-29'));
    expected -= hitDamage(boss, 25, penaltyCategory(penalty.label));
    expect((await db.bosses.get(MONDAY))!.hp).toBe(expected);
  });

  it('a defeating hit that also levels the player up queues the level-up first', async () => {
    const db = await setupPlayer(MONDAY);
    await db.bosses.update(MONDAY, { hp: 1 });
    await db.player.update(1, { xp: xpToNext(1) - 1 });
    const item = (await db.days.get(MONDAY))!.items[0]!;
    await setItemProgress(db, MONDAY, item.id, item.target, at(MONDAY));
    const types = ((await getMeta(db, 'pendingEvents')) ?? []).map((e) => e.type);
    expect(types).toContain('levelUp');
    expect(types.indexOf('levelUp')).toBeLessThan(types.indexOf('bossDefeated'));
  });

  it('last week’s boss takes no more damage and a new week starts fresh', async () => {
    const db = await setupPlayer(MONDAY);
    await startDay(db, at('2026-10-05'), neverUrgent);
    const fresh = (await db.bosses.get('2026-10-05'))!;
    const item = (await db.days.get('2026-10-05'))!.items[0]!;
    await setItemProgress(db, '2026-10-05', item.id, item.target, at('2026-10-05'));
    expect((await db.bosses.get(MONDAY))!.hp).toBe(360);
    expect((await db.bosses.get('2026-10-05'))!.hp).toBe(fresh.maxHp - hitDamage(fresh, 25, questItemCategory(item.id)));
  });

  it('when the last item finishes the daily and defeats the boss, the level-up comes before the boss window', async () => {
    const db = await setupPlayer(MONDAY);
    const items = (await db.days.get(MONDAY))!.items;
    for (const item of items.slice(0, 3)) await setItemProgress(db, MONDAY, item.id, item.target, at(MONDAY));
    await db.bosses.update(MONDAY, { hp: 1 });
    // Level 10: the boss reward (200) alone does not level up, but together with the daily XP (110) it does.
    await db.player.update(1, { level: 10, xp: xpToNext(10) - 250 });
    await db.meta.put({ key: 'pendingEvents', value: [] });
    const last = items[3]!;
    await setItemProgress(db, MONDAY, last.id, last.target, at(MONDAY));
    const types = ((await getMeta(db, 'pendingEvents')) ?? []).map((e) => e.type).filter((t) => t !== 'achievement');
    expect(types[0]).toBe('levelUp');
    // The Boss window, then its item drop, close the queue (spec v1.6.0 §6 event order).
    expect(types.slice(-2)).toEqual(['bossDefeated', 'itemObtained']);
    expect(types.filter((t) => t === 'bossDefeated')).toHaveLength(1);
  });

  it('doubles damage on the stored boss’s weakness even if the rotation changes', async () => {
    const db = await setupPlayer(MONDAY);
    const stored = (await db.bosses.get(MONDAY))!;
    const other = BOSSES.find((b) => b.weakness !== bossForWeek(MONDAY).weakness)!;
    await db.bosses.update(MONDAY, { bossId: other.id });
    const items = (await db.days.get(MONDAY))!.items;
    const hitItem = items.find((i) => questItemCategory(i.id) === other.weakness)!;
    await setItemProgress(db, MONDAY, hitItem.id, hitItem.target, at(MONDAY));
    expect((await db.bosses.get(MONDAY))!.hp).toBe(stored.maxHp - Math.ceil(25 * stored.scale * 2 - 1e-9));
  });

  it('v1.4.0 data: a stored retired-boss week still takes damage, rewards its old title, and loses nothing', async () => {
    const db = await setupPlayer(MONDAY);
    await db.bosses.update(MONDAY, { bossId: 'mawgrath', hp: 200 });
    await db.achievements.put({ id: 'boss-zereth', unlockedAt: '2026-09-20T10:00:00.000Z' });
    const before = { days: await db.days.count(), log: await db.questLog.count(), achievements: await db.achievements.toArray() };

    const boss = (await db.bosses.get(MONDAY))!;
    const squats = (await db.days.get(MONDAY))!.items.find((i) => i.id === 'squats')!;
    await setItemProgress(db, MONDAY, squats.id, squats.target, at(MONDAY)); // legs: Mawgrath's weakness
    expect((await db.bosses.get(MONDAY))!.hp).toBe(200 - hitDamage(boss, 25, 'legs'));
    expect(hitDamage(boss, 25, 'legs')).toBe(2 * hitDamage(boss, 25, null));

    for (const day of [MONDAY, '2026-09-29', '2026-09-30']) {
      await startDay(db, at(day), neverUrgent);
      await completeDaily(db, day);
    }
    expect((await db.bosses.get(MONDAY))!.defeatedAt).not.toBeNull();
    expect(await db.achievements.get('boss-mawgrath')).toBeTruthy();
    const events = (await getMeta(db, 'pendingEvents')) ?? [];
    expect(events.find((e) => e.type === 'bossDefeated')).toMatchObject({ bossId: 'mawgrath', title: 'Colossus Breaker' });

    expect(await db.days.count()).toBeGreaterThanOrEqual(before.days);
    expect(await db.questLog.count()).toBeGreaterThan(before.log);
    for (const a of before.achievements) expect(await db.achievements.get(a.id)).toEqual(a);
  });

  it('announces a new week’s boss once, but not at registration', async () => {
    const db = await setupPlayer(MONDAY);
    const appeared = async () => ((await getMeta(db, 'pendingEvents')) ?? []).filter((e) => e.type === 'bossAppeared');
    expect(await appeared()).toEqual([]);

    await startDay(db, at('2026-10-05'), neverUrgent);
    await startDay(db, at('2026-10-05', '13:00'), neverUrgent);
    await startDay(db, at('2026-10-06'), neverUrgent);
    expect(await appeared()).toEqual([{ type: 'bossAppeared', weekStart: '2026-10-05', bossId: bossForWeek('2026-10-05').id }]);
  });

  it('a new week drops last week’s un-accepted alert, and only that', async () => {
    const db = await setupPlayer(MONDAY);
    await startDay(db, at('2026-10-05'), neverUrgent); // alert for 10-05 queued, never accepted
    await pushEvents(db, [{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
    await startDay(db, at('2026-10-12'), neverUrgent);
    await startDay(db, at('2026-10-12', '13:00'), neverUrgent);
    const events = (await getMeta(db, 'pendingEvents')) ?? [];
    expect(events.filter((e) => e.type === 'bossAppeared')).toEqual([{ type: 'bossAppeared', weekStart: '2026-10-12', bossId: bossForWeek('2026-10-12').id }]);
    expect(events.filter((e) => e.type === 'achievement')).toEqual([{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
  });

  it('dropStaleBossAlerts only removes older weeks’ alerts, however often it runs', async () => {
    const db = await setupPlayer(MONDAY);
    const keep = [
      { type: 'achievement' as const, id: 'first-quest', title: 'The Awakened' },
      { type: 'bossAppeared' as const, weekStart: MONDAY, bossId: 'obrakh' },
      { type: 'bossAppeared' as const, weekStart: '2026-10-05', bossId: 'morvaine' }, // phone clock set back: keep it
    ];
    await setMeta(db, 'pendingEvents', [{ type: 'bossAppeared', weekStart: '2026-09-21', bossId: 'grolmak' }, ...keep]);
    await dropStaleBossAlerts(db, '2026-09-30');
    await dropStaleBossAlerts(db, '2026-09-30');
    expect(await getMeta(db, 'pendingEvents')).toEqual(keep);
  });

  it('shows yesterday’s level-up before the new week’s boss alert', async () => {
    const db = await setupPlayer('2026-10-04'); // a Sunday
    await db.player.update(1, { xp: xpToNext(1) - 1 });
    const item = (await db.days.get('2026-10-04'))!.items[0]!;
    await setItemProgress(db, '2026-10-04', item.id, Math.ceil(item.target / 2), at('2026-10-04'));

    await startDay(db, at('2026-10-05'), neverUrgent); // Monday: partial XP for Sunday, then the new boss
    const types = ((await getMeta(db, 'pendingEvents')) ?? []).map((e) => e.type);
    expect(types).toContain('levelUp');
    expect(types.indexOf('levelUp')).toBeLessThan(types.indexOf('bossAppeared'));
  });
});
