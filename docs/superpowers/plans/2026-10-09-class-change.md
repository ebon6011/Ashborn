# Class Change (v1.7.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At level 10 the player completes a one-time Trial and picks one of 4 original classes (Ironclad, Galestrider, Bulwark, Wayfarer). The class reshapes the daily quest mix (+30% focus, −10% others), gives +10% XP on side quests for its stat, and can be changed every 30 days.

**Architecture:**
- The class catalogue is in `src/config/classes.ts`, and the numbers in `progression.classes`.
- Pure rules live in `src/domain/classes.ts`; the quest mix lives in `generateDailyItems`.
- Dexie v4 adds 3 player fields, and the Trial's progress goes in meta (`classTrial`).
- Repo functions (`ensureTrial`, `setTrialProgress`, `chooseClass`) are in `src/db/repo/classes.ts`.
- UI: a class icon and button on Status, `ClassScreen`, a shared `ClassPicker`, a Trial card on Quests, and a `classChoice` event overlay.

**Tech Stack:** Vite 7 + React 19 + TS + Tailwind 4 + Dexie + Vitest (jsdom for UI) + Playwright WebKit (iPhone 15).

**Spec:** `docs/superpowers/specs/2026-10-09-class-change-design.md`

## Global Constraints

- **Never lose user data.**
  - Dexie `version(4)` plus `backupMigrations[4]`, `SCHEMA_VERSION = 4`.
  - Shipped version blocks are never edited.
  - The upgrade is tested with a real v3 player row.
- **Balance numbers** live only in `src/config/progression.ts` → `classes`: `unlockLevel: 10`, `changeCooldownDays: 30`, `trialScale: 1.5`, `focusBoost: 0.3`, `otherCut: 0.1`, `sideQuestXpBonus: 0.1`.
- **No class or `wayfarer`** gives a daily quest identical to v1.6.0.
- **Class ids are stable:** `ironclad`, `galestrider`, `bulwark`, `wayfarer`. Names and icons are original.
- **Sound only after a tap.** The `classChoice` overlay and the Trial card play nothing on show.
- **iPhone:** 44 px targets, safe areas, 16 px inputs.
- **No new packages.** Release 1.7.0 with a plain-words changelog entry.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Files are LF.** When editing with Python, open files with `newline=''`.
- **Commands:**
  - `npx vitest run <path>` runs one test file.
  - `npm run check` runs typecheck, lint, test and build.
  - `npm run e2e` runs Playwright WebKit.

## Review Focus

1. **Changing class on the first day vs inside the cooldown, and choosing the same class again.** The first pick is allowed straight after the Trial, day 29 is refused, day 30 is allowed, and choosing the same class restarts the timer. Pinned in Task 1 and Task 3.
2. **A player already above level 10 when the update installs.** The Trial must appear on the first `startDay`, not only after the next level-up. Pinned in Task 3.
3. **Levelling up to 10 mid-day** (from daily XP or a Boss reward). The Trial appears straight away, and only once. Pinned in Task 3.
4. **The Trial's XP itself causing a level-up**, or finishing the Trial twice (a double tap). XP and the `classChoice` event happen exactly once, and the Trial doesn't come back. Pinned in Task 3.
5. **A backup that sets `classId` without `classChosenAt`, an unknown class, or `trialDone` that isn't a boolean.** It is rejected. Pinned in Task 2.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/config/classes.ts` | create | `ClassDef`, `CLASSES`, `CLASS_IDS`, `getClass` |
| `src/config/progression.ts` | modify | `classes` block |
| `src/domain/classes.ts` (+test) | create | `classMultiplier`, `canChangeClass`, `daysUntilClassChange`, `trialAvailable`, `trialItems`, `sideQuestXp` |
| `src/domain/quests/daily.ts` (+test) | modify | `generateDailyItems`/`createDayRecord` take `classId` |
| `src/domain/types.ts` | modify | `ClassId`, Player fields, `QuestKind 'trial'`, `classChoice` event |
| `src/domain/stats.ts`, `src/db/schema.ts`, `src/domain/migrations.ts`, `src/domain/validate.ts`, `src/db/meta.ts` (+tests) | modify | v4 data, backups, `classTrial` meta |
| `src/db/repo/classes.ts` (+test) | create | `ensureTrial`, `setTrialProgress`, `chooseClass` |
| `src/db/repo/days.ts`, `src/db/repo/player.ts`, `src/db/repo/sideQuests.ts` | modify | Class in daily quests; Trial on level-up and daily reset; side-quest bonus |
| `src/ui/components/classIcons.ts`, `src/ui/components/ClassIcon.tsx`, `src/ui/components/ClassPicker.tsx` (+test) | create | Icons; picker |
| `src/ui/screens/ClassScreen.tsx` (+test), `src/ui/screens/StatusScreen.tsx` (+test) | create/modify | Class page; class line and Class button |
| `src/ui/screens/QuestsScreen.tsx` (+test) | modify | Trial card; `QuestItemRow` reuse |
| `src/ui/overlays/ClassChoiceOverlay.tsx`, `src/ui/overlays/EventHost.tsx` (+test) | create/modify | `classChoice` event |
| `e2e/class.spec.ts` | create | WebKit flow |
| `package.json`, `package-lock.json`, `src/data/changelog.ts`, `docs/credits.md` | modify | Release |

---

### Task 1: Classes config, pure rules, and the daily quest mix

**Files:**
- Create: `src/config/classes.ts`, `src/domain/classes.ts`, `src/domain/classes.test.ts`
- Modify:
  - `src/config/progression.ts` (interface and values)
  - `src/domain/types.ts` (add `ClassId`)
  - `src/domain/quests/daily.ts` (`generateDailyItems`, `createDayRecord`)
- Test: `src/domain/quests/daily.test.ts`

**Interfaces:**
- Produces:
  - `type ClassId = 'ironclad' | 'galestrider' | 'bulwark' | 'wayfarer'` in `types.ts`
  - `ClassDef { id: ClassId; name: string; tagline: string; stat: StatKey; focus: QuestItemKind | null }`
  - `CLASSES`, `CLASS_IDS`, `getClass(id: string | null): ClassDef | undefined`
  - `classMultiplier(classId: ClassId | null, kind: QuestItemKind): number`
  - `trialAvailable(p: { level: number; trialDone: boolean }): boolean`
  - `canChangeClass(p: { trialDone: boolean; classId: ClassId | null; classChosenAt: string | null }, today: string): boolean`
  - `daysUntilClassChange(p, today): number` (0 when allowed)
  - `sideQuestXp(base: number, stat: StatKey, classId: ClassId | null): number`
  - `trialItems(experience: Experience, level: number): QuestItem[]`
  - `generateDailyItems(experience, level, reference, classId: ClassId | null = null)`
  - `createDayRecord(date, experience, level, reference, classId: ClassId | null = null)`

- [ ] **Step 1: Write the failing tests** `src/domain/classes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CLASSES, CLASS_IDS, getClass } from '../config/classes';
import { canChangeClass, classMultiplier, daysUntilClassChange, sideQuestXp, trialAvailable, trialItems } from './classes';
import { generateDailyItems } from './quests/daily';

const chosen = (classChosenAt: string) => ({ trialDone: true, classId: 'ironclad' as const, classChosenAt });

describe('classes', () => {
  it('has 4 original classes with stable ids, stats and focus', () => {
    expect(CLASS_IDS).toEqual(['ironclad', 'galestrider', 'bulwark', 'wayfarer']);
    expect(CLASSES.map((c) => [c.id, c.stat, c.focus])).toEqual([
      ['ironclad', 'strength', 'pushups'], ['galestrider', 'agility', 'cardio'],
      ['bulwark', 'endurance', 'squats'], ['wayfarer', 'discipline', null],
    ]);
    expect(getClass('bulwark')?.name).toBe('Bulwark');
    expect(getClass(null)).toBeUndefined();
  });

  it('boosts the focus item 30 % and trims the others 10 %; Wayfarer and no class change nothing', () => {
    expect(classMultiplier('ironclad', 'pushups')).toBeCloseTo(1.3);
    expect(classMultiplier('ironclad', 'cardio')).toBeCloseTo(0.9);
    expect(classMultiplier('wayfarer', 'pushups')).toBe(1);
    expect(classMultiplier(null, 'squats')).toBe(1);
  });

  it('the Trial unlocks at level 10, once', () => {
    expect(trialAvailable({ level: 9, trialDone: false })).toBe(false);
    expect(trialAvailable({ level: 10, trialDone: false })).toBe(true);
    expect(trialAvailable({ level: 40, trialDone: true })).toBe(false);
  });

  it('cooldown: first pick right after the Trial, day 29 refused, day 30 allowed', () => {
    expect(canChangeClass({ trialDone: false, classId: null, classChosenAt: null }, '2026-10-09')).toBe(false);
    expect(canChangeClass({ trialDone: true, classId: null, classChosenAt: null }, '2026-10-09')).toBe(true);
    expect(canChangeClass(chosen('2026-10-01'), '2026-10-30')).toBe(false);
    expect(daysUntilClassChange(chosen('2026-10-01'), '2026-10-30')).toBe(1);
    expect(canChangeClass(chosen('2026-10-01'), '2026-10-31')).toBe(true);
    expect(daysUntilClassChange(chosen('2026-10-01'), '2026-10-31')).toBe(0);
  });

  it('+10 % side-quest XP only for the class’s stat', () => {
    expect(sideQuestXp(20, 'strength', 'ironclad')).toBe(22);
    expect(sideQuestXp(20, 'agility', 'ironclad')).toBe(20);
    expect(sideQuestXp(20, 'strength', null)).toBe(20);
    expect(sideQuestXp(15, 'discipline', 'wayfarer')).toBe(17); // 16.5 rounds to 17
  });

  it('Trial items are the daily items at 1.5×, uncapped and unboosted', () => {
    const daily = generateDailyItems('beginner', 10, null);
    const trial = trialItems('beginner', 10);
    expect(trial.map((i) => i.id)).toEqual(daily.map((i) => i.id));
    trial.forEach((t, i) => expect(t.target).toBe(Math.max(1, Math.round(daily[i]!.target * 1.5))));
    expect(trial.every((t) => t.progress === 0)).toBe(true);
  });
});
```

Append to `src/domain/quests/daily.test.ts`, inside its top-level `describe` or as a new one. Read the file first for its imports.

```ts
describe('class quest mix', () => {
  it('no class and Wayfarer are identical to the v1.6.0 quest', () => {
    const base = generateDailyItems('beginner', 12, null);
    expect(generateDailyItems('beginner', 12, null, null)).toEqual(base);
    expect(generateDailyItems('beginner', 12, null, 'wayfarer')).toEqual(base);
  });

  it.each([
    ['ironclad', 'pushups'], ['galestrider', 'cardio'], ['bulwark', 'squats'],
  ] as const)('%s raises %s and trims the rest', (classId, focus) => {
    const base = generateDailyItems('intermediate', 12, null);
    const mixed = generateDailyItems('intermediate', 12, null, classId);
    mixed.forEach((item, i) => {
      const expected = Math.max(1, Math.round(base[i]!.target * (item.id === focus ? 1.3 : 0.9)));
      expect(item.target).toBe(expected);
    });
  });

  it('the weekly growth cap still limits a boosted item', () => {
    const reference = generateDailyItems('beginner', 12, null);
    const mixed = generateDailyItems('beginner', 12, reference, 'ironclad');
    const push = mixed.find((i) => i.id === 'pushups')!;
    const before = reference.find((i) => i.id === 'pushups')!;
    expect(push.target).toBe(before.target + Math.max(1, Math.floor(before.target * 0.1)));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/classes.test.ts src/domain/quests/daily.test.ts`
Expected: FAIL. `../config/classes` is unresolved, and `generateDailyItems` ignores its 4th argument.

- [ ] **Step 3: Implement**

`src/domain/types.ts`: add `export type ClassId = 'ironclad' | 'galestrider' | 'bulwark' | 'wayfarer';` near `QuestItemKind`.

`src/config/progression.ts`: add to the interface, after `items`:

```ts
  classes: {
    /** Level at which the Class Change Trial unlocks. */
    unlockLevel: number;
    /** Days between class choices. */
    changeCooldownDays: number;
    /** Trial targets = daily targets × this. */
    trialScale: number;
    /** Daily target change for the class's focus item (+) and the other items (−). */
    focusBoost: number;
    otherCut: number;
    /** Extra XP share on side quests for the class's stat. */
    sideQuestXpBonus: number;
  };
```

Add to the values, after `items: {…},`:

```ts
  classes: {
    unlockLevel: 10,
    changeCooldownDays: 30,
    trialScale: 1.5,
    focusBoost: 0.3,
    otherCut: 0.1,
    sideQuestXpBonus: 0.1,
  },
```

`src/config/classes.ts`:

```ts
import type { ClassId, QuestItemKind, StatKey } from '../domain/types';

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  /** Side quests for this stat earn the class XP bonus. */
  stat: StatKey;
  /** Daily quest item that gets the focus boost; null = balanced. */
  focus: QuestItemKind | null;
}

/** Original classes, made for Ashborn. Ids are stored on phones and in backups: never rename one. */
export const CLASSES: readonly ClassDef[] = [
  { id: 'ironclad', name: 'Ironclad', tagline: 'The strength class', stat: 'strength', focus: 'pushups' },
  { id: 'galestrider', name: 'Galestrider', tagline: 'The speed class', stat: 'agility', focus: 'cardio' },
  { id: 'bulwark', name: 'Bulwark', tagline: 'The endurance class', stat: 'endurance', focus: 'squats' },
  { id: 'wayfarer', name: 'Wayfarer', tagline: 'The balanced class', stat: 'discipline', focus: null },
];

export const CLASS_IDS: readonly ClassId[] = CLASSES.map((c) => c.id);

export function getClass(id: string | null): ClassDef | undefined {
  return id === null ? undefined : CLASSES.find((c) => c.id === id);
}
```

`src/domain/classes.ts`:

```ts
import { getClass } from '../config/classes';
import { progression } from '../config/progression';
import { daysBetween } from './day';
import { generateDailyItems } from './quests/daily';
import type { ClassId, Experience, QuestItem, QuestItemKind, StatKey } from './types';

const cfg = progression.classes;

/** Daily-target multiplier for one quest item under a class (1 when no class or balanced). */
export function classMultiplier(classId: ClassId | null, kind: QuestItemKind): number {
  const focus = getClass(classId)?.focus ?? null;
  if (focus === null) return 1;
  return kind === focus ? 1 + cfg.focusBoost : 1 - cfg.otherCut;
}

export function trialAvailable(p: { level: number; trialDone: boolean }): boolean {
  return p.level >= cfg.unlockLevel && !p.trialDone;
}

type ClassState = { trialDone: boolean; classId: ClassId | null; classChosenAt: string | null };

/** 0 when a class may be chosen now. */
export function daysUntilClassChange(p: ClassState, today: string): number {
  if (p.classId === null || p.classChosenAt === null) return 0;
  return Math.max(0, cfg.changeCooldownDays - daysBetween(p.classChosenAt, today));
}

export function canChangeClass(p: ClassState, today: string): boolean {
  return p.trialDone && daysUntilClassChange(p, today) === 0;
}

export function sideQuestXp(base: number, stat: StatKey, classId: ClassId | null): number {
  return getClass(classId)?.stat === stat ? Math.round(base * (1 + cfg.sideQuestXpBonus)) : base;
}

/** The Class Change Trial: the player's daily items at trialScale×, no class, no growth cap. */
export function trialItems(experience: Experience, level: number): QuestItem[] {
  return generateDailyItems(experience, level, null).map((item) => ({
    ...item,
    target: Math.max(1, Math.round(item.target * cfg.trialScale)),
    progress: 0,
  }));
}
```

`src/domain/quests/daily.ts`:
- Import `classMultiplier` from `../classes`, and `ClassId` with the other types.
- Change the signature to `generateDailyItems(experience: Experience, level: number, reference: QuestItem[] | null, classId: ClassId | null = null)`.
- Replace `let target = Math.max(1, Math.round(tier.target * scale));` with:

  ```ts
      const base = Math.max(1, Math.round(tier.target * scale));
      let target = Math.max(1, Math.round(base * classMultiplier(classId, tier.kind)));
  ```

- `createDayRecord(date, experience, level, reference, classId: ClassId | null = null)` passes `classId` to `generateDailyItems`.

`src/domain/classes.ts` imports `generateDailyItems` from `./quests/daily`, and `daily.ts` imports `classMultiplier` from `../classes`. This is a function-only import cycle, which is safe in ESM. If Vitest reports `generateDailyItems is not a function` at load, move `classMultiplier` into `src/domain/quests/daily.ts` and re-export it from `classes.ts`. Ledger that ruling.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/classes.test.ts src/domain/quests/daily.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/config src/domain
git commit -m "feat(class): four original classes, class rules and the class quest mix"
```

---

### Task 2: Saved data v4 and backups

**Files:**
- Modify:
  - `src/domain/types.ts`: Player fields, `QuestKind` adds `'trial'`, `GameEvent` adds `{ type: 'classChoice' }`
  - `src/domain/stats.ts`: `initialPlayer`
  - `src/db/schema.ts`: `version(4)`
  - `src/domain/migrations.ts`: `SCHEMA_VERSION`, `backupMigrations[4]`
  - `src/domain/validate.ts`: player and questLog
  - `src/db/meta.ts`: `classTrial`
  - `src/ui/overlays/EventHost.tsx`: bridge
- Test: `src/db/schema.test.ts`, `src/domain/migrations.test.ts`, `src/domain/backup.test.ts`, `src/db/backup.test.ts`

**Interfaces:**
- Produces:
  - `Player.classId: ClassId | null`, `Player.classChosenAt: string | null`, `Player.trialDone: boolean`
  - `MetaMap.classTrial: { items: QuestItem[]; createdAt: string }`
  - `QuestKind` adds `'trial'`
  - `GameEvent` adds `{ type: 'classChoice' }`

- [ ] **Step 1: Write the failing tests**

`src/db/schema.test.ts`: append this. It follows the v2→v3 test already in the file.

```ts
  it('upgrades a version 3 (v1.6.0) database to version 4 without losing anything', async () => {
    const name = `v3-${crypto.randomUUID()}`;
    const v3 = new Dexie(name);
    v3.version(1).stores(STORES_V1);
    v3.version(2).stores(STORES_V2);
    v3.version(3).stores(STORES_V3);
    const data = sampleBackupData() as unknown as Record<string, unknown[]>;
    const { classId: _c, classChosenAt: _a, trialDone: _d, ...oldPlayer } = { ...(data.player![0] as Record<string, unknown>), level: 14, streak: 9, themeId: 'theme-ember', shields: 1 };
    void [_c, _a, _d];
    const inventory = [{ itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' }];
    for (const table of Object.keys(STORES_V3)) {
      await v3.table(table).bulkPut(table === 'player' ? [oldPlayer] : table === 'inventory' ? inventory : data[table]!);
    }
    v3.close();

    const v4 = new AshbornDB(name);
    await v4.open();
    expect(v4.verno).toBe(4);
    expect(await v4.player.get(1)).toEqual({ ...oldPlayer, classId: null, classChosenAt: null, trialDone: false });
    expect(await v4.inventory.toArray()).toEqual(inventory);
    for (const table of Object.keys(STORES_V3)) if (table !== 'player' && table !== 'inventory') expect(await v4.table(table).toArray()).toEqual(data[table]);
    v4.close();
  });
```

Change the earlier latest-version assertions to `.toBe(4)` (two places: the v1 test's `verno`, and the v2→v3 test's `verno`). **Ruling:** the app now opens at v4.

The v2→v3 test's player-row equality must now also include `classId: null, classChosenAt: null, trialDone: false`. Change it to `toEqual({ ...oldPlayer, themeId: null, frameId: null, shields: 0, classId: null, classChosenAt: null, trialDone: false })`.

`src/domain/migrations.test.ts`: move `expect(SCHEMA_VERSION).toBe(3)` out of the step-3 test and add:

```ts
  it('step 4 adds the class fields with safe defaults, keeping existing values', () => {
    expect(SCHEMA_VERSION).toBe(4);
    expect(backupMigrations[4]!({ player: [{ id: 1, level: 12 }] })).toEqual({
      player: [{ id: 1, level: 12, classId: null, classChosenAt: null, trialDone: false }],
    });
    expect(backupMigrations[4]!({ player: [{ id: 1, classId: 'bulwark', classChosenAt: '2026-10-01', trialDone: true }] })).toEqual({
      player: [{ id: 1, classId: 'bulwark', classChosenAt: '2026-10-01', trialDone: true }],
    });
  });
```

`src/domain/backup.test.ts`: add inside `describe('inventory in backups (v3)')`, or in a new `describe('class in backups (v4)')`:

```ts
  it('accepts a chosen class; rejects unknown classes, a class without a date, and a non-boolean trialDone', () => {
    const base = sampleBackupData();
    const make = (player: object) => parseBackup(text(buildBackup({ ...base, player: [{ ...base.player[0]!, ...player }] }, NOW)));
    expect(make({ classId: 'bulwark', classChosenAt: '2026-10-01', trialDone: true }).ok).toBe(true);
    expect(make({ classId: 'samurai', classChosenAt: '2026-10-01', trialDone: true }).ok).toBe(false);
    expect(make({ classId: 'bulwark', classChosenAt: null, trialDone: true }).ok).toBe(false);
    expect(make({ trialDone: 'yes' }).ok).toBe(false);
  });

  it('imports a v3 (v1.6.0) backup with no class yet', () => {
    const data = sampleBackupData() as unknown as Record<string, unknown[]>;
    const { classId: _c, classChosenAt: _a, trialDone: _d, ...oldPlayer } = data.player![0] as Record<string, unknown>;
    void [_c, _a, _d];
    const result = parseBackup(text({ app: 'ashborn', schemaVersion: 3, exportedAt: '', data: { ...data, player: [oldPlayer] } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.player[0]).toMatchObject({ classId: null, classChosenAt: null, trialDone: false });
  });
```

`src/db/backup.test.ts`: append inside `describe('database backup')`:

```ts
  it('round trip keeps the class, its date, the Trial flag, Trial progress and a trial XP entry', async () => {
    const database = await setupPlayer('2026-10-05');
    await database.player.update(1, { level: 12, classId: 'galestrider', classChosenAt: '2026-10-01', trialDone: true });
    await setMeta(database, 'classTrial', { items: [{ id: 'pushups', label: 'Push-ups', easier: 'Knee push-ups', target: 30, unit: 'reps', progress: 12 }], createdAt: '2026-10-05' });
    await database.questLog.add({ date: '2026-10-05', kind: 'trial', refId: 'class-trial', xp: 120, at: '2026-10-05T18:00:00.000Z' });
    const first = await exportData(database);
    const parsed = parseBackup(JSON.stringify(buildBackup(first, new Date('2026-10-06T08:00:00Z'))));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const other = freshDb();
    await importData(other, parsed.backup.data);
    expect(await exportData(other)).toEqual(first);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/db/schema.test.ts src/domain/migrations.test.ts src/domain/backup.test.ts src/db/backup.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/domain/types.ts`:
- In `Player`, after `shields: number;`:

  ```ts
    /** Chosen class; null until the player picks one. */
    classId: ClassId | null;
    /** Date key of the last class choice (starts the change cooldown). */
    classChosenAt: string | null;
    /** The one-time Class Change Trial is finished. */
    trialDone: boolean;
  ```

- `QuestKind` becomes `'daily' | 'penalty' | 'urgent' | 'side' | 'boss' | 'trial'`.
- Add `| { type: 'classChoice' }` to `GameEvent`.

`src/domain/stats.ts` `initialPlayer()`: after `shields: 0,`, add `classId: null, classChosenAt: null, trialDone: false,`.

`src/db/schema.ts`: after the v3 block, add:

```ts
    // v4: the player gains a class (none yet), its choice date and the Trial flag (matches backupMigrations[4]).
    this.version(4)
      .stores(STORES_V3)
      .upgrade((tx) =>
        tx.table('player').toCollection().modify((p: Record<string, unknown>) => {
          p.classId = p.classId ?? null;
          p.classChosenAt = p.classChosenAt ?? null;
          p.trialDone = p.trialDone ?? false;
        }),
      );
```

`src/domain/migrations.ts`: set `SCHEMA_VERSION = 4` and add:

```ts
  // v4 adds the player's class, its choice date and the Trial flag (same as the Dexie version 4 block).
  4: (data) => ({
    ...data,
    player: (Array.isArray(data.player) ? data.player : []).map((p) =>
      typeof p === 'object' && p !== null ? { classId: null, classChosenAt: null, trialDone: false, ...(p as Record<string, unknown>) } : p,
    ),
  }),
```

`src/domain/validate.ts`:
- Import `CLASS_IDS` from `../config/classes`.
- Player: add `classId: nullable(oneOf(...CLASS_IDS)), classChosenAt: nullable(isDateKey), trialDone: bool` to the shape. Wrap the player check as `both(shape({...}), (v) => isRecord(v) && (v.classId === null || v.classChosenAt !== null))`.
- questLog `kind`: add `'trial'` to `oneOf(...)`.

`src/db/meta.ts`:
- Import `QuestItem` with `GameEvent`.
- Add to `MetaMap`:

  ```ts
    /** The Class Change Trial in progress (removed when finished). */
    classTrial: { items: QuestItem[]; createdAt: string };
  ```

`src/ui/overlays/EventHost.tsx`: before the final `return (`, add `if (event.type === 'classChoice') return null; // routed in Task 5`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/db/schema.test.ts src/domain/migrations.test.ts src/domain/backup.test.ts src/db/backup.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation check.** Remove the `.upgrade(…)` from `version(4)`, run `npx vitest run src/db/schema.test.ts`, and expect the v3→v4 test to FAIL. Restore it and expect PASS.

- [ ] **Step 6: Run the full check**

Run: `npm run check`
Expected: exit 0. If some test builds a `Player` literally, add the 3 defaults to it. Never loosen a validator.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat(class): saved data v4 — class, choice date and Trial flag, backups included"
```

---

### Task 3: Trial, choosing a class, side-quest bonus, class in daily quests

**Files:**
- Create: `src/db/repo/classes.ts`, `src/db/repo/classes.test.ts`
- Modify:
  - `src/db/repo/days.ts` (`startDay` passes the class, calls `ensureTrial`)
  - `src/db/repo/player.ts` (`awardXp` calls `ensureTrial` after a level-up)
  - `src/db/repo/sideQuests.ts` (bonus XP)

**Interfaces:**
- Consumes: `trialAvailable`, `trialItems`, `canChangeClass`, `daysUntilClassChange`, `sideQuestXp` (Task 1); the player fields and `classTrial` meta (Task 2).
- Produces:
  - `ensureTrial(database, date: string): Promise<void>`
  - `setTrialProgress(database, itemId: string, progress: number, now: Date): Promise<void>`
  - `chooseClass(database, classId: ClassId, now: Date): Promise<void>`

- [ ] **Step 1: Write the failing tests** `src/db/repo/classes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { progression } from '../../config/progression';
import { generateDailyItems } from '../../domain/quests/daily';
import { xpToNext } from '../../domain/xp';
import { neverUrgent, setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { getMeta } from '../meta';
import type { AshbornDB } from '../schema';
import { chooseClass, ensureTrial, setTrialProgress } from './classes';
import { awardXp } from './player';
import { completeSideQuest, createSideQuest } from './sideQuests';
import { startDay } from './days';

const events = async (db: AshbornDB) => (await getMeta(db, 'pendingEvents')) ?? [];
async function finishTrial(db: AshbornDB, date: string) {
  for (const item of (await getMeta(db, 'classTrial'))!.items) await setTrialProgress(db, item.id, item.target, at(date));
}

describe('the Class Change Trial', () => {
  it('is not offered below level 10', async () => {
    const db = await setupPlayer('2026-10-05');
    await ensureTrial(db, '2026-10-05');
    expect(await getMeta(db, 'classTrial')).toBeUndefined();
  });

  it('appears on the first daily reset for a player already past level 10', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { level: 14 });
    await startDay(db, at('2026-10-06'), neverUrgent);
    const trial = (await getMeta(db, 'classTrial'))!;
    expect(trial.createdAt).toBe('2026-10-06');
    const daily = generateDailyItems('beginner', 14, null);
    trial.items.forEach((t, i) => expect(t.target).toBe(Math.max(1, Math.round(daily[i]!.target * 1.5))));
  });

  it('appears the moment you level up to 10, only once', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { level: 9, xp: xpToNext(9) - 1 });
    await awardXp(db, { amount: 5, kind: 'side', refId: '1', date: '2026-10-05', countsAsQuest: false }, at('2026-10-05'));
    const first = await getMeta(db, 'classTrial');
    expect(first).toBeTruthy();
    await setTrialProgress(db, first!.items[0]!.id, 3, at('2026-10-05'));
    await ensureTrial(db, '2026-10-06');
    expect((await getMeta(db, 'classTrial'))!.items[0]!.progress).toBe(3); // kept, not regenerated
  });

  it('finishing it rewards once: XP, Boss damage, trialDone and the class choice', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { level: 10 });
    await ensureTrial(db, '2026-10-05');
    const hpBefore = (await db.bosses.get('2026-10-05'))!.hp;
    await finishTrial(db, '2026-10-05');
    const player = (await db.player.get(1))!;
    expect(player.trialDone).toBe(true);
    expect(await getMeta(db, 'classTrial')).toBeUndefined();
    const trialXp = (await db.questLog.toArray()).filter((e) => e.kind === 'trial');
    expect(trialXp).toHaveLength(1);
    expect(trialXp[0]!.xp).toBe(progression.dailyQuest.baseXp + progression.dailyQuest.xpPerLevel * 10);
    expect((await db.bosses.get('2026-10-05'))!.hp).toBeLessThan(hpBefore);
    expect((await events(db)).filter((e) => e.type === 'classChoice')).toHaveLength(1);

    await setTrialProgress(db, 'pushups', 999, at('2026-10-05')); // a late double tap does nothing
    await ensureTrial(db, '2026-10-06');
    expect(await getMeta(db, 'classTrial')).toBeUndefined();
    expect((await db.questLog.toArray()).filter((e) => e.kind === 'trial')).toHaveLength(1);
  });
});

describe('choosing a class', () => {
  it('needs the Trial, then enforces the 30-day cooldown', async () => {
    const db = await setupPlayer('2026-10-01');
    await expect(chooseClass(db, 'ironclad', at('2026-10-01'))).rejects.toThrow('Finish the Class Change Trial first.');
    await db.player.update(1, { trialDone: true });
    await chooseClass(db, 'ironclad', at('2026-10-01'));
    expect(await db.player.get(1)).toMatchObject({ classId: 'ironclad', classChosenAt: '2026-10-01' });
    await expect(chooseClass(db, 'bulwark', at('2026-10-30'))).rejects.toThrow('You can change class in 1 day.');
    await expect(chooseClass(db, 'bulwark', at('2026-10-20'))).rejects.toThrow('You can change class in 11 days.');
    await chooseClass(db, 'bulwark', at('2026-10-31'));
    expect(await db.player.get(1)).toMatchObject({ classId: 'bulwark', classChosenAt: '2026-10-31' });
  });

  it('shapes the next daily quest, not today’s', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { trialDone: true }); // level 1, so the weekly cap still lets the focus item grow
    const today = (await db.days.get('2026-10-05'))!.items;
    await chooseClass(db, 'galestrider', at('2026-10-05'));
    expect((await db.days.get('2026-10-05'))!.items).toEqual(today);
    await startDay(db, at('2026-10-06'), neverUrgent);
    const tomorrow = (await db.days.get('2026-10-06'))!.items;
    const plain = generateDailyItems('beginner', 1, today);
    const cardio = (items: typeof tomorrow) => items.find((i) => i.id === 'cardio')!.target;
    const push = (items: typeof tomorrow) => items.find((i) => i.id === 'pushups')!.target;
    expect(cardio(tomorrow)).toBeGreaterThan(cardio(plain));
    expect(push(tomorrow)).toBeLessThan(push(plain));
  });

  it('gives +10 % XP on side quests for the class’s stat only', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { trialDone: true, classId: 'ironclad', classChosenAt: '2026-10-05' });
    const strong = await createSideQuest(db, { title: 'Carry groceries', xp: 20, stat: 'strength' });
    const quick = await createSideQuest(db, { title: 'Stairs', xp: 20, stat: 'agility' });
    await completeSideQuest(db, strong, at('2026-10-05'));
    await completeSideQuest(db, quick, at('2026-10-05'));
    const side = (await db.questLog.toArray()).filter((e) => e.kind === 'side').map((e) => e.xp);
    expect(side).toEqual([22, 20]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/db/repo/classes.test.ts`
Expected: FAIL, because it cannot resolve `./classes`.

- [ ] **Step 3: Implement `src/db/repo/classes.ts`**

```ts
import { getClass } from '../../config/classes';
import { progression } from '../../config/progression';
import { canChangeClass, daysUntilClassChange, trialAvailable, trialItems } from '../../domain/classes';
import { todayKey } from '../../domain/day';
import { dailyQuestXp } from '../../domain/quests/daily';
import type { ClassId } from '../../domain/types';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';
import { dealBossDamage } from './boss';
import { awardXp, pushEvents } from './player';

/** Creates the Class Change Trial once the player qualifies. Never replaces one in progress. */
export async function ensureTrial(database: AshbornDB, date: string): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    const profile = await database.profile.get(1);
    if (!player || !profile || !trialAvailable(player)) return;
    if (await getMeta(database, 'classTrial')) return;
    await setMeta(database, 'classTrial', { items: trialItems(profile.experience, player.level), createdAt: date });
  });
}

/** Logs Trial progress; finishing every item rewards the Trial exactly once. */
export async function setTrialProgress(database: AshbornDB, itemId: string, progress: number, now: Date): Promise<void> {
  const date = todayKey(now);
  await writeTx(database, async () => {
    const trial = await getMeta(database, 'classTrial');
    const player = await database.player.get(1);
    if (!trial || !player || player.trialDone) return;
    const value = Number.isFinite(progress) ? Math.min(100_000, Math.max(0, Math.floor(progress))) : 0;
    const items = trial.items.map((item) => (item.id === itemId ? { ...item, progress: value } : item));
    if (!items.every((item) => item.progress >= item.target)) {
      await setMeta(database, 'classTrial', { ...trial, items });
      return;
    }
    // Mark done first, so a level-up from the Trial's own XP cannot re-create it.
    await database.player.update(1, { trialDone: true });
    await database.meta.delete('classTrial');
    await awardXp(database, { amount: dailyQuestXp(player.level), kind: 'trial', refId: 'class-trial', date, countsAsQuest: true }, now);
    await dealBossDamage(database, { base: progression.boss.sessionDamage, category: null, date }, now);
    await pushEvents(database, [{ type: 'classChoice' }]);
  });
}

export async function chooseClass(database: AshbornDB, classId: ClassId, now: Date): Promise<void> {
  const today = todayKey(now);
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) throw new Error('Player not registered.');
    if (!getClass(classId)) throw new Error('Unknown class.');
    if (!player.trialDone) throw new Error('Finish the Class Change Trial first.');
    if (!canChangeClass(player, today)) {
      const n = daysUntilClassChange(player, today);
      throw new Error(`You can change class in ${n} ${n === 1 ? 'day' : 'days'}.`);
    }
    await database.player.update(1, { classId, classChosenAt: today });
  });
}
```

`src/db/repo/days.ts` `startDay`:
- Pass the class: `createDayRecord(current, profile.experience, player.level, await referenceItems(database, current), player.classId)`.
- After the `ensureWeekBoss(...)` line, add `await ensureTrial(database, current);`.
- Import `ensureTrial` from `./classes`.

`src/db/repo/player.ts` `awardXp`: after `if (levelUp) await pushEvents(...)`, add `if (levelUp) await ensureTrial(database, award.date);`. Import `ensureTrial` from `./classes`.

This creates a function-level import cycle (`classes` → `player` → `classes`), which is safe in ESM because both are only called at runtime.

`src/db/repo/sideQuests.ts` `completeSideQuest`: replace `amount: quest.xp` with `amount: sideQuestXp(quest.xp, quest.stat, player.classId)`. Import `sideQuestXp` from `../../domain/classes`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/db/repo/classes.test.ts`
Expected: PASS. If the "level up to 10" test sees no Trial because `setupPlayer`'s profile experience doesn't match `'beginner'`, check `sampleProfileInput.experience` in `src/test/fixtures.ts` and use it in the `generateDailyItems` expectations. Ledger it.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0. Existing tests that compare exact `pendingEvents` after levelling past 10 are unaffected, because the Trial isn't an event, only meta.

- [ ] **Step 6: Commit**

```bash
git add src/db/repo
git commit -m "feat(class): the Class Change Trial, choosing a class with a 30-day cooldown, side-quest bonus"
```

---

### Task 4: Class icons, picker, Class screen, and the Status card

**Files:**
- Create:
  - `src/ui/components/classIcons.ts`, `src/ui/components/ClassIcon.tsx`
  - `src/ui/components/ClassPicker.tsx`, `src/ui/components/ClassPicker.test.tsx`
  - `src/ui/screens/ClassScreen.tsx`, `src/ui/screens/ClassScreen.test.tsx`
- Modify: `src/ui/screens/StatusScreen.tsx` (class line, Class button, `showClass`)
- Test: `src/ui/screens/StatusScreen.test.tsx`

**Interfaces:**
- Consumes: `CLASSES`, `getClass` (Task 1); `chooseClass` (Task 3); `canChangeClass`, `daysUntilClassChange` (Task 1).
- Produces:
  - `CLASS_ICON_PATHS: Record<ClassId, string>`
  - `ClassIcon({ classId, size }: { classId: ClassId; size?: number })`, which renders `data-testid="class-icon"`
  - `ClassPicker({ onChosen, onLater }: { onChosen?: () => void; onLater?: () => void })`
  - `ClassScreen({ onBack }: { onBack: () => void })`

- [ ] **Step 1: Write the failing tests**

`src/ui/components/ClassPicker.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { playSound } from '../../platform/audio';
import { at } from '../../test/fixtures';
import { seedApp } from '../../test/uiFixtures';
import { ClassPicker } from './ClassPicker';

vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }));
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at('2026-10-05'));
  vi.mocked(playSound).mockClear();
  await seedApp('2026-10-05');
  await db.player.update(1, { level: 12, trialDone: true });
});
afterEach(() => vi.useRealTimers());

describe('ClassPicker', () => {
  it('lists the 4 classes and becomes the chosen one, with a sound only on the tap', async () => {
    const onChosen = vi.fn();
    render(<ClassPicker onChosen={onChosen} />);
    for (const name of ['Ironclad', 'Galestrider', 'Bulwark', 'Wayfarer']) expect(await screen.findByRole('radio', { name: new RegExp(name) })).toBeTruthy();
    expect(playSound).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: /Bulwark/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Become Bulwark' }));
    await waitFor(() => expect(onChosen).toHaveBeenCalledOnce());
    expect((await db.player.get(1))!.classId).toBe('bulwark');
    expect(playSound).toHaveBeenCalledWith('achievement');
  });

  it('shows the cooldown and disables Become', async () => {
    await db.player.update(1, { classId: 'ironclad', classChosenAt: '2026-09-25' });
    render(<ClassPicker />);
    expect(await screen.findByText('You can change class in 20 days.')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Wayfarer/ }));
    expect((screen.getByRole('button', { name: 'Become Wayfarer' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers Later when asked', async () => {
    const onLater = vi.fn();
    render(<ClassPicker onLater={onLater} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Later' }));
    expect(onLater).toHaveBeenCalledOnce();
  });
});
```

`src/ui/screens/ClassScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { ClassScreen } from './ClassScreen';

beforeEach(() => seedApp('2026-10-05'));

describe('ClassScreen', () => {
  it('before level 10 it explains the Trial', async () => {
    render(<ClassScreen onBack={() => {}} />);
    expect(await screen.findByText(/Reach level 10/)).toBeTruthy();
  });

  it('with the Trial open it points to the Quests screen', async () => {
    await db.player.update(1, { level: 10 });
    await setMeta(db, 'classTrial', { items: [], createdAt: '2026-10-05' });
    render(<ClassScreen onBack={() => {}} />);
    expect(await screen.findByText(/Finish the Trial on the Quests screen/)).toBeTruthy();
  });

  it('after the Trial it shows the picker', async () => {
    await db.player.update(1, { level: 10, trialDone: true });
    render(<ClassScreen onBack={() => {}} />);
    expect(await screen.findByRole('radio', { name: /Ironclad/ })).toBeTruthy();
  });
});
```

Append to `src/ui/screens/StatusScreen.test.tsx`:

```tsx
  it('shows the chosen class with its icon, and the Class button opens the Class screen', async () => {
    await seedApp();
    await db.player.update(1, { level: 12, trialDone: true, classId: 'galestrider', classChosenAt: '2026-09-21' });
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByText('Galestrider')).toBeTruthy();
    expect(screen.getByTestId('class-icon')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Class' }));
    expect(await screen.findByRole('radio', { name: /Ironclad/ })).toBeTruthy();
  });

  it('labels the Class button before level 10 and before choosing', async () => {
    await seedApp();
    const { unmount } = render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Class unlocks at level 10' })).toBeTruthy();
    unmount();
    await db.player.update(1, { level: 10 });
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Class: not chosen' })).toBeTruthy();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/components/ClassPicker.test.tsx src/ui/screens/ClassScreen.test.tsx src/ui/screens/StatusScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/ui/components/classIcons.ts`: these are the approved icons from the mockup, in a 60×60 viewBox, using `currentColor`.

```ts
import type { ClassId } from '../../domain/types';

const C = 'currentColor';
/** Original class icons, drawn for Ashborn. */
export const CLASS_ICON_PATHS: Record<ClassId, string> = {
  ironclad: `<path d="M30 4 L52 14 L52 34 C52 46 42 54 30 57 C18 54 8 46 8 34 L8 14 Z" fill="none" stroke="${C}" stroke-width="3"/><path d="M20 22 L40 22 L40 30 L36 30 L36 40 L24 40 L24 30 L20 30 Z" fill="${C}"/><path d="M27 40 L27 46 L33 46 L33 40" fill="${C}" opacity=".6"/>`,
  galestrider: `<circle cx="30" cy="30" r="25" fill="none" stroke="${C}" stroke-width="3"/><path d="M14 36 C22 30 30 28 46 18 M14 44 C24 38 34 34 48 28 M18 28 C24 24 30 22 40 14" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
  bulwark: `<rect x="8" y="8" width="44" height="44" rx="6" fill="none" stroke="${C}" stroke-width="3"/><path d="M16 42 L16 24 L30 16 L44 24 L44 42 Z" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M22 42 L22 30 L38 30 L38 42 Z" fill="${C}" opacity=".85"/>`,
  wayfarer: `<circle cx="30" cy="30" r="25" fill="none" stroke="${C}" stroke-width="3"/><path d="M30 8 L34 30 L30 52 L26 30 Z" fill="${C}"/><path d="M8 30 L30 26 L52 30 L30 34 Z" fill="${C}" opacity=".6"/>`,
};
```

`src/ui/components/ClassIcon.tsx`:

```tsx
import type { ClassId } from '../../domain/types';
import { CLASS_ICON_PATHS } from './classIcons';

/** A class's icon in the theme accent. Decorative. */
export function ClassIcon({ classId, size = 18 }: { classId: ClassId; size?: number }) {
  return (
    <svg
      data-testid="class-icon"
      aria-hidden="true"
      viewBox="0 0 60 60"
      width={size}
      height={size}
      className="shrink-0 text-glow"
      // Constant SVG markup from classIcons.ts — never user input.
      dangerouslySetInnerHTML={{ __html: CLASS_ICON_PATHS[classId] }}
    />
  );
}
```

`src/ui/components/ClassPicker.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { CLASSES } from '../../config/classes';
import { progression } from '../../config/progression';
import { chooseClass } from '../../db/repo/classes';
import { db } from '../../db/schema';
import { canChangeClass, daysUntilClassChange } from '../../domain/classes';
import { todayKey } from '../../domain/day';
import type { ClassId } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from './Button';
import { ClassIcon } from './ClassIcon';

const FOCUS_LABEL = { pushups: 'more push-ups', situps: 'more sit-ups', squats: 'more squats', cardio: 'a longer walk or jog' } as const;
const STAT_NAME = { strength: 'Strength', agility: 'Agility', vitality: 'Vitality', endurance: 'Endurance', discipline: 'Discipline' } as const;

/** The 4 classes with a Become button. Respects the change cooldown. */
export function ClassPicker({ onChosen, onLater }: { onChosen?: () => void; onLater?: () => void }) {
  const player = useLiveQuery(() => db.player.get(1), []);
  const [selected, setSelected] = useState<ClassId | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!player) return null;

  const today = todayKey(new Date());
  const allowed = canChangeClass(player, today);
  const wait = daysUntilClassChange(player, today);
  const pick = selected ?? player.classId ?? CLASSES[0]!.id;
  const def = CLASSES.find((c) => c.id === pick)!;

  async function become() {
    try {
      await chooseClass(db, pick, new Date());
      playSound('achievement');
      onChosen?.();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Classes" className="space-y-2">
        {CLASSES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={pick === c.id}
            onClick={() => setSelected(c.id)}
            className={`flex min-h-14 w-full items-center gap-3 rounded border p-3 text-left ${pick === c.id ? 'border-glow' : 'border-glow-soft'}`}
          >
            <ClassIcon classId={c.id} size={32} />
            <span>
              <span className="block text-ink">
                {c.name}
                {player.classId === c.id ? ' · current' : ''}
              </span>
              <span className="block text-sm text-muted">
                {`${STAT_NAME[c.stat]} +10% XP · ${c.focus ? FOCUS_LABEL[c.focus] : 'balanced'}`}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!allowed && wait > 0 && (
        <p className="mt-3 text-sm text-muted">{`You can change class in ${wait} ${wait === 1 ? 'day' : 'days'}.`}</p>
      )}
      <Button className="mt-3 w-full" disabled={!allowed} onClick={() => void become()}>{`Become ${def.name}`}</Button>
      {onLater && (
        <Button variant="ghost" className="mt-2 w-full" onClick={onLater}>
          Later
        </Button>
      )}
      <p className="mt-2 text-center text-xs text-muted">{`You can change class again after ${progression.classes.changeCooldownDays} days.`}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
```

`src/ui/screens/ClassScreen.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { progression } from '../../config/progression';
import { getMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { Button } from '../components/Button';
import { ClassPicker } from '../components/ClassPicker';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';

export function ClassScreen({ onBack }: { onBack: () => void }) {
  const player = useLiveQuery(() => db.player.get(1), []);
  const trial = useLiveQuery(async () => (await getMeta(db, 'classTrial')) ?? null, [], null);
  if (!player) return null;
  const unlock = progression.classes.unlockLevel;

  return (
    <Screen title="Class">
      <Button variant="ghost" onClick={onBack} className="mb-3">
        Back
      </Button>
      <SystemWindow title="Class">
        {player.level < unlock ? (
          <p className="text-muted">{`Reach level ${unlock} to unlock the Class Change Trial. Finish it to choose your class.`}</p>
        ) : !player.trialDone ? (
          <p className="text-muted">{trial ? 'Finish the Trial on the Quests screen to choose your class.' : 'Your Class Change Trial is on its way. Open the Quests screen.'}</p>
        ) : (
          <ClassPicker onChosen={onBack} />
        )}
      </SystemWindow>
    </Screen>
  );
}
```

`src/ui/screens/StatusScreen.tsx`:
- Add `const [showClass, setShowClass] = useState(false);` next to `showInventory`.
- After the inventory early return, add `if (showClass) return <ClassScreen onBack={() => setShowClass(false)} />;`.
- Under the title `<p>` in the name block, add:

  ```tsx
                {getClass(player.classId) && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-glow">
                    <ClassIcon classId={player.classId!} />
                    {getClass(player.classId)!.name}
                  </p>
                )}
  ```

- Replace the single Inventory `<Button className="mt-3 w-full" …>Inventory</Button>` with a 2-column row:

  ```tsx
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setShowInventory(true);
                onOpenInventory?.();
              }}
            >
              Inventory
            </Button>
            <Button onClick={() => setShowClass(true)}>
              {player.level < progression.classes.unlockLevel ? 'Class unlocks at level 10' : player.classId ? 'Class' : 'Class: not chosen'}
            </Button>
          </div>
  ```

- Import `getClass` from `../../config/classes`, `ClassIcon` from `../components/ClassIcon`, and `ClassScreen` from `./ClassScreen`.

**Hook order:** `showClass` must be declared before any early return.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/components/ClassPicker.test.tsx src/ui/screens/ClassScreen.test.tsx src/ui/screens/StatusScreen.test.tsx`
Expected: PASS. The Status test seeds `classChosenAt: '2026-09-21'` with the real clock, so the picker may show a cooldown, but the radios still render. If the label `Class unlocks at level 10` wraps badly on a 375 px wide screen, shorten it to `Class · Lv 10` and update both the test and the spec note in the ledger.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/ui
git commit -m "feat(class): class icons, class picker and Class screen; class shown on Status"
```

---

### Task 5: The Trial card on Quests, and the class choice after the Trial

**Files:**
- Modify:
  - `src/ui/screens/QuestsScreen.tsx` (`TrialCard`; `QuestItemRow` gains `onSave` and `labelPrefix`)
  - `src/ui/overlays/EventHost.tsx` (route `classChoice`)
- Create: `src/ui/overlays/ClassChoiceOverlay.tsx`
- Test: `src/ui/screens/QuestsScreen.test.tsx`, `src/ui/overlays/EventHost.test.tsx`

**Interfaces:**
- Consumes: `setTrialProgress` (Task 3), `ClassPicker` (Task 4), `classTrial` meta (Task 2).
- Produces: `ClassChoiceOverlay({ onClose })`, a dialog with `aria-label "Choose your class"`.

- [ ] **Step 1: Write the failing tests.** Append to `src/ui/screens/QuestsScreen.test.tsx`. Read its setup first; it uses `seedApp` and renders `<QuestsScreen />`.

```tsx
  it('shows the Class Change Trial above the daily quest and logs it separately', async () => {
    await seedApp();
    await db.player.update(1, { level: 10 });
    await ensureTrial(db, '2026-09-21');
    render(<QuestsScreen />);
    const trial = await screen.findByRole('region', { name: 'Class Change · Trial' });
    expect(trial.textContent).toContain('choose your class');
    fireEvent.click(within(trial).getByRole('button', { name: 'Complete Trial: Push-ups' }));
    await waitFor(async () => expect((await getMeta(db, 'classTrial'))!.items.find((i) => i.id === 'pushups')!.progress).toBeGreaterThan(0));
    expect((await db.days.get('2026-09-21'))!.items.find((i) => i.id === 'pushups')!.progress).toBe(0);
  });

  it('has no Trial card without a Trial', async () => {
    await seedApp();
    render(<QuestsScreen />);
    await screen.findByRole('region', { name: 'Daily Quest' });
    expect(screen.queryByRole('region', { name: 'Class Change · Trial' })).toBeNull();
  });
```

Add the imports the file lacks: `within`, `waitFor`, `getMeta` (`../../db/meta`) and `ensureTrial` (`../../db/repo/classes`). `SystemWindow` renders a `<section aria-labelledby>`, which is a `region` role with the title as its name.

Append to `src/ui/overlays/EventHost.test.tsx`:

```tsx
  it('after the Trial it offers the class choice, and Later closes it', async () => {
    await db.player.update(1, { level: 10, trialDone: true });
    await setMeta(db, 'pendingEvents', [{ type: 'classChoice' }]);
    render(<EventHost />);
    const dialog = await screen.findByRole('dialog', { name: 'Choose your class' });
    expect(within(dialog).getByRole('radio', { name: /Ironclad/ })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Later' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });
```

Import `within` if it's missing.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/screens/QuestsScreen.test.tsx src/ui/overlays/EventHost.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/ui/screens/QuestsScreen.tsx`:

1. Add two optional props to `QuestItemRow`, keeping all current callers working:

```tsx
  /** Saves progress somewhere other than the daily quest (the Trial). */
  onSave?: (value: number) => Promise<void>;
  /** Prefix for accessible labels, so Trial buttons differ from the daily ones. */
  labelPrefix?: string;
```

In `save(value)`, replace `await setItemProgress(db, date, item.id, value, new Date());` with:

```tsx
    if (onSave) await onSave(value);
    else await setItemProgress(db, date, item.id, value, new Date());
```

Use `${labelPrefix ?? ''}` in the input's `aria-label` and the Complete button's `aria-label`, for example ``aria-label={`Complete ${labelPrefix ?? ''}${item.label}`}``.

2. Add `TrialCard`:

```tsx
function TrialCard({ items, level }: { items: QuestItem[]; level: number }) {
  return (
    <SystemWindow title="Class Change · Trial" className="border-gold/70">
      <p className="mb-3 text-sm text-muted">Prove yourself to choose a class. No time limit.</p>
      <ul className="space-y-3">
        {items.map((item) => (
          <QuestItemRow
            key={item.id}
            date=""
            item={item}
            disabled={false}
            completesQuest={items.every((other) => other.id === item.id || other.progress >= other.target)}
            labelPrefix="Trial: "
            onSave={(value) => setTrialProgress(db, item.id, value, new Date())}
          />
        ))}
      </ul>
      <p className="mt-3 text-sm text-gold">{`Reward: ${dailyQuestXp(level)} XP · then choose your class`}</p>
    </SystemWindow>
  );
}
```

3. In `QuestsScreen`, add `const trial = useLiveQuery(async () => (await getMeta(db, 'classTrial')) ?? null, [], null);` with the other hooks, before the loading return. Render `{trial && <TrialCard items={trial.items} level={player.level} />}` just before `<DailyQuestCard …/>`. Import `getMeta` from `../../db/meta` and `setTrialProgress` from `../../db/repo/classes`.

`src/ui/overlays/ClassChoiceOverlay.tsx`:

```tsx
import { ClassPicker } from '../components/ClassPicker';
import { SystemWindow } from '../components/SystemWindow';

/** After the Trial: choose a class now, or Later from the Class button. Silent until a tap. */
export function ClassChoiceOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Choose your class" className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void/90 py-6">
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow title="System">
          <p className="mb-3 text-lg text-ink">Trial complete. Choose your class.</p>
          <ClassPicker onChosen={onClose} onLater={onClose} />
        </SystemWindow>
      </div>
    </div>
  );
}
```

`src/ui/overlays/EventHost.tsx`: replace the bridge line with:

```tsx
  if (event.type === 'classChoice') return <ClassChoiceOverlay key={`class-${events.length}`} onClose={() => void dismissEvent(db)} />;
```

Import `ClassChoiceOverlay`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/screens/QuestsScreen.test.tsx src/ui/overlays`
Expected: PASS. If `SystemWindow` doesn't merge `className` into a visible border, the gold edge is cosmetic only. Don't change `SystemWindow`; ledger the visual result.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/ui
git commit -m "feat(class): Trial card on the Quests screen and the class choice after the Trial"
```

---

### Task 6: iPhone (WebKit) end-to-end

**Files:**
- Create: `e2e/class.spec.ts`

- [ ] **Step 1: Write the test.** It seeds a level-10 player through the app's own backup restore, the same approach as `e2e/inventory.spec.ts`.

```ts
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block', acceptDownloads: true });

test('a level-10 player completes the Trial, becomes Ironclad, and sees it on Status', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await onboard(page);

  // Level the player to 10 through Export → edit → Import.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  backup.data.player[0].level = 10;
  await page
    .getByLabel('Import backup file')
    .setInputFiles({ name: 'ashborn.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: 'Replace my data' }).click();
  await page.reload(); // the daily reset creates the Trial

  await page.getByRole('button', { name: 'Quests', exact: true }).click();
  const trial = page.getByRole('region', { name: 'Class Change · Trial' });
  await expect(trial).toBeVisible();
  for (const label of ['Push-ups', 'Sit-ups', 'Squats', 'Walk']) {
    await trial.getByRole('button', { name: `Complete Trial: ${label}`, exact: true }).click();
  }

  const choose = page.getByRole('dialog', { name: 'Choose your class' });
  await expect(choose).toBeVisible({ timeout: 10_000 });
  await choose.getByRole('radio', { name: /Ironclad/ }).click();
  await choose.getByRole('button', { name: 'Become Ironclad' }).click();
  await expect(choose).toBeHidden();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByText('Ironclad', { exact: true })).toBeVisible();
});
```

If a title toast or level-up dialog appears between the last Complete and the class dialog, dismiss any `Continue` dialog first. The first-quest title toast is non-blocking.

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/class.spec.ts`
Expected: PASS.

- [ ] **Step 3: Mutation check.** Temporarily remove the `pushEvents(database, [{ type: 'classChoice' }])` line, re-run, and expect FAIL. Restore it.

- [ ] **Step 4: Run the full e2e suite**

Run: `npm run e2e`
Expected: all pass (the known offline-reload `fixme` stays skipped), and the perf median stays ≤ 1500 ms.

- [ ] **Step 5: Commit**

```bash
git add e2e/class.spec.ts
git commit -m "test(e2e): Trial to class choice on WebKit, class shown on Status"
```

---

### Task 7: Release 1.7.0

**Files:**
- Modify: `package.json`, `package-lock.json`, `src/data/changelog.ts`, `docs/credits.md`

- [ ] **Step 1: Bump the version.** Run `npm version 1.7.0 --no-git-tag-version`, then check that `git diff --stat` shows only `package.json` and `package-lock.json`.

- [ ] **Step 2: Run the changelog test to verify it fails**

Run: `npx vitest run src/data`
Expected: FAIL.

- [ ] **Step 3: Add the changelog entry** at the top of `CHANGELOG`:

```ts
  {
    version: '1.7.0',
    date: '2026-10-09',
    title: 'Class Change',
    notes: [
      'At level 10, take the Class Change Trial and choose your class: Ironclad, Galestrider, Bulwark or Wayfarer.',
      'Your class shapes your daily quest and gives extra XP for one stat.',
      'You can switch class every 30 days.',
    ],
  },
```

- [ ] **Step 4: Update the credits.** In `docs/credits.md` under Art, add:

```md
- Classes (`src/config/classes.ts`, `src/ui/components/classIcons.ts`): the four class names and icons are original, made for Ashborn.
```

- [ ] **Step 5: Verify everything**

Run: `npm run check` and then `npm run e2e`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/data/changelog.ts docs/credits.md
git commit -m "chore(release): v1.7.0 — Class Change"
```

Don't push. Pushing publishes the site, and the owner must say "push".
