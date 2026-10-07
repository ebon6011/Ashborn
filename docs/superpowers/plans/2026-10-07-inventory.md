# Inventory & Earned Rewards (v1.6.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an earned-only inventory (15 themes, 15 emblem frames, 30 titles, Streak Shields) that drops from Boss wins, 7-day streaks and exercise rank-ups. It comes with an Inventory screen (preview and equip), a reward screen, automatic Streak Shields, and full backup support.

**Architecture:**
- The item catalogue lives in `src/config/items.ts`, and the drop rates in `src/config/progression.ts`.
- A pure `rollDrop` in `src/domain/items.ts` and Shield logic inside `processDays`.
- Dexie v3 adds an `inventory` table and 3 player fields.
- The repo functions (`grantDrop`, `equipTheme`, `equipFrame`) run inside the existing `writeTx`.
- The UI: CSS-variable themes, an `Emblem` component, `InventoryScreen`, `ItemObtainedOverlay`, and a Shield toast routed by `EventHost`.

**Tech Stack:** Vite 7 + React 19 + TS + Tailwind 4 + Dexie + Vitest (jsdom for UI) + Playwright WebKit (iPhone 15).

**Spec:** `docs/superpowers/specs/2026-10-06-inventory-design.md`

## Global Constraints

- **Never lose user data.**
  - Dexie `version(3)` plus `backupMigrations[3]`, `SCHEMA_VERSION = 3`.
  - Shipped version blocks are never edited.
  - Each upgrade is tested with real old-shape data.
- **Items:** earned only. No currency, shop, backend, accounts or tracking.
- **Balance numbers** live only in `src/config/progression.ts` (rates, `maxShields: 2`, `streakDropEvery: 7`).
- **Item ids are stable:** `theme-*`, `frame-*`, `title-*`. Defaults are `theme-default` and `frame-hex`, and `null` in the player record means the default.
- **Themes** set only `--color-glow` and `--color-glow-soft`. There are no red or gold accents.
- **Sound only after a tap.** The reward screen and the Shield toast make no sound when they appear.
- **iPhone:** 44 px touch targets, safe areas, and no text inputs added.
- **No new packages.** Release 1.6.0 with a plain-words changelog entry.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Line endings:** files are LF. When editing with scripts, open them with `newline=''`.
- **Commands:**
  - `npx vitest run <path>` runs one test file.
  - `npm run check` runs typecheck, lint, test and build.
  - `npm run e2e` runs Playwright WebKit.

## Review Focus

1. **Missing more days than Shields held.** Keep the Shields and reset the streak. Pinned in Task 3 (`3 missed / 2 shields`).
2. **A backup whose equipped theme or frame isn't owned, or with shields > 2 or duplicate inventory rows.** Reject it with a clear message. Pinned in Task 2.
3. **Leaving the Inventory while a preview is showing**, by back button, tab switch or the app closing. The equipped theme must come back. Pinned in Task 7 (unmount test).
4. **A drop when everything is owned and Shields = 2.** Show "Collection complete", write nothing, never crash. Pinned in Tasks 1 and 4.
5. **Equipping a title found only in the inventory** from the Status picker. It must be allowed, and still blocked for unowned titles. Pinned in Task 5.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/config/items.ts` | create | Catalogue: themes, frames, titles, defaults, lookups |
| `src/config/progression.ts` | modify | `items` block (rates, maxShields, streakDropEvery) |
| `src/domain/items.ts` (+test) | create | `rollDrop`, `ItemSource`, `DropResult` |
| `src/domain/types.ts` | modify | `Player` fields, `InventoryRow`, `DayRecord.shielded`, new events |
| `src/domain/stats.ts` | modify | `initialPlayer` defaults |
| `src/db/schema.ts` (+test) | modify | Dexie v3 |
| `src/domain/migrations.ts`, `src/domain/validate.ts`, `src/domain/backup.ts` (+test) | modify | Backup v3, validation, ownership checks |
| `src/db/backup.ts` (+test) | modify | Export and import the inventory |
| `src/test/fixtures.ts` | modify | `sampleBackupData` gets `inventory: []` |
| `src/domain/dayCycle.ts` (+test), `src/db/repo/days.ts` | modify | Shields in the daily reset; streak drop |
| `src/db/repo/inventory.ts` (+test) | create | `grantDrop`, `equipTheme`, `equipFrame`, `ownedItemIds`, drop rng |
| `src/db/repo/boss.ts`, `src/db/repo/training.ts`, `src/db/repo/player.ts` | modify | Boss and rank-up drops; title ownership |
| `src/domain/achievements.ts` | modify | Item titles join `ALL_TITLES` |
| `src/ui/components/frames.ts`, `src/ui/components/Emblem.tsx` (+test) | create | Frame paths; emblem |
| `src/ui/hooks/theme.ts` (+test) | create | `applyTheme`, `useEquippedTheme` |
| `src/ui/screens/StatusScreen.tsx` (+test), `src/App.tsx` | modify | Emblem, Shields, Inventory button, owned titles, app theme |
| `src/ui/screens/InventoryScreen.tsx` (+test) | create | Tabs, preview, equip |
| `src/ui/overlays/ItemObtainedOverlay.tsx`, `src/ui/overlays/ShieldToast.tsx`, `src/ui/overlays/EventHost.tsx` (+tests) | create/modify | Reward screen, toast, routing |
| `e2e/inventory.spec.ts` | create | WebKit flow |
| `package.json`, `package-lock.json`, `src/data/changelog.ts`, `docs/credits.md` | modify | Release |

---

### Task 1: Item catalogue, drop rates and `rollDrop`

**Files:**
- Create: `src/config/items.ts`, `src/domain/items.ts`, `src/domain/items.test.ts`
- Modify: `src/config/progression.ts` (type + values)

**Interfaces:**
- Produces:
  - `ItemKind = 'theme' | 'frame' | 'title'`
  - `ThemeItem { id; kind: 'theme'; name; glow; soft }`, `FrameItem { id; kind: 'frame'; name }`, `TitleItem { id; kind: 'title'; name }`, `ItemDef`
  - `DEFAULT_THEME`, `DEFAULT_FRAME`, `THEMES`, `FRAMES`, `TITLES`, `ALL_ITEMS`
  - `getItem(id): ItemDef | undefined`, `getTheme(id: string | null): ThemeItem` (falls back to the default)
  - `progression.items: { maxShields: number; streakDropEvery: number; dropRates: Record<ItemSource, Record<ItemKind | 'shield', number>> }`
  - `ItemSource = 'boss' | 'streak' | 'rankUp'`
  - `DropResult = { kind: 'item'; itemId: string } | { kind: 'shield' } | { kind: 'complete' }`
  - `rollDrop(source: ItemSource, owned: ReadonlySet<string>, shields: number, rng: () => number): DropResult`

- [ ] **Step 1: Write the failing tests** `src/domain/items.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, FRAMES, getItem, getTheme, THEMES, TITLES } from '../config/items';
import { progression } from '../config/progression';
import { ACHIEVEMENTS } from './achievements';
import { ALL_BOSSES } from '../config/bosses';
import { rollDrop, type ItemSource } from './items';

/** Deterministic PRNG (mulberry32) so rate tests never flake. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SOURCES: ItemSource[] = ['boss', 'streak', 'rankUp'];

describe('item catalogue', () => {
  it('has 15 themes, 15 frames and 30 titles with unique, stable ids', () => {
    expect(THEMES).toHaveLength(15);
    expect(FRAMES).toHaveLength(15);
    expect(TITLES).toHaveLength(30);
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(60);
    for (const t of THEMES) expect(t.id).toMatch(/^theme-[a-z-]+$/);
    for (const f of FRAMES) expect(f.id).toMatch(/^frame-[a-z-]+$/);
    for (const t of TITLES) expect(t.id).toMatch(/^title-[a-z-]+$/);
    expect(getItem('theme-ember')?.name).toBe('Ember');
    expect(getItem('nope')).toBeUndefined();
  });

  it('never uses red or gold accents, and falls back to the default theme', () => {
    for (const t of THEMES) expect(['#ff5c7a', '#ffd166']).not.toContain(t.glow);
    expect(getTheme(null).glow).toBe('#3ab8ff');
    expect(getTheme('theme-nope').glow).toBe('#3ab8ff');
    expect(getTheme('theme-ember').glow).toBe('#ff8a3d');
  });

  it('item titles are unique across achievements and bosses', () => {
    const all = [...ACHIEVEMENTS.map((a) => a.title), ...ALL_BOSSES.map((b) => b.title), ...TITLES.map((t) => t.name), progression.defaultTitle];
    expect(new Set(all).size).toBe(all.length);
  });

  it('each source’s drop rates add up to 1', () => {
    for (const s of SOURCES) {
      const r = progression.items.dropRates[s];
      expect(r.theme + r.frame + r.title + r.shield).toBeCloseTo(1, 9);
    }
    expect(progression.items.maxShields).toBe(2);
    expect(progression.items.streakDropEvery).toBe(7);
  });
});

describe('rollDrop', () => {
  it.each(SOURCES)('matches the configured rates for %s (±2 points over 20 000 rolls)', (source) => {
    const rng = seeded(42);
    const counts = { theme: 0, frame: 0, title: 0, shield: 0 };
    const N = 20_000;
    for (let i = 0; i < N; i++) {
      const r = rollDrop(source, new Set(), 0, rng);
      if (r.kind === 'shield') counts.shield++;
      else if (r.kind === 'item') counts[getItem(r.itemId)!.kind]++;
    }
    const rates = progression.items.dropRates[source];
    for (const k of ['theme', 'frame', 'title', 'shield'] as const) expect(Math.abs(counts[k] / N - rates[k])).toBeLessThan(0.02);
  });

  it('never gives an owned item, and skips a complete kind', () => {
    const owned = new Set(THEMES.map((t) => t.id));
    const rng = seeded(7);
    for (let i = 0; i < 2000; i++) {
      const r = rollDrop('boss', owned, 0, rng);
      if (r.kind === 'item') {
        expect(owned.has(r.itemId)).toBe(false);
        expect(getItem(r.itemId)!.kind).not.toBe('theme');
      }
    }
  });

  it('skips shields at the cap, and collects every item exactly once', () => {
    const owned = new Set<string>();
    const rng = seeded(9);
    for (let i = 0; i < 60; i++) {
      const r = rollDrop('streak', owned, progression.items.maxShields, rng);
      expect(r.kind).toBe('item');
      if (r.kind === 'item') owned.add(r.itemId);
    }
    expect(owned.size).toBe(60);
    expect(rollDrop('streak', owned, 1, rng)).toEqual({ kind: 'shield' });
    expect(rollDrop('streak', owned, 2, rng)).toEqual({ kind: 'complete' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/domain/items.test.ts`
Expected: FAIL, because `../config/items` and `./items` cannot be resolved.

- [ ] **Step 3: Create `src/config/items.ts`**

```ts
/** Earned-only rewards. Ids are stored on phones and in backups: never rename or remove one. */
export type ItemKind = 'theme' | 'frame' | 'title';

export interface ThemeItem { id: string; kind: 'theme'; name: string; /** --color-glow */ glow: string; /** --color-glow-soft */ soft: string }
export interface FrameItem { id: string; kind: 'frame'; name: string }
export interface TitleItem { id: string; kind: 'title'; name: string }
export type ItemDef = ThemeItem | FrameItem | TitleItem;

export const DEFAULT_THEME: ThemeItem = { id: 'theme-default', kind: 'theme', name: 'System Blue', glow: '#3ab8ff', soft: '#1d5c85' };
export const DEFAULT_FRAME: FrameItem = { id: 'frame-hex', kind: 'frame', name: 'Plain Hex' };

/** Accents avoid red (warnings) and gold (rewards). `soft` = 45 % accent over #05070d. */
export const THEMES: readonly ThemeItem[] = [
  { id: 'theme-ember', kind: 'theme', name: 'Ember', glow: '#ff8a3d', soft: '#764223' },
  { id: 'theme-verdant', kind: 'theme', name: 'Verdant', glow: '#3dffa0', soft: '#1e774f' },
  { id: 'theme-amethyst', kind: 'theme', name: 'Amethyst', glow: '#b07cff', soft: '#523c7a' },
  { id: 'theme-frost', kind: 'theme', name: 'Frost', glow: '#b4f0ff', soft: '#54707a' },
  { id: 'theme-jade', kind: 'theme', name: 'Jade', glow: '#00c9a7', soft: '#035e52' },
  { id: 'theme-orchid', kind: 'theme', name: 'Orchid', glow: '#e07cff', soft: '#683c7a' },
  { id: 'theme-tidal', kind: 'theme', name: 'Tidal', glow: '#2ee6e6', soft: '#176b6f' },
  { id: 'theme-moss', kind: 'theme', name: 'Moss', glow: '#9ccf3d', soft: '#496123' },
  { id: 'theme-twilight', kind: 'theme', name: 'Twilight', glow: '#7c8cff', soft: '#3b437a' },
  { id: 'theme-coral', kind: 'theme', name: 'Coral', glow: '#ff8f7a', soft: '#76443e' },
  { id: 'theme-ashen', kind: 'theme', name: 'Ashen', glow: '#c8d0dc', soft: '#5d616a' },
  { id: 'theme-blossom', kind: 'theme', name: 'Blossom', glow: '#ff9ecf', soft: '#764b64' },
  { id: 'theme-venom', kind: 'theme', name: 'Venom', glow: '#b6ff3d', soft: '#557723' },
  { id: 'theme-plum', kind: 'theme', name: 'Plum', glow: '#d05c9a', soft: '#602d4c' },
  { id: 'theme-cobalt', kind: 'theme', name: 'Cobalt', glow: '#4d6bff', soft: '#25347a' },
];

export const FRAMES: readonly FrameItem[] = (
  [
    ['iron-hex', 'Iron Hex'], ['thorned-crest', 'Thorned Crest'], ['winged-seal', 'Winged Seal'], ['crown-rim', 'Crown Rim'],
    ['runic-circle', 'Runic Circle'], ['fang-ring', 'Fang Ring'], ['star-sigil', 'Star Sigil'], ['chain-loop', 'Chain Loop'],
    ['flame-halo', 'Flame Halo'], ['frost-shard', 'Frost Shard'], ['serpent-coil', 'Serpent Coil'], ['shield-crest', 'Shield Crest'],
    ['eclipse-ring', 'Eclipse Ring'], ['antler-crest', 'Antler Crest'], ['blade-cross', 'Blade Cross'],
  ] as const
).map(([id, name]) => ({ id: `frame-${id}`, kind: 'frame' as const, name }));

const TITLE_NAMES = [
  'Shieldbearer', 'Dawnstrider', 'Ironheart', 'Ember Soul', 'Stormcaller', 'Unyielding', 'Pathfinder', 'Nightwalker',
  'Stonefist', 'Swiftfoot', 'Steelspine', 'Frostborn', 'Ashwalker', 'Lionheart', 'Moonrunner', 'Rune Seeker',
  'Tidebreaker', 'Skyreach', 'Grim Resolve', 'Bladewise', 'Warden of Dawn', 'Starforged', 'Peakclimber', 'Thunderstep',
  'Silent Blade', 'Endless March', 'Iron Oath', 'Ascendant', 'Gatewalker', 'Last Light',
] as const;
export const TITLES: readonly TitleItem[] = TITLE_NAMES.map((name) => ({
  id: `title-${name.toLowerCase().replace(/ /g, '-')}`,
  kind: 'title' as const,
  name,
}));

export const ALL_ITEMS: readonly ItemDef[] = [...THEMES, ...FRAMES, ...TITLES];

export function getItem(id: string): ItemDef | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

/** The theme for a stored id; null or unknown ids give the default. */
export function getTheme(id: string | null): ThemeItem {
  const item = id ? getItem(id) : undefined;
  return item?.kind === 'theme' ? item : DEFAULT_THEME;
}
```

- [ ] **Step 4: Add the `items` block to `src/config/progression.ts`.** Add to the `Progression` interface, next to `boss`:

```ts
  items: {
    /** Streak Shields a player can hold at once. */
    maxShields: number;
    /** A drop every N days of streak (7, 14, 21 …). */
    streakDropEvery: number;
    /** Chance of each kind per drop, by source. Each row adds up to 1. */
    dropRates: Record<'boss' | 'streak' | 'rankUp', { theme: number; frame: number; title: number; shield: number }>;
  };
```

Add to the exported object, next to `boss: { … }`:

```ts
  items: {
    maxShields: 2,
    streakDropEvery: 7,
    dropRates: {
      boss: { theme: 0.35, frame: 0.35, title: 0.2, shield: 0.1 },
      streak: { theme: 0.2, frame: 0.2, title: 0.3, shield: 0.3 },
      rankUp: { theme: 0.3, frame: 0.3, title: 0.35, shield: 0.05 },
    },
  },
```

Read the file first, and match how `boss` is declared in both the interface and the object.

- [ ] **Step 5: Create `src/domain/items.ts`**

```ts
import { ALL_ITEMS, type ItemKind } from '../config/items';
import { progression } from '../config/progression';

export type ItemSource = 'boss' | 'streak' | 'rankUp';
export type DropResult = { kind: 'item'; itemId: string } | { kind: 'shield' } | { kind: 'complete' };

const KINDS = ['theme', 'frame', 'title', 'shield'] as const;

/**
 * One drop. Picks a kind by the source's rates among the kinds that can still give something
 * (unowned items left; Shields below the cap), then a random unowned item of that kind.
 */
export function rollDrop(source: ItemSource, owned: ReadonlySet<string>, shields: number, rng: () => number): DropResult {
  const rates = progression.items.dropRates[source];
  const pool = (kind: ItemKind) => ALL_ITEMS.filter((i) => i.kind === kind && !owned.has(i.id));
  const available = KINDS.filter((k) => (k === 'shield' ? shields < progression.items.maxShields : pool(k).length > 0) && rates[k] > 0);
  if (available.length === 0) return { kind: 'complete' };

  const total = available.reduce((sum, k) => sum + rates[k], 0);
  let roll = rng() * total;
  let kind = available[available.length - 1]!;
  for (const k of available) {
    if (roll < rates[k]) { kind = k; break; }
    roll -= rates[k];
  }
  if (kind === 'shield') return { kind: 'shield' };
  const items = pool(kind);
  return { kind: 'item', itemId: items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!.id };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/domain/items.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 7: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/config/items.ts src/config/progression.ts src/domain/items.ts src/domain/items.test.ts
git commit -m "feat(items): original item catalogue, drop rates in config, and the drop roll"
```

---

### Task 2: Saved data v3 and backups (inventory, player fields, shielded days)

**Files:**
- Modify:
  - `src/domain/types.ts`: `Player`, `DayRecord`, add `InventoryRow`
  - `src/domain/stats.ts:16-29`: `initialPlayer`
  - `src/db/schema.ts`: `STORES_V3`, `version(3)`, `inventory` table
  - `src/domain/migrations.ts`: `SCHEMA_VERSION`, `BACKUP_TABLES`, `backupMigrations[3]`
  - `src/domain/validate.ts`: player, days and inventory validators
  - `src/domain/backup.ts`: ownership checks after row validation
  - `src/db/backup.ts`: export and import of `inventory`
  - `src/test/fixtures.ts`: `sampleBackupData` gets `inventory: []`
- Test: `src/db/schema.test.ts`, `src/domain/backup.test.ts`, `src/db/backup.test.ts`

**Interfaces:**
- Produces:
  - `Player` gains `themeId: string | null; frameId: string | null; shields: number`.
  - `DayRecord` gains `shielded?: true`.
  - `InventoryRow { itemId: string; obtainedAt: string; source: ItemSource }`.
  - `db.inventory: Table<InventoryRow, string>`.
  - `BackupData.inventory: InventoryRow[]`.

- [ ] **Step 1: Write the failing tests.** Append to `src/db/schema.test.ts`. Update the import to bring in `STORES_V2, STORES_V3`.

```ts
  it('upgrades a version 2 (v1.5.0) database to version 3 without losing anything', async () => {
    const name = `v2-${crypto.randomUUID()}`;
    const v2 = new Dexie(name);
    v2.version(1).stores(STORES_V1);
    v2.version(2).stores(STORES_V2);
    const data = sampleBackupData() as unknown as Record<string, unknown[]>;
    // A real v1.5.0 player row: no themeId / frameId / shields.
    const oldPlayer = { id: 1, level: 12, xp: 40, unspentStatPoints: 2, stats: { strength: 14, agility: 11, vitality: 12, intelligence: 10, discipline: 13 },
      titleId: 'boss-mawgrath', streak: 9, bestStreak: 21, questsCompleted: 60, sideQuestStatProgress: { strength: 0, agility: 1, vitality: 0, intelligence: 0, discipline: 2 } };
    for (const table of Object.keys(STORES_V2)) await v2.table(table).bulkPut(table === 'player' ? [oldPlayer] : data[table]!);
    v2.close();

    const v3 = new AshbornDB(name);
    await v3.open();
    expect(v3.verno).toBe(3);
    expect(await v3.player.get(1)).toEqual({ ...oldPlayer, themeId: null, frameId: null, shields: 0 });
    for (const table of Object.keys(STORES_V2)) if (table !== 'player') expect(await v3.table(table).toArray()).toEqual(data[table]);
    expect(await v3.inventory.count()).toBe(0);
    v3.close();
  });
```

Change the first test to compare against `STORES_V3` (`expect(Object.keys(STORES_V3).sort()).toEqual([...BACKUP_TABLES].sort())`).

The old test `upgrades a version 1 database to version 2` now opens at v3. `sampleBackupData().player` uses `initialPlayer()`, which will contain the new fields after Step 3, so its equality still holds. Also add `expect(v2.verno).toBe(3)` and rename it to `…version 1 database to the latest version…`. **Ruling:** the old `verno` assertion of 2 becomes 3 because the app now opens at v3.

Append to `src/domain/backup.test.ts`. Read the file first to reuse its helpers `text`/`f`, and match its names.

```ts
  it('imports a v2 (v1.5.0) backup with an empty inventory and default player fields', () => {
    const { inventory: _none, ...v2data } = sampleBackupData() as unknown as Record<string, unknown[]>;
    const p = (v2data.player as Record<string, unknown>[])[0]!;
    const { themeId: _t, frameId: _f, shields: _s, ...oldPlayer } = p;
    const result = parseBackup(JSON.stringify({ app: 'ashborn', schemaVersion: 2, exportedAt: '', data: { ...v2data, player: [oldPlayer] } }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.inventory).toEqual([]);
      expect(result.backup.data.player[0]).toMatchObject({ themeId: null, frameId: null, shields: 0 });
    }
  });

  it('rejects unowned equipped items, too many shields, unknown or duplicate items', () => {
    const base = sampleBackupData();
    const make = (patch: { player?: object; inventory?: unknown[] }) =>
      parseBackup(JSON.stringify(buildBackup({ ...base, player: [{ ...base.player[0]!, ...patch.player }], inventory: (patch.inventory ?? []) as never }, new Date())));
    const row = { itemId: 'theme-ember', obtainedAt: '2026-10-01T10:00:00.000Z', source: 'boss' };
    expect(make({ player: { themeId: 'theme-ember' }, inventory: [row] }).ok).toBe(true);
    expect(make({ player: { themeId: 'theme-ember' } }).ok).toBe(false);
    expect(make({ player: { frameId: 'theme-ember' }, inventory: [row] }).ok).toBe(false);
    expect(make({ player: { shields: 3 } }).ok).toBe(false);
    expect(make({ inventory: [{ ...row, itemId: 'theme-nope' }] }).ok).toBe(false);
    expect(make({ inventory: [row, row] }).ok).toBe(false);
    expect(make({ inventory: [{ ...row, source: 'shop' }] }).ok).toBe(false);
  });

  it('accepts a shielded missed day', () => {
    const base = sampleBackupData();
    const day = { ...base.days[0]!, status: 'missed' as const, shielded: true as const };
    expect(parseBackup(JSON.stringify(buildBackup({ ...base, days: [day] }, new Date()))).ok).toBe(true);
    expect(parseBackup(JSON.stringify(buildBackup({ ...base, days: [{ ...day, shielded: 'yes' as never }] }, new Date()))).ok).toBe(false);
  });
```

Append to `src/db/backup.test.ts`. Read it first for its existing round-trip helpers and database fixture names.

```ts
  it('round trip: inventory, equipped items, shields and shielded days survive export → import → export', async () => {
    const database = await setupPlayer('2026-10-05');
    await database.inventory.bulkPut([
      { itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' },
      { itemId: 'frame-flame-halo', obtainedAt: '2026-10-05T11:00:00.000Z', source: 'streak' },
      { itemId: 'title-ironheart', obtainedAt: '2026-10-05T12:00:00.000Z', source: 'rankUp' },
    ]);
    await database.player.update(1, { themeId: 'theme-ember', frameId: 'frame-flame-halo', titleId: 'title-ironheart', shields: 2 });
    const day = (await database.days.get('2026-10-05'))!;
    await database.days.put({ ...day, date: '2026-10-04', status: 'missed', shielded: true });

    const first = await exportData(database);
    const parsed = parseBackup(JSON.stringify(buildBackup(first, new Date('2026-10-06T08:00:00Z'))));
    expect(parsed.ok).toBe(true);
    const other = freshDb();
    if (parsed.ok) await importData(other, parsed.backup.data);
    expect(await exportData(other)).toEqual(first);
    expect(first.inventory).toHaveLength(3);
  });
```

Import `setupPlayer` from `../test/dbFixtures`, `freshDb` from `../test/fixtures`, and `buildBackup, parseBackup` from `../domain/backup`, if they aren't imported already.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/db/schema.test.ts src/domain/backup.test.ts src/db/backup.test.ts`
Expected: FAIL. `STORES_V3`, `inventory` and `themeId` don't exist yet, and the type errors surface as failures or a transform error.

- [ ] **Step 3: Implement the types and defaults**

`src/domain/types.ts`:
- In `Player`, after `sideQuestStatProgress: Stats;`, add:

  ```ts
    /** Equipped window theme; null = the default. */
    themeId: string | null;
    /** Equipped emblem frame; null = the default. */
    frameId: string | null;
    /** Streak Shields held (0 … progression.items.maxShields). */
    shields: number;
  ```

- In `DayRecord`, after `xpAwarded: number;`, add `/** A missed day covered by a Streak Shield. */ shielded?: true;`.
- At the end of the file, add:

  ```ts
  export type ItemSource = 'boss' | 'streak' | 'rankUp';
  export interface InventoryRow {
    itemId: string;
    /** ISO time it was earned */
    obtainedAt: string;
    source: ItemSource;
  }
  ```

`src/domain/items.ts`: replace `export type ItemSource = 'boss' | 'streak' | 'rankUp';` with `export type { ItemSource } from './types';` and add `import type { ItemSource } from './types';`.

`src/domain/stats.ts` `initialPlayer()`: after `sideQuestStatProgress: initialStats(0),`, add `themeId: null, frameId: null, shields: 0,`.

- [ ] **Step 4: Implement the schema, migrations and validation**

`src/db/schema.ts`:
- Add `InventoryRow` to the type import.
- After `STORES_V2`, add:

  ```ts
  /** Version 3 (v1.6.0): adds the earned-items inventory, keyed by item id. */
  export const STORES_V3: Record<BackupTable, string> = { ...STORES_V2, inventory: 'itemId' };
  ```

- Change `STORES_V2`'s type to `Record<Exclude<BackupTable, 'inventory'>, string>`, and `STORES_V1`'s to `Record<Exclude<BackupTable, 'bosses' | 'inventory'>, string>`.
- Add `declare inventory: Table<InventoryRow, string>;`.
- After the v2 line, add:

  ```ts
      // v3: new empty `inventory` table; the player gains default theme/frame and 0 Shields (matches backupMigrations[3]).
      this.version(3)
        .stores(STORES_V3)
        .upgrade((tx) =>
          tx.table('player').toCollection().modify((p: Record<string, unknown>) => {
            p.themeId = p.themeId ?? null;
            p.frameId = p.frameId ?? null;
            p.shields = p.shields ?? 0;
          }),
        );
  ```

`src/domain/migrations.ts`:
- `SCHEMA_VERSION = 3`.
- Append `'inventory'` to `BACKUP_TABLES`.
- Add to `backupMigrations`:

  ```ts
    // v3 adds the inventory and the player's equipped items / Shields (same as the Dexie version 3 block).
    3: (data) => ({
      ...data,
      inventory: Array.isArray(data.inventory) ? data.inventory : [],
      player: (Array.isArray(data.player) ? data.player : []).map((p) =>
        typeof p === 'object' && p !== null
          ? { themeId: null, frameId: null, shields: 0, ...(p as Record<string, unknown>) }
          : p,
      ),
    }),
  ```

`src/domain/validate.ts`:
- Add `import { getItem } from '../config/items';` and `import { progression } from '../config/progression';`.
- Player: add `themeId: nullable(str), frameId: nullable(str), shields: intIn(0, progression.items.maxShields)` to its `shape({...})`.
- Days: wrap the existing shape as `both(shape({...existing}), (v) => isRecord(v) && (v.shielded === undefined || v.shielded === true))`.
- Add an `inventory` entry:

  ```ts
    inventory: shape({ itemId: (v) => typeof v === 'string' && getItem(v) !== undefined, obtainedAt: str, source: oneOf('boss', 'streak', 'rankUp') }),
  ```

`src/domain/backup.ts`: in `parseBackup`, after `if (typed.profile.length !== 1 || typed.player.length !== 1) return fail(...)`, add:

```ts
  const owned = new Set<string>();
  for (const row of typed.inventory) {
    if (owned.has(row.itemId)) return fail('This backup lists the same item twice.');
    owned.add(row.itemId);
  }
  const equipped = typed.player[0]!;
  const ownsKind = (id: string | null, kind: 'theme' | 'frame') => id === null || (owned.has(id) && getItem(id)?.kind === kind);
  if (!ownsKind(equipped.themeId, 'theme') || !ownsKind(equipped.frameId, 'frame')) return fail('This backup equips an item it does not own.');
```

Add `import { getItem } from '../config/items';`, and add `inventory: InventoryRow[];` to `BackupData`, importing `InventoryRow` with the other types.

`src/db/backup.ts`: add `database.inventory.toArray()` as the 12th entry, and `inventory` to the destructure and the returned object. In `importData`, add `await database.inventory.bulkPut(data.inventory);`.

`src/test/fixtures.ts`: add `inventory: [],` after `bosses: [],` in `sampleBackupData`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/db/schema.test.ts src/domain/backup.test.ts src/db/backup.test.ts`
Expected: PASS.

- [ ] **Step 6: Mutation check on the upgrade test.** Temporarily remove the `.upgrade(...)` call from `version(3)` and re-run `npx vitest run src/db/schema.test.ts`. Expected: the v2→v3 test FAILS. Restore it, re-run, and expect PASS.

- [ ] **Step 7: Run the full check**

Run: `npm run check`
Expected: exit 0. If other tests build `Player` objects literally (search with `grep -rn "questsCompleted:" src --include=*.test.ts*`), add the 3 default fields to them. Never loosen a validator to make a test pass.

- [ ] **Step 8: Commit**

```bash
git add src/domain src/db src/test
git commit -m "feat(items): saved data v3 — inventory table, equipped items and Shields, backups included"
```

---

### Task 3: Streak Shields in the daily reset

**Files:**
- Modify: `src/domain/dayCycle.ts`, `src/db/repo/days.ts:36-70` (`startDay`), `src/domain/types.ts` (`GameEvent`)
- Test: `src/domain/dayCycle.test.ts`, `src/db/repo/days.test.ts`

**Interfaces:**
- Produces:
  - `ProcessDaysInput.shields: number`.
  - `ProcessDaysResult` gains `shieldsUsed: number`.
  - Closed records that a Shield covers carry `shielded: true`.
  - New event `{ type: 'shieldUsed'; count: number; streak: number }`.

- [ ] **Step 1: Write the failing tests.** Append to `src/domain/dayCycle.test.ts`. Read its top for the `base` object and its date helpers. Every existing call passes `...base`, so add `shields: 0` to `base`.

```ts
describe('Streak Shields', () => {
  const run = (shields: number, lastOpenDate: string, today: string) =>
    processDays({ lastOpenDate, today, days: {}, streak: 9, level: 1, shields });

  it('one missed day with one Shield keeps the streak, still needs the penalty', () => {
    const r = run(1, '2026-10-05', '2026-10-06');
    expect(r.streak).toBe(9);
    expect(r.shieldsUsed).toBe(1);
    expect(r.needsPenalty).toBe(true);
    expect(r.closed).toEqual([{ date: '2026-10-05', items: [], status: 'missed', penalty: null, urgent: null, xpAwarded: 0, shielded: true }]);
  });

  it('two missed days with two Shields uses both', () => {
    const r = run(2, '2026-10-04', '2026-10-06');
    expect(r.streak).toBe(9);
    expect(r.shieldsUsed).toBe(2);
    expect(r.closed.every((d) => d.shielded)).toBe(true);
  });

  it('three missed days with two Shields uses none and resets the streak', () => {
    const r = run(2, '2026-10-03', '2026-10-06');
    expect(r.streak).toBe(0);
    expect(r.shieldsUsed).toBe(0);
    expect(r.closed.some((d) => d.shielded)).toBe(false);
  });

  it('no Shields behaves exactly as before', () => {
    const r = run(0, '2026-10-05', '2026-10-06');
    expect(r.streak).toBe(0);
    expect(r.shieldsUsed).toBe(0);
  });
});
```

Existing tests that compare the whole result with `toEqual({...})` must now include `shieldsUsed: 0`. Add it to those objects; this is a ruling, because the result shape grew.

Append to `src/db/repo/days.test.ts`. Read its imports first; it uses `setupPlayer`, `startDay`, `at`, `neverUrgent` and `getMeta`.

```ts
  it('a Streak Shield covers a missed day: streak kept, Shield spent, day marked, note queued, penalty still comes', async () => {
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { streak: 9, shields: 2 });
    await startDay(db, at('2026-10-06'), neverUrgent); // 10-05 was left open
    const player = (await db.player.get(1))!;
    expect(player.streak).toBe(9);
    expect(player.shields).toBe(1);
    expect((await db.days.get('2026-10-05'))).toMatchObject({ status: 'missed', shielded: true });
    expect((await db.days.get('2026-10-06'))!.penalty).not.toBeNull();
    const events = (await getMeta(db, 'pendingEvents')) ?? [];
    expect(events.filter((e) => e.type === 'shieldUsed')).toEqual([{ type: 'shieldUsed', count: 1, streak: 9 }]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/dayCycle.test.ts src/db/repo/days.test.ts`
Expected: FAIL. `shieldsUsed` is undefined, and the streak resets to 0.

- [ ] **Step 3: Implement `processDays`.** In `src/domain/dayCycle.ts`:
- Add `shields: number;` to `ProcessDaysInput` and `shieldsUsed: number;` to `ProcessDaysResult`.
- In the early-return branch, add `shieldsUsed: 0` to the returned object.
- Replace the `dates.forEach(…)` block and the final return with:

```ts
  // Days that would break the streak: not done, not rest, not already closed as missed.
  const breaking = dates.filter((date) => {
    const record = input.days[date];
    return !(record && (record.status === 'done' || record.status === 'rest' || record.status === 'missed'));
  });
  // Shields only spend when they can cover every breaking day; otherwise they are kept.
  const shielded = breaking.length > 0 && breaking.length <= input.shields;

  dates.forEach((date, index) => {
    const record = input.days[date];
    if (!breaking.includes(date)) return;

    needsPenalty = true;
    if (!shielded) streak = 0;
    const mark = shielded ? { shielded: true as const } : {};

    if (!record) {
      if (index >= firstRecorded) closed.push({ ...missedPlaceholder(date), ...mark });
      return;
    }

    let xpAwarded = record.xpAwarded;
    if (record.status === 'open' || record.status === 'partial') {
      const earned = partialXp(record.items, level) - record.xpAwarded;
      if (earned > 0) {
        xpToAward += earned;
        xpAwarded += earned;
      }
    }
    closed.push({ ...record, status: 'missed', xpAwarded, ...mark });
  });

  return { closed, streak, xpToAward, needsPenalty, currentDate: today, shieldsUsed: shielded ? breaking.length : 0 };
```

`src/db/repo/days.ts` `startDay`:
- Pass `shields: player.shields` into `processDays({...})`.
- After the streak update line, add:

  ```ts
      if (result.shieldsUsed > 0) {
        await database.player.update(1, { shields: player.shields - result.shieldsUsed });
        await pushEvents(database, [{ type: 'shieldUsed', count: result.shieldsUsed, streak: result.streak }]);
      }
  ```

- Import `pushEvents` from `./player` next to `awardXp`.

`src/domain/types.ts` `GameEvent`: add `| { type: 'shieldUsed'; count: number; streak: number }`.

`src/ui/overlays/EventHost.tsx`: until Task 8, add `if (event.type === 'shieldUsed') return null;` before the final `return (` so it type-checks. Task 8 replaces this bridge.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/dayCycle.test.ts src/db/repo/days.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/domain src/db/repo src/ui/overlays/EventHost.tsx
git commit -m "feat(items): Streak Shields cover missed days when they can save the streak"
```

---

### Task 4: Drops — Boss wins, 7-day streaks, exercise rank-ups

**Files:**
- Create: `src/db/repo/inventory.ts`, `src/db/repo/inventory.test.ts`
- Modify:
  - `src/db/repo/boss.ts` (`dealBossDamage` defeat branch)
  - `src/db/repo/days.ts` (`setItemProgress` daily completion)
  - `src/db/repo/training.ts` (`logSet`)
  - `src/domain/types.ts` (`GameEvent`)
  - `src/ui/overlays/EventHost.tsx` (bridge)

**Interfaces:**
- Consumes: `rollDrop`, `ItemSource` (Task 1); `db.inventory`, `player.shields` (Task 2).
- Produces:
  - `grantDrop(database, source: ItemSource, now: Date, rng?: () => number): Promise<void>`
  - `ownedItemIds(database): Promise<Set<string>>`
  - `setDropRngForTests(fn: (() => number) | null): void`
  - Event `{ type: 'itemObtained'; source: ItemSource; itemId: string | null; shield: boolean }`. `itemId` is null for a Shield or "complete"; `shield` is true for a Shield.

- [ ] **Step 1: Write the failing tests** `src/db/repo/inventory.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { getItem } from '../../config/items';
import { completeDaily, neverUrgent, setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { getMeta } from '../meta';
import { startDay } from './days';
import { grantDrop, setDropRngForTests } from './inventory';
import { logSet } from './training';
import { dealBossDamage } from './boss';

afterEach(() => setDropRngForTests(null));
const drops = async (db: Awaited<ReturnType<typeof setupPlayer>>) =>
  ((await getMeta(db, 'pendingEvents')) ?? []).filter((e) => e.type === 'itemObtained');

describe('grantDrop', () => {
  it('stores a new item and queues the reward screen', async () => {
    const db = await setupPlayer('2026-10-05');
    await grantDrop(db, 'boss', at('2026-10-05'), () => 0); // theme, first unowned theme
    expect(await db.inventory.toArray()).toEqual([{ itemId: 'theme-ember', obtainedAt: at('2026-10-05').toISOString(), source: 'boss' }]);
    expect(await drops(db)).toEqual([{ type: 'itemObtained', source: 'boss', itemId: 'theme-ember', shield: false }]);
  });

  it('a Shield drop adds one Shield, never above 2', async () => {
    const db = await setupPlayer('2026-10-05');
    await grantDrop(db, 'streak', at('2026-10-05'), () => 0.99); // shield is the last kind
    expect((await db.player.get(1))!.shields).toBe(1);
    expect((await drops(db))[0]).toEqual({ type: 'itemObtained', source: 'streak', itemId: null, shield: true });
    await db.player.update(1, { shields: 2 });
    await grantDrop(db, 'streak', at('2026-10-05'), () => 0.99); // capped → falls to a collectable
    expect((await db.player.get(1))!.shields).toBe(2);
    expect((await drops(db))[1]).toMatchObject({ shield: false });
  });

  it('with everything owned and 2 Shields it says complete and writes nothing', async () => {
    const db = await setupPlayer('2026-10-05');
    const { ALL_ITEMS } = await import('../../config/items');
    await db.inventory.bulkPut(ALL_ITEMS.map((i) => ({ itemId: i.id, obtainedAt: 'x', source: 'boss' as const })));
    await db.player.update(1, { shields: 2 });
    await grantDrop(db, 'boss', at('2026-10-05'), () => 0.5);
    expect(await db.inventory.count()).toBe(60);
    expect((await drops(db))[0]).toEqual({ type: 'itemObtained', source: 'boss', itemId: null, shield: false });
  });
});

describe('when drops happen', () => {
  it('a Boss win gives exactly one drop', async () => {
    setDropRngForTests(() => 0);
    const db = await setupPlayer('2026-09-28');
    const boss = (await db.bosses.get('2026-09-28'))!;
    await dealBossDamage(db, { base: 10_000, category: null, date: '2026-09-28' }, at('2026-09-28'));
    await dealBossDamage(db, { base: 10_000, category: null, date: '2026-09-28' }, at('2026-09-28'));
    expect(boss.hp).toBeGreaterThan(0);
    expect((await drops(db)).map((e) => e.source)).toEqual(['boss']);
  });

  it('reaching a 7-day streak gives a drop; 6 days does not', async () => {
    setDropRngForTests(() => 0);
    const db = await setupPlayer('2026-10-05');
    await db.player.update(1, { streak: 5 });
    await completeDaily(db, '2026-10-05'); // streak 6
    expect(await drops(db)).toEqual([]);
    await startDay(db, at('2026-10-06'), neverUrgent);
    await completeDaily(db, '2026-10-06'); // streak 7
    expect((await drops(db)).map((e) => e.source)).toEqual(['streak']);
  });

  it('an exercise rank-up gives a drop; a first set or same-rank set does not', async () => {
    setDropRngForTests(() => 0);
    const db = await setupPlayer('2026-10-05');
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-10-05')); // baseline, rank E
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-10-06')); // ratio 1 → E
    expect(await drops(db)).toEqual([]);
    await logSet(db, { exerciseId: 'pushup', reps: 12, weightKg: 0 }, at('2026-10-06')); // ratio 1.2 → D
    expect((await drops(db)).map((e) => e.source)).toEqual(['rankUp']);
    expect(getItem((await db.inventory.toArray())[0]!.itemId)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/db/repo/inventory.test.ts`
Expected: FAIL, because it cannot resolve `./inventory`.

- [ ] **Step 3: Create `src/db/repo/inventory.ts`**

```ts
import { getItem } from '../../config/items';
import { rollDrop, type ItemSource } from '../../domain/items';
import { writeTx, type AshbornDB } from '../schema';
import { pushEvents } from './player';

let testRng: (() => number) | null = null;
/** Tests only: make every drop deterministic. Pass null to restore Math.random. */
export function setDropRngForTests(fn: (() => number) | null): void {
  testRng = fn;
}

export async function ownedItemIds(database: AshbornDB): Promise<Set<string>> {
  return new Set((await database.inventory.toArray()).map((r) => r.itemId));
}

/** Rolls one drop for `source`, saves it, and queues the reward screen. */
export async function grantDrop(database: AshbornDB, source: ItemSource, now: Date, rng: () => number = testRng ?? Math.random): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) return;
    const result = rollDrop(source, await ownedItemIds(database), player.shields, rng);
    if (result.kind === 'item') {
      await database.inventory.put({ itemId: result.itemId, obtainedAt: now.toISOString(), source });
      await pushEvents(database, [{ type: 'itemObtained', source, itemId: result.itemId, shield: false }]);
    } else if (result.kind === 'shield') {
      await database.player.update(1, { shields: player.shields + 1 });
      await pushEvents(database, [{ type: 'itemObtained', source, itemId: null, shield: true }]);
    } else {
      await pushEvents(database, [{ type: 'itemObtained', source, itemId: null, shield: false }]);
    }
  });
}

/** Equips an owned theme or frame (null = the default). */
async function equip(database: AshbornDB, field: 'themeId' | 'frameId', kind: 'theme' | 'frame', itemId: string | null): Promise<void> {
  await writeTx(database, async () => {
    if (itemId !== null && (getItem(itemId)?.kind !== kind || !(await database.inventory.get(itemId)))) throw new Error('You have not found that item yet.');
    await database.player.update(1, { [field]: itemId });
  });
}
export const equipTheme = (database: AshbornDB, itemId: string | null) => equip(database, 'themeId', 'theme', itemId);
export const equipFrame = (database: AshbornDB, itemId: string | null) => equip(database, 'frameId', 'frame', itemId);
```

`src/domain/types.ts` `GameEvent`: add `| { type: 'itemObtained'; source: ItemSource; itemId: string | null; shield: boolean }`.

- [ ] **Step 4: Hook up the 3 sources**

`src/db/repo/boss.ts` `dealBossDamage`: after the `pushEvents(database, [{ type: 'bossDefeated', … }])` line, add `await grantDrop(database, 'boss', now);`, and import `grantDrop` from `./inventory`.

`src/db/repo/days.ts` `setItemProgress`: after `await awardXp(database, { amount: xp, kind: 'daily', … }, now);` and before `await bossHits();`, add:

```ts
    if (streak % progression.items.streakDropEvery === 0) await grantDrop(database, 'streak', now);
```

Import `grantDrop` from `./inventory`.

`src/db/repo/training.ts` `logSet`: inside the transaction, after `previous` is read and before `add(set)`:

```ts
    const sameDayOnly = previous.length === 0;
    const rankBefore = exerciseRank(previous, exercise.weighted).rank;
```

After `await database.workoutSets.add(set);`:

```ts
    const rankAfter = exerciseRank([...previous, set], exercise.weighted).rank;
    if (!sameDayOnly && rankIndex(rankAfter) > rankIndex(rankBefore)) await grantDrop(database, 'rankUp', now);
```

Import `exerciseRank` from `../../domain/workout/exerciseRank`, `rankIndex` from `../../domain/rank`, and `grantDrop` from `./inventory`.

**Check `rankIndex` direction first:** `RANKS` order in `src/domain/types.ts`. If `RANKS` lists `'S'` first, a higher rank has a lower index, so use `<` instead of `>`. Record which in the ledger.

`src/ui/overlays/EventHost.tsx`: until Task 8, add `if (event.type === 'itemObtained') return null;` next to the `shieldUsed` bridge.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/db/repo/inventory.test.ts`
Expected: PASS. Note: the import of `inventory.ts` from `boss.ts` may create an import cycle (`inventory → player`, `boss → inventory`). That is fine as long as there's no top-level use. If Vitest reports a cycle error, move `pushEvents` usage behind the function calls; it already is.

- [ ] **Step 6: Run the full check**

Run: `npm run check`
Expected: exit 0. Existing tests that assert exact `pendingEvents` lists after a Boss win, a 7th streak day or a rank-up now also see `itemObtained`. Filter those assertions by the event type they are about, and never delete them.

- [ ] **Step 7: Commit**

```bash
git add src/db/repo src/domain/types.ts src/ui/overlays/EventHost.tsx
git commit -m "feat(items): drops from Boss wins, every 7 streak days and exercise rank-ups"
```

---

### Task 5: Item titles in the shared title list; ownership

**Files:**
- Modify:
  - `src/domain/achievements.ts` (`ALL_TITLES`)
  - `src/db/repo/player.ts:74-79` (`setTitle`)
  - `src/ui/screens/StatusScreen.tsx:27,141,150` (owned title ids)
- Test: `src/domain/achievements.test.ts`, `src/db/repo/player.test.ts` (or create `src/db/repo/titles.test.ts` if there's no player test file)

**Interfaces:**
- Produces:
  - `ALL_TITLES` includes `{ id: 'title-…', title: name, description: 'Found as an item drop.' }`.
  - `ownedTitleIds(database): Promise<string[]>` in `src/db/repo/player.ts`, made of achievement ids plus the inventory's `title-` ids.

- [ ] **Step 1: Write the failing tests.** Append to `src/domain/achievements.test.ts` inside `describe('titleFor')`:

```ts
  it('knows item titles too', () => {
    expect(titleFor('title-warden-of-dawn')).toBe('Warden of Dawn');
    expect(ALL_TITLES.filter((t) => t.id.startsWith('title-'))).toHaveLength(30);
  });
```

Update that file's existing exact-list test (`knows the Boss titles too`) to `[...ACHIEVEMENTS ids, ...ALL_BOSSES ids, ...TITLES ids]`. Import `TITLES` from `../config/items`. **Ruling:** `ALL_TITLES` now ends with item titles, per spec §1c.

Create or append (choose by `ls src/db/repo/player.test.ts`) a test:

```ts
import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { ownedTitleIds, setTitle } from './player';

describe('titles from the inventory', () => {
  it('can be equipped once found, and stay locked before', async () => {
    const db = await setupPlayer('2026-10-05');
    await expect(setTitle(db, 'title-ironheart')).rejects.toThrow('That title is still locked.');
    await db.inventory.put({ itemId: 'title-ironheart', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' });
    await setTitle(db, 'title-ironheart');
    expect((await db.player.get(1))!.titleId).toBe('title-ironheart');
    expect(await ownedTitleIds(db)).toContain('title-ironheart');
    await db.inventory.put({ itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' });
    expect(await ownedTitleIds(db)).not.toContain('theme-ember');
    await expect(setTitle(db, 'theme-ember')).rejects.toThrow('That title is still locked.');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/achievements.test.ts src/db/repo/player.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/domain/achievements.ts`: import `TITLES` from `../config/items`, and append to `ALL_TITLES`:

```ts
  ...TITLES.map((t) => ({ id: t.id, title: t.name, description: 'Found as an item drop.' })),
```

`src/db/repo/player.ts`:

```ts
/** Every title the player may wear: unlocked achievements/Bosses plus item titles in the inventory. */
export async function ownedTitleIds(database: AshbornDB): Promise<string[]> {
  const achieved = (await database.achievements.toArray()).map((a) => a.id);
  const items = (await database.inventory.toArray()).map((r) => r.itemId).filter((id) => id.startsWith('title-'));
  return [...achieved, ...items];
}
```

In `setTitle`, replace the lock check with:

```ts
    if (titleId !== null && !(await ownedTitleIds(database)).includes(titleId)) throw new Error('That title is still locked.');
```

`src/ui/screens/StatusScreen.tsx`:
- Line 27 becomes `const unlockedIds = useLiveQuery(() => ownedTitleIds(db), [], [] as string[]);`, importing `ownedTitleIds` from `../../db/repo/player`.
- In the list at line 150, item titles must show only once owned. Change the filter to `(t) => !(t.id.startsWith('boss-') || t.id.startsWith('title-')) || unlockedIds.includes(t.id)`, and update the comment to `{/* Achievements always; Boss and item titles once earned. */}`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/achievements.test.ts src/db/repo/player.test.ts src/ui/screens/StatusScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/domain/achievements.ts src/domain/achievements.test.ts src/db/repo/player.ts src/db/repo/player.test.ts src/ui/screens/StatusScreen.tsx
git commit -m "feat(items): item titles join the shared title list and can be equipped once found"
```

---

### Task 6: App-wide theme, the Emblem, and the Status card

**Files:**
- Create:
  - `src/ui/hooks/theme.ts`, `src/ui/hooks/theme.test.tsx`
  - `src/ui/components/frames.ts`
  - `src/ui/components/Emblem.tsx`, `src/ui/components/Emblem.test.tsx`
- Modify: `src/App.tsx` (call `useEquippedTheme`), `src/ui/screens/StatusScreen.tsx` (emblem, Shields, Inventory button)
- Test: `src/ui/screens/StatusScreen.test.tsx`

**Interfaces:**
- Produces:
  - `applyTheme(theme: ThemeItem, root?: HTMLElement): void`, which sets `--color-glow` and `--color-glow-soft` on the root.
  - `useEquippedTheme(enabled: boolean): void`
  - `FRAME_PATHS: Record<string, string>`: SVG inner markup per frame id, including `frame-hex`, drawn with `currentColor`.
  - `Emblem({ name, frameId, size? }: { name: string; frameId: string | null; size?: number })`, which renders `data-testid="emblem"` and `data-frame={id}`.
  - `StatusScreen` prop: `onOpenInventory?: () => void`.

- [ ] **Step 1: Write the failing tests**

`src/ui/hooks/theme.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, getTheme } from '../../config/items';
import { applyTheme } from './theme';

describe('applyTheme', () => {
  it('sets only the two accent variables', () => {
    const root = document.createElement('div');
    applyTheme(getTheme('theme-ember'), root);
    expect(root.style.getPropertyValue('--color-glow')).toBe('#ff8a3d');
    expect(root.style.getPropertyValue('--color-glow-soft')).toBe('#764223');
    applyTheme(DEFAULT_THEME, root);
    expect(root.style.getPropertyValue('--color-glow')).toBe('#3ab8ff');
    expect(root.style.getPropertyValue('--color-gold')).toBe('');
  });
});
```

`src/ui/components/Emblem.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FRAMES } from '../../config/items';
import { FRAME_PATHS } from './frames';
import { Emblem } from './Emblem';

describe('Emblem', () => {
  it('shows the uppercase initial inside the equipped frame, default when none or unknown', () => {
    const { getByTestId, rerender } = render(<Emblem name="kai" frameId="frame-flame-halo" />);
    expect(getByTestId('emblem').textContent).toBe('K');
    expect(getByTestId('emblem').getAttribute('data-frame')).toBe('frame-flame-halo');
    rerender(<Emblem name="kai" frameId={null} />);
    expect(getByTestId('emblem').getAttribute('data-frame')).toBe('frame-hex');
    rerender(<Emblem name="kai" frameId="frame-nope" />);
    expect(getByTestId('emblem').getAttribute('data-frame')).toBe('frame-hex');
    expect(getByTestId('emblem').getAttribute('aria-hidden')).toBe('true');
  });

  it('has a drawing for every frame', () => {
    for (const f of FRAMES) expect(FRAME_PATHS[f.id]).toBeTruthy();
    expect(FRAME_PATHS['frame-hex']).toBeTruthy();
  });
});
```

Append to `src/ui/screens/StatusScreen.test.tsx`. Read it first to reuse its render setup (it seeds with `seedApp()` and renders `<StatusScreen onNavigate={…} />`).

```tsx
  it('shows the emblem, held Shields and an Inventory button', async () => {
    await db.player.update(1, { shields: 2 });
    const onOpenInventory = vi.fn();
    render(<StatusScreen onNavigate={() => {}} onOpenInventory={onOpenInventory} />);
    expect(await screen.findByTestId('emblem')).toBeTruthy();
    expect(screen.getByText(/2 Shields/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    expect(onOpenInventory).toHaveBeenCalledOnce();
  });

  it('hides the Shield count when none are held', async () => {
    render(<StatusScreen onNavigate={() => {}} />);
    await screen.findByTestId('emblem');
    expect(screen.queryByText(/Shield/)).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/hooks/theme.test.tsx src/ui/components/Emblem.test.tsx src/ui/screens/StatusScreen.test.tsx`
Expected: FAIL, with unresolved modules and missing elements.

- [ ] **Step 3: Implement**

`src/ui/hooks/theme.ts`:

```ts
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { getTheme, type ThemeItem } from '../../config/items';
import { db } from '../../db/schema';

/** Sets only the accent variables, so warning red and reward gold never change. */
export function applyTheme(theme: ThemeItem, root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--color-glow', theme.glow);
  root.style.setProperty('--color-glow-soft', theme.soft);
}

/** Keeps the app's accent in step with the equipped theme. */
export function useEquippedTheme(enabled: boolean): void {
  const themeId = useLiveQuery(async () => (enabled ? ((await db.player.get(1))?.themeId ?? null) : null), [enabled], null);
  useEffect(() => {
    applyTheme(getTheme(themeId));
  }, [themeId]);
}
```

`src/ui/components/frames.ts`: these are the approved designs from the spec mockup, in a viewBox of `-2 -4 64 66`, using `currentColor`.

```ts
const C = 'currentColor';
/** Original emblem frames, drawn for Ashborn. */
export const FRAME_PATHS: Record<string, string> = {
  'frame-hex': `<path d="M30 3 L53 16 L53 44 L30 57 L7 44 L7 16 Z" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-iron-hex': `<path d="M30 3 L54 16 L54 44 L30 57 L6 44 L6 16 Z" fill="none" stroke="${C}" stroke-width="3"/><path d="M30 8 L50 19 L50 41 L30 52 L10 41 L10 19 Z" fill="none" stroke="${C}" stroke-width="1" opacity=".5"/>`,
  'frame-thorned-crest': `<circle cx="30" cy="30" r="22" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M30 2 L33 9 L27 9Z M58 30 L51 33 L51 27Z M30 58 L27 51 L33 51Z M2 30 L9 27 L9 33Z M50 10 L46 17 L43 14Z M10 10 L17 14 L14 17Z M50 50 L43 46 L46 43Z M10 50 L14 43 L17 46Z" fill="${C}"/>`,
  'frame-winged-seal': `<circle cx="30" cy="30" r="17" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M13 30 C6 22 2 18 1 10 C8 16 12 18 15 22 M47 30 C54 22 58 18 59 10 C52 16 48 18 45 22" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-crown-rim': `<circle cx="30" cy="33" r="20" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M16 15 L20 4 L26 12 L30 2 L34 12 L40 4 L44 15 Z" fill="${C}"/>`,
  'frame-runic-circle': `<circle cx="30" cy="30" r="25" fill="none" stroke="${C}" stroke-width="1.5"/><circle cx="30" cy="30" r="20" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M30 5 L30 10 M55 30 L50 30 M30 55 L30 50 M5 30 L10 30 M47 13 L44 16 M13 47 L16 44 M47 47 L44 44 M13 13 L16 16" stroke="${C}" stroke-width="2"/>`,
  'frame-fang-ring': `<circle cx="30" cy="30" r="21" fill="none" stroke="${C}" stroke-width="3"/><path d="M22 9 L25 18 L28 10 M38 9 L35 18 L32 10 M22 51 L25 42 L28 50 M38 51 L35 42 L32 50" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-star-sigil': `<path d="M30 2 L36 22 L57 22 L40 35 L47 56 L30 43 L13 56 L20 35 L3 22 L24 22 Z" fill="none" stroke="${C}" stroke-width="2.5"/>`,
  'frame-chain-loop': `<g fill="none" stroke="${C}" stroke-width="2.2"><ellipse cx="30" cy="6" rx="6" ry="4"/><ellipse cx="54" cy="30" rx="4" ry="6"/><ellipse cx="30" cy="54" rx="6" ry="4"/><ellipse cx="6" cy="30" rx="4" ry="6"/><ellipse cx="47" cy="13" rx="5" ry="4" transform="rotate(45 47 13)"/><ellipse cx="47" cy="47" rx="5" ry="4" transform="rotate(-45 47 47)"/><ellipse cx="13" cy="47" rx="5" ry="4" transform="rotate(45 13 47)"/><ellipse cx="13" cy="13" rx="5" ry="4" transform="rotate(-45 13 13)"/></g>`,
  'frame-flame-halo': `<circle cx="30" cy="32" r="18" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M18 18 C14 10 20 6 18 0 C26 6 24 12 26 14 M42 18 C46 10 40 6 42 0 C34 6 36 12 34 14 M30 13 C26 6 32 3 30 -2 C36 4 34 9 34 13" fill="none" stroke="${C}" stroke-width="2"/>`,
  'frame-frost-shard': `<path d="M30 2 L38 22 L58 30 L38 38 L30 58 L22 38 L2 30 L22 22 Z" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M30 12 L30 48 M12 30 L48 30" stroke="${C}" stroke-width="1" opacity=".5"/>`,
  'frame-serpent-coil': `<path d="M30 8 C46 8 52 20 52 30 C52 44 42 52 30 52 C16 52 8 42 8 30 C8 18 18 12 26 12" fill="none" stroke="${C}" stroke-width="3"/><path d="M26 12 L18 8 L22 15 Z" fill="${C}"/>`,
  'frame-shield-crest': `<path d="M30 3 L53 11 L51 34 C49 46 40 53 30 57 C20 53 11 46 9 34 L7 11 Z" fill="none" stroke="${C}" stroke-width="2.5"/>`,
  'frame-eclipse-ring': `<circle cx="30" cy="30" r="23" fill="none" stroke="${C}" stroke-width="2"/><path d="M30 7 A23 23 0 0 1 30 53 A17 23 0 0 0 30 7 Z" fill="${C}" opacity=".8"/>`,
  'frame-antler-crest': `<circle cx="30" cy="34" r="18" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M20 20 L12 6 M16 13 L8 12 M14 9 L16 2 M40 20 L48 6 M44 13 L52 12 M46 9 L44 2" fill="none" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>`,
  'frame-blade-cross': `<circle cx="30" cy="30" r="17" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M6 6 L54 54 M54 6 L6 54" stroke="${C}" stroke-width="2.5"/><path d="M4 4 L10 6 L6 10Z M56 4 L50 6 L54 10Z" fill="${C}"/>`,
};
```

`src/ui/components/Emblem.tsx`:

```tsx
import { FRAME_PATHS } from './frames';

/** The player's initial inside their equipped frame, in the theme accent. Decorative. */
export function Emblem({ name, frameId, size = 50 }: { name: string; frameId: string | null; size?: number }) {
  const id = frameId && FRAME_PATHS[frameId] ? frameId : 'frame-hex';
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span data-testid="emblem" data-frame={id} aria-hidden="true" className="relative inline-flex shrink-0 items-center justify-center text-glow" style={{ width: size, height: size }}>
      <svg viewBox="-2 -4 64 66" className="absolute inset-0 h-full w-full" dangerouslySetInnerHTML={{ __html: FRAME_PATHS[id]! }} />
      <span className="relative text-lg font-semibold text-ink">{initial}</span>
    </span>
  );
}
```

`dangerouslySetInnerHTML` here takes only the constant strings in `frames.ts`; there's no user input.

`src/App.tsx`: after `useDayCycle(registered);`, add `useEquippedTheme(registered);`, importing it from `./ui/hooks/theme`.

`src/ui/screens/StatusScreen.tsx`:
- Add `onOpenInventory?: () => void` to the props type, next to `onNavigate`.
- Wrap the name block: change `<div>` (line ~71, containing the name and title) to `<div className="flex items-center gap-3"><Emblem name={profile.name} frameId={player.frameId} /><div>` … `</div></div>`.
- After the streak `<p>`, add:

  ```tsx
          {player.shields > 0 && (
            <p className="mt-1 text-sm text-muted">
              <span aria-hidden="true">🛡 </span>
              {player.shields} {player.shields === 1 ? 'Shield' : 'Shields'}
            </p>
          )}
          <Button className="mt-3 w-full" onClick={() => onOpenInventory?.()}>
            Inventory
          </Button>
  ```

- Import `Emblem`, and `Button` if it isn't imported already.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/hooks/theme.test.tsx src/ui/components/Emblem.test.tsx src/ui/screens/StatusScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0. If the lint rule `react/no-danger` fires, add a single-line disable comment on that prop with the reason "constant SVG from frames.ts".

- [ ] **Step 6: Commit**

```bash
git add src/ui src/App.tsx
git commit -m "feat(items): app-wide accent themes, emblem with frames, Shields and Inventory button on Status"
```

---

### Task 7: The Inventory screen (tabs, preview, equip)

**Files:**
- Create: `src/ui/screens/InventoryScreen.tsx`, `src/ui/screens/InventoryScreen.test.tsx`
- Modify: `src/ui/screens/StatusScreen.tsx`, so it shows the Inventory in place of itself when opened

**Interfaces:**
- Consumes:
  - `THEMES`, `FRAMES`, `TITLES`, `DEFAULT_THEME`, `DEFAULT_FRAME`, `getTheme` (Task 1)
  - `equipTheme`, `equipFrame` (Task 4); `setTitle`, `ownedTitleIds` (Task 5)
  - `applyTheme` (Task 6), `Emblem` (Task 6)
- Produces: `InventoryScreen({ onBack }: { onBack: () => void })`.

- [ ] **Step 1: Write the failing test** `src/ui/screens/InventoryScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { InventoryScreen } from './InventoryScreen';

const root = document.documentElement;
beforeEach(async () => {
  await seedApp('2026-10-05');
  await db.inventory.bulkPut([
    { itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' },
    { itemId: 'frame-flame-halo', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'streak' },
    { itemId: 'title-ironheart', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'rankUp' },
  ]);
  root.style.setProperty('--color-glow', '#3ab8ff');
});

describe('InventoryScreen', () => {
  it('lists themes with counts and hidden unfound items', async () => {
    render(<InventoryScreen onBack={() => {}} />);
    expect(await screen.findByText('2 of 16 found')).toBeTruthy();
    expect(screen.getAllByText('? ? ?')).toHaveLength(14);
    expect(screen.getByRole('button', { name: /System Blue/ }).textContent).toContain('Equipped');
  });

  it('previews without saving, Equip saves, leaving restores the equipped theme', async () => {
    const { unmount } = render(<InventoryScreen onBack={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Ember/ }));
    expect(root.style.getPropertyValue('--color-glow')).toBe('#ff8a3d');
    expect((await db.player.get(1))!.themeId).toBeNull();
    unmount();
    expect(root.style.getPropertyValue('--color-glow')).toBe('#3ab8ff');

    render(<InventoryScreen onBack={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Ember/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Equip Ember' }));
    await waitFor(async () => expect((await db.player.get(1))!.themeId).toBe('theme-ember'));
  });

  it('frames, titles and shields tabs', async () => {
    await db.player.update(1, { shields: 1 });
    const onBack = vi.fn();
    render(<InventoryScreen onBack={onBack} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Frames' }));
    fireEvent.click(await screen.findByRole('button', { name: /Flame Halo/ }));
    expect(screen.getByTestId('emblem').getAttribute('data-frame')).toBe('frame-flame-halo');
    fireEvent.click(screen.getByRole('button', { name: 'Equip Flame Halo' }));
    await waitFor(async () => expect((await db.player.get(1))!.frameId).toBe('frame-flame-halo'));

    fireEvent.click(screen.getByRole('tab', { name: 'Titles' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Equip Ironheart' }));
    await waitFor(async () => expect((await db.player.get(1))!.titleId).toBe('title-ironheart'));

    fireEvent.click(screen.getByRole('tab', { name: 'Shields' }));
    expect(await screen.findByText('1 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/screens/InventoryScreen.test.tsx`
Expected: FAIL, because it cannot resolve `./InventoryScreen`.

- [ ] **Step 3: Create `src/ui/screens/InventoryScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { DEFAULT_FRAME, DEFAULT_THEME, FRAMES, getTheme, THEMES, TITLES, type ItemDef } from '../../config/items';
import { progression } from '../../config/progression';
import { equipFrame, equipTheme } from '../../db/repo/inventory';
import { ownedTitleIds, setTitle } from '../../db/repo/player';
import { db } from '../../db/schema';
import { ALL_TITLES } from '../../domain/achievements';
import { Button } from '../components/Button';
import { Emblem } from '../components/Emblem';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { applyTheme } from '../hooks/theme';

type TabId = 'themes' | 'frames' | 'titles' | 'shields';
const TABS: { id: TabId; label: string }[] = [
  { id: 'themes', label: 'Themes' }, { id: 'frames', label: 'Frames' }, { id: 'titles', label: 'Titles' }, { id: 'shields', label: 'Shields' },
];

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<TabId>('themes');
  const [preview, setPreview] = useState<string | null>(null);
  const player = useLiveQuery(() => db.player.get(1), []);
  const profile = useLiveQuery(() => db.profile.get(1), []);
  const owned = useLiveQuery(async () => new Set((await db.inventory.toArray()).map((r) => r.itemId)), [], new Set<string>());
  const titles = useLiveQuery(() => ownedTitleIds(db), [], [] as string[]);
  const equippedTheme = player?.themeId ?? null;

  // A theme preview recolours the app; the equipped theme always comes back when you leave.
  useEffect(() => {
    if (tab === 'themes' && preview) applyTheme(getTheme(preview === DEFAULT_THEME.id ? null : preview));
    else applyTheme(getTheme(equippedTheme));
  }, [tab, preview, equippedTheme]);
  useEffect(() => () => applyTheme(getTheme(equippedTheme)), [equippedTheme]);

  if (!player || !profile) return null;

  const grid = (defaultItem: ItemDef, items: readonly ItemDef[], equippedId: string | null) => {
    const found = items.filter((i) => owned.has(i.id));
    const equipped = equippedId ?? defaultItem.id;
    return (
      <>
        <p className="mb-2 text-sm text-muted">{`${found.length + 1} of ${items.length + 1} found`}</p>
        <div className="grid grid-cols-3 gap-2">
          {[defaultItem, ...items].map((item) =>
            item.id === defaultItem.id || owned.has(item.id) ? (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreview(item.id)}
                className={`min-h-16 rounded border p-2 text-sm ${preview === item.id ? 'border-glow' : 'border-glow-soft'}`}
                style={item.kind === 'theme' ? { borderColor: (item as typeof DEFAULT_THEME).glow } : undefined}
              >
                {item.name}
                {equipped === item.id && <span className="block text-xs text-glow">Equipped</span>}
                {preview === item.id && equipped !== item.id && <span className="block text-xs text-muted">Previewing</span>}
              </button>
            ) : (
              <div key={item.id} className="flex min-h-16 items-center justify-center rounded border border-glow-soft/50 p-2 text-sm text-muted">
                ? ? ?
              </div>
            ),
          )}
        </div>
      </>
    );
  };

  const selected = preview ? [DEFAULT_THEME, DEFAULT_FRAME, ...THEMES, ...FRAMES].find((i) => i.id === preview) : undefined;
  const equipSelected = async () => {
    if (!selected) return;
    const id = selected.id === DEFAULT_THEME.id || selected.id === DEFAULT_FRAME.id ? null : selected.id;
    if (selected.kind === 'theme') await equipTheme(db, id);
    else await equipFrame(db, id);
    setPreview(null);
  };

  return (
    <Screen title="Inventory">
      <Button variant="ghost" onClick={onBack} className="mb-3">
        Back
      </Button>
      <div role="tablist" aria-label="Inventory" className="mb-3 grid grid-cols-4 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setPreview(null);
            }}
            className={`min-h-11 border-b-2 text-sm ${tab === t.id ? 'border-glow text-glow' : 'border-transparent text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'themes' && (
        <SystemWindow title="Themes">
          {grid(DEFAULT_THEME, THEMES, player.themeId)}
          {selected?.kind === 'theme' && (
            <div className="mt-3">
              <p className="text-sm text-muted">This is how your windows and bars will look.</p>
              <div className="mt-2 h-2 rounded bg-glow-soft">
                <div className="h-2 w-3/5 rounded bg-glow" />
              </div>
              <Button className="mt-3 w-full" onClick={() => void equipSelected()}>{`Equip ${selected.name}`}</Button>
            </div>
          )}
        </SystemWindow>
      )}

      {tab === 'frames' && (
        <SystemWindow title="Frames">
          <div className="mb-3 flex justify-center">
            <Emblem name={profile.name} frameId={selected?.kind === 'frame' ? (selected.id === DEFAULT_FRAME.id ? null : selected.id) : player.frameId} size={72} />
          </div>
          {grid(DEFAULT_FRAME, FRAMES, player.frameId)}
          {selected?.kind === 'frame' && <Button className="mt-3 w-full" onClick={() => void equipSelected()}>{`Equip ${selected.name}`}</Button>}
        </SystemWindow>
      )}

      {tab === 'titles' && (
        <SystemWindow title="Titles">
          <p className="mb-2 text-sm text-muted">{`${TITLES.filter((t) => titles.includes(t.id)).length} of ${TITLES.length} item titles found`}</p>
          <ul className="space-y-2">
            {ALL_TITLES.filter((t) => titles.includes(t.id)).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className={player.titleId === t.id ? 'text-glow' : 'text-ink'}>{t.title}</span>
                {player.titleId === t.id ? (
                  <span className="text-xs text-glow">Equipped</span>
                ) : (
                  <Button variant="ghost" aria-label={`Equip ${t.title}`} onClick={() => void setTitle(db, t.id)}>
                    Equip
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}

      {tab === 'shields' && (
        <SystemWindow title="Streak Shields">
          <p className="text-2xl text-ink">{`${player.shields} of ${progression.items.maxShields}`}</p>
          <p className="mt-2 text-sm text-muted">
            A Shield saves your streak when you miss a day. It is used automatically, only when it can keep your streak alive. The penalty quest still comes.
          </p>
        </SystemWindow>
      )}
    </Screen>
  );
}
```

`src/ui/screens/StatusScreen.tsx`:
- At the top of the component, add `const [showInventory, setShowInventory] = useState(false);`.
- After the loading guards, add `if (showInventory) return <InventoryScreen onBack={() => setShowInventory(false)} />;`.
- The Inventory button's `onClick` becomes `() => { setShowInventory(true); onOpenInventory?.(); }`.
- Import `InventoryScreen` and `useState`.

**Hook order:** `showInventory` must be declared before any early return, so the hooks keep a stable order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/screens/InventoryScreen.test.tsx src/ui/screens/StatusScreen.test.tsx`
Expected: PASS. If `getByRole('button', { name: /Ember/ })` matches more than one element, scope the query with `within(screen.getByRole('tabpanel'))` and add `role="tabpanel"` to the SystemWindow wrapper. Ledger any such change.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/ui/screens
git commit -m "feat(items): Inventory screen with tabs, live preview and equip"
```

---

### Task 8: Reward screen, Shield note, and event routing

**Files:**
- Create:
  - `src/ui/overlays/ItemObtainedOverlay.tsx`, `src/ui/overlays/ItemObtainedOverlay.test.tsx`
  - `src/ui/overlays/ShieldToast.tsx`
- Modify: `src/ui/overlays/EventHost.tsx` (replace the two bridges)
- Test: `src/ui/overlays/EventHost.test.tsx`

**Interfaces:**
- Consumes: the `itemObtained` and `shieldUsed` events (Tasks 3–4), `equipTheme`/`equipFrame` (Task 4), `setTitle` (Task 5), `Emblem` (Task 6).
- Produces: `ItemObtainedOverlay({ event, playerName, onClose })` and `ShieldToast({ count, streak, onDone })`.

- [ ] **Step 1: Write the failing tests** `src/ui/overlays/ItemObtainedOverlay.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { playSound } from '../../platform/audio';
import { seedApp } from '../../test/uiFixtures';
import { ItemObtainedOverlay } from './ItemObtainedOverlay';

vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }));
beforeEach(async () => {
  vi.mocked(playSound).mockClear();
  await seedApp('2026-10-05');
  await db.inventory.put({ itemId: 'frame-flame-halo', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'streak' });
});

describe('ItemObtainedOverlay', () => {
  it('shows the item silently; Equip now equips and closes', async () => {
    const onClose = vi.fn();
    render(<ItemObtainedOverlay event={{ type: 'itemObtained', source: 'streak', itemId: 'frame-flame-halo', shield: false }} playerName="Kai" onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Item obtained' });
    expect(dialog.textContent).toContain('Flame Halo');
    expect(dialog.textContent).toContain('Emblem frame');
    expect(dialog.textContent).toContain('From: 7-day streak');
    expect(playSound).not.toHaveBeenCalled();
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Equip now' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect((await db.player.get(1))!.frameId).toBe('frame-flame-halo');
    expect(playSound).toHaveBeenCalledWith('achievement');
  });

  it('Later just closes; a Shield and "complete" have no Equip now', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<ItemObtainedOverlay event={{ type: 'itemObtained', source: 'boss', itemId: null, shield: true }} playerName="Kai" onClose={onClose} />);
    expect(screen.getByRole('dialog').textContent).toContain('Streak Shield');
    expect(screen.queryByRole('button', { name: 'Equip now' })).toBeNull();
    rerender(<ItemObtainedOverlay event={{ type: 'itemObtained', source: 'boss', itemId: null, shield: false }} playerName="Kai" onClose={onClose} />);
    expect(screen.getByRole('dialog').textContent).toContain('Collection complete');
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect((await db.player.get(1))!.frameId).toBeNull();
  });
});
```

Append to `src/ui/overlays/EventHost.test.tsx` inside `describe('EventHost')`:

```tsx
  it('shows the item reward screen and the Shield note, silently', async () => {
    await setMeta(db, 'pendingEvents', [
      { type: 'shieldUsed', count: 1, streak: 9 },
      { type: 'itemObtained', source: 'boss', itemId: null, shield: true },
    ]);
    render(<EventHost />);
    expect((await screen.findByRole('status')).textContent).toContain('Your 9-day streak is safe');
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toHaveLength(1), { timeout: 5000 });
    fireEvent.click(await screen.findByRole('button', { name: 'Later' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });
```

The Shield toast dismisses itself after 3.5 s. The `waitFor` timeout of 5 s covers this; the file already fakes only `Date`, so real timers run.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/overlays/ItemObtainedOverlay.test.tsx src/ui/overlays/EventHost.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/ui/overlays/ItemObtainedOverlay.tsx`:

```tsx
import { useRef } from 'react';
import { getItem } from '../../config/items';
import { equipFrame, equipTheme } from '../../db/repo/inventory';
import { setTitle } from '../../db/repo/player';
import { db } from '../../db/schema';
import type { GameEvent } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { Emblem } from '../components/Emblem';
import { SystemWindow } from '../components/SystemWindow';

const KIND_LABEL = { theme: 'Window theme', frame: 'Emblem frame', title: 'Title' } as const;
const SOURCE_LABEL = { boss: 'Boss win', streak: '7-day streak', rankUp: 'Exercise rank-up' } as const;

type Props = { event: Extract<GameEvent, { type: 'itemObtained' }>; playerName: string; onClose: () => void };

/** "Item obtained". Silent until a button is tapped (iPhone: sound only after a tap). */
export function ItemObtainedOverlay({ event, playerName, onClose }: Props) {
  const item = event.itemId ? getItem(event.itemId) : undefined;
  const done = useRef(false);
  const finish = async (equip: boolean) => {
    if (done.current) return;
    done.current = true;
    playSound('achievement');
    if (equip && item) {
      if (item.kind === 'theme') await equipTheme(db, item.id);
      else if (item.kind === 'frame') await equipFrame(db, item.id);
      else await setTitle(db, item.id);
    }
    onClose();
  };

  const name = item ? item.name : event.shield ? 'Streak Shield' : 'Collection complete';
  const kind = item ? KIND_LABEL[item.kind] : event.shield ? 'Saves your streak for one missed day' : 'You have found every item. Well done!';

  return (
    <div role="dialog" aria-modal="true" aria-label="Item obtained" className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void/90">
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Item obtained</p>
          <p className="mt-1 text-sm text-muted">{`From: ${SOURCE_LABEL[event.source]}`}</p>
          <div className="my-3 flex justify-center">
            {item?.kind === 'frame' ? (
              <Emblem name={playerName} frameId={item.id} size={80} />
            ) : item?.kind === 'theme' ? (
              <span aria-hidden="true" className="block h-16 w-24 rounded border-2" style={{ borderColor: item.glow, boxShadow: `0 0 16px ${item.glow}` }} />
            ) : (
              <span aria-hidden="true" className="text-5xl">{event.shield ? '🛡' : item ? '◆' : '✦'}</span>
            )}
          </div>
          <p className="text-lg text-ink">{name}</p>
          <p className="text-sm text-muted">{kind}</p>
          <div className={`mt-4 grid gap-2 ${item ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {item && <Button onClick={() => void finish(true)}>Equip now</Button>}
            <Button variant="ghost" onClick={() => void finish(false)}>
              Later
            </Button>
          </div>
        </SystemWindow>
      </div>
    </div>
  );
}
```

`src/ui/overlays/ShieldToast.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { SystemWindow } from '../components/SystemWindow';

/** Non-blocking note after the daily reset used a Shield. Silent (it appears without a tap). */
export function ShieldToast({ count, streak, onDone }: { count: number; streak: number; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), 3500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div role="status" className="safe-x pointer-events-none fixed inset-x-0 top-0 z-40" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <SystemWindow className="mx-auto max-w-md">
        <p className="text-ink">
          <span aria-hidden="true">🛡 </span>
          {`${count === 1 ? 'Streak Shield' : `${count} Streak Shields`} used. Your ${streak}-day streak is safe.`}
        </p>
      </SystemWindow>
    </div>
  );
}
```

`src/ui/overlays/EventHost.tsx`: replace the two bridge lines (`shieldUsed` and `itemObtained` returning null) with:

```tsx
  if (event.type === 'shieldUsed') {
    return <ShieldToast key={`shield-${event.streak}-${event.count}`} count={event.count} streak={event.streak} onDone={() => void dismissEvent(db)} />;
  }
  if (event.type === 'itemObtained') {
    return <ItemObtainedOverlay key={`item-${event.itemId ?? (event.shield ? 'shield' : 'complete')}`} event={event} playerName={playerName} onClose={() => void dismissEvent(db)} />;
  }
```

Also add `const playerName = useLiveQuery(async () => (await db.profile.get(1))?.name ?? '', [], '');` next to the `events` query, and import `ItemObtainedOverlay` and `ShieldToast`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/overlays`
Expected: PASS.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/ui/overlays
git commit -m "feat(items): 'Item obtained' reward screen and the Shield note"
```

---

### Task 9: iPhone (WebKit) end-to-end

**Files:**
- Create: `e2e/inventory.spec.ts`

**Interfaces:**
- Consumes:
  - `onboard(page)` from `e2e/helpers.ts`
  - Settings' **Export backup** button and **Import backup file** input
  - The **Replace my data** confirm button
  - The Status screen's **Inventory** button and the Inventory's tabs and buttons

- [ ] **Step 1: Write the test** `e2e/inventory.spec.ts`. The item is seeded through the app's own backup restore flow.

```ts
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

test('an earned theme can be previewed and equipped from the Inventory', async ({ page }) => {
  await onboard(page);

  // Default look first.
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await page.getByRole('button', { name: 'Inventory' }).click();
  await expect(page.getByText('1 of 16 found')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();

  // Seed one earned theme through Export → edit → Import (the app's own restore flow).
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  backup.data.inventory = [{ itemId: 'theme-ember', obtainedAt: new Date().toISOString(), source: 'boss' }];
  await page.getByLabel('Import backup file').setInputFiles({ name: 'ashborn.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: 'Replace my data' }).click();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await page.getByRole('button', { name: 'Inventory' }).click();
  await expect(page.getByText('2 of 16 found')).toBeVisible();
  await page.getByRole('button', { name: /Ember/ }).click();
  const glow = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-glow').trim());
  await expect.poll(glow).toBe('#ff8a3d');
  await page.getByRole('button', { name: 'Equip Ember' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.reload();
  await expect.poll(glow).toBe('#ff8a3d');
});
```

- If **Export backup** is not a `button` (check `SettingsScreen.tsx:141`), use the role it renders as.
- If the app shares the file through the Web Share API instead of a download in WebKit, read `exportBackup` in `src/platform` and switch to building the backup with `page.evaluate` against the app's own export. Record that in the ledger.

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/inventory.spec.ts`
Expected: PASS.

- [ ] **Step 3: Mutation check.** Temporarily make `applyTheme` a no-op and re-run. Expected: FAIL. Restore it.

- [ ] **Step 4: Run the full e2e suite**

Run: `npm run e2e`
Expected: all pass (the known offline-reload `fixme` stays skipped), and the perf median stays ≤ 1500 ms.

- [ ] **Step 5: Commit**

```bash
git add e2e/inventory.spec.ts
git commit -m "test(e2e): earned theme preview and equip on WebKit, persists after reload"
```

---

### Task 10: Release 1.6.0

**Files:**
- Modify: `package.json`, `package-lock.json`, `src/data/changelog.ts`, `docs/credits.md`

- [ ] **Step 1: Bump the version.** Run `npm version 1.6.0 --no-git-tag-version`, then check that `git diff --stat` shows only `package.json` and `package-lock.json`.

- [ ] **Step 2: Run the changelog test to verify it fails**

Run: `npx vitest run src/data`
Expected: FAIL (the top entry is 1.5.0).

- [ ] **Step 3: Add the changelog entry** at the top of `CHANGELOG`:

```ts
  {
    version: '1.6.0',
    date: '2026-10-07',
    title: 'Inventory',
    notes: [
      'New Inventory: earn colour themes, emblem frames and titles. Nothing can be bought.',
      'Rewards drop from Boss wins, every 7 days of streak, and new exercise ranks.',
      'Streak Shields save your streak when you miss a day. You can hold two.',
    ],
  },
```

- [ ] **Step 4: Update the credits.** In `docs/credits.md` under Art, add:

```md
- Inventory items (`src/config/items.ts`, `src/ui/components/frames.ts`): the window themes, emblem frames and item titles are original, made for Ashborn.
```

- [ ] **Step 5: Verify everything**

Run: `npm run check` and then `npm run e2e`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/data/changelog.ts docs/credits.md
git commit -m "chore(release): v1.6.0 — Inventory, earned rewards and Streak Shields"
```

Don't push. Pushing publishes the site, and the owner must say "push".
