import { progression } from '../config/progression';
import { STAT_KEYS, type Player, type StatKey, type Stats } from './types';

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  agility: 'Agility',
  vitality: 'Vitality',
  endurance: 'Endurance',
  discipline: 'Discipline',
};

export function initialStats(value: number = progression.startingStatValue): Stats {
  return { strength: value, agility: value, vitality: value, endurance: value, discipline: value };
}

export function initialPlayer(): Player {
  return {
    id: 1,
    level: 1,
    xp: 0,
    unspentStatPoints: 0,
    stats: initialStats(),
    titleId: null,
    streak: 0,
    bestStreak: 0,
    questsCompleted: 0,
    sideQuestStatProgress: initialStats(0),
    themeId: null,
    frameId: null,
    shields: 0,
    classId: null,
    classChosenAt: null,
    trialDone: false,
  };
}

export function assignStatPoints(player: Player, allocation: Partial<Stats>): Player {
  const stats = { ...player.stats };
  let total = 0;
  for (const key of STAT_KEYS) {
    const add = allocation[key] ?? 0;
    if (!Number.isInteger(add) || add < 0) throw new Error('Stat points must be whole, non-negative numbers.');
    stats[key] += add;
    total += add;
  }
  if (total > player.unspentStatPoints) throw new Error('Not enough stat points.');
  return { ...player, stats, unspentStatPoints: player.unspentStatPoints - total };
}

export function addSideQuestProgress(player: Player, stat: StatKey): Player {
  const per = progression.sideQuest.completionsPerStatPoint;
  const progress = { ...player.sideQuestStatProgress, [stat]: player.sideQuestStatProgress[stat] + 1 };
  const stats = { ...player.stats };
  if (progress[stat] >= per) {
    progress[stat] -= per;
    stats[stat] += 1;
  }
  return { ...player, stats, sideQuestStatProgress: progress };
}
