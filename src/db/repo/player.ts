import { getExercise } from '../../config/exercises';
import { newlyUnlocked } from '../../domain/achievements';
import { assignStatPoints } from '../../domain/stats';
import type { GameEvent, QuestKind, Stats } from '../../domain/types';
import { summarizeProgress } from '../../domain/workout/exerciseRank';
import { applyXp } from '../../domain/xp';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';

export interface XpAward {
  amount: number;
  kind: QuestKind;
  refId: string;
  date: string;
  countsAsQuest: boolean;
}

export async function pushEvents(database: AshbornDB, events: GameEvent[]): Promise<void> {
  if (events.length === 0) return;
  const current = (await getMeta(database, 'pendingEvents')) ?? [];
  await setMeta(database, 'pendingEvents', [...current, ...events]);
}

export async function dismissEvent(database: AshbornDB): Promise<void> {
  await writeTx(database, async () => {
    const current = (await getMeta(database, 'pendingEvents')) ?? [];
    await setMeta(database, 'pendingEvents', current.slice(1));
  });
}

export async function unlockAchievements(database: AshbornDB, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) return;
    const unlocked = (await database.achievements.toArray()).map((a) => a.id);
    const progress = summarizeProgress(await database.workoutSets.toArray(), (id) => getExercise(id)?.weighted ?? false);
    const fresh = newlyUnlocked(
      { questsCompleted: player.questsCompleted, bestStreak: player.bestStreak, level: player.level, ...progress },
      unlocked,
    );
    if (fresh.length === 0) return;
    await database.achievements.bulkPut(fresh.map((a) => ({ id: a.id, unlockedAt: now.toISOString() })));
    await pushEvents(database, fresh.map((a) => ({ type: 'achievement', id: a.id, title: a.title })));
  });
}

export async function awardXp(database: AshbornDB, award: XpAward, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) throw new Error('Player not registered.');
    const { player: leveled, levelUp } = applyXp(player, award.amount);
    const next = award.countsAsQuest ? { ...leveled, questsCompleted: leveled.questsCompleted + 1 } : leveled;
    await database.player.put(next);
    await database.questLog.add({
      date: award.date,
      kind: award.kind,
      refId: award.refId,
      xp: Math.max(0, Math.floor(award.amount)),
      at: now.toISOString(),
    });
    if (levelUp) await pushEvents(database, [{ type: 'levelUp', ...levelUp }]);
    await unlockAchievements(database, now);
  });
}

export async function assignStats(database: AshbornDB, allocation: Partial<Stats>): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) throw new Error('Player not registered.');
    await database.player.put(assignStatPoints(player, allocation));
  });
}

export async function setTitle(database: AshbornDB, titleId: string | null): Promise<void> {
  await writeTx(database, async () => {
    if (titleId !== null && !(await database.achievements.get(titleId))) throw new Error('That title is still locked.');
    await database.player.update(1, { titleId });
  });
}
