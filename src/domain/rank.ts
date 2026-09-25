import { progression } from '../config/progression';
import { RANKS, type Rank } from './types';

export function rankForLevel(level: number): Rank {
  for (const threshold of progression.rankThresholds) {
    if (level >= threshold.minLevel) return threshold.rank;
  }
  return 'E';
}

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}
