import type { FoodEntry, Profile, Sex } from './types';

/*
 * Nutrition formulas and their sources. Do not change a number here without a source.
 *
 * BMR — Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.
 *   "A new predictive equation for resting energy expenditure in healthy individuals."
 *   Am J Clin Nutr. 1990;51(2):241–247.
 *   men:   10 × kg + 6.25 × cm − 5 × age + 5
 *   women: 10 × kg + 6.25 × cm − 5 × age − 161
 *
 * Activity multipliers — the standard factors used with BMR equations
 *   (sedentary 1.2, lightly active 1.375, moderately active 1.55, very active 1.725),
 *   e.g. McArdle, Katch & Katch, "Exercise Physiology". Mapped from training days per week.
 *
 * Protein — Jäger R, et al. "International Society of Sports Nutrition Position Stand:
 *   protein and exercise." J Int Soc Sports Nutr. 2017;14:20. Range 1.4–2.0 g/kg/day; we use 1.6.
 *
 * Fat — 25 % of energy, inside the Acceptable Macronutrient Distribution Range of 20–35 %
 *   (Institute of Medicine, "Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat,
 *   Fatty Acids, Cholesterol, Protein, and Amino Acids", 2005). Carbohydrate is the remainder.
 *
 * Water — EFSA Panel on Dietetic Products, Nutrition and Allergies. "Scientific Opinion on
 *   Dietary Reference Values for water." EFSA Journal 2010;8(3):1459. 2.0 L/day women, 2.5 L/day men.
 *
 * Safety floor — never below BMR, and never below 1,200 kcal (women) / 1,500 kcal (men),
 *   the commonly cited minimums for unsupervised diets (e.g. Harvard Health Publishing).
 *
 * Goal adjustment (app policy, deliberately moderate): fat loss −20 % of maintenance with the
 *   deficit capped at 500 kcal/day; muscle gain +10 %; general fitness = maintenance.
 */

export type NutritionProfile = Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'goal' | 'daysPerWeek'>;

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  multiplier: number;
  calories: number;
  floor: number;
  floorApplied: boolean;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
  minorHeldAtMaintenance: boolean;
}

export const GOAL_POLICY = { loseFatDeficit: 0.2, maxDeficitKcal: 500, buildMuscleSurplus: 0.1 } as const;
export const PROTEIN_G_PER_KG = 1.6;
export const FAT_ENERGY_SHARE = 0.25;
export const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };
export const WATER_ML: Record<Sex, number> = { male: 2500, female: 2000 };

export function mifflinStJeorBmr(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function activityMultiplier(daysPerWeek: number): number {
  if (daysPerWeek <= 1) return 1.2;
  if (daysPerWeek <= 3) return 1.375;
  if (daysPerWeek <= 5) return 1.55;
  return 1.725;
}

export function calculateTargets(p: NutritionProfile): NutritionTargets {
  const bmrRaw = mifflinStJeorBmr(p);
  const multiplier = activityMultiplier(p.daysPerWeek);
  const tdeeRaw = bmrRaw * multiplier;

  const minorHeldAtMaintenance = p.age < 18 && p.goal === 'lose_fat';

  let goalKcal = tdeeRaw;
  if (p.goal === 'lose_fat' && !minorHeldAtMaintenance) goalKcal = tdeeRaw - Math.min(tdeeRaw * GOAL_POLICY.loseFatDeficit, GOAL_POLICY.maxDeficitKcal);
  if (p.goal === 'build_muscle') goalKcal = tdeeRaw * (1 + GOAL_POLICY.buildMuscleSurplus);

  const floor = Math.round(Math.max(bmrRaw, MIN_CALORIES[p.sex]));
  const floorApplied = goalKcal < floor;
  const calories = floorApplied ? floor : Math.round(goalKcal);

  const proteinG = Math.round(PROTEIN_G_PER_KG * p.weightKg);
  const fatG = Math.round((calories * FAT_ENERGY_SHARE) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return {
    bmr: Math.round(bmrRaw),
    tdee: Math.round(tdeeRaw),
    multiplier,
    calories,
    floor,
    floorApplied,
    proteinG,
    fatG,
    carbsG,
    waterMl: WATER_ML[p.sex],
    minorHeldAtMaintenance,
  };
}

export function sumFood(entries: ReadonlyArray<Pick<FoodEntry, 'kcal' | 'proteinG' | 'waterMl'>>): { kcal: number; proteinG: number; waterMl: number } {
  return entries.reduce(
    (t, e) => ({ kcal: t.kcal + e.kcal, proteinG: t.proteinG + e.proteinG, waterMl: t.waterMl + e.waterMl }),
    { kcal: 0, proteinG: 0, waterMl: 0 },
  );
}
