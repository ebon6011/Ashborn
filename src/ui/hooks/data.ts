import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta, type MetaMap } from '../../db/meta';
import { db } from '../../db/schema';
import type { Player, Profile } from '../../domain/types';

export function useProfile(): Profile | undefined {
  return useLiveQuery(() => db.profile.get(1), []);
}

export function usePlayer(): Player | undefined {
  return useLiveQuery(() => db.player.get(1), []);
}

export function useMeta<K extends keyof MetaMap>(key: K): MetaMap[K] | undefined {
  return useLiveQuery(() => getMeta(db, key), [key]);
}
