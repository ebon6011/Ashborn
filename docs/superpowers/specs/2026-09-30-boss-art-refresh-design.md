# Ashborn — Boss Art & Roster Refresh (v1.5.0)

Date: 2026-09-30
Status: design approved in chat; awaiting written-spec review

## Intent
The old code-drawn Boss silhouettes looked flat and silly. Replace them with 8 new, detailed, scary Boss models in the app's own dark-and-blue look, and announce each week's Boss with a "⚠ A Boss has appeared" alert. The Boss rules and numbers stay exactly as in v1.4.0.

## Owner decisions
- **Style:** detailed drawn vector art, not painted AI art. Colours are the app's own dark navy plus the blue System glow only. There are no per-Boss colours.
- **Background:** a plain dark-blue glow with low smoke. There is no Gate ring and no arch.
- **Roster:** the 8 current Bosses leave the rotation and 8 new ones replace them, 2 per weakness.
- **Inspiration:** the monsters follow classic dungeon-boss types (knight, war-giant, insect monarch, scorpion, frost giant, stone golem, dragon, lich). Every one is an original design with an original name. None copies a character from any series (CLAUDE.md rule 4).
- **Extras chosen:** only the Monday "A Boss has appeared" alert. The Gate frame, rank badge and shadow smoke were not chosen.
- The approved art files are in `docs/superpowers/specs/assets/2026-09-30-boss-art/` and must ship unchanged.

## 1. New roster (`src/config/bosses.ts` → `BOSSES`)
Rotation order is fixed as listed. The weaknesses cycle, so no two neighbouring weeks share one.

| # | id | Name | Epithet | Weakness | Title dropped | Story (one line) |
|---|---|---|---|---|---|---|
| 1 | vaelcrest | Vaelcrest | the Oathbroken Knight | upper | Oathkeeper | A knight who broke every oath but one: no challenger leaves standing. |
| 2 | skarnyx | Skarnyx | the Carapace Sovereign | core | Carapace Cracker | A mantis sovereign whose scythes cut faster than the eye can follow. |
| 3 | hrimgald | Hrimgald | the Glacier Warden | legs | Frostwalker | Frost follows its every step. Only strong legs outrun the cold. |
| 4 | ashvyrn | Ashvyrn | the Cinder Wyrm | cardio | Wyrmrunner | A wyrm of blue fire that hunts anything that stops moving. |
| 5 | grolmak | Grolmak | the Warbound Chieftain | upper | Warbreaker | A tusked war-giant who drags twin axes from battle to battle. |
| 6 | thessrak | Thessrak | the Sting Titan | core | Stingbreaker | A scorpion the size of a hill. Its stinger never misses twice. |
| 7 | obrakh | Obrakh | the Gate Sentinel | legs | Gatebreaker | A living wall of cracked stone that guards the deepest dungeon door. |
| 8 | morvaine | Morvaine | the Hollow Regent | cardio | Crownbreaker | A hollow king who keeps the souls of the fallen in his staff. |

Rotation is unchanged: roster index = (weeks since `ROSTER_EPOCH` 2026-01-05) mod 8.

## 2. Retired Bosses (keeping old progress safe)
- The 8 v1.4.0 Bosses (mawgrath, ulgara, sylreth, grimhald, vessik, brakmor, korrun, zereth) move to `RETIRED_BOSSES`. Their ids, names, epithets, weaknesses, titles, stories and silhouettes are unchanged.
- `bossForWeek` picks only from `BOSSES`. `getBoss(id)` searches `BOSSES`, then `RETIRED_BOSSES`.
- `ALL_TITLES` lists titles for both lists, so an earned `boss-<retired id>` title keeps its name. The Status screen already hides Boss titles that haven't been earned.
- **This week's Boss is already stored** (a retired id for existing players). It plays out its week normally with its old silhouette, and the new roster starts on the next Monday. Its defeat overlay also uses the old silhouette.
- **No stored data changes.** There's no Dexie version bump and no backup-format change. Backups holding retired ids stay valid, because `bossId` is already any string.

## 3. Art
- **Files:** copy the 8 approved files to `src/assets/bosses/<id>.svg`, byte-for-byte from the spec assets folder. Each is a self-contained 300×360 SVG with its own background, between 3.6 and 8.8 KB. The total is about 45 KB.
- **`BossDef` fields:**
  - New Bosses have `art: string`, the URL from a Vite asset import.
  - Retired Bosses keep `silhouette: Silhouette`.
  - A Boss has exactly one of the two, and a test enforces it.
- **`BossArt` component** (`src/ui/components/BossArt.tsx`):
  - It renders `<img src={art} alt="" aria-hidden="true" draggable={false}>` with `object-cover` and rounded corners.
  - For retired Bosses it falls back to the existing `BossSilhouette`.
  - Using `<img>` means Safari draws each picture once as a still image.
- **Where the art appears:**
  - `BossCard`: 96 × 115 px, keeping the 300:360 shape.
  - `BossDefeatedOverlay`: 128 × 154 px.
  - New `BossAppearedOverlay`: 160 × 192 px.
- **Defeated look on the card:** `opacity-40 grayscale`.
- **Offline:** the PWA `globPatterns` already include `svg`, so all 8 are precached. Any file Vite inlines as a data URL (under 4 KB) is inside the JS bundle, which is also precached.
- **iPhone Safari performance:** the art uses Gaussian-blur filters. The e2e perf budget (median first screen ≤ 1.5 s) must still pass, plus a WebKit e2e check that the Status screen renders the Boss image. If WebKit ever stalls, swap the blurs for soft radial gradients. Any such swap must keep the approved look and be shown to the owner first.

## 4. "⚠ A Boss has appeared" alert
- **New event:** `{ type: 'bossAppeared'; weekStart: string; bossId: string }` in `GameEvent`. It lives in the existing `pendingEvents` queue, which isn't part of backups.
- **When it's queued:** `ensureWeekBoss(database, date, { announce })` queues it only when it **creates** a new week's record and `announce` is true.
  - `startDay` passes `announce: true`. It calls `ensureWeekBoss` **after** awarding the previous day's partial XP, so any level-up from yesterday shows first.
  - `registerPlayer` passes `announce: false`, so a brand-new player isn't greeted with an alert on day one.
  - An existing player who updates mid-week gets no alert until the next Monday, because this week's record already exists.
- **Stale alerts:** if the queued alert's `weekStart` isn't the current week when it reaches the front of the queue, `EventHost` drops it silently. For example, the app was closed before the alert was dismissed and reopened a week later.
- **`BossAppearedOverlay`** (full-screen dialog, `aria-label "A Boss has appeared"`):
  - Contents, top to bottom: "⚠ WARNING" in the existing danger colour (`--color-danger`), "A Boss has appeared", the Boss art, "Name, epithet", a "Weak to X" badge, "N days to defeat it" (from `bossDaysLeft`), and an **Accept** button.
  - Accept dismisses the alert. Tapping the backdrop does nothing, so the alert can't be skipped by accident.
  - **Sound:** none when the alert appears (no tap has happened yet, CLAUDE.md rule 6). `chime` plays when Accept is tapped.
  - It uses the existing entrance animation classes and respects reduced motion. It sits inside the safe area.

## 5. Unchanged
All `progression.boss` numbers, damage rules, weakness ×2, the training cap, chip damage with no daily limit, XP reward, title-once rule, the event order for level-up before Boss victory, and `BossRecord`.

## 6. Tests (TDD)
- **Roster:**
  - 8 active Bosses, 2 per weakness, unique ids and unique titles, and every one has `art`.
  - The rotation matches the table order.
  - Active and retired ids don't overlap.
  - All 16 are found by `getBoss`, and retired ones have `silhouette` and no `art`.
- **Old data kept:**
  - A database seeded with a v1.4.0 week record (`bossId: 'mawgrath'`, part-damaged) and an earned `boss-mawgrath` title.
  - After the update, the card shows Mawgrath with the same HP, damage still applies, and `titleFor('boss-mawgrath')` is still "Colossus Breaker".
  - Nothing in the database is changed or removed.
- **Alert:**
  - Queued once when a new week is created by `startDay`.
  - Not queued by `registerPlayer`, and not queued again for the same week.
  - Queued after yesterday's level-up event.
  - Stale alerts are dropped.
- **UI:**
  - The overlay shows its contents, Accept dismisses it, no sound plays on show and `chime` plays on Accept.
  - The card and defeat overlay show an `<img>` for new Bosses and the old silhouette for retired ones.
- **e2e (WebKit iPhone 15):**
  - The alert appears on the first open of a new week, and Accept closes it.
  - The Status card shows the Boss image.
  - The perf budget still holds.

## 7. Release
- `package.json` becomes 1.5.0.
- New `src/data/changelog.ts` entry in plain words, for example: "Eight brand-new Bosses with fresh, scarier looks. A warning now pops up when a new Boss arrives each Monday. Titles you've already won are kept."
- `docs/credits.md`: the Boss art is original, drawn for Ashborn.
- No new packages.
