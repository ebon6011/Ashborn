# Ashborn — Inventory & Earned Rewards (v1.6.0)

Date: 2026-10-06
Status: design approved in chat (3 parts); awaiting written-spec review

## Intent
Give players a collection of cosmetic rewards and Streak Shields that they can **only earn, never buy**. The collection rewards Boss wins, keeping a streak and getting stronger at exercises. It adds no currency, shop, backend or tracking.

## Owner decisions
- **Item kinds:** window themes (they change the whole app's accent colour), emblem frames (around a new emblem showing the player's initial, next to their name), titles (one shared list with achievement and Boss titles), and Streak Shields.
- **Collection size:** large. 15 themes, 15 frames and 30 titles, plus the free defaults (the current blue theme and the plain hex frame).
- **Streak Shield:**
  - A player holds at most 2.
  - A missed day uses one automatically. The streak is **kept but does not increase**, and the **penalty quest still comes**.
  - Shields are used only when they can save the streak. If there are more missed days than Shields, none are used.
- **When drops happen:**
  - every Boss win;
  - every 7 days of streak (7, 14, 21 …);
  - every **exercise** rank-up (not player rank).
  - Nothing is awarded retroactively for streaks or rank-ups reached before this update.
- **How a drop works:**
  - A drop always gives something, and never a duplicate.
  - The kind is chosen by per-source rates in `src/config/progression.ts`, then a random unowned item of that kind.
  - If the rolled kind can't give anything (all owned, or Shields already at 2), the roll is repeated among the kinds that can, using the same rates.
  - If nothing at all can be given, the player sees "Collection complete".
- **Rewards:**
  - A reward screen offers **Equip now** or **Later**. It is silent until a tap.
  - The Shield-used note is a small toast that fades by itself.
- **The Inventory:** a page opened from an **Inventory** button on the Status screen, with tabs Themes / Frames / Titles / Shields. Unfound items show as "? ? ?". Tapping a theme or frame previews it, and **Equip** keeps it.
- **Storage:** a new `inventory` table plus 3 new player fields, via a versioned Dexie migration. Backups include the inventory.
- **Originality:** all names and designs are original (CLAUDE.md rule 4). Red and gold are never used as theme accents, so warnings (`--color-danger`) and rewards (`--color-gold`) keep their meaning.

## 1. The collection (`src/config/items.ts`)
Item ids are stable and must never be renamed.

### 1a. Themes (`theme-<id>`)
Free default: `theme-default` (#3ab8ff / #1d5c85).

| id | Name | accent (`--color-glow`) |
|---|---|---|
| theme-ember | Ember | #ff8a3d |
| theme-verdant | Verdant | #3dffa0 |
| theme-amethyst | Amethyst | #b07cff |
| theme-frost | Frost | #b4f0ff |
| theme-jade | Jade | #00c9a7 |
| theme-orchid | Orchid | #e07cff |
| theme-tidal | Tidal | #2ee6e6 |
| theme-moss | Moss | #9ccf3d |
| theme-twilight | Twilight | #7c8cff |
| theme-coral | Coral | #ff8f7a |
| theme-ashen | Ashen | #c8d0dc |
| theme-blossom | Blossom | #ff9ecf |
| theme-venom | Venom | #b6ff3d |
| theme-plum | Plum | #d05c9a |
| theme-cobalt | Cobalt | #4d6bff |

- Each theme also stores `soft` (`--color-glow-soft`), precomputed as 45% accent mixed with #05070d. The values are written into the config, not computed at runtime.
- Applying a theme sets only `--color-glow` and `--color-glow-soft` on `document.documentElement`.
- Hard-coded blues in the approved Boss art and backdrop stay as they are.

### 1b. Emblem frames (`frame-<id>`)
- Free default: `frame-hex` (plain hexagon).
- The 15 frames, as approved in the chat mockup:

  | id | Name |
  |---|---|
  | frame-iron-hex | Iron Hex |
  | frame-thorned-crest | Thorned Crest |
  | frame-winged-seal | Winged Seal |
  | frame-crown-rim | Crown Rim |
  | frame-runic-circle | Runic Circle |
  | frame-fang-ring | Fang Ring |
  | frame-star-sigil | Star Sigil |
  | frame-chain-loop | Chain Loop |
  | frame-flame-halo | Flame Halo |
  | frame-frost-shard | Frost Shard |
  | frame-serpent-coil | Serpent Coil |
  | frame-shield-crest | Shield Crest |
  | frame-eclipse-ring | Eclipse Ring |
  | frame-antler-crest | Antler Crest |
  | frame-blade-cross | Blade Cross |

- Each frame is SVG path data in a 60×60 box, drawn in `currentColor` (the theme accent), and lives in `src/ui/components/frames.ts`.
- The emblem shows the first letter of the player's name, uppercased, inside the frame.

### 1c. Titles (`title-<id>`)
The 30 titles: Shieldbearer, Dawnstrider, Ironheart, Ember Soul, Stormcaller, Unyielding, Pathfinder, Nightwalker, Stonefist, Swiftfoot, Steelspine, Frostborn, Ashwalker, Lionheart, Moonrunner, Rune Seeker, Tidebreaker, Skyreach, Grim Resolve, Bladewise, Warden of Dawn, Starforged, Peakclimber, Thunderstep, Silent Blade, Endless March, Iron Oath, Ascendant, Gatewalker, Last Light.

- The id is the kebab-case name, for example `title-warden-of-dawn`.
- They join `ALL_TITLES`. A test checks that all titles are unique across achievements, Bosses and items.

### 1d. Streak Shield
- The kind is `shield`. It is not a collectable row; it is counted in `player.shields`.
- `progression.items.maxShields = 2`.

## 2. Drop rates (`src/config/progression.ts` → `items`)
```
items: {
  maxShields: 2,
  streakDropEvery: 7,
  dropRates: {
    boss:      { theme: 0.35, frame: 0.35, title: 0.20, shield: 0.10 },
    streak:    { theme: 0.20, frame: 0.20, title: 0.30, shield: 0.30 },
    rankUp:    { theme: 0.30, frame: 0.30, title: 0.35, shield: 0.05 },
  },
}
```
- Each source's rates add up to 1, and a test checks this.
- **Roll:** `rollDrop(source, owned: Set<itemId>, shields: number, rng): DropResult` is pure, in `src/domain/items.ts`. It returns `{ kind: 'item', itemId } | { kind: 'shield' } | { kind: 'complete' }`.
  1. Find the kinds still available for this player.
  2. If none are available, return `complete`.
  3. Otherwise, renormalise those kinds' rates and pick a kind with `rng()`.
  4. For a theme, frame or title, pick uniformly among the unowned items of that kind with `rng()`.

## 3. Saved data (Dexie v3; no data lost)
- **New table:** `inventory: 'itemId'`, with rows `InventoryRow { itemId: string; obtainedAt: string /* ISO */; source: 'boss' | 'streak' | 'rankUp' }`.
- **`Player` gains** `themeId: string | null`, `frameId: string | null` (null means the default) and `shields: number`.
- **`DayRecord` gains** an optional `shielded?: true`, set on a missed day that a Shield covered.
- **`this.version(3).stores({ ...STORES_V2, inventory: 'itemId' }).upgrade(tx => …)`** sets `themeId: null`, `frameId: null` and `shields: 0` on the existing player row. Nothing else changes.
- **Backups:**
  - `SCHEMA_VERSION = 3`.
  - `backupMigrations[3]` adds `inventory: []` and the 3 player defaults to v2 backups.
  - `BACKUP_TABLES` gains `inventory`.
  - `validate.ts` checks:
    - inventory rows: known `itemId`, ISO `obtainedAt`, known `source`, no duplicates;
    - player fields: `shields` is an integer from 0 to `maxShields`, and `themeId` / `frameId` are null or an owned item of the right kind;
    - `shielded` on a day.
- **Unknown item ids** found in stored data (none today) are ignored when shown, not deleted.

## 4. When drops happen
All drops happen inside the existing `writeTx` transactions, so a drop and its cause commit together.

- **Boss win:** in `dealBossDamage`, after the `bossDefeated` event is queued, call `grantDrop(database, 'boss', now)`.
- **Streak:** in the daily-quest completion path (`days.ts`, where the streak increases), if the new `streak % streakDropEvery === 0`, call `grantDrop(database, 'streak', now)`. This happens after the daily XP, so any level-up is queued first.
- **Exercise rank-up:** in `logSet`, compare that exercise's `exerciseRank` before and after the new set. If the rank index went up, call `grantDrop(database, 'rankUp', now)`. A player's first set for an exercise sets the baseline and is never a rank-up.
- **`grantDrop`:**
  1. Reads the owned items and Shields.
  2. Calls `rollDrop`.
  3. Writes the inventory row, or `shields + 1` (never above 2).
  4. Queues `{ type: 'itemObtained'; itemId: string | null; shield: boolean; source }`. `itemId` is null for a Shield or for "complete".
- **Randomness:** the repo functions take an optional `rng` (default `Math.random`), so tests are deterministic.

## 5. Streak Shields in the daily reset
- `processDays` gets `shields: number` as input and returns `shieldsUsed: number` plus the list of shielded dates.
- **Rule:** let `missed` be the number of dates in the range that would break the streak.
  - If `missed ≥ 1` and `missed ≤ shields`, every one of those days is shielded. The streak is kept and doesn't increase, and those records are marked `missed` with `shielded: true`.
  - Otherwise, no Shields are used, and the streak resets to 0 as today.
- `needsPenalty` is unchanged: the penalty quest still comes.
- `startDay` writes `shields - shieldsUsed` and queues `{ type: 'shieldUsed'; count: number; streak: number }`.

## 6. Screens
- **Theme applied app-wide:**
  - `useEquippedTheme()` in `App` sets the two CSS variables from `player.themeId`. Unknown or null ids fall back to the default.
  - The Inventory page's preview sets them temporarily and restores the equipped theme on leave or unmount.
- **`Emblem` component:** the frame plus the initial, in the accent colour, about 50 px, placed before the name on the Status card.
- **Status card:**
  - It gets the emblem and an **Inventory** button.
  - It shows "🛡 N Shield(s)" next to the streak when `shields > 0`.
- **`InventoryScreen`**, reached from Status, with a back button:
  - **Tabs:** Themes / Frames / Titles / Shields.
  - **Grid of cells:** owned items by name, plus the default, with "equipped" or "previewing" badges. Unfound items show "? ? ?". Each tab shows a count like "N of 16 found"; the count includes the default.
  - **Tapping an owned theme or frame** previews it: a live sample window and bar for themes, and a live emblem for frames. An **Equip** button saves it.
  - **Titles:** every owned title (achievements, Bosses, items), with Equip. This writes the same `player.titleId` as the Status picker.
  - **Shields:** "N of 2" with a one-line explanation.
  - All buttons are at least 44 px and the page respects the safe area. There are no text inputs.
- **`ItemObtainedOverlay`** (a dialog, `aria-label "Item obtained"`):
  - It shows the item's preview, name, kind and "From: Boss win / 7-day streak / Exercise rank-up".
  - **Equip now** equips and dismisses; **Later** just dismisses. Equip now isn't shown for Shields or "Collection complete".
  - The backdrop does nothing. `achievement` plays on a button tap and never on show.
- **`shieldUsed`:** a non-blocking toast, "🛡 Streak Shield used. Your N-day streak is safe."
- **Event order:** `EventHost` routes both new events. The queue keeps its existing order, for example a level-up, then Boss defeated, then the item.

## 7. Tests (TDD)
- **Domain:**
  - **`rollDrop`:**
    - Rates match the config within ±2 percentage points over 20,000 seeded rolls per source.
    - There are never duplicates.
    - A complete kind is skipped, and Shields at 2 are skipped.
    - `complete` is returned when nothing is left.
  - **Config:** each source's rates sum to 1; item ids are unique; there are 15 / 15 / 30 items; all titles are unique.
  - **`processDays`:**
    - 1 missed day with 1 Shield keeps the streak, uses 1 Shield, and still needs the penalty.
    - 2 missed days with 2 Shields use both.
    - 3 missed days with 2 Shields use none and reset the streak.
    - 0 Shields resets the streak as before.
- **Repo:**
  - A Boss win grants exactly one drop.
  - Reaching a 7-day streak grants a drop, and a 6-day streak does not.
  - An exercise rank-up grants a drop; a first set and a same-rank set don't.
  - The Shield count never goes above 2.
  - `startDay` uses a Shield, writes `shielded: true` and queues `shieldUsed`.
- **Data safety:**
  - A v2 database (v1.5.0 data, including a player with a streak and titles) opens as v3. Everything is kept, and the player has `themeId: null`, `frameId: null`, `shields: 0`.
  - **Backup round trip:**
    - Export, wipe, import, export again gives identical data, including the inventory, equipped items, Shields and `shielded` days.
    - A v2 backup imports with an empty inventory.
    - A backup claiming an equipped item it doesn't own is rejected.
- **UI:**
  - Inventory tabs, counts, "? ? ?", preview without saving, Equip saves.
  - Leaving the page restores the equipped theme.
  - Title equip is shared with Status.
  - The overlay's Equip now / Later work, with no sound on show.
  - The toast for `shieldUsed` appears.
- **e2e (WebKit, iPhone 15):**
  - Open the Inventory from Status.
  - The default is equipped.
  - A granted item (seeded through the app's own flow) can be previewed and equipped.
  - The accent colour changes.
  - The perf budget still holds.

## 8. Release
- `package.json` becomes 1.6.0, with a changelog entry, for example: "New: an Inventory! Earn colour themes, emblem frames, titles and Streak Shields from Boss wins, streaks and new exercise ranks. Nothing can be bought."
- `docs/credits.md` gains the frames, themes and titles as original work.
- No new packages. No backend, accounts or tracking.
