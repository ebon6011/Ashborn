import { progression } from '../config/progression';
import { rankForLevel } from './rank';
import type { LevelUpEvent, Player } from './types';

export function xpToNext(level: number): number {
  const { base, exponent } = progression.xpCurve;
  return Math.round(base * Math.pow(level, exponent));
}

type XpFields = Pick<Player, 'level' | 'xp' | 'unspentStatPoints'>;

export function applyXp<P extends XpFields>(player: P, amount: number): { player: P; levelUp: LevelUpEvent | null } {
  const gain = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  let level = player.level;
  let xp = player.xp + gain;
  let points = player.unspentStatPoints;

  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    const rankBefore = rankForLevel(level);
    level += 1;
    points += progression.statPointsPerLevel;
    if (rankForLevel(level) !== rankBefore) points += progression.statPointsPerRankUp;
  }

  const next = { ...player, level, xp, unspentStatPoints: points };
  if (level === player.level) return { player: next, levelUp: null };
  return {
    player: next,
    levelUp: {
      fromLevel: player.level,
      toLevel: level,
      fromRank: rankForLevel(player.level),
      toRank: rankForLevel(level),
      statPointsGained: points - player.unspentStatPoints,
    },
  };
}
