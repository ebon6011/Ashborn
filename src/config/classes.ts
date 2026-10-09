import type { ClassId, QuestItemKind, StatKey } from '../domain/types';

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  /** Side quests for this stat earn the class XP bonus. */
  stat: StatKey;
  /** Daily quest item that gets the focus boost; null = balanced. */
  focus: QuestItemKind | null;
}

/** Original classes, made for Ashborn. Ids are stored on phones and in backups: never rename one. */
export const CLASSES: readonly ClassDef[] = [
  { id: 'ironclad', name: 'Ironclad', tagline: 'The strength class', stat: 'strength', focus: 'pushups' },
  { id: 'galestrider', name: 'Galestrider', tagline: 'The speed class', stat: 'agility', focus: 'cardio' },
  { id: 'bulwark', name: 'Bulwark', tagline: 'The endurance class', stat: 'endurance', focus: 'squats' },
  { id: 'wayfarer', name: 'Wayfarer', tagline: 'The balanced class', stat: 'discipline', focus: null },
];

export const CLASS_IDS: readonly ClassId[] = CLASSES.map((c) => c.id);

export function getClass(id: string | null): ClassDef | undefined {
  return id === null ? undefined : CLASSES.find((c) => c.id === id);
}
