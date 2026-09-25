import { AshbornDB } from '../db/schema';
import type { ProfileInput } from '../domain/types';

export const sampleProfileInput: ProfileInput = {
  name: 'Kai',
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  goal: 'get_fit',
  experience: 'beginner',
  daysPerWeek: 3,
  minutesPerSession: 30,
  equipment: 'none',
};

/** Local-time Date for a YYYY-MM-DD key, e.g. at('2026-09-25', '23:59'). */
export function at(date: string, time = '09:00'): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, h, min);
}

/** A brand-new, empty database with a unique name (fake-indexeddb in tests). */
export function freshDb(): AshbornDB {
  return new AshbornDB(`test-${crypto.randomUUID()}`);
}
