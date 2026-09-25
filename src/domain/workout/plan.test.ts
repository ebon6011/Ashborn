import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '../../config/exercises';
import { generateWeekPlan, planVolume, trainingWeekdays, type PlanProfile } from './plan';

const beginnerHome: PlanProfile = { daysPerWeek: 3, minutesPerSession: 30, equipment: 'none', experience: 'beginner' };
const WEEK = '2026-09-21';

describe('exercise library', () => {
  it('gives every weighted exercise a no-equipment alternative in the same category', () => {
    for (const e of EXERCISES.filter((x) => x.weighted)) {
      const alt = getExercise(e.alternativeId ?? '');
      expect(alt?.equipment).toContain('none');
      expect(alt?.category).toBe(e.category);
    }
  });
});

describe('trainingWeekdays', () => {
  it('spreads sessions through the week', () => {
    expect(trainingWeekdays(1)).toEqual([1]);
    expect(trainingWeekdays(3)).toEqual([1, 3, 5]);
    expect(trainingWeekdays(4)).toEqual([1, 2, 4, 5]);
    expect(trainingWeekdays(9)).toHaveLength(7);
    expect(trainingWeekdays(0)).toEqual([1]);
  });
});

describe('generateWeekPlan', () => {
  it('builds full-body home sessions for 3 days a week', () => {
    const plan = generateWeekPlan(beginnerHome, WEEK, null);
    expect(plan.weekStart).toBe(WEEK);
    expect(plan.days.map((d) => d.focus)).toEqual(['full', 'full', 'full']);
    for (const day of plan.days) {
      expect(day.exercises).toHaveLength(4);
      for (const ex of day.exercises) {
        expect(getExercise(ex.exerciseId)?.equipment).toContain('none');
        expect(ex).toMatchObject({ sets: 2, reps: 10 });
      }
    }
    expect(planVolume(plan)).toBe(240);
  });

  it('prefers weighted lifts when a gym is available', () => {
    const plan = generateWeekPlan({ ...beginnerHome, equipment: 'gym' }, WEEK, null);
    const main = plan.days[0]!.exercises.filter((e) => getExercise(e.exerciseId)?.category !== 'core');
    expect(main.every((e) => getExercise(e.exerciseId)?.weighted)).toBe(true);
  });

  it('switches to an upper/lower split at 4+ days', () => {
    const plan = generateWeekPlan({ ...beginnerHome, daysPerWeek: 4 }, WEEK, null);
    expect(plan.days.map((d) => d.focus)).toEqual(['upper', 'lower', 'upper', 'lower']);
    const ids = plan.days[0]!.exercises.map((e) => e.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fits the session length', () => {
    expect(generateWeekPlan({ ...beginnerHome, minutesPerSession: 15 }, WEEK, null).days[0]!.exercises).toHaveLength(3);
    expect(generateWeekPlan({ ...beginnerHome, minutesPerSession: 60 }, WEEK, null).days[0]!.exercises).toHaveLength(5);
  });

  it('keeps the same plan volume week to week when nothing changes', () => {
    const previous = generateWeekPlan(beginnerHome, '2026-09-14', null);
    expect(planVolume(generateWeekPlan(beginnerHome, WEEK, previous))).toBe(planVolume(previous));
  });

  it('never grows planned volume more than 10 % over the previous week', () => {
    const previous = generateWeekPlan({ ...beginnerHome, daysPerWeek: 2 }, '2026-09-14', null);
    const next = generateWeekPlan({ ...beginnerHome, daysPerWeek: 6 }, WEEK, previous);
    expect(planVolume(next)).toBeLessThanOrEqual(Math.floor(planVolume(previous) * 1.1));
    expect(next.days.length).toBeGreaterThanOrEqual(1);
    expect(next.days.every((d) => d.exercises.every((e) => e.sets >= 1))).toBe(true);
  });
});
