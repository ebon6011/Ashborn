# Update System (v1.2.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen: native, in-session) to implement this plan task-by-task, with superpowers:test-driven-development and superpowers:verification-before-completion. Steps use checkbox (`- [ ]`) syntax.

**Goal:** New versions wait for an "Update now" tap (never auto-reload), are checked on open/foreground/Settings, and a one-time System "What's New" window follows each update.

**Architecture:** Service worker moves to vite-plugin-pwa prompt mode. `src/platform/updates.ts` wraps the registration in a tiny external store; `src/ui/busy.ts` is a tiny store the set logger marks while open. `UpdateBanner` and `WhatsNewWindow` render in the App shell. Which changelog entries are unseen is a pure function over `src/data/changelog.ts` and a new `lastSeenVersion` meta key (key–value; no schema change).

**Tech Stack:** existing only — React 19, Dexie, vite-plugin-pwa (`virtual:pwa-register`), Vitest + Testing Library, Playwright WebKit.

**Spec:** `docs/superpowers/specs/2026-09-27-update-system-design.md`

## Global Constraints
- CLAUDE.md "Update Rules" apply (Superpowers workflow, never lose data, version bump + changelog, originality, no backend, iPhone-first, no new packages, balance numbers in `src/config/progression.ts`, commit per task).
- Nothing may reload the page except the player tapping "Update now".
- Busy = only the set logger open on Training.
- New player: no What's New window. Missing `lastSeenVersion` on an existing install = baseline `1.1.0`.
- 16px inputs, ≥44px targets, screen-reader labels, safe areas, reduced motion respected.

## Review Focus
1. Update ready while the set logger is open → banner hidden, appears on close (Task 3 test).
2. App reopened after an update several versions later → all unseen notes shown once (Task 1 `unseenEntries` "several newer" + Task 4 test).
3. Offline tap on "Check for updates" → "You're offline" message, no crash (Task 2 test).
4. Level-up pending at launch after an update → What's New waits (Task 4 test).
5. Backup restored from before this feature → What's New shows 1.2.0 once, no crash (covered by missing-key baseline, Task 4 test).

---

### Task 1: Unseen-changelog logic, `lastSeenVersion`, version 1.2.0

**Files:** Modify `src/data/changelog.ts`, `src/data/changelog.test.ts`, `src/db/meta.ts`, `src/db/repo/onboarding.ts`, `src/db/repo/onboarding.test.ts`, `package.json`.

**Produces:** `PRE_TRACKING_VERSION = '1.1.0'`; `unseenEntries(changelog: readonly ChangelogEntry[], lastSeen: string): ChangelogEntry[]`; `MetaMap.lastSeenVersion: string`; `registerPlayer` sets `lastSeenVersion = __APP_VERSION__`.

- [ ] **Step 1: Failing tests** — append to `src/data/changelog.test.ts`:
```ts
import { PRE_TRACKING_VERSION, unseenEntries, type ChangelogEntry } from './changelog';

describe('unseenEntries', () => {
  const log: ChangelogEntry[] = [
    { version: '1.3.0', date: '2026-10-05', notes: ['c'] },
    { version: '1.2.0', date: '2026-09-27', notes: ['b'] },
    { version: '1.1.0', date: '2026-09-27', notes: ['a'] },
  ];
  it('returns entries newer than the last seen version, newest first', () => {
    expect(unseenEntries(log, '1.1.0').map((e) => e.version)).toEqual(['1.3.0', '1.2.0']);
  });
  it('returns nothing when the player has seen the latest', () => {
    expect(unseenEntries(log, '1.3.0')).toEqual([]);
    expect(unseenEntries(log, '9.0.0')).toEqual([]);
  });
  it('treats installs from before tracking as having seen 1.1.0', () => {
    expect(PRE_TRACKING_VERSION).toBe('1.1.0');
  });
});
```
Append to `src/db/repo/onboarding.test.ts` (inside the `registerPlayer` describe):
```ts
  it('marks the current version as seen so a new player gets no What’s New window', async () => {
    const db = await setupPlayer('2026-09-21');
    expect(await getMeta(db, 'lastSeenVersion')).toBe(__APP_VERSION__);
  });
```
- [ ] **Step 2:** `npx vitest run src/data src/db/repo/onboarding.test.ts` → FAIL (missing exports / undefined meta).
- [ ] **Step 3: Implement.** In `src/data/changelog.ts` add:
```ts
/** Every install from before What's New tracking had seen up to this version. */
export const PRE_TRACKING_VERSION = '1.1.0';

export function unseenEntries(changelog: readonly ChangelogEntry[], lastSeen: string): ChangelogEntry[] {
  return changelog.filter((entry) => compareVersions(entry.version, lastSeen) > 0);
}
```
and put this entry at the TOP of `CHANGELOG`:
```ts
  {
    version: '1.2.0',
    date: '2026-09-27',
    notes: [
      'Updates now wait for you: tap “Update now” when you’re ready, and see what changed right after.',
      'New “Check for updates” button in Settings.',
    ],
  },
```
In `src/db/meta.ts` add `lastSeenVersion: string;` to `MetaMap`. In `src/db/repo/onboarding.ts` `registerPlayer`, after `setMeta(database, 'lastOpenDate', today)` add `await setMeta(database, 'lastSeenVersion', __APP_VERSION__);`. Run `npm version 1.2.0 --no-git-tag-version`.
- [ ] **Step 4:** same command → PASS; `npm test` all green (the version-match test now requires 1.2.0 on top).
- [ ] **Step 5:** commit `feat(updates): track the last seen version and add v1.2.0 notes`.

---

### Task 2: Update store and prompt-mode service worker

**Files:** Create `src/platform/updates.ts`, `src/platform/updates.test.ts`. Modify `src/main.tsx`, `vite.config.ts`.

**Produces:** `type UpdateCheck = 'available' | 'none' | 'offline' | 'unsupported'`; `setRegistration(r)`, `setApplyUpdate(fn)`, `markUpdateReady()`, `isUpdateReady()`, `useUpdateReady()`, `checkForUpdates(): Promise<UpdateCheck>`, `applyUpdate(): Promise<void>`, `resetUpdatesForTests()`.

- [ ] **Step 1: Failing tests** `src/platform/updates.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyUpdate, checkForUpdates, isUpdateReady, markUpdateReady, resetUpdatesForTests, setApplyUpdate, setRegistration } from './updates';

type FakeReg = { update: () => Promise<void>; waiting: object | null; installing: object | null };
const fake = (over: Partial<FakeReg> = {}): FakeReg => ({ update: vi.fn(async () => {}), waiting: null, installing: null, ...over });

afterEach(() => {
  resetUpdatesForTests();
  vi.unstubAllGlobals();
});

describe('checkForUpdates', () => {
  it('is unsupported without a service worker', async () => {
    expect(await checkForUpdates()).toBe('unsupported');
  });
  it('reports none when nothing new was found', async () => {
    const reg = fake();
    setRegistration(reg);
    expect(await checkForUpdates()).toBe('none');
    expect(reg.update).toHaveBeenCalledOnce();
  });
  it('reports available when a new version is waiting or installing', async () => {
    const reg = fake();
    reg.update = vi.fn(async () => { reg.waiting = {}; });
    setRegistration(reg);
    expect(await checkForUpdates()).toBe('available');
    setRegistration(fake({ installing: {} }));
    expect(await checkForUpdates()).toBe('available');
  });
  it('reports available once the banner is already up', async () => {
    setRegistration(fake());
    markUpdateReady();
    expect(isUpdateReady()).toBe(true);
    expect(await checkForUpdates()).toBe('available');
  });
  it('reports offline when the phone is offline or the check fails', async () => {
    setRegistration(fake());
    vi.stubGlobal('navigator', { onLine: false });
    expect(await checkForUpdates()).toBe('offline');
    vi.unstubAllGlobals();
    setRegistration(fake({ update: vi.fn(async () => { throw new Error('network'); }) }));
    expect(await checkForUpdates()).toBe('offline');
  });
});

describe('applyUpdate', () => {
  it('runs the activation the service worker registration provided', async () => {
    const apply = vi.fn(async () => {});
    setApplyUpdate(apply);
    await applyUpdate();
    expect(apply).toHaveBeenCalledOnce();
  });
});
```
- [ ] **Step 2:** `npx vitest run src/platform/updates.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** `src/platform/updates.ts`:
```ts
import { useSyncExternalStore } from 'react';

/** Result of a manual "Check for updates". */
export type UpdateCheck = 'available' | 'none' | 'offline' | 'unsupported';

type Registration = Pick<ServiceWorkerRegistration, 'update'> & { waiting: unknown; installing: unknown };

let registration: Registration | null = null;
let applyFn: (() => Promise<void>) | null = null;
let updateReady = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

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
```
- [ ] **Step 4:** test → PASS.
- [ ] **Step 5: Prompt mode.** In `vite.config.ts` set `registerType: 'prompt'` and delete `skipWaiting: true,` and `clientsClaim: true,` from `workbox`. Replace the `registerSW({...})` block in `src/main.tsx` with:
```ts
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: markUpdateReady,
  onRegisteredSW(_url, r) {
    if (!r) return;
    setRegistration(r);
    void checkForUpdates();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    });
  },
});
setApplyUpdate(() => updateSW(true));
```
with `import { checkForUpdates, markUpdateReady, setApplyUpdate, setRegistration } from './platform/updates';`.
- [ ] **Step 6:** `npm run build`, then confirm `dist/sw.js` contains no `skipWaiting()` call on install (`node -e "const s=require('fs').readFileSync('dist/sw.js','utf8');console.log(/self\.skipWaiting\(\)/.test(s)&&!/SKIP_WAITING/.test(s))"` → `false`; the SKIP_WAITING message listener is expected). `npm run check` green.
- [ ] **Step 7:** commit `feat(updates): wait for Update now instead of switching versions automatically`.

---

### Task 3: Busy flag, set logger, UpdateBanner

**Files:** Create `src/ui/busy.ts`, `src/ui/overlays/UpdateBanner.tsx`, `src/ui/overlays/UpdateBanner.test.tsx`. Modify `src/ui/screens/TrainingScreen.tsx`, `src/ui/screens/TrainingScreen.test.tsx`, `src/App.tsx`.

**Produces:** `setBusy(reason: string, on: boolean)`, `isBusy()`, `useIsBusy()`, `resetBusyForTests()`; `<UpdateBanner />`.

- [ ] **Step 1: Failing tests** `src/ui/overlays/UpdateBanner.test.tsx`:
```tsx
// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { markUpdateReady, resetUpdatesForTests, setApplyUpdate } from '../../platform/updates';
import { resetBusyForTests, setBusy } from '../busy';
import { UpdateBanner } from './UpdateBanner';

afterEach(() => {
  resetUpdatesForTests();
  resetBusyForTests();
});

describe('UpdateBanner', () => {
  it('stays hidden until an update is ready', () => {
    render(<UpdateBanner />);
    expect(screen.queryByText('A new update is ready')).toBeNull();
    act(() => markUpdateReady());
    expect(screen.getByText('A new update is ready')).toBeTruthy();
  });

  it('does not interrupt an active workout: hidden while the set logger is open', () => {
    markUpdateReady();
    setBusy('set-logger', true);
    render(<UpdateBanner />);
    expect(screen.queryByText('A new update is ready')).toBeNull();
    act(() => setBusy('set-logger', false));
    expect(screen.getByText('A new update is ready')).toBeTruthy();
  });

  it('updates only when the player taps Update now', () => {
    const apply = vi.fn(async () => {});
    setApplyUpdate(apply);
    markUpdateReady();
    render(<UpdateBanner />);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(apply).toHaveBeenCalledOnce();
  });
});
```
Append to `src/ui/screens/TrainingScreen.test.tsx`:
```tsx
  it('marks the app busy while the set logger is open', async () => {
    render(<TrainingScreen />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^Push-up/ }))[0]!);
    await screen.findByLabelText('Reps');
    expect(isBusy()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(isBusy()).toBe(false);
  });
```
(import `isBusy` from `'../busy'`).
- [ ] **Step 2:** `npx vitest run src/ui/overlays/UpdateBanner.test.tsx src/ui/screens/TrainingScreen.test.tsx` → FAIL.
- [ ] **Step 3: Implement** `src/ui/busy.ts`:
```ts
import { useSyncExternalStore } from 'react';

/** Moments when the update banner must not appear. Today only the open set logger. */
const reasons = new Set<string>();
const listeners = new Set<() => void>();

export function setBusy(reason: string, on: boolean): void {
  const had = reasons.has(reason);
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  if (had !== on) listeners.forEach((l) => l());
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
```
`src/ui/overlays/UpdateBanner.tsx`:
```tsx
import { useState } from 'react';
import { applyUpdate, useUpdateReady } from '../../platform/updates';
import { Button } from '../components/Button';
import { useIsBusy } from '../busy';

export function UpdateBanner() {
  const ready = useUpdateReady();
  const busy = useIsBusy();
  const [applying, setApplying] = useState(false);
  if (!ready || busy) return null;
  return (
    <div role="status" className="safe-x fixed inset-x-0 z-30" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
      <div className="system-window mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm text-ink">A new update is ready</p>
        <Button
          disabled={applying}
          onClick={() => {
            setApplying(true);
            void applyUpdate();
          }}
        >
          Update now
        </Button>
      </div>
    </div>
  );
}
```
In `TrainingScreen.tsx` `ExerciseLogger`, before `const exercise = getExercise(exerciseId);` add:
```tsx
  useEffect(() => {
    setBusy('set-logger', true);
    return () => setBusy('set-logger', false);
  }, []);
```
(import `useEffect` from react and `setBusy` from `'../busy'`). In `App.tsx` render `<UpdateBanner />` right after `<TabBar … />` in the registered branch.
- [ ] **Step 4:** tests → PASS; `npm test` green.
- [ ] **Step 5:** commit `feat(updates): show an Update now banner that waits while logging sets`.

---

### Task 4: One-time What's New System window

**Files:** Create `src/ui/overlays/WhatsNewWindow.tsx`, `src/ui/overlays/WhatsNewWindow.test.tsx`. Modify `src/App.tsx`.

- [ ] **Step 1: Failing tests** `src/ui/overlays/WhatsNewWindow.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta, setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { WhatsNewWindow } from './WhatsNewWindow';

beforeEach(() => seedApp('2026-09-21'));

describe('WhatsNewWindow', () => {
  it('shows nothing to a new player', async () => {
    render(<WhatsNewWindow />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the changelog only once per version', async () => {
    await setMeta(db, 'lastSeenVersion', '1.1.0');
    const { unmount } = render(<WhatsNewWindow />);
    const dialog = await screen.findByRole('dialog', { name: 'What’s new' });
    expect(dialog.textContent).toContain('Version 1.2.0');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(async () => expect(await getMeta(db, 'lastSeenVersion')).toBe(__APP_VERSION__));
    unmount();
    render(<WhatsNewWindow />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('treats an install from before tracking as having seen 1.1.0', async () => {
    await db.meta.delete('lastSeenVersion');
    render(<WhatsNewWindow />);
    expect((await screen.findByRole('dialog')).textContent).toContain('Version 1.2.0');
  });

  it('waits while a level-up is pending', async () => {
    await setMeta(db, 'lastSeenVersion', '1.1.0');
    await setMeta(db, 'pendingEvents', [{ type: 'levelUp', fromLevel: 1, toLevel: 2, fromRank: 'E', toRank: 'E', statPointsGained: 3 }]);
    render(<WhatsNewWindow />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
    await setMeta(db, 'pendingEvents', []);
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
```
- [ ] **Step 2:** → FAIL (module not found).
- [ ] **Step 3: Implement** `src/ui/overlays/WhatsNewWindow.tsx`:
```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { CHANGELOG, PRE_TRACKING_VERSION, unseenEntries } from '../../data/changelog';
import { getMeta, setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import type { GameEvent } from '../../domain/types';
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';
import { Typewriter } from '../components/Typewriter';

/** Shown once after an update: every changelog entry newer than the last version the player saw. */
export function WhatsNewWindow() {
  const lastSeen = useLiveQuery(async () => (await getMeta(db, 'lastSeenVersion')) ?? PRE_TRACKING_VERSION, [], null);
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  if (lastSeen === null || events.length > 0) return null;
  const entries = unseenEntries(CHANGELOG, lastSeen);
  const newest = entries[0];
  if (!newest) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="What’s new" className="safe-x fixed inset-0 z-50 flex items-center justify-center bg-void/85">
      <SystemWindow title="System" className="max-h-[80dvh] w-full max-w-md overflow-y-auto">
        <Typewriter key={newest.version} text={`System update complete: Version ${newest.version}`} />
        {entries.map((entry) => (
          <div key={entry.version} className="mt-3">
            <p className="text-sm text-glow">
              Version {entry.version}
              {entry.title ? ` · ${entry.title}` : ''}
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
              {entry.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ))}
        <Button className="mt-4 w-full" onClick={() => void setMeta(db, 'lastSeenVersion', __APP_VERSION__)}>
          Close
        </Button>
      </SystemWindow>
    </div>
  );
}
```
In `App.tsx` render `<WhatsNewWindow />` after `<EventHost />` in the registered branch.
- [ ] **Step 4:** → PASS; `npm test` green.
- [ ] **Step 5:** commit `feat(updates): show What’s New once after each update`.

---

### Task 5: "Check for updates" in Settings, README, verify, release

**Files:** Modify `src/ui/screens/SettingsScreen.tsx`, `src/ui/screens/SettingsScreen.test.tsx`, `README.md`.

- [ ] **Step 1: Failing test** in `SettingsScreen.test.tsx`:
```tsx
  it('checks for updates and says so plainly', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check for updates' }));
    expect(await screen.findByText('Updates aren’t available here.')).toBeTruthy();
  });
```
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: Implement.** In `SettingsScreen.tsx` add
```tsx
const UPDATE_TEXT: Record<UpdateCheck, string> = {
  available: 'An update is ready — tap Update now.',
  none: 'You have the latest version.',
  offline: 'You’re offline — try again later.',
  unsupported: 'Updates aren’t available here.',
};
```
state `const [updateMessage, setUpdateMessage] = useState<string | null>(null); const [checking, setChecking] = useState(false);`, handler
```tsx
  async function checkUpdates() {
    setChecking(true);
    setUpdateMessage(UPDATE_TEXT[await checkForUpdates()]);
    setChecking(false);
  }
```
and, right above `<WhatsNew />`:
```tsx
      <SystemWindow title="Updates">
        <p className="text-sm">You’re on version {__APP_VERSION__}.</p>
        <Button variant="ghost" className="mt-3 w-full" disabled={checking} onClick={() => void checkUpdates()}>
          {checking ? 'Checking…' : 'Check for updates'}
        </Button>
        {updateMessage && <p role="status" className="mt-2 text-sm text-glow">{updateMessage}</p>}
      </SystemWindow>
```
(import `checkForUpdates, type UpdateCheck` from `'../../platform/updates'`). The button keeps the accessible name "Check for updates" while idle.
In `README.md` replace the sentence about updates downloading by themselves with: "When a new version is ready, a banner says **A new update is ready** — tap **Update now**. After it reloads, a System window shows what's new. You can also tap **Check for updates** in Settings."
- [ ] **Step 4:** → PASS.
- [ ] **Step 5: Verify.** `npm run check` → all green; `npm run e2e` → 7 passed, 1 skipped. Browser pane (mobile viewport): Settings shows "Updates" window with the version and the button; set `lastSeenVersion` to `1.1.0` via devtools-style `javascript_exec` on the meta store and reload → What's New window types out and closes with Close.
- [ ] **Step 6:** commit `feat(settings): add Check for updates` then ask the owner before pushing.
