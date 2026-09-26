import { useSyncExternalStore } from 'react';

/** Moments when the update banner must not appear. Today: only the open set logger. */
const reasons = new Set<string>();
const listeners = new Set<() => void>();

export function setBusy(reason: string, on: boolean): void {
  const had = reasons.has(reason);
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  if (had !== on) listeners.forEach((listener) => listener());
}

export function isBusy(): boolean {
  return reasons.size > 0;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsBusy(): boolean {
  return useSyncExternalStore(subscribe, isBusy, () => false);
}

export function resetBusyForTests(): void {
  reasons.clear();
}
