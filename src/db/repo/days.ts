import { addDays, dateRange, todayKey } from '../../domain/day';
import { processDays } from '../../domain/dayCycle';
import { createDayRecord, dailyQuestXp, isDailyComplete, partialXp } from '../../domain/quests/daily';
import { generatePenalty } from '../../domain/quests/penalty';
import { rollUrgent } from '../../domain/quests/urgent';
import type { DayRecord, QuestItem } from '../../domain/types';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';
import { awardXp, pushEvents } from './player';
import { ensureWeekPlan } from './training';
import { progression } from '../../config/progression';
import { penaltyCategory, questItemCategory } from '../../domain/boss';
import { CHIP, dealBossDamage, dropStaleBossAlerts, ensureWeekBoss } from './boss';

const MAX_PROGRESS = 100_000;

function cleanProgress(progress: number): number {
  return Number.isFinite(progress) ? Math.min(MAX_PROGRESS, Math.max(0, Math.floor(progress))) : 0;
}

/** The quest from ≥ 7 days ago (or the very first quest) that today's targets may not outgrow by > 10 %. */
async function referenceItems(database: AshbornDB, current: string): Promise<QuestItem[] | null> {
  const cutoff = addDays(current, -7);
  const older = await database.days.where('date').belowOrEqual(cutoff).reverse().filter((d) => d.items.length > 0).first();
  if (older) return older.items;
  const earliest = await database.days.orderBy('date').filter((d) => d.date < current && d.items.length > 0).first();
  return earliest?.items ?? null;
}

/** Runs the daily reset. Safe to call any number of times; call on launch, on focus and every minute. */
export async function startDay(database: AshbornDB, now: Date, rng: () => number = Math.random): Promise<void> {
  const today = todayKey(now);
  await writeTx(database, async () => {
    const profile = await database.profile.get(1);
    const player = await database.player.get(1);
    if (!profile || !player) return;

    const last = (await getMeta(database, 'lastOpenDate')) ?? null;
    const dates = last !== null && today > last ? dateRange(last, today) : [];
    const existing: Record<string, DayRecord> = {};
    for (const record of await database.days.bulkGet(dates)) if (record) existing[record.date] = record;

    const result = processDays({ lastOpenDate: last, today, days: existing, streak: player.streak, level: player.level, shields: player.shields });
    if (result.closed.length > 0) await database.days.bulkPut(result.closed);
    if (result.streak !== player.streak) await database.player.update(1, { streak: result.streak });
    if (result.shieldsUsed > 0) {
      await database.player.update(1, { shields: player.shields - result.shieldsUsed });
      await pushEvents(database, [{ type: 'shieldUsed', count: result.shieldsUsed, streak: result.streak }]);
    }

    const current = result.currentDate;
    let record = (await database.days.get(current)) ??
      createDayRecord(current, profile.experience, player.level, await referenceItems(database, current));
    if (result.needsPenalty && !record.penalty) record = { ...record, penalty: generatePenalty(profile.experience) };

    const lastUrgent = (await getMeta(database, 'lastUrgentDate')) ?? null;
    if (lastUrgent !== current) {
      const urgent = rollUrgent(rng, current, lastUrgent);
      if (urgent && !record.urgent) record = { ...record, urgent };
      await setMeta(database, 'lastUrgentDate', current);
    }

    await database.days.put(record);
    await setMeta(database, 'lastOpenDate', current);
    await ensureWeekPlan(database, profile, current);

    if (result.xpToAward > 0) {
      await awardXp(database, { amount: result.xpToAward, kind: 'daily', refId: 'partial', date: current, countsAsQuest: false }, now);
    }
    // After yesterday's partial XP, so a level-up it causes is shown before the new week's alert.
    await dropStaleBossAlerts(database, current);
    await ensureWeekBoss(database, current, { announce: true });
  });
}

export async function setItemProgress(database: AshbornDB, date: string, itemId: string, progress: number, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    const player = await database.player.get(1);
    if (!record || !player || (record.status !== 'open' && record.status !== 'partial')) return;

    const items = record.items.map((item) => (item.id === itemId ? { ...item, progress: cleanProgress(progress) } : item));
    // Each item hits the weekly Boss once, when it first reaches its target. Hits land after the
    // daily-quest XP, so a level-up from that XP is celebrated before any Boss victory.
    const bossHits = async () => {
      for (const [i, item] of items.entries()) {
        const before = record.items[i]!;
        if (before.progress < before.target && item.progress >= item.target) {
          await dealBossDamage(database, { base: progression.boss.sessionDamage / items.length, category: questItemCategory(item.id), date }, now);
        }
      }
    };
    if (!isDailyComplete(items)) {
      await database.days.put({ ...record, items });
      await bossHits();
      return;
    }

    const xp = Math.max(0, dailyQuestXp(player.level) - record.xpAwarded);
    await database.days.put({ ...record, items, status: 'done', xpAwarded: record.xpAwarded + xp });
    const streak = player.streak + 1;
    await database.player.update(1, { streak, bestStreak: Math.max(player.bestStreak, streak) });
    await awardXp(database, { amount: xp, kind: 'daily', refId: date, date, countsAsQuest: true }, now);
    await bossHits();
  });
}

export async function finishDay(database: AshbornDB, date: string, now: Date): Promise<number> {
  return writeTx(database, async () => {
    const record = await database.days.get(date);
    const player = await database.player.get(1);
    if (!record || !player || (record.status !== 'open' && record.status !== 'partial')) return 0;
    const earned = partialXp(record.items, player.level) - record.xpAwarded;
    if (earned <= 0) return 0;
    await database.days.put({ ...record, status: 'partial', xpAwarded: record.xpAwarded + earned });
    await awardXp(database, { amount: earned, kind: 'daily', refId: date, date, countsAsQuest: false }, now);
    return earned;
  });
}

export async function setRest(database: AshbornDB, date: string, rest: boolean): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    if (!record) return;
    if (rest && (record.status === 'open' || record.status === 'partial')) {
      await database.days.put({ ...record, status: 'rest' });
    }
    if (!rest && record.status === 'rest') {
      await database.days.put({ ...record, status: record.xpAwarded > 0 ? 'partial' : 'open' });
    }
  });
}

export async function setPenaltyProgress(database: AshbornDB, date: string, progress: number, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    if (!record?.penalty || record.penalty.done) return;
    const value = cleanProgress(progress);
    const done = value >= record.penalty.target;
    await database.days.put({ ...record, penalty: { ...record.penalty, progress: value, done } });
    if (done) {
      await awardXp(database, { amount: record.penalty.xp, kind: 'penalty', refId: date, date, countsAsQuest: true }, now);
      await dealBossDamage(database, { base: CHIP.penalty, category: penaltyCategory(record.penalty.label), date }, now);
    }
  });
}

export async function completeUrgent(database: AshbornDB, date: string, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    if (!record?.urgent || record.urgent.done) return;
    await database.days.put({ ...record, urgent: { ...record.urgent, done: true } });
    await awardXp(database, { amount: record.urgent.xp, kind: 'urgent', refId: record.urgent.id, date, countsAsQuest: true }, now);
  });
}
