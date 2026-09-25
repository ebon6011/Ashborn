import type { Equipment, ExerciseCategory } from '../domain/types';

export interface ExerciseDef {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** Setups that can do this exercise */
  equipment: Equipment[];
  /** Weighted exercises are logged with kg; bodyweight ones with reps only */
  weighted: boolean;
  /** No-equipment alternative for weighted exercises */
  alternativeId?: string;
}

const ANY: Equipment[] = ['none', 'dumbbells', 'gym'];
const DB: Equipment[] = ['dumbbells', 'gym'];
const GYM: Equipment[] = ['gym'];

export const EXERCISES: readonly ExerciseDef[] = [
  // push
  { id: 'pushup', name: 'Push-up', category: 'push', equipment: ANY, weighted: false },
  { id: 'pike-pushup', name: 'Pike push-up', category: 'push', equipment: ANY, weighted: false },
  { id: 'db-bench-press', name: 'Dumbbell bench press', category: 'push', equipment: DB, weighted: true, alternativeId: 'pushup' },
  { id: 'db-shoulder-press', name: 'Dumbbell shoulder press', category: 'push', equipment: DB, weighted: true, alternativeId: 'pike-pushup' },
  { id: 'bench-press', name: 'Barbell bench press', category: 'push', equipment: GYM, weighted: true, alternativeId: 'pushup' },
  { id: 'overhead-press', name: 'Overhead press', category: 'push', equipment: GYM, weighted: true, alternativeId: 'pike-pushup' },
  // pull
  { id: 'towel-row', name: 'Doorway towel row', category: 'pull', equipment: ANY, weighted: false },
  { id: 'superman', name: 'Superman raise', category: 'pull', equipment: ANY, weighted: false },
  { id: 'db-row', name: 'One-arm dumbbell row', category: 'pull', equipment: DB, weighted: true, alternativeId: 'towel-row' },
  { id: 'lat-pulldown', name: 'Lat pulldown', category: 'pull', equipment: GYM, weighted: true, alternativeId: 'towel-row' },
  { id: 'cable-row', name: 'Seated cable row', category: 'pull', equipment: GYM, weighted: true, alternativeId: 'superman' },
  // legs
  { id: 'bodyweight-squat', name: 'Bodyweight squat', category: 'legs', equipment: ANY, weighted: false },
  { id: 'reverse-lunge', name: 'Reverse lunge', category: 'legs', equipment: ANY, weighted: false },
  { id: 'glute-bridge', name: 'Glute bridge', category: 'legs', equipment: ANY, weighted: false },
  { id: 'goblet-squat', name: 'Goblet squat', category: 'legs', equipment: DB, weighted: true, alternativeId: 'bodyweight-squat' },
  { id: 'db-romanian-deadlift', name: 'Dumbbell Romanian deadlift', category: 'legs', equipment: DB, weighted: true, alternativeId: 'glute-bridge' },
  { id: 'back-squat', name: 'Barbell back squat', category: 'legs', equipment: GYM, weighted: true, alternativeId: 'bodyweight-squat' },
  { id: 'leg-press', name: 'Leg press', category: 'legs', equipment: GYM, weighted: true, alternativeId: 'reverse-lunge' },
  // core
  { id: 'dead-bug', name: 'Dead bug', category: 'core', equipment: ANY, weighted: false },
  { id: 'lying-leg-raise', name: 'Lying leg raise', category: 'core', equipment: ANY, weighted: false },
  { id: 'bicycle-crunch', name: 'Bicycle crunch', category: 'core', equipment: ANY, weighted: false },
];

export function getExercise(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function exercisesFor(equipment: Equipment): ExerciseDef[] {
  return EXERCISES.filter((e) => e.equipment.includes(equipment));
}
