import { progression } from '../../config/progression';
import { EXERCISES, type ExerciseDef } from '../../config/exercises';
import type { Equipment, ExerciseCategory, PlanDay, PlanFocus, PlannedExercise, Profile, WeekPlan } from '../types';

export type PlanProfile = Pick<Profile, 'daysPerWeek' | 'minutesPerSession' | 'equipment' | 'experience'>;

const WEEKDAYS_BY_COUNT: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

export function trainingWeekdays(daysPerWeek: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(daysPerWeek)));
  return [...WEEKDAYS_BY_COUNT[n]!];
}

function slotsFor(focus: PlanFocus, minutes: number): ExerciseCategory[] {
  const base: ExerciseCategory[] =
    focus === 'full' ? ['push', 'pull', 'legs', 'core'] : focus === 'upper' ? ['push', 'pull', 'push', 'core'] : ['legs', 'legs', 'core'];
  const extra: ExerciseCategory = focus === 'upper' ? 'pull' : 'legs';
  if (minutes < 20) return base.slice(0, 3);
  if (minutes >= 45) return [...base, extra];
  return base;
}

function candidates(category: ExerciseCategory, equipment: Equipment): ExerciseDef[] {
  const list = EXERCISES.filter((e) => e.category === category && e.equipment.includes(equipment));
  if (equipment === 'none') return list;
  return [...list.filter((e) => e.weighted), ...list.filter((e) => !e.weighted)];
}

export function planVolume(plan: WeekPlan): number {
  return plan.days.reduce((sum, day) => sum + day.exercises.reduce((s, e) => s + e.sets * e.reps, 0), 0);
}

export function capVolume(plan: WeekPlan, previousVolume: number): WeekPlan {
  if (previousVolume <= 0) return plan;
  const limit = Math.floor(previousVolume * (1 + progression.training.weeklyVolumeCap));
  const days: PlanDay[] = plan.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) }));
  const capped: WeekPlan = { ...plan, days };

  while (planVolume(capped) > limit) {
    let biggest: PlannedExercise | undefined;
    for (const day of days) {
      for (const ex of day.exercises) if (ex.sets > 1 && (!biggest || ex.sets > biggest.sets)) biggest = ex;
    }
    if (biggest) {
      biggest.sets -= 1;
      continue;
    }
    if (days.length > 1) {
      days.pop();
      continue;
    }
    break;
  }
  return capped;
}

export function generateWeekPlan(profile: PlanProfile, weekStart: string, previous: WeekPlan | null): WeekPlan {
  const weekdays = trainingWeekdays(profile.daysPerWeek);
  const split = weekdays.length >= 4;
  const sets = progression.training.setsByTier[profile.experience];
  const reps = progression.training.repsByTier[profile.experience];

  const days: PlanDay[] = weekdays.map((weekday, dayIndex) => {
    const focus: PlanFocus = split ? (dayIndex % 2 === 0 ? 'upper' : 'lower') : 'full';
    const used = new Map<ExerciseCategory, number>();
    const exercises = slotsFor(focus, profile.minutesPerSession).map((category) => {
      const list = candidates(category, profile.equipment);
      const occurrence = used.get(category) ?? 0;
      used.set(category, occurrence + 1);
      const pick = list[(dayIndex + occurrence) % list.length]!;
      return { exerciseId: pick.id, sets, reps };
    });
    return { weekday, focus, exercises };
  });

  const plan: WeekPlan = { weekStart, days };
  return previous ? capVolume(plan, planVolume(previous)) : plan;
}
