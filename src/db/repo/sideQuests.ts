import { progression } from '../../config/progression';
import { todayKey } from '../../domain/day';
import { sideQuestXp } from '../../domain/classes';
import { addSideQuestProgress } from '../../domain/stats';
import { STAT_KEYS, type StatKey } from '../../domain/types';
import { writeTx, type AshbornDB } from '../schema';
import { awardXp } from './player';
import { CHIP, dealBossDamage } from './boss';

export interface SideQuestInput {
  title: string;
  xp: number;
  stat: StatKey;
}

function clean(input: SideQuestInput): SideQuestInput {
  const title = input.title.trim().slice(0, 60);
  if (!title) throw new Error('Give the quest a name.');
  if (!STAT_KEYS.includes(input.stat)) throw new Error('Choose a stat for this quest.');
  const { minXp, maxXp } = progression.sideQuest;
  const xp = Number.isFinite(input.xp) ? Math.min(maxXp, Math.max(minXp, Math.round(input.xp))) : minXp;
  return { title, xp, stat: input.stat };
}

export async function createSideQuest(database: AshbornDB, input: SideQuestInput): Promise<number> {
  return database.sideQuests.add({ ...clean(input), archived: false, completions: 0 });
}

export async function updateSideQuest(database: AshbornDB, id: number, input: SideQuestInput): Promise<void> {
  await database.sideQuests.update(id, clean(input));
}

export async function archiveSideQuest(database: AshbornDB, id: number): Promise<void> {
  await database.sideQuests.update(id, { archived: true });
}

export async function completeSideQuest(database: AshbornDB, id: number, now: Date): Promise<boolean> {
  const date = todayKey(now);
  return writeTx(database, async () => {
    const quest = await database.sideQuests.get(id);
    const player = await database.player.get(1);
    if (!quest || quest.archived || !player) return false;
    const doneToday = await database.questLog
      .where('date').equals(date)
      .filter((entry) => entry.kind === 'side' && entry.refId === String(id))
      .count();
    if (doneToday > 0) return false;
    await database.sideQuests.update(id, { completions: quest.completions + 1 });
    await database.player.put(addSideQuestProgress(player, quest.stat));
    await awardXp(database, { amount: sideQuestXp(quest.xp, quest.stat, player.classId), kind: 'side', refId: String(id), date, countsAsQuest: true }, now);
    await dealBossDamage(database, { base: CHIP.sideQuest, category: null, date }, now);
    return true;
  });
}
