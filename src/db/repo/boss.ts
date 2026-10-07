import { getBoss } from '../../config/bosses';
import { progression } from '../../config/progression';
import { applyDamage, bossForWeek, bossRewardXp, createBossRecord, hitDamage, plannedSetsPerDay, trainingSetBase } from '../../domain/boss';
import { weekStartOf } from '../../domain/day';
import type { BossCategory } from '../../domain/types';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';
import { grantDrop } from './inventory';
import { awardXp, pushEvents } from './player';

/** Achievement row id (and title id) for defeating a Boss. */
export const bossTitleId = (bossId: string) => `boss-${bossId}`;

/** Chip damage in session-damage points. */
export const CHIP = {
  sideQuest: progression.boss.chip.sideQuest * progression.boss.sessionDamage,
  penalty: progression.boss.chip.penalty * progression.boss.sessionDamage,
};

/**
 * Creates the Boss for the week containing `date`, if it doesn't exist yet.
 * With `announce`, a newly created Boss also queues the "A Boss has appeared" alert.
 */
export async function ensureWeekBoss(database: AshbornDB, date: string, { announce }: { announce: boolean }): Promise<void> {
  await writeTx(database, async () => {
    const weekStart = weekStartOf(date);
    if (await database.bosses.get(weekStart)) return;
    const player = await database.player.get(1);
    const profile = await database.profile.get(1);
    if (!player || !profile) return;
    const record = createBossRecord(weekStart, player.level, profile.experience);
    await database.bosses.put(record);
    if (announce) await pushEvents(database, [{ type: 'bossAppeared', weekStart, bossId: record.bossId }]);
  });
}

/** One hit on the Boss of the week containing `date`. The defeating hit rewards XP and the title exactly once. */
export async function dealBossDamage(database: AshbornDB, hit: { base: number; category: BossCategory | null; date: string }, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const boss = await database.bosses.get(weekStartOf(hit.date));
    if (!boss || boss.defeatedAt) return;
    const { boss: next, defeatedNow } = applyDamage(boss, hitDamage(boss, hit.base, hit.category), now);
    if (next === boss) return;
    await database.bosses.put(next);
    if (!defeatedNow) return;

    const player = await database.player.get(1);
    const def = getBoss(boss.bossId) ?? bossForWeek(boss.weekStart);
    const xp = bossRewardXp(player?.level ?? 1);
    await awardXp(database, { amount: xp, kind: 'boss', refId: boss.weekStart, date: hit.date, countsAsQuest: false }, now);
    const titleId = bossTitleId(def.id);
    const hadTitle = Boolean(await database.achievements.get(titleId));
    if (!hadTitle) await database.achievements.put({ id: titleId, unlockedAt: now.toISOString() });
    await pushEvents(database, [{ type: 'bossDefeated', bossId: def.id, xp, title: hadTitle ? null : def.title }]);
    await grantDrop(database, 'boss', now);
  });
}

/**
 * Removes "A Boss has appeared" alerts for weeks before the one containing `today`
 * (the app was closed before Accept). Filters by content, so running it twice is harmless.
 */
export async function dropStaleBossAlerts(database: AshbornDB, today: string): Promise<void> {
  await writeTx(database, async () => {
    const week = weekStartOf(today);
    const current = (await getMeta(database, 'pendingEvents')) ?? [];
    const kept = current.filter((e) => e.type !== 'bossAppeared' || e.weekStart >= week);
    if (kept.length !== current.length) await setMeta(database, 'pendingEvents', kept);
  });
}

/** A logged set: a share of one session, up to one session of base damage per day. */
export async function dealTrainingDamage(database: AshbornDB, hit: { category: BossCategory; date: string }, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const weekStart = weekStartOf(hit.date);
    const boss = await database.bosses.get(weekStart);
    if (!boss || boss.defeatedAt) return;
    const already = boss.trainingBase[hit.date] ?? 0;
    const base = trainingSetBase(plannedSetsPerDay(await database.workoutPlans.get(weekStart)), already);
    if (base <= 0) return;
    await database.bosses.put({ ...boss, trainingBase: { ...boss.trainingBase, [hit.date]: already + base } });
    await dealBossDamage(database, { base, category: hit.category, date: hit.date }, now);
  });
}
