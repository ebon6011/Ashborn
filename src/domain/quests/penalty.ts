import { progression } from '../../config/progression';
import type { Experience, PenaltyQuest } from '../types';

export function generatePenalty(experience: Experience): PenaltyQuest {
  const p = progression.penalty.byTier[experience];
  return {
    id: 'penalty',
    label: p.label,
    easier: p.easier,
    target: p.target,
    unit: p.unit,
    progress: 0,
    xp: progression.penalty.xp,
    done: false,
  };
}
