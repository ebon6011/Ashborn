import type { BossCategory } from '../domain/types';

/** Shape drawn for each Boss (see src/ui/components/BossSilhouette.tsx). */
export type Silhouette = 'colossus' | 'treant' | 'serpent' | 'titan' | 'wraith' | 'hound' | 'brute' | 'knight';

export interface BossDef {
  id: string;
  name: string;
  epithet: string;
  weakness: BossCategory;
  /** Title unlocked the first time this Boss is defeated */
  title: string;
  story: string;
  silhouette: Silhouette;
}

/** Original Bosses, written for Ashborn. Two per weakness; they rotate one per week. */
export const BOSSES: readonly BossDef[] = [
  { id: 'mawgrath', name: 'Mawgrath', epithet: 'the Hollow Colossus', weakness: 'legs', title: 'Colossus Breaker', story: 'A walking ruin of fused stone. Every step it takes shakes the gate.', silhouette: 'colossus' },
  { id: 'ulgara', name: 'Ulgara', epithet: 'the Coiled Tyrant', weakness: 'core', title: 'Tyrant’s Bane', story: 'A coiled serpent-queen who crushes the careless in her rings.', silhouette: 'serpent' },
  { id: 'sylreth', name: 'Sylreth', epithet: 'the Ashwind Wraith', weakness: 'cardio', title: 'Windchaser', story: 'A wraith of ash that outpaces anything that stops to breathe.', silhouette: 'wraith' },
  { id: 'grimhald', name: 'Grimhald', epithet: 'the Iron-Armed Brute', weakness: 'upper', title: 'Armbreaker', story: 'A brute with arms like battering rams. Meet force with force.', silhouette: 'brute' },
  { id: 'vessik', name: 'Vessik', epithet: 'the Ironroot Warden', weakness: 'legs', title: 'Rootsplitter', story: 'Its roots drink the strength of anyone who stands still too long.', silhouette: 'treant' },
  { id: 'brakmor', name: 'Brakmor', epithet: 'the Stone-Gut Titan', weakness: 'core', title: 'Titanfall', story: 'A titan with a belly of solid rock. Only an iron core can crack it.', silhouette: 'titan' },
  { id: 'korrun', name: 'Korrun', epithet: 'the Tireless Hound', weakness: 'cardio', title: 'Houndrunner', story: 'A hound that never tires. It hunts the ones who stop running.', silhouette: 'hound' },
  { id: 'zereth', name: 'Zereth', epithet: 'the Chainbound Knight', weakness: 'upper', title: 'Chainbreaker', story: 'A fallen knight bound in chains, still swinging a blade no one can lift.', silhouette: 'knight' },
];

export function getBoss(id: string): BossDef | undefined {
  return BOSSES.find((b) => b.id === id);
}
