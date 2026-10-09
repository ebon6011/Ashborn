import { getClass } from '../../config/classes';
import { progression } from '../../config/progression';
import { canChangeClass, daysUntilClassChange, trialAvailable, trialItems } from '../../domain/classes';
import { todayKey } from '../../domain/day';
import { dailyQuestXp } from '../../domain/quests/daily';
import type { ClassId } from '../../domain/types';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';
import { dealBossDamage } from './boss';
import { awardXp, pushEvents } from './player';

/** Creates the Class Change Trial once the player qualifies. Never replaces one in progress. */
export async function ensureTrial(database: AshbornDB, date: string): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    const profile = await database.profile.get(1);
    // A class date in the future came from a wrong phone clock: count the cooldown from today instead.
    if (player?.classChosenAt && player.classChosenAt > date) await database.player.update(1, { classChosenAt: date });
    if (!player || !profile || !trialAvailable(player)) return;
    if (await getMeta(database, 'classTrial')) return;
    await setMeta(database, 'classTrial', { items: trialItems(profile.experience, player.level), createdAt: date });
  });
}

/** Logs Trial progress; finishing every item rewards the Trial exactly once. */
export async function setTrialProgress(database: AshbornDB, itemId: string, progress: number, now: Date): Promise<void> {
  const date = todayKey(now);
  await writeTx(database, async () => {
    const trial = await getMeta(database, 'classTrial');
    const player = await database.player.get(1);
    if (!trial || !player || player.trialDone) return;
    const value = Number.isFinite(progress) ? Math.min(100_000, Math.max(0, Math.floor(progress))) : 0;
    const items = trial.items.map((item) => (item.id === itemId ? { ...item, progress: value } : item));
    if (!items.every((item) => item.progress >= item.target)) {
      await setMeta(database, 'classTrial', { ...trial, items });
      return;
    }
    // Mark done first, so a level-up from the Trial's own XP cannot re-create it.
    await database.player.update(1, { trialDone: true });
    await database.meta.delete('classTrial');
    await awardXp(database, { amount: dailyQuestXp(player.level), kind: 'trial', refId: 'class-trial', date, countsAsQuest: true }, now);
    await dealBossDamage(database, { base: progression.boss.sessionDamage, category: null, date }, now);
    await pushEvents(database, [{ type: 'classChoice' }]);
  });
}

export async function chooseClass(database: AshbornDB, classId: ClassId, now: Date): Promise<void> {
  const today = todayKey(now);
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) throw new Error('Player not registered.');
    if (!getClass(classId)) throw new Error('Unknown class.');
    if (!player.trialDone) throw new Error('Finish the Class Change Trial first.');
    if (!canChangeClass(player, today)) {
      const n = daysUntilClassChange(player, today);
      throw new Error(`You can change class in ${n} ${n === 1 ? 'day' : 'days'}.`);
    }
    await database.player.update(1, { classId, classChosenAt: today });
  });
}
