import type { AshbornDB } from '../db/schema';
import { startDay, setItemProgress } from '../db/repo/days';
import { registerPlayer } from '../db/repo/onboarding';
import { at, freshDb, sampleProfileInput } from './fixtures';

export const neverUrgent = () => 0.99;

export async function setupPlayer(date = '2026-09-21'): Promise<AshbornDB> {
  const database = freshDb();
  await registerPlayer(database, sampleProfileInput, at(date));
  await startDay(database, at(date), neverUrgent);
  return database;
}

export async function completeDaily(database: AshbornDB, date: string): Promise<void> {
  const day = await database.days.get(date);
  for (const item of day?.items ?? []) await setItemProgress(database, date, item.id, item.target, at(date, '18:00'));
}
