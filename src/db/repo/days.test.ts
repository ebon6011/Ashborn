import { describe, expect, it } from 'vitest';
import { completeDaily, neverUrgent, setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { getMeta } from '../meta';
import { completeUrgent, finishDay, setItemProgress, setPenaltyProgress, setRest, startDay } from './days';
import { dismissEvent } from './player';

describe('daily quest progress', () => {
  it('completing every item awards full XP, a streak and the first title', async () => {
    const db = await setupPlayer();
    await completeDaily(db, '2026-09-21');
    expect((await db.days.get('2026-09-21'))?.status).toBe('done');
    expect(await db.player.get(1)).toMatchObject({ xp: 65, streak: 1, bestStreak: 1, questsCompleted: 1 });
    expect(await db.achievements.get('first-quest')).toBeTruthy();
    expect(await getMeta(db, 'pendingEvents')).toEqual([{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
  });

  it('completing an already-done day twice awards once', async () => {
    const db = await setupPlayer();
    await completeDaily(db, '2026-09-21');
    await completeDaily(db, '2026-09-21');
    expect((await db.player.get(1))?.xp).toBe(65);
    expect(await db.questLog.count()).toBe(1);
  });

  it('queues a level-up event before achievement events', async () => {
    const db = await setupPlayer();
    await db.player.update(1, { xp: 70 });
    await completeDaily(db, '2026-09-21');
    expect(await db.player.get(1)).toMatchObject({ level: 2, xp: 55, unspentStatPoints: 3 });
    expect((await getMeta(db, 'pendingEvents'))?.[0]).toMatchObject({ type: 'levelUp', fromLevel: 1, toLevel: 2, statPointsGained: 3 });
    await dismissEvent(db);
    expect((await getMeta(db, 'pendingEvents'))?.[0]).toMatchObject({ type: 'achievement', id: 'first-quest' });
  });

  it('"Finish for today" gives partial XP and more progress can still complete the day', async () => {
    const db = await setupPlayer();
    const first = (await db.days.get('2026-09-21'))!.items[0]!;
    await setItemProgress(db, '2026-09-21', first.id, first.target, at('2026-09-21'));
    expect(await finishDay(db, '2026-09-21', at('2026-09-21'))).toBe(16);
    expect(await db.days.get('2026-09-21')).toMatchObject({ status: 'partial', xpAwarded: 16 });
    expect(await finishDay(db, '2026-09-21', at('2026-09-21'))).toBe(0);
    await completeDaily(db, '2026-09-21');
    expect(await db.days.get('2026-09-21')).toMatchObject({ status: 'done', xpAwarded: 65 });
    expect((await db.player.get(1))?.xp).toBe(65);
  });

  it('ignores negative or non-numeric progress', async () => {
    const db = await setupPlayer();
    await setItemProgress(db, '2026-09-21', 'pushups', -5, at('2026-09-21'));
    await setItemProgress(db, '2026-09-21', 'situps', Number.NaN, at('2026-09-21'));
    const items = (await db.days.get('2026-09-21'))!.items;
    expect(items.map((i) => i.progress)).toEqual([0, 0, 0, 0]);
  });
});

describe('startDay', () => {
  it('a missed day resets the streak and adds one penalty quest', async () => {
    const db = await setupPlayer('2026-09-21');
    await completeDaily(db, '2026-09-21');
    await startDay(db, at('2026-09-22'), neverUrgent);
    await startDay(db, at('2026-09-24'), neverUrgent);
    expect((await db.days.get('2026-09-22'))?.status).toBe('missed');
    expect((await db.days.get('2026-09-23'))?.status).toBe('missed');
    expect((await db.days.get('2026-09-24'))?.penalty).toMatchObject({ label: 'Squats', target: 15, done: false });
    expect((await db.player.get(1))?.streak).toBe(0);
  });

  it('startDay after a 3-week gap does not crash and creates one penalty', async () => {
    const db = await setupPlayer('2026-09-01');
    await startDay(db, at('2026-09-22'), neverUrgent);
    const all = await db.days.toArray();
    expect(all.filter((d) => d.status === 'missed')).toHaveLength(21);
    expect(all.filter((d) => d.penalty !== null)).toHaveLength(1);
  });

  it('a rest day keeps the streak and adds no penalty', async () => {
    const db = await setupPlayer('2026-09-21');
    await completeDaily(db, '2026-09-21');
    await startDay(db, at('2026-09-22'), neverUrgent);
    await setRest(db, '2026-09-22', true);
    await startDay(db, at('2026-09-23'), neverUrgent);
    expect((await db.player.get(1))?.streak).toBe(1);
    expect((await db.days.get('2026-09-23'))?.penalty).toBeNull();
  });

  it('rest can be undone on the same day', async () => {
    const db = await setupPlayer('2026-09-21');
    await setRest(db, '2026-09-21', true);
    await setRest(db, '2026-09-21', false);
    expect((await db.days.get('2026-09-21'))?.status).toBe('open');
  });

  it('rolls the urgent quest at most once per day', async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-22'), () => 0);
    expect((await db.days.get('2026-09-22'))?.urgent).toMatchObject({ label: 'Hold a plank for 30 seconds', done: false });
    await completeUrgent(db, '2026-09-22', at('2026-09-22'));
    await completeUrgent(db, '2026-09-22', at('2026-09-22'));
    await startDay(db, at('2026-09-22', '20:00'), () => 0);
    expect((await db.days.get('2026-09-22'))?.urgent).toMatchObject({ done: true });
    expect((await db.player.get(1))?.xp).toBe(25);
  });

  it('completes the penalty quest once for 20 XP', async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-22'), neverUrgent);
    await setPenaltyProgress(db, '2026-09-22', 15, at('2026-09-22'));
    await setPenaltyProgress(db, '2026-09-22', 15, at('2026-09-22'));
    expect((await db.days.get('2026-09-22'))?.penalty?.done).toBe(true);
    expect((await db.player.get(1))?.xp).toBe(20);
  });

  it("keeps today's quest when the clock moves backwards", async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-20'), neverUrgent);
    expect(await db.days.get('2026-09-20')).toBeUndefined();
    expect(await getMeta(db, 'lastOpenDate')).toBe('2026-09-21');
  });

  it('caps daily targets at +10 % of the quest a week earlier', async () => {
    const db = await setupPlayer('2026-09-21');
    await db.player.update(1, { level: 11 });
    await startDay(db, at('2026-09-29'), neverUrgent);
    expect((await db.days.get('2026-09-29'))?.items.map((i) => i.target)).toEqual([11, 16, 16, 16]);
  });

  it("creates next week's training plan", async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-28'), neverUrgent);
    expect(await db.workoutPlans.get('2026-09-28')).toBeTruthy();
  });
});

describe('Streak Shields in the daily reset', () => {
  it('a Shield covers a missed day: streak kept, Shield spent, day marked, note queued, penalty still comes', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { streak: 9, shields: 2 });
    await startDay(db, at('2026-10-06'), neverUrgent); // 10-05 was left open
    const player = (await db.player.get(1))!;
    expect(player.streak).toBe(9);
    expect(player.shields).toBe(1);
    expect(await db.days.get('2026-10-05')).toMatchObject({ status: 'missed', shielded: true });
    expect((await db.days.get('2026-10-06'))!.penalty).not.toBeNull();
    const events = (await getMeta(db, 'pendingEvents')) ?? [];
    expect(events.filter((e) => e.type === 'shieldUsed')).toEqual([{ type: 'shieldUsed', count: 1, streak: 9 }]);
  });
});
