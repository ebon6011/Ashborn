import { useSyncExternalStore } from 'react';

/** Result of a manual "Check for updates". */
export type UpdateCheck = 'available' | 'none' | 'offline' | 'unsupported';

interface Registration {
  update(): Promise<unknown>;
  waiting: unknown;
  installing: unknown;
}

let registration: Registration | null = null;
let applyFn: (() => Promise<void>) | null = null;
let updateReady = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export function setRegistration(r: Registration): void {
  registration = r;
}

export function setApplyUpdate(fn: () => Promise<void>): void {
  applyFn = fn;
}

/** Called by the service worker registration when a new version is installed and waiting. */
export function markUpdateReady(): void {
  updateReady = true;
  emit();
}

export function isUpdateReady(): boolean {
  return updateReady;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(subscribe, isUpdateReady, () => false);
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export async function checkForUpdates(): Promise<UpdateCheck> {
  if (!registration) return 'unsupported';
  if (updateReady) return 'available';
  if (isOffline()) return 'offline';
  try {
    await registration.update();
  } catch {
    return 'offline';
  }
  return updateReady || registration.waiting || registration.installing ? 'available' : 'none';
}

/** Activates the waiting version and reloads. Only ever called from the "Update now" tap. */
export async function applyUpdate(): Promise<void> {
  await applyFn?.();
}

export function resetUpdatesForTests(): void {
  registration = null;
  applyFn = null;
  updateReady = false;
  listeners.clear();
}
