import { todayKey } from '../../domain/day';
import type { AshbornDB } from '../schema';

export interface FoodInput {
  kcal: number;
  proteinG: number;
  waterMl: number;
  note?: string;
}

const LIMITS = { kcal: 20_000, proteinG: 1_000, waterMl: 10_000 } as const;

export async function addFood(database: AshbornDB, input: FoodInput, now: Date): Promise<number> {
  for (const key of ['kcal', 'proteinG', 'waterMl'] as const) {
    const value = input[key];
    if (!Number.isFinite(value) || value < 0 || value > LIMITS[key]) throw new Error(`Amounts must be between 0 and ${LIMITS[key]}.`);
  }
  if (input.kcal === 0 && input.proteinG === 0 && input.waterMl === 0) throw new Error('Enter calories, protein or water.');
  return database.foodLog.add({
    date: todayKey(now),
    kcal: Math.round(input.kcal),
    proteinG: Math.round(input.proteinG),
    waterMl: Math.round(input.waterMl),
    note: (input.note ?? '').trim().slice(0, 80),
    at: now.toISOString(),
  });
}

export async function deleteFood(database: AshbornDB, id: number): Promise<void> {
  await database.foodLog.delete(id);
}
