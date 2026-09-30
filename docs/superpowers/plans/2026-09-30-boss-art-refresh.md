# Boss Art & Roster Refresh (v1.5.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 8 code-drawn Boss silhouettes with 8 new, detailed, original Bosses (approved SVG art), keep retired Bosses resolvable so no progress is lost, and announce each new week's Boss with a "⚠ A Boss has appeared" alert.

**Architecture:** `src/config/bosses.ts` gets an active `BOSSES` roster (with imported SVG art URLs) and a lookup-only `RETIRED_BOSSES` list. A `BossArt` component renders the image, or the old silhouette for retired Bosses. `ensureWeekBoss` gains an `announce` option that queues a new `bossAppeared` event. `EventHost` shows it with a new `BossAppearedOverlay`, and silently drops a stale one.

**Tech Stack:** Vite 7 + React 19 + TS + Tailwind 4 + Dexie + Vitest (jsdom for UI) + Playwright WebKit (iPhone 15).

**Spec:** `docs/superpowers/specs/2026-09-30-boss-art-refresh-design.md`

## Global Constraints

- The approved art in `docs/superpowers/specs/assets/2026-09-30-boss-art/*.svg` ships **byte-for-byte unchanged** as `src/assets/bosses/<id>.svg`.
- No stored-data changes. No Dexie version bump and no backup-format change. `BossRecord` is unchanged.
- All `progression.boss` numbers stay unchanged, and no balance number is added outside `src/config/progression.ts`.
- There's no sound when the alert appears. `chime` plays only when Accept is tapped (iPhone rule: sound only after a tap).
- The app stays original (CLAUDE.md rule 4). Names, stories and titles come exactly from the spec table.
- No new packages.
- Release: `package.json` becomes `1.5.0`, and a new top entry goes in `src/data/changelog.ts` in plain words.
- Commit after each task. Messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commands:
  - `npm test -- <path>` runs a single test file.
  - `npm run check` runs typecheck, lint, test and build.
  - `npm run e2e` runs Playwright WebKit.

## Review Focus

1. **Existing player mid-week, current record has a retired id (`mawgrath`).** The card, damage, defeat overlay and title name must all keep working. Pinned by the Task 2 "v1.4.0 data" test.
2. **App reopened after skipping weeks with an un-dismissed alert.** The old alert must not show for a week that's over. Pinned by the Task 4 stale-alert test.
3. **Opening the app several times on Monday.** The alert must be queued once only. Pinned by the Task 3 "not queued again" test.
4. **Level-up from yesterday's partial XP in the same launch that creates the week.** The level-up must show before the alert. Pinned by the Task 3 order test.
5. **Accidental taps on the alert backdrop.** They must not dismiss it; only Accept does. Pinned by the Task 4 overlay test.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/assets/bosses/*.svg` (8) | create (copy) | Approved art |
| `src/config/bosses.ts` | rewrite | Active roster, retired roster, `getBoss`, `BossDef` type |
| `src/domain/achievements.ts` | modify | Titles for active and retired Bosses |
| `src/domain/boss.test.ts`, `src/domain/achievements.test.ts` | modify | Roster and title tests |
| `src/ui/components/BossArt.tsx` (+ test) | create | Image or legacy silhouette |
| `src/ui/screens/BossCard.tsx` (+ test) | modify | Use `BossArt` |
| `src/ui/overlays/BossDefeatedOverlay.tsx` | modify | Use `BossArt` |
| `src/domain/types.ts` | modify | `bossAppeared` event |
| `src/db/repo/boss.ts` (+ test) | modify | `ensureWeekBoss(..., { announce })` |
| `src/db/repo/days.ts` | modify | Announce, after partial XP |
| `src/db/repo/onboarding.ts` | modify | `announce: false` |
| `src/ui/overlays/BossAppearedOverlay.tsx` (+ test) | create | The alert |
| `src/ui/overlays/EventHost.tsx` (+ test) | modify | Route and drop stale alerts |
| `e2e/boss.spec.ts` | create | Alert and card image on WebKit |
| `package.json`, `src/data/changelog.ts`, `docs/credits.md` | modify | Release |

---

### Task 1: New roster, retired roster, art files, titles

**Files:**
- Create: `src/assets/bosses/{vaelcrest,skarnyx,hrimgald,ashvyrn,grolmak,thessrak,obrakh,morvaine}.svg` (copies)
- Rewrite: `src/config/bosses.ts`
- Modify: `src/domain/achievements.ts:1,34-38`
- Test: `src/domain/boss.test.ts` (roster block), `src/domain/achievements.test.ts`

**Interfaces:**
- Produces:
  - `BossDef = BossBase & ({ art: string; silhouette?: never } | { silhouette: Silhouette; art?: never })`
  - `BossBase = { id; name; epithet; weakness: BossCategory; title; story }`
  - `BOSSES: readonly BossDef[]` (active, all with `art`), `RETIRED_BOSSES: readonly BossDef[]` (all with `silhouette`), `ALL_BOSSES`
  - `getBoss(id): BossDef | undefined` (searches both lists)
  - `type Silhouette` is unchanged.

- [ ] **Step 1: Copy the art unchanged**

```bash
mkdir -p src/assets/bosses
cp docs/superpowers/specs/assets/2026-09-30-boss-art/*.svg src/assets/bosses/
for f in docs/superpowers/specs/assets/2026-09-30-boss-art/*.svg; do cmp "$f" "src/assets/bosses/$(basename "$f")" || echo "DIFF $f"; done
```
Expected: no `DIFF` lines.

- [ ] **Step 2: Write the failing roster tests.** In `src/domain/boss.test.ts`, change the import to `import { ALL_BOSSES, BOSSES, getBoss, RETIRED_BOSSES } from '../config/bosses';`. Then replace the `describe('roster and rotation', …)` block's first `it` with:

```ts
  it('has 8 active original bosses, 2 per weakness, each with its own title and art', () => {
    expect(BOSSES.map((b) => b.id)).toEqual(['vaelcrest', 'skarnyx', 'hrimgald', 'ashvyrn', 'grolmak', 'thessrak', 'obrakh', 'morvaine']);
    for (const w of ['legs', 'core', 'cardio', 'upper']) expect(BOSSES.filter((b) => b.weakness === w)).toHaveLength(2);
    expect(new Set(BOSSES.map((b) => b.title)).size).toBe(8);
    for (const b of BOSSES) {
      expect(typeof b.art).toBe('string');
      expect(b.art).toMatch(new RegExp(`${b.id}\\.svg|^data:image/svg`));
      expect(b.silhouette).toBeUndefined();
    }
  });

  it('keeps the 8 retired v1.4.0 bosses for lookup only, unchanged', () => {
    expect(RETIRED_BOSSES.map((b) => [b.id, b.title, b.silhouette])).toEqual([
      ['mawgrath', 'Colossus Breaker', 'colossus'], ['ulgara', 'Tyrant’s Bane', 'serpent'], ['sylreth', 'Windchaser', 'wraith'],
      ['grimhald', 'Armbreaker', 'brute'], ['vessik', 'Rootsplitter', 'treant'], ['brakmor', 'Titanfall', 'titan'],
      ['korrun', 'Houndrunner', 'hound'], ['zereth', 'Chainbreaker', 'knight'],
    ]);
    for (const b of RETIRED_BOSSES) expect(b.art).toBeUndefined();
    expect(new Set(ALL_BOSSES.map((b) => b.id)).size).toBe(16);
    expect(new Set(ALL_BOSSES.map((b) => b.title)).size).toBe(16);
    for (const b of ALL_BOSSES) expect(getBoss(b.id)).toBe(b);
    expect(getBoss('nope')).toBeUndefined();
  });

  it('rotates only through the active roster, in table order', () => {
    const ids = Array.from({ length: 8 }, (_, i) => bossForWeek(addDays('2026-01-05', 7 * i)).id);
    expect(ids).toEqual(BOSSES.map((b) => b.id));
  });
```

In `src/domain/achievements.test.ts`, add:

```ts
import { titleFor } from './achievements';
// …
it('names titles for active and retired bosses', () => {
  expect(titleFor('boss-vaelcrest')).toBe('Oathkeeper');
  expect(titleFor('boss-morvaine')).toBe('Crownbreaker');
  expect(titleFor('boss-mawgrath')).toBe('Colossus Breaker');
  expect(titleFor('boss-zereth')).toBe('Chainbreaker');
});
```
If `titleFor` is already imported, merge the import. Put the `it` inside the file's existing top-level `describe`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/domain/boss.test.ts src/domain/achievements.test.ts`
Expected: FAIL. `ALL_BOSSES`/`RETIRED_BOSSES` are not exported, and there's no `boss-vaelcrest` title.

- [ ] **Step 4: Rewrite `src/config/bosses.ts`**

```ts
import type { BossCategory } from '../domain/types';
import ashvyrn from '../assets/bosses/ashvyrn.svg';
import grolmak from '../assets/bosses/grolmak.svg';
import hrimgald from '../assets/bosses/hrimgald.svg';
import morvaine from '../assets/bosses/morvaine.svg';
import obrakh from '../assets/bosses/obrakh.svg';
import skarnyx from '../assets/bosses/skarnyx.svg';
import thessrak from '../assets/bosses/thessrak.svg';
import vaelcrest from '../assets/bosses/vaelcrest.svg';

/** Code-drawn shape used only by the retired v1.4.0 Bosses (see src/ui/components/BossSilhouette.tsx). */
export type Silhouette = 'colossus' | 'treant' | 'serpent' | 'titan' | 'wraith' | 'hound' | 'brute' | 'knight';

interface BossBase {
  id: string;
  name: string;
  epithet: string;
  weakness: BossCategory;
  /** Title unlocked the first time this Boss is defeated */
  title: string;
  story: string;
}

/** Active Bosses have drawn art; retired ones keep their old silhouette. */
export type BossDef = BossBase & ({ art: string; silhouette?: never } | { silhouette: Silhouette; art?: never });

/** Original Bosses, drawn for Ashborn. Two per weakness; they rotate one per week in this order. */
export const BOSSES: readonly BossDef[] = [
  { id: 'vaelcrest', name: 'Vaelcrest', epithet: 'the Oathbroken Knight', weakness: 'upper', title: 'Oathkeeper', story: 'A knight who broke every oath but one: no challenger leaves standing.', art: vaelcrest },
  { id: 'skarnyx', name: 'Skarnyx', epithet: 'the Carapace Sovereign', weakness: 'core', title: 'Carapace Cracker', story: 'A mantis sovereign whose scythes cut faster than the eye can follow.', art: skarnyx },
  { id: 'hrimgald', name: 'Hrimgald', epithet: 'the Glacier Warden', weakness: 'legs', title: 'Frostwalker', story: 'Frost follows its every step. Only strong legs outrun the cold.', art: hrimgald },
  { id: 'ashvyrn', name: 'Ashvyrn', epithet: 'the Cinder Wyrm', weakness: 'cardio', title: 'Wyrmrunner', story: 'A wyrm of blue fire that hunts anything that stops moving.', art: ashvyrn },
  { id: 'grolmak', name: 'Grolmak', epithet: 'the Warbound Chieftain', weakness: 'upper', title: 'Warbreaker', story: 'A tusked war-giant who drags twin axes from battle to battle.', art: grolmak },
  { id: 'thessrak', name: 'Thessrak', epithet: 'the Sting Titan', weakness: 'core', title: 'Stingbreaker', story: 'A scorpion the size of a hill. Its stinger never misses twice.', art: thessrak },
  { id: 'obrakh', name: 'Obrakh', epithet: 'the Gate Sentinel', weakness: 'legs', title: 'Gatebreaker', story: 'A living wall of cracked stone that guards the deepest dungeon door.', art: obrakh },
  { id: 'morvaine', name: 'Morvaine', epithet: 'the Hollow Regent', weakness: 'cardio', title: 'Crownbreaker', story: 'A hollow king who keeps the souls of the fallen in his staff.', art: morvaine },
];

/** The v1.4.0 Bosses. Out of the rotation, but kept so saved weeks and earned titles still resolve. */
export const RETIRED_BOSSES: readonly BossDef[] = [
  { id: 'mawgrath', name: 'Mawgrath', epithet: 'the Hollow Colossus', weakness: 'legs', title: 'Colossus Breaker', story: 'A walking ruin of fused stone. Every step it takes shakes the gate.', silhouette: 'colossus' },
  { id: 'ulgara', name: 'Ulgara', epithet: 'the Coiled Tyrant', weakness: 'core', title: 'Tyrant’s Bane', story: 'A coiled serpent-queen who crushes the careless in her rings.', silhouette: 'serpent' },
  { id: 'sylreth', name: 'Sylreth', epithet: 'the Ashwind Wraith', weakness: 'cardio', title: 'Windchaser', story: 'A wraith of ash that outpaces anything that stops to breathe.', silhouette: 'wraith' },
  { id: 'grimhald', name: 'Grimhald', epithet: 'the Iron-Armed Brute', weakness: 'upper', title: 'Armbreaker', story: 'A brute with arms like battering rams. Meet force with force.', silhouette: 'brute' },
  { id: 'vessik', name: 'Vessik', epithet: 'the Ironroot Warden', weakness: 'legs', title: 'Rootsplitter', story: 'Its roots drink the strength of anyone who stands still too long.', silhouette: 'treant' },
  { id: 'brakmor', name: 'Brakmor', epithet: 'the Stone-Gut Titan', weakness: 'core', title: 'Titanfall', story: 'A titan with a belly of solid rock. Only an iron core can crack it.', silhouette: 'titan' },
  { id: 'korrun', name: 'Korrun', epithet: 'the Tireless Hound', weakness: 'cardio', title: 'Houndrunner', story: 'A hound that never tires. It hunts the ones who stop running.', silhouette: 'hound' },
  { id: 'zereth', name: 'Zereth', epithet: 'the Chainbound Knight', weakness: 'upper', title: 'Chainbreaker', story: 'A fallen knight bound in chains, still swinging a blade no one can lift.', silhouette: 'knight' },
];

export const ALL_BOSSES: readonly BossDef[] = [...BOSSES, ...RETIRED_BOSSES];

export function getBoss(id: string): BossDef | undefined {
  return ALL_BOSSES.find((b) => b.id === id);
}
```

The retired entries must be copied **exactly** from the current file, including the curly apostrophe in `Tyrant’s Bane`.

In `src/domain/achievements.ts`, change the import to `import { ALL_BOSSES } from '../config/bosses';` and `...BOSSES.map(` to `...ALL_BOSSES.map(`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/domain/boss.test.ts src/domain/achievements.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the whole suite and typecheck**

Run: `npm run check`
Expected: PASS. `BossSilhouette` still type-checks, because retired defs carry `silhouette`. The UI still passes `def.silhouette`, which TS now types as possibly `undefined`. If typecheck fails there, apply this minimal bridge; Task 2 replaces it:
- `BossCard.tsx:32`: `{def.silhouette && <BossSilhouette … />}`
- `BossDefeatedOverlay.tsx:42`: `{def?.silhouette && <BossSilhouette … />}`

- [ ] **Step 7: Commit**

```bash
git add src/assets/bosses src/config/bosses.ts src/domain/achievements.ts src/domain/boss.test.ts src/domain/achievements.test.ts src/ui
git commit -m "feat(boss): new original 8-boss roster with drawn art; retired bosses kept for lookup"
```

---

### Task 2: BossArt on the card and the defeat overlay (and v1.4.0 data safety)

**Files:**
- Create: `src/ui/components/BossArt.tsx`, `src/ui/components/BossArt.test.tsx`
- Modify: `src/ui/screens/BossCard.tsx:9,31-32`, `src/ui/overlays/BossDefeatedOverlay.tsx:4,42`
- Test: `src/ui/screens/BossCard.test.tsx`, `src/db/repo/boss.test.ts`

**Interfaces:**
- Consumes: `BossDef`, `getBoss` (Task 1).
- Produces: `BossArt({ def, className }: { def: BossDef; className?: string })`. It renders `<img data-testid="boss-art">` for `def.art`, otherwise `BossSilhouette`. It is always `aria-hidden`.

- [ ] **Step 1: Write the failing component test** `src/ui/components/BossArt.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getBoss } from '../../config/bosses';
import { BossArt } from './BossArt';

describe('BossArt', () => {
  it('shows the drawn image for an active boss, hidden from screen readers', () => {
    const { container } = render(<BossArt def={getBoss('vaelcrest')!} className="h-10" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(getBoss('vaelcrest')!.art);
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
    expect(img.getAttribute('draggable')).toBe('false');
    expect(img.className).toContain('h-10');
    expect(img.className).toContain('object-cover');
  });

  it('falls back to the old silhouette for a retired boss', () => {
    const { container } = render(<BossArt def={getBoss('mawgrath')!} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/ui/components/BossArt.test.tsx`
Expected: FAIL, because it cannot resolve `./BossArt`.

- [ ] **Step 3: Create `src/ui/components/BossArt.tsx`**

```tsx
import type { BossDef } from '../../config/bosses';
import { BossSilhouette } from './BossSilhouette';

/** A Boss's picture: the drawn art, or the old silhouette for a retired v1.4.0 Boss. Decorative only. */
export function BossArt({ def, className = '' }: { def: BossDef; className?: string }) {
  if (def.art) {
    return (
      <img
        src={def.art}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-testid="boss-art"
        className={`rounded-lg object-cover ${className}`}
      />
    );
  }
  return <BossSilhouette silhouette={def.silhouette} className={className} />;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/ui/components/BossArt.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing card tests.** Append to `src/ui/screens/BossCard.test.tsx` inside the `describe`:

```tsx
  it('shows the new boss art, dimmed once defeated', async () => {
    const { container } = render(<BossCard />);
    await screen.findByText(bossForWeek(MONDAY).name);
    const img = container.querySelector('[data-testid="boss-art"]')!;
    expect(img.getAttribute('src')).toBe(bossForWeek(MONDAY).art);
    expect(img.className).not.toContain('grayscale');
    await db.bosses.update(MONDAY, { hp: 0, defeatedAt: '2026-09-30T18:00:00.000Z' });
    await screen.findByText('Defeated');
    expect(container.querySelector('[data-testid="boss-art"]')!.className).toContain('grayscale');
  });

  it('v1.4.0 data: a retired boss week keeps working with its old look', async () => {
    await db.bosses.update(MONDAY, { bossId: 'mawgrath', hp: 250 });
    const { container } = render(<BossCard />);
    expect(await screen.findByText('Mawgrath')).toBeTruthy();
    expect(screen.getByText('250 / 360 HP')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
```

Append to `src/db/repo/boss.test.ts` inside `describe('weekly boss', …)`:

```ts
  it('v1.4.0 data: a stored retired-boss week still takes damage, rewards its old title, and loses nothing', async () => {
    const db = await setupPlayer(MONDAY);
    await db.bosses.update(MONDAY, { bossId: 'mawgrath', hp: 200 });
    await db.achievements.put({ id: 'boss-zereth', unlockedAt: '2026-09-20T10:00:00.000Z' });
    const before = { days: await db.days.count(), log: await db.questLog.count(), achievements: await db.achievements.toArray() };

    const boss = (await db.bosses.get(MONDAY))!;
    const items = (await db.days.get(MONDAY))!.items;
    await setItemProgress(db, MONDAY, items[2]!.id, items[2]!.target, at(MONDAY)); // squats → legs, Mawgrath's weakness
    expect((await db.bosses.get(MONDAY))!.hp).toBe(200 - hitDamage(boss, 25, 'legs'));
    expect(hitDamage(boss, 25, 'legs')).toBe(2 * hitDamage(boss, 25, null));

    for (const day of [MONDAY, '2026-09-29', '2026-09-30']) {
      await startDay(db, at(day), neverUrgent);
      await completeDaily(db, day);
    }
    expect((await db.bosses.get(MONDAY))!.defeatedAt).not.toBeNull();
    expect(await db.achievements.get('boss-mawgrath')).toBeTruthy();
    const events = (await getMeta(db, 'pendingEvents')) ?? [];
    expect(events.find((e) => e.type === 'bossDefeated')).toMatchObject({ bossId: 'mawgrath', title: 'Colossus Breaker' });

    expect(await db.days.count()).toBeGreaterThanOrEqual(before.days);
    expect(await db.questLog.count()).toBeGreaterThan(before.log);
    for (const a of before.achievements) expect(await db.achievements.get(a.id)).toEqual(a);
  });
```

Check that `items[2]` is the squats item before relying on it. Read `createDayRecord` in `src/domain/quests/daily.ts`. If the order differs, pick the item with `id === 'squats'`: `const squats = items.find((i) => i.id === 'squats')!`.

- [ ] **Step 6: Run the tests to verify the card tests fail**

Run: `npm test -- src/ui/screens/BossCard.test.tsx src/db/repo/boss.test.ts`
Expected: BossCard FAILS because there's no `boss-art` image yet. The repo test should already PASS, since Task 1 kept retired lookup. That's fine: it is a regression guard, confirmed by the mutation check in Step 8.

- [ ] **Step 7: Use `BossArt` in the card and the defeat overlay**

`src/ui/screens/BossCard.tsx`: replace the `BossSilhouette` import with `import { BossArt } from '../components/BossArt';` and line 32 with:

```tsx
        <BossArt def={def} className={`h-[115px] w-24 shrink-0 ${boss.defeatedAt ? 'opacity-40 grayscale' : ''}`} />
```

`src/ui/overlays/BossDefeatedOverlay.tsx`: replace the import with `import { BossArt } from '../components/BossArt';` and line 42 with:

```tsx
          {def && <BossArt def={def} className="mx-auto my-2 h-[154px] w-32 opacity-60" />}
```

- [ ] **Step 8: Run the tests, then a mutation check on the data-safety test**

Run: `npm test -- src/ui src/db/repo/boss.test.ts`
Expected: PASS.

Mutation check: temporarily change `getBoss` in `src/config/bosses.ts` to search only `BOSSES`, then run `npm test -- src/db/repo/boss.test.ts src/ui/screens/BossCard.test.tsx`. Expected: the two "v1.4.0 data" tests FAIL. Revert the change and re-run. Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/db/repo/boss.test.ts
git commit -m "feat(boss): show the new boss art on the card and victory screen; guard v1.4.0 boss weeks"
```

---

### Task 3: Queue a "Boss appeared" event when a new week's Boss is created

**Files:**
- Modify: `src/domain/types.ts:157-160`, `src/db/repo/boss.ts:18-28`, `src/db/repo/days.ts:62-67`, `src/db/repo/onboarding.ts:20`
- Test: `src/db/repo/boss.test.ts`

**Interfaces:**
- Produces:
  - `GameEvent` gains `{ type: 'bossAppeared'; weekStart: string; bossId: string }`.
  - `ensureWeekBoss(database, date, opts: { announce: boolean }): Promise<void>`. The option is **required**, so every caller decides.

- [ ] **Step 1: Write the failing tests.** Append inside `describe('weekly boss', …)` in `src/db/repo/boss.test.ts`. Add `import { xpToNext } from '../../domain/xp';` if it isn't imported already; it is at the top of this file.

```ts
  it('announces a new week’s boss once, but not at registration', async () => {
    const db = await setupPlayer(MONDAY);
    const appeared = async () => ((await getMeta(db, 'pendingEvents')) ?? []).filter((e) => e.type === 'bossAppeared');
    expect(await appeared()).toEqual([]);

    await startDay(db, at('2026-10-05'), neverUrgent);
    await startDay(db, at('2026-10-05', '13:00'), neverUrgent);
    await startDay(db, at('2026-10-06'), neverUrgent);
    expect(await appeared()).toEqual([{ type: 'bossAppeared', weekStart: '2026-10-05', bossId: bossForWeek('2026-10-05').id }]);
  });

  it('shows yesterday’s level-up before the new week’s boss alert', async () => {
    const db = await setupPlayer('2026-10-04'); // a Sunday
    await db.player.update(1, { xp: xpToNext(1) - 1 });
    const item = (await db.days.get('2026-10-04'))!.items[0]!;
    await setItemProgress(db, '2026-10-04', item.id, Math.ceil(item.target / 2), at('2026-10-04'));

    await startDay(db, at('2026-10-05'), neverUrgent); // Monday: partial XP for Sunday, then the new boss
    const types = ((await getMeta(db, 'pendingEvents')) ?? []).map((e) => e.type);
    expect(types).toContain('levelUp');
    expect(types.indexOf('levelUp')).toBeLessThan(types.indexOf('bossAppeared'));
  });
```

If Sunday's partial XP is not enough to level up with `xp: xpToNext(1) - 1`, check `partialXp` in `src/domain/quests/daily.ts`. Make sure the progress is above 0 and below the target, and at least 1 XP is awarded. The test must see a `levelUp`, and the `toContain` assertion guards that.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/db/repo/boss.test.ts`
Expected: FAIL. No `bossAppeared` events exist.

- [ ] **Step 3: Implement**

`src/domain/types.ts`, in `GameEvent`:

```ts
  | { type: 'bossDefeated'; bossId: string; xp: number; title: string | null }
  | { type: 'bossAppeared'; weekStart: string; bossId: string };
```

`src/db/repo/boss.ts`, replacing `ensureWeekBoss`:

```ts
/**
 * Creates the Boss for the week containing `date`, if it doesn't exist yet.
 * With `announce`, a newly created Boss also queues the "A Boss has appeared" alert.
 */
export async function ensureWeekBoss(database: AshbornDB, date: string, { announce }: { announce: boolean }): Promise<void> {
  await writeTx(database, async () => {
    const weekStart = weekStartOf(date);
    if (await database.bosses.get(weekStart)) return;
    const player = await database.player.get(1);
    const profile = await database.profile.get(1);
    if (!player || !profile) return;
    const record = createBossRecord(weekStart, player.level, profile.experience);
    await database.bosses.put(record);
    if (announce) await pushEvents(database, [{ type: 'bossAppeared', weekStart, bossId: record.bossId }]);
  });
}
```

`src/db/repo/days.ts`, in `startDay`: remove the line `await ensureWeekBoss(database, current);` and add it **after** the `if (result.xpToAward > 0) { … }` block, still inside the transaction:

```ts
    // After yesterday's partial XP, so a level-up it causes is shown before the new week's alert.
    await ensureWeekBoss(database, current, { announce: true });
```

`src/db/repo/onboarding.ts:20`: `await ensureWeekBoss(database, today, { announce: false });`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/db/repo/boss.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite.** Tests that cross into a new week now also see a `bossAppeared` event.

Run: `npm run check`
Expected: PASS. If a test fails only because an exact `pendingEvents` list now also contains `bossAppeared`, don't delete the assertion. Filter it to the event type that test is about, the same way as `events.filter((e) => e.type === 'bossDefeated')`. Re-read each failure before touching it. A failure about **order** or **count** of other events is a real bug; fix the code, not the test.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/db/repo
git commit -m "feat(boss): queue a 'Boss appeared' alert when a new week's boss arrives (not at sign-up)"
```

---

### Task 4: The "⚠ A Boss has appeared" overlay and EventHost routing

**Files:**
- Create: `src/ui/overlays/BossAppearedOverlay.tsx`, `src/ui/overlays/BossAppearedOverlay.test.tsx`
- Modify: `src/ui/overlays/EventHost.tsx`
- Test: `src/ui/overlays/EventHost.test.tsx`

**Interfaces:**
- Consumes:
  - `GameEvent` `bossAppeared` (Task 3), `BossArt` (Task 2), `getBoss` (Task 1)
  - `bossDaysLeft(weekStart, today)` and `weekStartOf(date)` from `src/domain/boss` / `src/domain/day`
  - `WEAKNESS_LABEL` from `src/ui/screens/BossCard`
  - `playSound` from `src/platform/audio`
  - `useMeta('lastOpenDate')` from `src/ui/hooks/data`
- Produces: `BossAppearedOverlay({ bossId, weekStart, today, onAccept })`.

- [ ] **Step 1: Write the failing overlay test** `src/ui/overlays/BossAppearedOverlay.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playSound } from '../../platform/audio';
import { BossAppearedOverlay } from './BossAppearedOverlay';

vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }));
beforeEach(() => vi.mocked(playSound).mockClear());

describe('BossAppearedOverlay', () => {
  it('warns about the new boss, silently, and accepts with a chime', () => {
    const onAccept = vi.fn();
    render(<BossAppearedOverlay bossId="grolmak" weekStart="2026-10-05" today="2026-10-05" onAccept={onAccept} />);
    const dialog = screen.getByRole('dialog', { name: 'A Boss has appeared' });
    expect(dialog.textContent).toContain('⚠ WARNING');
    expect(dialog.textContent).toContain('Grolmak, the Warbound Chieftain');
    expect(dialog.textContent).toContain('Weak to upper body');
    expect(dialog.textContent).toContain('7 days to defeat it');
    expect(dialog.querySelector('[data-testid="boss-art"]')).not.toBeNull();
    expect(playSound).not.toHaveBeenCalled();

    fireEvent.click(dialog); // backdrop taps do nothing
    expect(onAccept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(playSound).toHaveBeenCalledWith('chime');
    expect(onAccept).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('says "1 day" on the last day', () => {
    render(<BossAppearedOverlay bossId="grolmak" weekStart="2026-10-05" today="2026-10-11" onAccept={() => {}} />);
    expect(screen.getByRole('dialog').textContent).toContain('1 day to defeat it');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/ui/overlays/BossAppearedOverlay.test.tsx`
Expected: FAIL, because it cannot resolve `./BossAppearedOverlay`.

- [ ] **Step 3: Create `src/ui/overlays/BossAppearedOverlay.tsx`**

```tsx
import { useRef } from 'react';
import { getBoss } from '../../config/bosses';
import { bossDaysLeft, bossForWeek } from '../../domain/boss';
import { playSound } from '../../platform/audio';
import { BossArt } from '../components/BossArt';
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';
import { WEAKNESS_LABEL } from '../screens/BossCard';

interface Props {
  bossId: string;
  weekStart: string;
  today: string;
  onAccept: () => void;
}

/** Shown once when a new week's Boss arrives. Silent until Accept is tapped (iPhone: sound only after a tap). */
export function BossAppearedOverlay({ bossId, weekStart, today, onAccept }: Props) {
  const def = getBoss(bossId) ?? bossForWeek(weekStart);
  const days = bossDaysLeft(weekStart, today);
  const done = useRef(false);
  const accept = () => {
    if (done.current) return;
    done.current = true;
    playSound('chime');
    onAccept();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="A Boss has appeared"
      className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-void/90"
    >
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-danger">⚠ WARNING</p>
          <p className="mt-1 text-lg font-semibold text-ink">A Boss has appeared</p>
          <BossArt def={def} className="mx-auto my-3 h-48 w-40" />
          <p className="text-lg text-ink">{`${def.name}, ${def.epithet}`}</p>
          <p className="mt-1 inline-block rounded border border-gold/60 px-2 text-xs text-gold">{`Weak to ${WEAKNESS_LABEL[def.weakness]}`}</p>
          <p className="mt-2 text-sm text-muted">{`${days} ${days === 1 ? 'day' : 'days'} to defeat it`}</p>
          <Button className="mt-4 w-full" onClick={accept}>
            Accept
          </Button>
        </SystemWindow>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/ui/overlays/BossAppearedOverlay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing EventHost tests.** Append inside `describe('EventHost', …)` in `src/ui/overlays/EventHost.test.tsx`. `seedApp()` registers on `2026-09-21`, so `lastOpenDate` is `2026-09-21`, a Monday.

```tsx
  it('shows the boss alert for this week and removes it on Accept', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'bossAppeared', weekStart: '2026-09-21', bossId: 'thessrak' }]);
    render(<EventHost />);
    const dialog = await screen.findByRole('dialog', { name: 'A Boss has appeared' });
    expect(dialog.textContent).toContain('Thessrak');
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });

  it('silently drops a boss alert from a week that is already over', async () => {
    await setMeta(db, 'pendingEvents', [
      { type: 'bossAppeared', weekStart: '2026-09-14', bossId: 'thessrak' },
      { type: 'achievement', id: 'first-quest', title: 'The Awakened' },
    ]);
    render(<EventHost />);
    expect((await screen.findByRole('status')).textContent).toContain('The Awakened');
    expect(screen.queryByRole('dialog', { name: 'A Boss has appeared' })).toBeNull();
    expect(await getMeta(db, 'pendingEvents')).toEqual([{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
  });
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm test -- src/ui/overlays/EventHost.test.tsx`
Expected: the two new tests FAIL. The alert falls through to the defeat overlay branch, and the stale one isn't dropped.

- [ ] **Step 7: Route in `src/ui/overlays/EventHost.tsx`.** Replace the file with:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { getMeta } from '../../db/meta';
import { dismissEvent } from '../../db/repo/player';
import { db } from '../../db/schema';
import { weekStartOf } from '../../domain/day';
import type { GameEvent } from '../../domain/types';
import { useMeta } from '../hooks/data';
import { AchievementToast } from './AchievementToast';
import { BossAppearedOverlay } from './BossAppearedOverlay';
import { BossDefeatedOverlay } from './BossDefeatedOverlay';
import { LevelUpOverlay } from './LevelUpOverlay';

export function EventHost({ onAssignPoints }: { onAssignPoints?: () => void } = {}) {
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  const today = useMeta('lastOpenDate');
  const event = events[0];
  // A Boss alert for a week that's already over (app closed before Accept) is dropped, not shown.
  const stale = event?.type === 'bossAppeared' && today !== undefined && event.weekStart !== weekStartOf(today);
  useEffect(() => {
    if (stale) void dismissEvent(db);
  }, [stale, event]);

  if (!event || stale) return null;
  if (event.type === 'levelUp') {
    return (
      <LevelUpOverlay
        key={`level-${event.toLevel}`}
        event={event}
        onClose={() => void dismissEvent(db)}
        onAssign={() => {
          void dismissEvent(db);
          onAssignPoints?.();
        }}
      />
    );
  }
  if (event.type === 'achievement') {
    return <AchievementToast key={`title-${event.id}`} title={event.title} onDone={() => void dismissEvent(db)} />;
  }
  if (event.type === 'bossAppeared') {
    if (today === undefined) return null;
    return (
      <BossAppearedOverlay
        key={`appeared-${event.weekStart}`}
        bossId={event.bossId}
        weekStart={event.weekStart}
        today={today}
        onAccept={() => void dismissEvent(db)}
      />
    );
  }
  return (
    <BossDefeatedOverlay key={`boss-${event.bossId}`} bossId={event.bossId} xp={event.xp} title={event.title} onClose={() => void dismissEvent(db)} />
  );
}
```

If `useMeta`'s return type for `lastOpenDate` includes `null`, widen the checks to `today == null`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- src/ui/overlays`
Expected: PASS.

- [ ] **Step 9: Run the full check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/ui/overlays
git commit -m "feat(boss): '⚠ A Boss has appeared' alert with Accept; stale alerts dropped"
```

---

### Task 5: iPhone (WebKit) end-to-end check

**Files:**
- Create: `e2e/boss.spec.ts`

**Interfaces:**
- Consumes: `onboard(page)` from `e2e/helpers.ts`; the dialog name `A Boss has appeared`; `data-testid="boss-art"`.

- [ ] **Step 1: Write the e2e test** `e2e/boss.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

const DAY = 24 * 60 * 60 * 1000;

test('the Status card shows the boss art; a new week brings the boss alert', async ({ page }) => {
  const start = new Date();
  await page.clock.install({ time: start });
  await onboard(page);

  // No alert on the day you sign up.
  await expect(page.getByRole('dialog', { name: 'A Boss has appeared' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  const art = page.getByTestId('boss-art');
  await expect(art).toBeVisible();
  await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  // Jump a week ahead and reopen the app.
  await page.clock.setFixedTime(new Date(start.getTime() + 7 * DAY));
  await page.reload();
  const alert = page.getByRole('dialog', { name: 'A Boss has appeared' });
  await expect(alert).toBeVisible({ timeout: 10_000 });
  await expect(alert.getByText('⚠ WARNING')).toBeVisible();
  await alert.getByRole('button', { name: 'Accept' }).click();
  await expect(alert).toBeHidden();
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run e2e`
Expected: all tests PASS, including `perf.spec.ts` (first-screen median ≤ 1.5 s) and the new `boss.spec.ts`.
- If the alert is hidden behind another overlay after the reload, wait for the queue first. The penalty quest and any level-up come before it. Dismiss any `Continue` dialog before asserting.
- If `page.clock` time does not survive `reload()` in this Playwright version, use `page.goto('./')` instead.
- If the WebKit page stalls or `perf.spec.ts` fails because of the art, **stop and report to the owner**. The spec's fallback (radial gradients instead of blur) changes the approved look and needs their approval.

- [ ] **Step 3: Commit**

```bash
git add e2e/boss.spec.ts
git commit -m "test(e2e): boss art renders on WebKit and the new-week boss alert appears and closes"
```

---

### Task 6: Release 1.5.0

**Files:**
- Modify: `package.json` + `package-lock.json` (version), `src/data/changelog.ts` (top entry), `docs/credits.md` (Art section)

- [ ] **Step 1: Bump the version.** Run `npm version 1.5.0 --no-git-tag-version`. This updates `package.json` and `package-lock.json` and installs nothing. Check that `git diff --stat` shows only those two files.

- [ ] **Step 2: Run the changelog test to verify it fails**

Run: `npm test -- src/data`
Expected: FAIL. The top changelog entry (1.4.0) doesn't match the app version 1.5.0.

- [ ] **Step 3: Add the changelog entry** at the top of `CHANGELOG` in `src/data/changelog.ts`:

```ts
  {
    version: '1.5.0',
    date: '2026-09-30',
    title: 'New Bosses',
    notes: [
      'Eight brand-new Bosses with fresh, scarier looks.',
      'A warning now pops up when a new Boss arrives each Monday.',
      'Titles you have already won are kept.',
    ],
  },
```

- [ ] **Step 4: Update the credits.** In `docs/credits.md`, replace the Boss silhouettes bullet with:

```md
- Boss art (`src/assets/bosses/*.svg`) and the eight Bosses' names, stories and titles (`src/config/bosses.ts`): original, drawn for Ashborn. The retired v1.4.0 Bosses' silhouettes (`src/ui/components/BossSilhouette.tsx`) are original too.
```

- [ ] **Step 5: Verify everything**

Run: `npm run check` and then `npm run e2e`
Expected: both PASS. Also run `npm run size` and note the bundle growth; it should be about 45 KB for the art.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/data/changelog.ts docs/credits.md
git commit -m "chore(release): v1.5.0 — new bosses and the Monday boss alert"
```

Don't push. Pushing publishes the site, and the owner must say "push".
