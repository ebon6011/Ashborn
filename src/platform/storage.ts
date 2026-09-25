import type { PersistResult } from '../domain/types';

type PersistApi = { persist?: () => Promise<boolean> };

/** Asks the browser not to evict our data. Call once, from a user tap. */
export async function requestPersist(storage: PersistApi | undefined = globalThis.navigator?.storage): Promise<PersistResult> {
  if (typeof storage?.persist !== 'function') return 'unsupported';
  try {
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}
