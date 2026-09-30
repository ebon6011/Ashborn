import type { BossCategory } from '../domain/types';
import ashvyrn from '../assets/bosses/ashvyrn.svg';
import grolmak from '../assets/bosses/grolmak.svg';
import hrimgald from '../assets/bosses/hrimgald.svg';
import morvaine from '../assets/bosses/morvaine.svg';
import obrakh from '../assets/bosses/obrakh.svg';
import skarnyx from '../assets/bosses/skarnyx.svg';
import thessrak from '../assets/bosses/thessrak.svg';
import vaelcrest from '../assets/bosses/vaelcrest.svg';

/** Code-drawn shape used only by the retired v1.4.0 Bosses (see src/ui/components/BossSilhouette.tsx). */
export type Silhouette = 'colossus' | 'treant' | 'serpent' | 'titan' | 'wraith' | 'hound' | 'brute' | 'knight';

interface BossBase {
  id: string;
  name: string;
  epithet: string;
  weakness: BossCategory;
  /** Title unlocked the first time this Boss is defeated */
  title: string;
  story: string;
}

/** Active Bosses have drawn art; retired ones keep their old silhouette. */
export type BossDef = BossBase & ({ art: string; silhouette?: never } | { silhouette: Silhouette; art?: never });

/** Original Bosses, drawn for Ashborn. Two per weakness; they rotate one per week in this order. */
export const BOSSES: readonly BossDef[] = [
  { id: 'vaelcrest', name: 'Vaelcrest', epithet: 'the Oathbroken Knight', weakness: 'upper', title: 'Oathkeeper', story: 'A knight who broke every oath but one: no challenger leaves standing.', art: vaelcrest },
  { id: 'skarnyx', name: 'Skarnyx', epithet: 'the Carapace Sovereign', weakness: 'core', title: 'Carapace Cracker', story: 'A mantis sovereign whose scythes cut faster than the eye can follow.', art: skarnyx },
  { id: 'hrimgald', name: 'Hrimgald', epithet: 'the Glacier Warden', weakness: 'legs', title: 'Frostwalker', story: 'Frost follows its every step. Only strong legs outrun the cold.', art: hrimgald },
  { id: 'ashvyrn', name: 'Ashvyrn', epithet: 'the Cinder Wyrm', weakness: 'cardio', title: 'Wyrmrunner', story: 'A wyrm of blue fire that hunts anything that stops moving.', art: ashvyrn },
  { id: 'grolmak', name: 'Grolmak', epithet: 'the Warbound Chieftain', weakness: 'upper', title: 'Warbreaker', story: 'A tusked war-giant who drags twin axes from battle to battle.', art: grolmak },
  { id: 'thessrak', name: 'Thessrak', epithet: 'the Sting Titan', weakness: 'core', title: 'Stingbreaker', story: 'A scorpion the size of a hill. Its stinger never misses twice.', art: thessrak },
  { id: 'obrakh', name: 'Obrakh', epithet: 'the Gate Sentinel', weakness: 'legs', title: 'Gatebreaker', story: 'A living wall of cracked stone that guards the deepest dungeon door.', art: obrakh },
  { id: 'morvaine', name: 'Morvaine', epithet: 'the Hollow Regent', weakness: 'cardio', title: 'Crownbreaker', story: 'A hollow king who keeps the souls of the fallen in his staff.', art: morvaine },
];

/** The v1.4.0 Bosses. Out of the rotation, but kept so saved weeks and earned titles still resolve. */
export const RETIRED_BOSSES: readonly BossDef[] = [
  { id: 'mawgrath', name: 'Mawgrath', epithet: 'the Hollow Colossus', weakness: 'legs', title: 'Colossus Breaker', story: 'A walking ruin of fused stone. Every step it takes shakes the gate.', silhouette: 'colossus' },
  { id: 'ulgara', name: 'Ulgara', epithet: 'the Coiled Tyrant', weakness: 'core', title: 'Tyrant’s Bane', story: 'A coiled serpent-queen who crushes the careless in her rings.', silhouette: 'serpent' },
  { id: 'sylreth', name: 'Sylreth', epithet: 'the Ashwind Wraith', weakness: 'cardio', title: 'Windchaser', story: 'A wraith of ash that outpaces anything that stops to breathe.', silhouette: 'wraith' },
  { id: 'grimhald', name: 'Grimhald', epithet: 'the Iron-Armed Brute', weakness: 'upper', title: 'Armbreaker', story: 'A brute with arms like battering rams. Meet force with force.', silhouette: 'brute' },
  { id: 'vessik', name: 'Vessik', epithet: 'the Ironroot Warden', weakness: 'legs', title: 'Rootsplitter', story: 'Its roots drink the strength of anyone who stands still too long.', silhouette: 'treant' },
  { id: 'brakmor', name: 'Brakmor', epithet: 'the Stone-Gut Titan', weakness: 'core', title: 'Titanfall', story: 'A titan with a belly of solid rock. Only an iron core can crack it.', silhouette: 'titan' },
  { id: 'korrun', name: 'Korrun', epithet: 'the Tireless Hound', weakness: 'cardio', title: 'Houndrunner', story: 'A hound that never tires. It hunts the ones who stop running.', silhouette: 'hound' },
  { id: 'zereth', name: 'Zereth', epithet: 'the Chainbound Knight', weakness: 'upper', title: 'Chainbreaker', story: 'A fallen knight bound in chains, still swinging a blade no one can lift.', silhouette: 'knight' },
];

export const ALL_BOSSES: readonly BossDef[] = [...BOSSES, ...RETIRED_BOSSES];

export function getBoss(id: string): BossDef | undefined {
  return ALL_BOSSES.find((b) => b.id === id);
}
