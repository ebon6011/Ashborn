import { describe, expect, it } from 'vitest';
import { activityMultiplier, calculateTargets, mifflinStJeorBmr, sumFood, type NutritionProfile } from './nutrition';

const man: NutritionProfile = { sex: 'male', weightKg: 80, heightCm: 180, age: 30, goal: 'lose_fat', daysPerWeek: 3 };

describe('Mifflin-St Jeor BMR', () => {
  it('matches the published equation', () => {
    expect(mifflinStJeorBmr(man)).toBe(1780); // 800 + 1125 − 150 + 5
    expect(mifflinStJeorBmr({ ...man, sex: 'female' })).toBe(1614); // … − 161
  });
});

describe('activityMultiplier', () => {
  it.each([[0, 1.2], [1, 1.2], [2, 1.375], [3, 1.375], [4, 1.55], [5, 1.55], [6, 1.725], [7, 1.725]])(
    '%i training days → %f', (days, mult) => expect(activityMultiplier(days)).toBe(mult),
  );
});

describe('calculateTargets', () => {
  it('applies a 20 % deficit for fat loss', () => {
    expect(calculateTargets(man)).toEqual({
      bmr: 1780, tdee: 2448, multiplier: 1.375, calories: 1958, floor: 1780, floorApplied: false,
      proteinG: 128, fatG: 54, carbsG: 240, waterMl: 2500, minorHeldAtMaintenance: false,
    });
  });

  it('adds 10 % for muscle gain and keeps maintenance for fitness', () => {
    expect(calculateTargets({ ...man, goal: 'build_muscle' }).calories).toBe(2692);
    expect(calculateTargets({ ...man, goal: 'get_fit' }).calories).toBe(2448);
  });

  it('caps the deficit at 500 kcal', () => {
    const big: NutritionProfile = { sex: 'male', weightKg: 100, heightCm: 190, age: 25, goal: 'lose_fat', daysPerWeek: 6 };
    const t = calculateTargets(big);
    expect(t.tdee).toBe(3566);
    expect(t.calories).toBe(3066);
  });

  it('never goes below BMR', () => {
    const t = calculateTargets({ ...man, daysPerWeek: 0 });
    expect(t.calories).toBe(1780);
    expect(t.floorApplied).toBe(true);
  });

  it('never goes below 1200 kcal for women', () => {
    const t = calculateTargets({ sex: 'female', weightKg: 45, heightCm: 155, age: 60, goal: 'lose_fat', daysPerWeek: 1 });
    expect(t.calories).toBe(1200);
    expect(t.floor).toBe(1200);
    expect(t.floorApplied).toBe(true);
    expect(t.waterMl).toBe(2000);
  });

  it('never returns negative carbs', () => {
    const t = calculateTargets({ sex: 'female', weightKg: 150, heightCm: 150, age: 90, goal: 'lose_fat', daysPerWeek: 0 });
    expect(t.carbsG).toBeGreaterThanOrEqual(0);
  });

  it('holds an under-18 fat-loss goal at maintenance, not a deficit', () => {
    const teen: NutritionProfile = { sex: 'male', weightKg: 60, heightCm: 170, age: 15, goal: 'lose_fat', daysPerWeek: 3 };
    const t = calculateTargets(teen);
    const maintenance = calculateTargets({ ...teen, goal: 'get_fit' });
    expect(t.calories).toBe(maintenance.calories);
    expect(t.minorHeldAtMaintenance).toBe(true);
  });

  it('does not flag an adult fat-loss goal', () => {
    const t = calculateTargets(man);
    expect(t.minorHeldAtMaintenance).toBe(false);
  });
});

describe('sumFood', () => {
  it('totals the day', () => {
    expect(sumFood([{ kcal: 500, proteinG: 30, waterMl: 0 }, { kcal: 0, proteinG: 0, waterMl: 250 }])).toEqual({ kcal: 500, proteinG: 30, waterMl: 250 });
    expect(sumFood([])).toEqual({ kcal: 0, proteinG: 0, waterMl: 0 });
  });
});
