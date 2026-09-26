import type { GameEvent, PersistResult } from '../domain/types';
import type { AshbornDB } from './schema';

export interface MetaMap {
  lastOpenDate: string;
  lastBackupAt: string;
  persistResult: PersistResult;
  lastUrgentDate: string;
  medicalAck: boolean;
  soundOn: boolean;
  installedAt: string;
  installGuideDismissed: boolean;
  pendingEvents: GameEvent[];
  /** Newest version whose What's New notes the player has seen */
  lastSeenVersion: string;
}

export async function getMeta<K extends keyof MetaMap>(database: AshbornDB, key: K): Promise<MetaMap[K] | undefined> {
  const row = await database.meta.get(key);
  return row?.value as MetaMap[K] | undefined;
}

export async function setMeta<K extends keyof MetaMap>(database: AshbornDB, key: K, value: MetaMap[K]): Promise<void> {
  await database.meta.put({ key, value });
}
