import { vi } from 'vitest';
import { startDay } from '../db/repo/days';
import { registerPlayer } from '../db/repo/onboarding';
import { db } from '../db/schema';
import { neverUrgent } from './dbFixtures';
import { at, sampleProfileInput } from './fixtures';

/** Empties the app's database singleton and registers the sample player on `date`. */
export async function seedApp(date = '2026-09-21'): Promise<void> {
  await db.delete();
  await db.open();
  await registerPlayer(db, sampleProfileInput, at(date));
  await startDay(db, at(date), neverUrgent);
}

export async function emptyApp(): Promise<void> {
  await db.delete();
  await db.open();
}

export function mockReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
