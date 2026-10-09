import { describe, expect, it } from 'vitest';
import { progression } from '../../config/progression';
import { generateDailyItems } from '../../domain/quests/daily';
import { xpToNext } from '../../domain/xp';
import { neverUrgent, setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { getMeta } from '../meta';
import type { AshbornDB } from '../schema';
import { chooseClass, ensureTrial, setTrialProgress } from './classes';
import { startDay } from './days';
import { awardXp } from './player';
import { completeSideQuest, createSideQuest } from './sideQuests';

const events = async (db: AshbornDB) => (await getMeta(db, 'pendingEvents')) ?? [];
async function finishTrial(db: AshbornDB, date: string) {
  for (const item of (await getMeta(db, 'classTrial'))!.items) await setTrialProgress(db, item.id, item.target, at(date));
}

describe('the Class Change Trial', () => {
  it('is not offered below level 10', async () => {
    const db = await setupPlayer('2026-10-05');
    await ensureTrial(db, '2026-10-05');
    expect(await getMeta(db, 'classTrial')).toBeUndefined();
  });

  it('appears on the first daily reset for a player already past level 10', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { level: 14 });
    await startDay(db, at('2026-10-06'), neverUrgent);
    const trial = (await getMeta(db, 'classTrial'))!;
    expect(trial.createdAt).toBe('2026-10-06');
    const daily = generateDailyItems('beginner', 14, null);
    trial.items.forEach((t, i) => expect(t.target).toBe(Math.max(1, Math.round(daily[i]!.target * 1.5))));
  });

  it('appears the moment you level up to 10, only once', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { level: 9, xp: xpToNext(9) - 1 });
    await awardXp(db, { amount: 5, kind: 'side', refId: '1', date: '2026-10-05', countsAsQuest: false }, at('2026-10-05'));
    const first = await getMeta(db, 'classTrial');
    expect(first).toBeTruthy();
    await setTrialProgress(db, first!.items[0]!.id, 3, at('2026-10-05'));
    await ensureTrial(db, '2026-10-06');
    expect((await getMeta(db, 'classTrial'))!.items[0]!.progress).toBe(3); // kept, not regenerated
  });

  it('finishing it rewards once: XP, Boss damage, trialDone and the class choice', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { level: 10 });
    await ensureTrial(db, '2026-10-05');
    const hpBefore = (await db.bosses.get('2026-10-05'))!.hp;
    await finishTrial(db, '2026-10-05');
    const player = (await db.player.get(1))!;
    expect(player.trialDone).toBe(true);
    expect(await getMeta(db, 'classTrial')).toBeUndefined();
    const trialXp = (await db.questLog.toArray()).filter((e) => e.kind === 'trial');
    expect(trialXp).toHaveLength(1);
    expect(trialXp[0]!.xp).toBe(progression.dailyQuest.baseXp + progression.dailyQuest.xpPerLevel * 10);
    expect((await db.bosses.get('2026-10-05'))!.hp).toBeLessThan(hpBefore);
    expect((await events(db)).filter((e) => e.type === 'classChoice')).toHaveLength(1);

    await setTrialProgress(db, 'pushups', 999, at('2026-10-05')); // a late double tap does nothing
    await ensureTrial(db, '2026-10-06');
    expect(await getMeta(db, 'classTrial')).toBeUndefined();
    expect((await db.questLog.toArray()).filter((e) => e.kind === 'trial')).toHaveLength(1);
    expect((await events(db)).filter((e) => e.type === 'classChoice')).toHaveLength(1);
  });
});

describe('choosing a class', () => {
  it('needs the Trial, then enforces the 30-day cooldown', async () => {
    const db = await setupPlayer('2026-10-01');
    await expect(chooseClass(db, 'ironclad', at('2026-10-01'))).rejects.toThrow('Finish the Class Change Trial first.');
    await db.player.update(1, { trialDone: true });
    await chooseClass(db, 'ironclad', at('2026-10-01'));
    expect(await db.player.get(1)).toMatchObject({ classId: 'ironclad', classChosenAt: '2026-10-01' });
    await expect(chooseClass(db, 'bulwark', at('2026-10-30'))).rejects.toThrow('You can change class in 1 day.');
    await expect(chooseClass(db, 'bulwark', at('2026-10-20'))).rejects.toThrow('You can change class in 11 days.');
    await chooseClass(db, 'bulwark', at('2026-10-31'));
    expect(await db.player.get(1)).toMatchObject({ classId: 'bulwark', classChosenAt: '2026-10-31' });
  });

  it('shapes the next daily quest, not today’s', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { trialDone: true }); // level 1, so the weekly cap still lets the focus item grow
    const today = (await db.days.get('2026-10-05'))!.items;
    await chooseClass(db, 'galestrider', at('2026-10-05'));
    expect((await db.days.get('2026-10-05'))!.items).toEqual(today);
    await startDay(db, at('2026-10-06'), neverUrgent);
    const tomorrow = (await db.days.get('2026-10-06'))!.items;
    const plain = generateDailyItems('beginner', 1, today);
    const cardio = (items: typeof tomorrow) => items.find((i) => i.id === 'cardio')!.target;
    const push = (items: typeof tomorrow) => items.find((i) => i.id === 'pushups')!.target;
    expect(cardio(tomorrow)).toBeGreaterThan(cardio(plain));
    expect(push(tomorrow)).toBeLessThan(push(plain));
  });

  it('gives +10 % XP on side quests for the class’s stat only', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { trialDone: true, classId: 'ironclad', classChosenAt: '2026-10-05' });
    const strong = await createSideQuest(db, { title: 'Carry groceries', xp: 20, stat: 'strength' });
    const quick = await createSideQuest(db, { title: 'Stairs', xp: 20, stat: 'agility' });
    await completeSideQuest(db, strong, at('2026-10-05'));
    await completeSideQuest(db, quick, at('2026-10-05'));
    const side = (await db.questLog.toArray()).filter((e) => e.kind === 'side').map((e) => e.xp);
    expect(side).toEqual([22, 20]);
  });
});
