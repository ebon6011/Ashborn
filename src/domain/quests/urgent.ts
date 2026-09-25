import { progression } from '../../config/progression';
import type { UrgentQuest } from '../types';

export function rollUrgent(rng: () => number, today: string, lastUrgentDate: string | null): UrgentQuest | null {
  if (lastUrgentDate === today) return null;
  const { chance, xp, tasks } = progression.urgent;
  if (tasks.length === 0 || rng() >= chance) return null;
  const index = Math.min(tasks.length - 1, Math.floor(rng() * tasks.length));
  return { id: `urgent-${today}`, label: tasks[index]!, xp, done: false };
}
