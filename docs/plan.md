# Ashborn v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Also use superpowers:test-driven-development for every task and superpowers:verification-before-completion before reporting any task done.

**Goal:** Build Ashborn, an offline-first iPhone PWA that turns workouts and habits into an RPG (levels, E–S ranks, daily quests, stats), hosted free on GitHub Pages.

**Architecture:** Vite + React + TypeScript single-page app. All game rules live in pure TypeScript modules under `src/domain/` (no React, no database, the clock is passed in) with every balance number in `src/config/progression.ts`. Dexie (IndexedDB) stores everything on the device; small repo functions in `src/db/repo/` apply domain rules inside Dexie transactions; React screens read live data with `useLiveQuery` and call repo functions. No router and no state library: a `tab` state in `App.tsx` drives a bottom tab bar.

**Tech Stack:** Vite 8, React 19, TypeScript 6.0 (pinned: typescript-eslint does not support TS 7 yet), Tailwind CSS 4, vite-plugin-pwa 1.3, Dexie 4 + dexie-react-hooks, Vitest 5 (+ jsdom, @testing-library/react, fake-indexeddb), Playwright 1.63 (WebKit, iPhone 15 profile), ESLint 10 + typescript-eslint, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-25-ashborn-design.md`

**Progress:** tick a task's checkboxes and commit this file with each task's commit.

## Global Constraints

- App name "Ashborn". No other names, logos, artwork or copied text from any existing app or series. All copy, titles and icons are original.
- Stack is fixed. Approved packages only: react, react-dom, dexie, dexie-react-hooks; dev: vite, @vitejs/plugin-react, typescript, tailwindcss, @tailwindcss/vite, vite-plugin-pwa, vitest, jsdom, @testing-library/react, fake-indexeddb, @playwright/test, eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals, @types/react, @types/react-dom, @types/node. `@eslint/js` and `globals` are ESLint's standard config helpers, and `@types/node` gives types to config files. Anything else needs the owner's approval.
- No backend, login, accounts, subscriptions, ads, analytics or tracking. No network calls at runtime.
- Metric units only (kg, cm, ml/L).
- Vite `base: '/ashborn/'`. Live URL `https://ebon6011.github.io/ashborn/`.
- Manifest: `display: standalone`, name/short_name "Ashborn", theme and background `#05070d`.
- Icons: `apple-touch-icon.png` 180×180, `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`. All generated from our own `public/icon.svg`.
- `viewport-fit=cover`. Header, tab bar and overlays use `env(safe-area-inset-*)`.
- Every text/number input and select uses `font-size: 16px` or larger (Tailwind `text-base`).
- No Vibration API. Feedback is visual + Web Audio sound. Audio unlocks on the first tap and every sound call fails silently.
- Tap targets ≥ 44 px (`min-h-11`). Screen-reader labels on all controls. WCAG AA contrast.
- Respect `prefers-reduced-motion`. Animations < 400 ms except the level-up overlay (~1.6 s, skippable).
- "Today" is always the phone's **local** date as `YYYY-MM-DD`. The day resets at local midnight.
- Rest is always allowed and never penalised. Penalty quests are small and safe.
- Calorie target never below max(BMR, 1500 kcal men / 1200 kcal women). No planned volume or daily-target jump > ~10 % week over week.
- Never edit an existing `db.version(n)` block. Schema changes add a new version + a backup migration step.
- Zero TypeScript errors, zero ESLint errors/warnings. `npm run check` must pass before any task is reported done.
- Commit after every completed task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Shell is Windows PowerShell 5.1: chain commands with `;`, not `&&`. Multi-line commit messages use a here-string (`git commit -m @' ... '@` with the closing `'@` at column 0).

## Review Focus

1. **Coming back after a long gap, or the phone clock moving backwards (time-zone travel).** Expect: no crash, at most one penalty quest, streak 0 after a real miss. A backwards clock must not close or duplicate days. Pinned by Task 6 tests "1000-day gap" and "clock moved backwards", and by the Task 13 test "startDay after a 3-week gap".
2. **Importing a bad backup file** (not JSON, another app's JSON, a newer version, truncated or with a wrong field type). Expect: a clear message and nothing changed on the device. Pinned by the Task 12 rejection tests and the Task 22 Settings test "invalid file leaves data untouched".
3. **Odd number input** (blank, negative, decimal where whole numbers are needed, `1e9`, comma decimals like `72,5` from a European iPhone keyboard). Expect: rejected with a message, never `NaN` stored. Pinned by the Task 10 `parseNumberInput` tests and the Task 14 `logSet`/`addFood` validation tests.
4. **Leaving the app open across midnight.** Expect: the new day starts within a minute, without a reload. Pinned by the Task 3 `shouldRollOver` tests; `useDayCycle` (Task 23) calls it every 60 s and on `visibilitychange`.
5. **Double taps on reward buttons** (Complete, Confirm stats, side quest). Expect: XP or points granted once only. Pinned by the Task 13 test "completing an already-done day twice awards once", the Task 14 test "side quest completes once per day" and the Task 10 test "cannot spend more points than available".

## File Map

```
index.html                         viewport-fit, apple meta tags, icons
vite.config.ts                     base, React, Tailwind, PWA
vitest.config.ts                   unit test config (node default, jsdom per file)
playwright.config.ts               WebKit iPhone 15 project, preview server
eslint.config.js
tsconfig.json / tsconfig.node.json
scripts/generate-icons.mjs         renders public/icon.svg → PNG icons with Playwright WebKit
public/icon.svg + generated PNGs
.github/workflows/deploy.yml
src/
  main.tsx  App.tsx  index.css
  config/progression.ts            ALL balance numbers
  config/exercises.ts              exercise library
  domain/types.ts                  all shared types
  domain/rank.ts  xp.ts  day.ts  dayCycle.ts  nutrition.ts  stats.ts
  domain/achievements.ts  input.ts  migrations.ts  validate.ts  backup.ts
  domain/quests/daily.ts  penalty.ts  urgent.ts
  domain/workout/plan.ts  records.ts  exerciseRank.ts
  db/schema.ts  meta.ts  backup.ts
  db/repo/player.ts  onboarding.ts  days.ts  training.ts  sideQuests.ts  food.ts
  platform/audio.ts  standalone.ts  storage.ts  download.ts
  ui/hooks/useReducedMotion.ts  data.ts  useDayCycle.ts
  ui/components/SystemWindow.tsx  Button.tsx  ProgressBar.tsx  NumberField.tsx
                TextField.tsx  ChoiceGroup.tsx  Typewriter.tsx  TabBar.tsx  Screen.tsx  RankBadge.tsx
  ui/screens/Awakening.tsx  ProfileForm.tsx  StatusScreen.tsx  QuestsScreen.tsx
             TrainingScreen.tsx  NutritionScreen.tsx  SettingsScreen.tsx
  ui/overlays/InstallGuide.tsx  MedicalNotice.tsx  BackupReminder.tsx
              LevelUpOverlay.tsx  AchievementToast.tsx  EventHost.tsx
  test/setup.ts  test/fixtures.ts
e2e/helpers.ts  onboarding.spec.ts  daily-quest.spec.ts  level-up.spec.ts  pwa.spec.ts
README.md
```

Unit tests sit next to their source as `*.test.ts(x)`.

---

### Task 1: Project scaffold and toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `e2e`, `icons`, `check`; Tailwind theme colours `void`, `panel`, `glow`, `glow-soft`, `ink`, `muted`, `danger`, `gold`; CSS classes `system-window`, `level-burst`, `safe-top`, `safe-bottom`, `safe-x`.

- [x] **Step 1: Create `package.json`**

```json
{
  "name": "ashborn",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit",
    "lint": "eslint . --max-warnings 0",
    "test": "vitest run",
    "e2e": "playwright test",
    "icons": "node scripts/generate-icons.mjs",
    "check": "npm run typecheck && npm run lint && npm test && npm run build"
  }
}
```

(`&&` inside npm scripts is fine: npm runs scripts with `cmd.exe` on Windows, not PowerShell.)

- [x] **Step 2: Install approved packages (exact versions)**

```powershell
npm install react@19.3.0 react-dom@19.3.0 dexie@4.4.6 dexie-react-hooks@4.4.0
npm install -D vite@8.3.1 @vitejs/plugin-react@6.1.1 typescript@6.0.3 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vite-plugin-pwa@1.3.0 vitest@5.0.2 jsdom@30.1.1 @testing-library/react@16.3.3 fake-indexeddb@6.2.5 @playwright/test@1.63.0 eslint@10.11.0 @eslint/js@10.0.1 typescript-eslint@8.70.1 eslint-plugin-react-hooks@7.1.1 globals@17.12.0 @types/react@19.3.0 @types/react-dom@19.3.0 "@types/node@^24"
```

Expected: installs with no `ERESOLVE` error. If npm reports a peer conflict, stop and report it. Do not use `--force` or `--legacy-peer-deps`.

- [x] **Step 3: Create `tsconfig.json` (app code)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [x] **Step 4: Create `tsconfig.node.json` (config files + e2e)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "e2e"]
}
```

- [x] **Step 5: Create `vite.config.ts`, `vitest.config.ts`, `src/test/setup.ts`**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/ashborn/',
  plugins: [react(), tailwindcss()],
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
  },
});
```

`src/test/setup.ts`:
```ts
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [x] **Step 6: Create `eslint.config.js`**

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },
]);
```

If `reactHooks.configs.flat.recommended` is undefined in the installed version, check `node_modules/eslint-plugin-react-hooks/README.md` for the flat-config export name and use that. Do not add other plugins.

- [x] **Step 7: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#05070d" />
    <meta name="color-scheme" content="dark" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Ashborn" />
    <meta name="description" content="Level up in real life: daily quests, ranks and stats for your workouts and habits." />
    <link rel="icon" type="image/svg+xml" href="%BASE_URL%icon.svg" />
    <link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon.png" />
    <title>Ashborn</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 8: Create `src/index.css`**

```css
@import "tailwindcss";

@theme {
  --color-void: #05070d;
  --color-panel: #0a1020;
  --color-glow: #3ab8ff;
  --color-glow-soft: #1d5c85;
  --color-ink: #e6f1ff;
  --color-muted: #8aa0b8;
  --color-danger: #ff5c7a;
  --color-gold: #ffd166;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--color-void);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  overscroll-behavior-y: none;
}

input,
select,
textarea {
  font-size: 16px; /* stops iPhone Safari zooming into focused fields */
}

.safe-top { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-x {
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}

@keyframes window-in {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: none; }
}

@keyframes shimmer {
  from { background-position: -200% 0; }
  to { background-position: 200% 0; }
}

@keyframes level-burst {
  0% { opacity: 0; transform: scale(0.6); }
  40% { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}

.system-window {
  position: relative;
  border: 1px solid rgb(58 184 255 / 0.6);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(10 16 32 / 0.94), rgb(5 7 13 / 0.94));
  box-shadow: 0 0 12px rgb(58 184 255 / 0.35), inset 0 0 18px rgb(58 184 255 / 0.08);
  animation: window-in 220ms ease-out;
}

.system-window::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgb(58 184 255 / 0.08) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: shimmer 6s linear infinite;
}

.level-burst { animation: level-burst 1.6s ease-out both; }

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .system-window::before { display: none; }
}
```

- [x] **Step 9: Write the failing smoke test `src/App.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App scaffold', () => {
  it('renders the app name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Ashborn' })).toBeTruthy();
  });
});
```

- [x] **Step 10: Run it to check it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL, cannot resolve `./App`.

- [x] **Step 11: Create `src/App.tsx` and `src/main.tsx`**

`src/App.tsx`:
```tsx
export default function App() {
  return (
    <main className="safe-top safe-x p-4">
      <h1 className="text-2xl font-semibold text-glow">Ashborn</h1>
    </main>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [x] **Step 12: Run the full gate**

Run: `npm run check`
Expected: typecheck passes, lint passes with 0 problems, 1 test passes, `vite build` writes `dist/`. Fix anything that fails before continuing.

- [x] **Step 13: Commit**

```powershell
git add -A
git commit -m @'
chore: scaffold Vite + React + TS + Tailwind + Vitest + ESLint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 2: Types, progression config, XP and ranks

**Files:**
- Create: `src/domain/types.ts`, `src/config/progression.ts`, `src/domain/rank.ts`, `src/domain/xp.ts`, `src/test/fixtures.ts`
- Test: `src/domain/rank.test.ts`, `src/domain/xp.test.ts`

**Interfaces:**
- Produces (types, used by every later task): everything in `types.ts` below.
- Produces: `progression` (config object); `rankForLevel(level: number): Rank`; `rankIndex(rank: Rank): number`; `xpToNext(level: number): number`; `applyXp<P extends Pick<Player,'level'|'xp'|'unspentStatPoints'>>(player: P, amount: number): { player: P; levelUp: LevelUpEvent | null }`; fixtures `sampleProfileInput`, `at(date, time?)`.

- [x] **Step 1: Create `src/domain/types.ts`**

```ts
export type Sex = 'male' | 'female';
export type Goal = 'lose_fat' | 'build_muscle' | 'get_fit';
export type Experience = 'never' | 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'none' | 'dumbbells' | 'gym';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export const RANKS: readonly Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export type StatKey = 'strength' | 'agility' | 'vitality' | 'endurance' | 'discipline';
export const STAT_KEYS: readonly StatKey[] = ['strength', 'agility', 'vitality', 'endurance', 'discipline'];
export type Stats = Record<StatKey, number>;

export interface Profile {
  id: 1;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  minutesPerSession: number;
  equipment: Equipment;
  createdAt: string;
}
export type ProfileInput = Omit<Profile, 'id' | 'createdAt'>;

export interface Player {
  id: 1;
  level: number;
  xp: number;
  unspentStatPoints: number;
  stats: Stats;
  titleId: string | null;
  streak: number;
  bestStreak: number;
  questsCompleted: number;
  sideQuestStatProgress: Stats;
}

export type QuestItemKind = 'pushups' | 'situps' | 'squats' | 'cardio';
export type QuestUnit = 'reps' | 'min';

export interface QuestItem {
  id: string;
  label: string;
  easier: string;
  target: number;
  unit: QuestUnit;
  progress: number;
}

export interface PenaltyQuest extends QuestItem {
  xp: number;
  done: boolean;
}

export interface UrgentQuest {
  id: string;
  label: string;
  xp: number;
  done: boolean;
}

export type DayStatus = 'open' | 'partial' | 'done' | 'missed' | 'rest';

export interface DayRecord {
  date: string;
  items: QuestItem[];
  status: DayStatus;
  penalty: PenaltyQuest | null;
  urgent: UrgentQuest | null;
  xpAwarded: number;
}

export interface SideQuest {
  id: number;
  title: string;
  xp: number;
  stat: StatKey;
  archived: boolean;
  completions: number;
}

export type QuestKind = 'daily' | 'penalty' | 'urgent' | 'side';

export interface QuestLogEntry {
  id: number;
  date: string;
  kind: QuestKind;
  refId: string;
  xp: number;
  at: string;
}

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core';
export type PlanFocus = 'full' | 'upper' | 'lower';

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: number;
}

export interface PlanDay {
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  weekday: number;
  focus: PlanFocus;
  exercises: PlannedExercise[];
}

export interface WeekPlan {
  weekStart: string;
  days: PlanDay[];
}

export interface WorkoutSet {
  id: number;
  exerciseId: string;
  date: string;
  reps: number;
  weightKg: number;
  at: string;
}

export interface FoodEntry {
  id: number;
  date: string;
  kcal: number;
  proteinG: number;
  waterMl: number;
  note: string;
  at: string;
}

export interface AchievementRow {
  id: string;
  unlockedAt: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export type PersistResult = 'granted' | 'denied' | 'unsupported';

export interface LevelUpEvent {
  fromLevel: number;
  toLevel: number;
  fromRank: Rank;
  toRank: Rank;
  statPointsGained: number;
}

export type GameEvent =
  | ({ type: 'levelUp' } & LevelUpEvent)
  | { type: 'achievement'; id: string; title: string };
```

- [x] **Step 2: Create `src/config/progression.ts`**

```ts
import type { Experience, QuestItemKind, QuestUnit, Rank } from '../domain/types';

/**
 * ALL game-balance numbers live here. Change them to rebalance the game;
 * the unit tests read these values, so they keep passing after tweaks
 * unless a rule itself breaks.
 */

export interface TierItem {
  kind: QuestItemKind;
  label: string;
  easier: string;
  target: number;
  unit: QuestUnit;
}

export interface TierPenalty {
  label: string;
  easier: string;
  target: number;
  unit: QuestUnit;
}

export interface ProgressionConfig {
  xpCurve: { base: number; exponent: number };
  rankThresholds: ReadonlyArray<{ rank: Rank; minLevel: number }>;
  statPointsPerLevel: number;
  statPointsPerRankUp: number;
  startingStatValue: number;
  defaultTitle: string;
  dailyQuest: {
    baseXp: number;
    xpPerLevel: number;
    scalePerLevel: number;
    maxScale: number;
    weeklyGrowthCap: number;
  };
  tiers: Record<Experience, TierItem[]>;
  penalty: { xp: number; byTier: Record<Experience, TierPenalty> };
  urgent: { chance: number; xp: number; tasks: readonly string[] };
  sideQuest: { minXp: number; maxXp: number; completionsPerStatPoint: number };
  exerciseRank: ReadonlyArray<{ rank: Rank; minRatio: number }>;
  training: {
    setsByTier: Record<Experience, number>;
    repsByTier: Record<Experience, number>;
    weeklyVolumeCap: number;
  };
}

export const progression: ProgressionConfig = {
  /** XP needed to go from level L to L+1 = round(base × L^exponent). */
  xpCurve: { base: 80, exponent: 1.3 },
  /** Checked top-down: the first entry whose minLevel ≤ level wins. */
  rankThresholds: [
    { rank: 'S', minLevel: 70 },
    { rank: 'A', minLevel: 50 },
    { rank: 'B', minLevel: 35 },
    { rank: 'C', minLevel: 20 },
    { rank: 'D', minLevel: 10 },
    { rank: 'E', minLevel: 1 },
  ],
  statPointsPerLevel: 3,
  statPointsPerRankUp: 5,
  startingStatValue: 10,
  defaultTitle: 'Novice',
  dailyQuest: {
    /** Full daily quest XP = baseXp + xpPerLevel × level */
    baseXp: 60,
    xpPerLevel: 5,
    /** Targets grow 5 % per level above 1, up to 2× the tier's base */
    scalePerLevel: 0.05,
    maxScale: 2,
    /** No target may exceed the reference quest from ≥ 7 days earlier by more than 10 % (min +1) */
    weeklyGrowthCap: 0.1,
  },
  tiers: {
    never: [
      { kind: 'pushups', label: 'Knee or wall push-ups', easier: 'Wall push-ups', target: 5, unit: 'reps' },
      { kind: 'situps', label: 'Crunches', easier: 'Half crunches', target: 10, unit: 'reps' },
      { kind: 'squats', label: 'Chair squats', easier: 'Sit-to-stand from a high chair', target: 10, unit: 'reps' },
      { kind: 'cardio', label: 'Walk', easier: 'Slow walk', target: 10, unit: 'min' },
    ],
    beginner: [
      { kind: 'pushups', label: 'Push-ups', easier: 'Knee or wall push-ups', target: 10, unit: 'reps' },
      { kind: 'situps', label: 'Sit-ups', easier: 'Crunches', target: 15, unit: 'reps' },
      { kind: 'squats', label: 'Squats', easier: 'Chair squats', target: 15, unit: 'reps' },
      { kind: 'cardio', label: 'Walk', easier: 'Slow walk', target: 15, unit: 'min' },
    ],
    intermediate: [
      { kind: 'pushups', label: 'Push-ups', easier: 'Knee push-ups', target: 20, unit: 'reps' },
      { kind: 'situps', label: 'Sit-ups', easier: 'Crunches', target: 25, unit: 'reps' },
      { kind: 'squats', label: 'Squats', easier: 'Chair squats', target: 30, unit: 'reps' },
      { kind: 'cardio', label: 'Jog', easier: 'Brisk walk', target: 20, unit: 'min' },
    ],
    advanced: [
      { kind: 'pushups', label: 'Push-ups', easier: 'Knee push-ups', target: 30, unit: 'reps' },
      { kind: 'situps', label: 'Sit-ups', easier: 'Crunches', target: 40, unit: 'reps' },
      { kind: 'squats', label: 'Squats', easier: 'Chair squats', target: 40, unit: 'reps' },
      { kind: 'cardio', label: 'Run', easier: 'Jog or brisk walk', target: 25, unit: 'min' },
    ],
  },
  penalty: {
    xp: 20,
    byTier: {
      never: { label: 'Walk', easier: 'Slow walk', target: 10, unit: 'min' },
      beginner: { label: 'Squats', easier: 'Chair squats', target: 15, unit: 'reps' },
      intermediate: { label: 'Squats', easier: 'Chair squats', target: 20, unit: 'reps' },
      advanced: { label: 'Squats', easier: 'Chair squats', target: 25, unit: 'reps' },
    },
  },
  urgent: {
    chance: 0.3,
    xp: 25,
    tasks: [
      'Hold a plank for 30 seconds',
      'Drink a full glass of water',
      'Stretch for 5 minutes',
      'Take a 10-minute walk',
      'Do 10 slow squats',
    ],
  },
  sideQuest: { minXp: 10, maxXp: 50, completionsPerStatPoint: 5 },
  /** Best result ÷ your first-session best. Checked top-down. */
  exerciseRank: [
    { rank: 'S', minRatio: 2 },
    { rank: 'A', minRatio: 1.75 },
    { rank: 'B', minRatio: 1.5 },
    { rank: 'C', minRatio: 1.25 },
    { rank: 'D', minRatio: 1.1 },
    { rank: 'E', minRatio: 0 },
  ],
  training: {
    setsByTier: { never: 2, beginner: 2, intermediate: 3, advanced: 4 },
    repsByTier: { never: 8, beginner: 10, intermediate: 10, advanced: 10 },
    /** Planned weekly volume (sets × reps) may grow at most 10 % week over week */
    weeklyVolumeCap: 0.1,
  },
};
```

- [x] **Step 3: Write failing tests `src/domain/rank.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { rankForLevel, rankIndex } from './rank';

describe('rankForLevel', () => {
  it.each([
    [1, 'E'], [9, 'E'], [10, 'D'], [19, 'D'], [20, 'C'], [34, 'C'],
    [35, 'B'], [49, 'B'], [50, 'A'], [69, 'A'], [70, 'S'], [250, 'S'],
  ])('level %i is rank %s', (level, rank) => {
    expect(rankForLevel(level)).toBe(rank);
  });

  it('orders ranks from E to S', () => {
    expect(rankIndex('E')).toBe(0);
    expect(rankIndex('S')).toBe(5);
  });
});
```

- [x] **Step 4: Write failing tests `src/domain/xp.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { applyXp, xpToNext } from './xp';

const fresh = { level: 1, xp: 0, unspentStatPoints: 0 };

describe('xpToNext', () => {
  it('follows round(80 × L^1.3)', () => {
    expect(xpToNext(1)).toBe(80);
    expect(xpToNext(2)).toBe(197);
    expect(xpToNext(5)).toBe(648);
    expect(xpToNext(10)).toBe(1596);
  });
});

describe('applyXp', () => {
  it('adds XP without levelling when below the threshold', () => {
    const r = applyXp(fresh, 50);
    expect(r.player).toEqual({ level: 1, xp: 50, unspentStatPoints: 0 });
    expect(r.levelUp).toBeNull();
  });

  it('levels up exactly at the threshold and grants 3 points', () => {
    const r = applyXp(fresh, 80);
    expect(r.player).toEqual({ level: 2, xp: 0, unspentStatPoints: 3 });
    expect(r.levelUp).toEqual({ fromLevel: 1, toLevel: 2, fromRank: 'E', toRank: 'E', statPointsGained: 3 });
  });

  it('carries overflow across several level-ups', () => {
    const r = applyXp(fresh, xpToNext(1) + xpToNext(2) + 10);
    expect(r.player).toEqual({ level: 3, xp: 10, unspentStatPoints: 6 });
    expect(r.levelUp?.statPointsGained).toBe(6);
  });

  it('adds the rank-up bonus when crossing into a new rank', () => {
    const r = applyXp({ level: 9, xp: 0, unspentStatPoints: 1 }, xpToNext(9));
    expect(r.player.level).toBe(10);
    expect(r.player.unspentStatPoints).toBe(1 + 3 + 5);
    expect(r.levelUp).toMatchObject({ fromRank: 'E', toRank: 'D', statPointsGained: 8 });
  });

  it('ignores negative, fractional-part and non-finite amounts safely', () => {
    expect(applyXp(fresh, -40).player).toEqual(fresh);
    expect(applyXp(fresh, Number.NaN).player).toEqual(fresh);
    expect(applyXp(fresh, Number.POSITIVE_INFINITY).player).toEqual(fresh);
    expect(applyXp(fresh, 10.9).player.xp).toBe(10);
  });

  it('keeps other player fields untouched', () => {
    const r = applyXp({ ...fresh, streak: 4 }, 5);
    expect(r.player.streak).toBe(4);
  });
});
```

- [x] **Step 5: Run the tests to check they fail**

Run: `npx vitest run src/domain/rank.test.ts src/domain/xp.test.ts`
Expected: FAIL, modules `./rank` and `./xp` not found.

- [x] **Step 6: Implement `src/domain/rank.ts`**

```ts
import { progression } from '../config/progression';
import { RANKS, type Rank } from './types';

export function rankForLevel(level: number): Rank {
  for (const threshold of progression.rankThresholds) {
    if (level >= threshold.minLevel) return threshold.rank;
  }
  return 'E';
}

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}
```

- [x] **Step 7: Implement `src/domain/xp.ts`**

```ts
import { progression } from '../config/progression';
import { rankForLevel } from './rank';
import type { LevelUpEvent, Player } from './types';

export function xpToNext(level: number): number {
  const { base, exponent } = progression.xpCurve;
  return Math.round(base * Math.pow(level, exponent));
}

type XpFields = Pick<Player, 'level' | 'xp' | 'unspentStatPoints'>;

export function applyXp<P extends XpFields>(player: P, amount: number): { player: P; levelUp: LevelUpEvent | null } {
  const gain = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  let level = player.level;
  let xp = player.xp + gain;
  let points = player.unspentStatPoints;

  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    const rankBefore = rankForLevel(level);
    level += 1;
    points += progression.statPointsPerLevel;
    if (rankForLevel(level) !== rankBefore) points += progression.statPointsPerRankUp;
  }

  const next = { ...player, level, xp, unspentStatPoints: points };
  if (level === player.level) return { player: next, levelUp: null };
  return {
    player: next,
    levelUp: {
      fromLevel: player.level,
      toLevel: level,
      fromRank: rankForLevel(player.level),
      toRank: rankForLevel(level),
      statPointsGained: points - player.unspentStatPoints,
    },
  };
}
```

- [x] **Step 8: Create `src/test/fixtures.ts`**

```ts
import type { ProfileInput } from '../domain/types';

export const sampleProfileInput: ProfileInput = {
  name: 'Kai',
  age: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  goal: 'get_fit',
  experience: 'beginner',
  daysPerWeek: 3,
  minutesPerSession: 30,
  equipment: 'none',
};

/** Local-time Date for a YYYY-MM-DD key, e.g. at('2026-09-25', '23:59'). */
export function at(date: string, time = '09:00'): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, h, min);
}
```

- [x] **Step 9: Run the tests to check they pass**

Run: `npx vitest run src/domain`
Expected: PASS, all rank and xp tests.

- [x] **Step 10: Gate and commit**

Run: `npm run typecheck; npm run lint`. Both must be clean.

```powershell
git add -A
git commit -m @'
feat(domain): add types, progression config, XP curve and ranks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 3: Local-date utilities

**Files:**
- Create: `src/domain/day.ts`
- Test: `src/domain/day.test.ts`

**Interfaces:**
- Produces: `todayKey(now: Date): string`; `isDateKey(value: unknown): value is string`; `addDays(key: string, n: number): string`; `daysBetween(from: string, to: string): number`; `dateRange(fromInclusive: string, toExclusive: string): string[]`; `isoWeekday(key: string): number` (1 = Mon … 7 = Sun); `weekStartOf(key: string): string` (the Monday); `shouldRollOver(currentDate: string | null, now: Date): boolean`.

- [x] **Step 1: Write failing tests `src/domain/day.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { at } from '../test/fixtures';
import { addDays, dateRange, daysBetween, isDateKey, isoWeekday, shouldRollOver, todayKey, weekStartOf } from './day';

describe('todayKey', () => {
  it('uses the local calendar date', () => {
    expect(todayKey(at('2026-03-08', '23:59'))).toBe('2026-03-08');
    expect(todayKey(at('2026-03-09', '00:00'))).toBe('2026-03-09');
  });
});

describe('addDays / daysBetween / dateRange', () => {
  it('crosses month, year, leap-day and DST boundaries by calendar', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09'); // US DST starts 2026-03-08
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26'); // EU DST ends 2026-10-25
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-09-25', '2026-09-25')).toBe(0);
  });

  it('lists dates in [from, to)', () => {
    expect(dateRange('2026-09-20', '2026-09-23')).toEqual(['2026-09-20', '2026-09-21', '2026-09-22']);
    expect(dateRange('2026-09-20', '2026-09-20')).toEqual([]);
  });
});

describe('weeks', () => {
  it('uses ISO weekdays and Monday week starts', () => {
    expect(isoWeekday('2026-09-21')).toBe(1); // Monday
    expect(isoWeekday('2026-09-27')).toBe(7); // Sunday
    expect(weekStartOf('2026-09-25')).toBe('2026-09-21');
    expect(weekStartOf('2026-09-27')).toBe('2026-09-21');
    expect(weekStartOf('2026-09-21')).toBe('2026-09-21');
  });
});

describe('isDateKey', () => {
  it('accepts real dates only', () => {
    expect(isDateKey('2026-09-25')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('26-9-25')).toBe(false);
    expect(isDateKey(20260925)).toBe(false);
  });
});

describe('shouldRollOver', () => {
  it('rolls over on first run and after local midnight only', () => {
    expect(shouldRollOver(null, at('2026-09-25'))).toBe(true);
    expect(shouldRollOver('2026-09-25', at('2026-09-25', '23:59'))).toBe(false);
    expect(shouldRollOver('2026-09-25', at('2026-09-26', '00:00'))).toBe(true);
  });

  it('does not roll over when the clock moved backwards', () => {
    expect(shouldRollOver('2026-09-25', at('2026-09-24', '22:00'))).toBe(false);
  });
});
```

- [x] **Step 2: Run to check it fails**

Run: `npx vitest run src/domain/day.test.ts`
Expected: FAIL, module `./day` not found.

- [x] **Step 3: Implement `src/domain/day.ts`**

```ts
/**
 * Dates are stored as local-calendar keys "YYYY-MM-DD".
 * Arithmetic on keys uses UTC internally so DST changes never skip or repeat a day.
 */

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

function parts(key: string): [number, number, number] {
  return key.split('-').map(Number) as [number, number, number];
}

function toKeyUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function todayKey(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = parts(value);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = parts(key);
  return toKeyUtc(new Date(Date.UTC(y, m - 1, d + n)));
}

export function daysBetween(from: string, to: string): number {
  const [a, b, c] = parts(from);
  const [x, y, z] = parts(to);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / DAY_MS);
}

export function dateRange(fromInclusive: string, toExclusive: string): string[] {
  const out: string[] = [];
  for (let key = fromInclusive; key < toExclusive; key = addDays(key, 1)) out.push(key);
  return out;
}

export function isoWeekday(key: string): number {
  const [y, m, d] = parts(key);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function weekStartOf(key: string): string {
  return addDays(key, 1 - isoWeekday(key));
}

export function shouldRollOver(currentDate: string | null, now: Date): boolean {
  return currentDate === null || todayKey(now) > currentDate;
}
```

- [x] **Step 4: Run to check it passes**

Run: `npx vitest run src/domain/day.test.ts`
Expected: PASS.

- [x] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): add local-date utilities with DST-safe arithmetic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 4: Daily Quest generation

**Files:**
- Create: `src/domain/quests/daily.ts`
- Test: `src/domain/quests/daily.test.ts`

**Interfaces:**
- Consumes: `progression`, types `Experience`, `QuestItem`, `DayRecord`.
- Produces: `dailyQuestXp(level: number): number`; `targetScale(level: number): number`; `generateDailyItems(experience: Experience, level: number, reference: QuestItem[] | null): QuestItem[]`; `createDayRecord(date: string, experience: Experience, level: number, reference: QuestItem[] | null): DayRecord`; `completionFraction(items: QuestItem[]): number`; `isDailyComplete(items: QuestItem[]): boolean`; `partialXp(items: QuestItem[], level: number): number`.

The Daily Quest is always bodyweight, so equipment does not affect it. Equipment only shapes the weekly training plan (Task 8). `reference` is the quest from ≥ 7 days earlier, and it enforces the 10 % weekly cap.

- [x] **Step 1: Write failing tests `src/domain/quests/daily.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { QuestItem } from '../types';
import {
  completionFraction, createDayRecord, dailyQuestXp, generateDailyItems, isDailyComplete, partialXp, targetScale,
} from './daily';

const targets = (items: QuestItem[]) => items.map((i) => i.target);

describe('generateDailyItems', () => {
  it('gives the beginner tier its base targets at level 1', () => {
    const items = generateDailyItems('beginner', 1, null);
    expect(items.map((i) => i.id)).toEqual(['pushups', 'situps', 'squats', 'cardio']);
    expect(targets(items)).toEqual([10, 15, 15, 15]);
    expect(items[3]).toMatchObject({ label: 'Walk', unit: 'min', progress: 0 });
  });

  it('uses gentle movements for people who have never trained', () => {
    const items = generateDailyItems('never', 1, null);
    expect(items.map((i) => i.label)).toEqual(['Knee or wall push-ups', 'Crunches', 'Chair squats', 'Walk']);
    expect(targets(items)).toEqual([5, 10, 10, 10]);
  });

  it('always offers an easier option', () => {
    for (const tier of ['never', 'beginner', 'intermediate', 'advanced'] as const) {
      for (const item of generateDailyItems(tier, 1, null)) expect(item.easier.length).toBeGreaterThan(0);
    }
  });

  it('scales targets 5 % per level', () => {
    expect(targetScale(11)).toBeCloseTo(1.5);
    expect(targets(generateDailyItems('beginner', 11, null))).toEqual([15, 23, 23, 23]);
  });

  it('never scales beyond 2×', () => {
    expect(targets(generateDailyItems('beginner', 100, null))).toEqual([20, 30, 30, 30]);
  });

  it('caps growth at +10 % (min +1) over the reference quest', () => {
    const reference = generateDailyItems('beginner', 1, null);
    expect(targets(generateDailyItems('beginner', 11, reference))).toEqual([11, 16, 16, 16]);
  });

  it('ramps gradually when the experience tier is raised', () => {
    const reference = generateDailyItems('beginner', 1, null);
    expect(targets(generateDailyItems('advanced', 1, reference))).toEqual([11, 16, 16, 16]);
  });
});

describe('completion and XP', () => {
  const items = generateDailyItems('beginner', 1, null);

  it('computes full XP as 60 + 5 × level', () => {
    expect(dailyQuestXp(1)).toBe(65);
    expect(dailyQuestXp(10)).toBe(110);
  });

  it('averages per-item completion, capping each item at 100 %', () => {
    const done = items.map((i, n) => (n === 0 ? { ...i, progress: 999 } : i));
    expect(completionFraction(done)).toBeCloseTo(0.25);
    expect(partialXp(done, 1)).toBe(16);
    expect(isDailyComplete(done)).toBe(false);
  });

  it('is complete when every item reaches its target', () => {
    const all = items.map((i) => ({ ...i, progress: i.target }));
    expect(isDailyComplete(all)).toBe(true);
    expect(completionFraction(all)).toBe(1);
    expect(isDailyComplete([])).toBe(false);
  });

  it('creates an open day record', () => {
    const record = createDayRecord('2026-09-25', 'beginner', 1, null);
    expect(record).toMatchObject({ date: '2026-09-25', status: 'open', penalty: null, urgent: null, xpAwarded: 0 });
    expect(record.items).toHaveLength(4);
  });
});
```

- [x] **Step 2: Run to check it fails**

Run: `npx vitest run src/domain/quests/daily.test.ts`
Expected: FAIL, module not found.

- [x] **Step 3: Implement `src/domain/quests/daily.ts`**

```ts
import { progression } from '../../config/progression';
import type { DayRecord, Experience, QuestItem } from '../types';

export function dailyQuestXp(level: number): number {
  const { baseXp, xpPerLevel } = progression.dailyQuest;
  return baseXp + xpPerLevel * level;
}

export function targetScale(level: number): number {
  const { scalePerLevel, maxScale } = progression.dailyQuest;
  return Math.min(maxScale, 1 + scalePerLevel * (level - 1));
}

export function generateDailyItems(experience: Experience, level: number, reference: QuestItem[] | null): QuestItem[] {
  const scale = targetScale(level);
  return progression.tiers[experience].map((tier) => {
    let target = Math.max(1, Math.round(tier.target * scale));
    const previous = reference?.find((r) => r.id === tier.kind);
    if (previous) {
      const cap = previous.target + Math.max(1, Math.floor(previous.target * progression.dailyQuest.weeklyGrowthCap));
      target = Math.min(target, cap);
    }
    return { id: tier.kind, label: tier.label, easier: tier.easier, target, unit: tier.unit, progress: 0 };
  });
}

export function createDayRecord(date: string, experience: Experience, level: number, reference: QuestItem[] | null): DayRecord {
  return {
    date,
    items: generateDailyItems(experience, level, reference),
    status: 'open',
    penalty: null,
    urgent: null,
    xpAwarded: 0,
  };
}

export function completionFraction(items: QuestItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + (item.target > 0 ? Math.min(1, item.progress / item.target) : 1), 0);
  return total / items.length;
}

export function isDailyComplete(items: QuestItem[]): boolean {
  return items.length > 0 && items.every((item) => item.progress >= item.target);
}

export function partialXp(items: QuestItem[], level: number): number {
  return Math.floor(dailyQuestXp(level) * completionFraction(items));
}
```

- [x] **Step 4: Run to check it passes**

Run: `npx vitest run src/domain/quests/daily.test.ts`
Expected: PASS.

- [x] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): generate tiered daily quests with 10% weekly cap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 5: Penalty and Urgent quests

**Files:**
- Create: `src/domain/quests/penalty.ts`, `src/domain/quests/urgent.ts`
- Test: `src/domain/quests/penalty.test.ts`, `src/domain/quests/urgent.test.ts`

**Interfaces:**
- Produces: `generatePenalty(experience: Experience): PenaltyQuest`; `rollUrgent(rng: () => number, today: string, lastUrgentDate: string | null): UrgentQuest | null`. `rng` is called once for the chance and, on success, once more for which task.

- [x] **Step 1: Write failing tests**

`src/domain/quests/penalty.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { generatePenalty } from './penalty';

describe('generatePenalty', () => {
  it('is one small, tier-scaled task worth 20 XP', () => {
    expect(generatePenalty('never')).toMatchObject({ id: 'penalty', label: 'Walk', target: 10, unit: 'min', xp: 20, done: false, progress: 0 });
    expect(generatePenalty('beginner')).toMatchObject({ label: 'Squats', target: 15, unit: 'reps' });
    expect(generatePenalty('advanced').target).toBeLessThanOrEqual(25);
  });
});
```

`src/domain/quests/urgent.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { rollUrgent } from './urgent';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

describe('rollUrgent', () => {
  it('appears when the roll is under the 30 % chance', () => {
    expect(rollUrgent(seq(0.1, 0), '2026-09-25', null)).toEqual({
      id: 'urgent-2026-09-25', label: 'Hold a plank for 30 seconds', xp: 25, done: false,
    });
  });

  it('picks the task from the second roll', () => {
    expect(rollUrgent(seq(0.1, 0.99), '2026-09-25', null)?.label).toBe('Do 10 slow squats');
  });

  it('does not appear when the roll misses', () => {
    expect(rollUrgent(seq(0.5), '2026-09-25', null)).toBeNull();
  });

  it('appears at most once per day', () => {
    expect(rollUrgent(seq(0), '2026-09-25', '2026-09-25')).toBeNull();
  });
});
```

- [x] **Step 2: Run to check they fail**

Run: `npx vitest run src/domain/quests`
Expected: FAIL for penalty and urgent (modules not found). Daily tests still pass.

- [x] **Step 3: Implement**

`src/domain/quests/penalty.ts`:
```ts
import { progression } from '../../config/progression';
import type { Experience, PenaltyQuest } from '../types';

export function generatePenalty(experience: Experience): PenaltyQuest {
  const p = progression.penalty.byTier[experience];
  return {
    id: 'penalty',
    label: p.label,
    easier: p.easier,
    target: p.target,
    unit: p.unit,
    progress: 0,
    xp: progression.penalty.xp,
    done: false,
  };
}
```

`src/domain/quests/urgent.ts`:
```ts
import { progression } from '../../config/progression';
import type { UrgentQuest } from '../types';

export function rollUrgent(rng: () => number, today: string, lastUrgentDate: string | null): UrgentQuest | null {
  if (lastUrgentDate === today) return null;
  const { chance, xp, tasks } = progression.urgent;
  if (tasks.length === 0 || rng() >= chance) return null;
  const index = Math.min(tasks.length - 1, Math.floor(rng() * tasks.length));
  return { id: `urgent-${today}`, label: tasks[index]!, xp, done: false };
}
```

- [x] **Step 4: Run to check they pass**

Run: `npx vitest run src/domain/quests`
Expected: PASS.

- [x] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): add penalty and urgent quests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 6: Daily reset (day cycle)

**Files:**
- Create: `src/domain/dayCycle.ts`
- Test: `src/domain/dayCycle.test.ts`

**Interfaces:**
- Consumes: `dateRange` (Task 3), `partialXp` (Task 4).
- Produces:
```ts
export const MAX_BACKFILL_DAYS = 366;
export interface ProcessDaysInput { lastOpenDate: string | null; today: string; days: Readonly<Record<string, DayRecord>>; streak: number; level: number }
export interface ProcessDaysResult { closed: DayRecord[]; streak: number; xpToAward: number; needsPenalty: boolean; currentDate: string }
export function processDays(input: ProcessDaysInput): ProcessDaysResult
```

Rules (spec §5):
- Every date from `lastOpenDate` (inclusive) to `today` (exclusive) is closed.
- `done` and `rest` days stay as they are.
- `open` days become `missed`, and any progress earns partial XP.
- `partial` days become `missed`; their XP was already awarded.
- Days with no record get a placeholder `missed` record (only the most recent 366).
- Any missed day resets the streak to 0 and sets `needsPenalty`: one penalty, never stacked.
- If the clock moved backwards (`today < lastOpenDate`), nothing is closed and `currentDate` stays `lastOpenDate`.

- [x] **Step 1: Write failing tests `src/domain/dayCycle.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { addDays } from './day';
import { MAX_BACKFILL_DAYS, processDays } from './dayCycle';
import { createDayRecord } from './quests/daily';
import type { DayRecord } from './types';

const open = (date: string): DayRecord => createDayRecord(date, 'beginner', 1, null);
const base = { streak: 5, level: 1 };

describe('processDays', () => {
  it('does nothing on the very first run', () => {
    const r = processDays({ ...base, lastOpenDate: null, today: '2026-09-25', days: {} });
    expect(r).toEqual({ closed: [], streak: 5, xpToAward: 0, needsPenalty: false, currentDate: '2026-09-25' });
  });

  it('does nothing when reopened on the same day', () => {
    const r = processDays({ ...base, lastOpenDate: '2026-09-25', today: '2026-09-25', days: { '2026-09-25': open('2026-09-25') } });
    expect(r.closed).toEqual([]);
    expect(r.needsPenalty).toBe(false);
  });

  it('keeps a completed day and the streak', () => {
    const done = { ...open('2026-09-24'), status: 'done' as const };
    const r = processDays({ ...base, lastOpenDate: '2026-09-24', today: '2026-09-25', days: { '2026-09-24': done } });
    expect(r.closed).toEqual([]);
    expect(r.streak).toBe(5);
    expect(r.needsPenalty).toBe(false);
  });

  it('never penalises a rest day', () => {
    const rest = { ...open('2026-09-24'), status: 'rest' as const };
    const r = processDays({ ...base, lastOpenDate: '2026-09-24', today: '2026-09-25', days: { '2026-09-24': rest } });
    expect(r.streak).toBe(5);
    expect(r.needsPenalty).toBe(false);
  });

  it('marks an untouched day missed, resets the streak and asks for a penalty', () => {
    const r = processDays({ ...base, lastOpenDate: '2026-09-24', today: '2026-09-25', days: { '2026-09-24': open('2026-09-24') } });
    expect(r.closed).toHaveLength(1);
    expect(r.closed[0]!.status).toBe('missed');
    expect(r.streak).toBe(0);
    expect(r.needsPenalty).toBe(true);
    expect(r.xpToAward).toBe(0);
  });

  it('awards partial XP for progress left on an open day', () => {
    const day = open('2026-09-24');
    day.items[0] = { ...day.items[0]!, progress: day.items[0]!.target };
    const r = processDays({ ...base, lastOpenDate: '2026-09-24', today: '2026-09-25', days: { '2026-09-24': day } });
    expect(r.xpToAward).toBe(16);
    expect(r.closed[0]).toMatchObject({ status: 'missed', xpAwarded: 16 });
  });

  it('does not re-award XP for a day already finished as partial', () => {
    const day = { ...open('2026-09-24'), status: 'partial' as const, xpAwarded: 16 };
    const r = processDays({ ...base, lastOpenDate: '2026-09-24', today: '2026-09-25', days: { '2026-09-24': day } });
    expect(r.xpToAward).toBe(0);
    expect(r.closed[0]).toMatchObject({ status: 'missed', xpAwarded: 16 });
    expect(r.needsPenalty).toBe(true);
  });

  it('fills a multi-day gap with missed days but only one penalty', () => {
    const r = processDays({ ...base, lastOpenDate: '2026-09-20', today: '2026-09-23', days: { '2026-09-20': open('2026-09-20') } });
    expect(r.closed.map((d) => [d.date, d.status])).toEqual([
      ['2026-09-20', 'missed'], ['2026-09-21', 'missed'], ['2026-09-22', 'missed'],
    ]);
    expect(r.needsPenalty).toBe(true);
    expect(r.streak).toBe(0);
    expect(r.currentDate).toBe('2026-09-23');
  });

  it('closes days correctly across a DST change', () => {
    const r = processDays({ ...base, lastOpenDate: '2026-03-07', today: '2026-03-09', days: {} });
    expect(r.closed.map((d) => d.date)).toEqual(['2026-03-07', '2026-03-08']);
  });

  it('survives a 1000-day gap without creating unbounded records', () => {
    const today = addDays('2024-01-01', 1000);
    const r = processDays({ ...base, lastOpenDate: '2024-01-01', today, days: {} });
    expect(r.closed).toHaveLength(MAX_BACKFILL_DAYS);
    expect(r.closed.at(-1)!.date).toBe(addDays(today, -1));
    expect(r.needsPenalty).toBe(true);
  });

  it('ignores a clock that moved backwards', () => {
    const r = processDays({ ...base, lastOpenDate: '2026-09-25', today: '2026-09-24', days: { '2026-09-25': open('2026-09-25') } });
    expect(r).toEqual({ closed: [], streak: 5, xpToAward: 0, needsPenalty: false, currentDate: '2026-09-25' });
  });
});
```

- [x] **Step 2: Run to check it fails**

Run: `npx vitest run src/domain/dayCycle.test.ts`
Expected: FAIL, module not found.

- [x] **Step 3: Implement `src/domain/dayCycle.ts`**

```ts
import { dateRange } from './day';
import { partialXp } from './quests/daily';
import type { DayRecord } from './types';

/** Placeholder records are only written for this many most-recent missed days. */
export const MAX_BACKFILL_DAYS = 366;

export interface ProcessDaysInput {
  lastOpenDate: string | null;
  today: string;
  days: Readonly<Record<string, DayRecord>>;
  streak: number;
  level: number;
}

export interface ProcessDaysResult {
  closed: DayRecord[];
  streak: number;
  xpToAward: number;
  needsPenalty: boolean;
  currentDate: string;
}

function missedPlaceholder(date: string): DayRecord {
  return { date, items: [], status: 'missed', penalty: null, urgent: null, xpAwarded: 0 };
}

export function processDays(input: ProcessDaysInput): ProcessDaysResult {
  const { lastOpenDate, today, level } = input;
  let streak = input.streak;

  if (lastOpenDate === null || today <= lastOpenDate) {
    const currentDate = lastOpenDate !== null && today < lastOpenDate ? lastOpenDate : today;
    return { closed: [], streak, xpToAward: 0, needsPenalty: false, currentDate };
  }

  const dates = dateRange(lastOpenDate, today);
  const firstRecorded = Math.max(0, dates.length - MAX_BACKFILL_DAYS);
  const closed: DayRecord[] = [];
  let xpToAward = 0;
  let needsPenalty = false;

  dates.forEach((date, index) => {
    const record = input.days[date];
    if (record && (record.status === 'done' || record.status === 'rest' || record.status === 'missed')) return;

    needsPenalty = true;
    streak = 0;

    if (!record) {
      if (index >= firstRecorded) closed.push(missedPlaceholder(date));
      return;
    }

    let xpAwarded = record.xpAwarded;
    if (record.status === 'open') {
      const earned = partialXp(record.items, level) - record.xpAwarded;
      if (earned > 0) {
        xpToAward += earned;
        xpAwarded += earned;
      }
    }
    closed.push({ ...record, status: 'missed', xpAwarded });
  });

  return { closed, streak, xpToAward, needsPenalty, currentDate: today };
}
```

- [x] **Step 4: Run to check it passes**

Run: `npx vitest run src/domain/dayCycle.test.ts`
Expected: PASS.

- [x] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): process daily reset, streaks, missed days and penalties

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 7: Nutrition targets

**Files:**
- Create: `src/domain/nutrition.ts`
- Test: `src/domain/nutrition.test.ts`

**Interfaces:**
- Produces: `mifflinStJeorBmr(p): number`; `activityMultiplier(daysPerWeek: number): number`; `calculateTargets(p: NutritionProfile): NutritionTargets`; `sumFood(entries: Pick<FoodEntry,'kcal'|'proteinG'|'waterMl'>[]): { kcal: number; proteinG: number; waterMl: number }`; constants `GOAL_POLICY`, `MIN_CALORIES`, `WATER_ML`, `PROTEIN_G_PER_KG`, `FAT_ENERGY_SHARE`.
```ts
export type NutritionProfile = Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'goal' | 'daysPerWeek'>;
export interface NutritionTargets { bmr: number; tdee: number; multiplier: number; calories: number; floor: number; floorApplied: boolean; proteinG: number; fatG: number; carbsG: number; waterMl: number }
```

- [x] **Step 1: Write failing tests `src/domain/nutrition.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { activityMultiplier, calculateTargets, mifflinStJeorBmr, sumFood, type NutritionProfile } from './nutrition';

const man: NutritionProfile = { sex: 'male', weightKg: 80, heightCm: 180, age: 30, goal: 'lose_fat', daysPerWeek: 3 };

describe('Mifflin-St Jeor BMR', () => {
  it('matches the published equation', () => {
    expect(mifflinStJeorBmr(man)).toBe(1780); // 800 + 1125 − 150 + 5
    expect(mifflinStJeorBmr({ ...man, sex: 'female' })).toBe(1614); // … − 161
  });
});

describe('activityMultiplier', () => {
  it.each([[0, 1.2], [1, 1.2], [2, 1.375], [3, 1.375], [4, 1.55], [5, 1.55], [6, 1.725], [7, 1.725]])(
    '%i training days → %f', (days, mult) => expect(activityMultiplier(days)).toBe(mult),
  );
});

describe('calculateTargets', () => {
  it('applies a 20 % deficit for fat loss', () => {
    expect(calculateTargets(man)).toEqual({
      bmr: 1780, tdee: 2448, multiplier: 1.375, calories: 1958, floor: 1780, floorApplied: false,
      proteinG: 128, fatG: 54, carbsG: 240, waterMl: 2500,
    });
  });

  it('adds 10 % for muscle gain and keeps maintenance for fitness', () => {
    expect(calculateTargets({ ...man, goal: 'build_muscle' }).calories).toBe(2692);
    expect(calculateTargets({ ...man, goal: 'get_fit' }).calories).toBe(2448);
  });

  it('caps the deficit at 500 kcal', () => {
    const big: NutritionProfile = { sex: 'male', weightKg: 100, heightCm: 190, age: 25, goal: 'lose_fat', daysPerWeek: 6 };
    const t = calculateTargets(big);
    expect(t.tdee).toBe(3566);
    expect(t.calories).toBe(3066);
  });

  it('never goes below BMR', () => {
    const t = calculateTargets({ ...man, daysPerWeek: 0 });
    expect(t.calories).toBe(1780);
    expect(t.floorApplied).toBe(true);
  });

  it('never goes below 1200 kcal for women', () => {
    const t = calculateTargets({ sex: 'female', weightKg: 45, heightCm: 155, age: 60, goal: 'lose_fat', daysPerWeek: 1 });
    expect(t.calories).toBe(1200);
    expect(t.floor).toBe(1200);
    expect(t.floorApplied).toBe(true);
    expect(t.waterMl).toBe(2000);
  });

  it('never returns negative carbs', () => {
    const t = calculateTargets({ sex: 'female', weightKg: 150, heightCm: 150, age: 90, goal: 'lose_fat', daysPerWeek: 0 });
    expect(t.carbsG).toBeGreaterThanOrEqual(0);
  });
});

describe('sumFood', () => {
  it('totals the day', () => {
    expect(sumFood([{ kcal: 500, proteinG: 30, waterMl: 0 }, { kcal: 0, proteinG: 0, waterMl: 250 }])).toEqual({ kcal: 500, proteinG: 30, waterMl: 250 });
    expect(sumFood([])).toEqual({ kcal: 0, proteinG: 0, waterMl: 0 });
  });
});
```

- [x] **Step 2: Run to check it fails**

Run: `npx vitest run src/domain/nutrition.test.ts`
Expected: FAIL, module not found.

- [x] **Step 3: Implement `src/domain/nutrition.ts`**

```ts
import type { FoodEntry, Profile, Sex } from './types';

/*
 * Nutrition formulas and their sources. Do not change a number here without a source.
 *
 * BMR — Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.
 *   "A new predictive equation for resting energy expenditure in healthy individuals."
 *   Am J Clin Nutr. 1990;51(2):241–247.
 *   men:   10 × kg + 6.25 × cm − 5 × age + 5
 *   women: 10 × kg + 6.25 × cm − 5 × age − 161
 *
 * Activity multipliers — the standard factors used with BMR equations
 *   (sedentary 1.2, lightly active 1.375, moderately active 1.55, very active 1.725),
 *   e.g. McArdle, Katch & Katch, "Exercise Physiology". Mapped from training days per week.
 *
 * Protein — Jäger R, et al. "International Society of Sports Nutrition Position Stand:
 *   protein and exercise." J Int Soc Sports Nutr. 2017;14:20. Range 1.4–2.0 g/kg/day; we use 1.6.
 *
 * Fat — 25 % of energy, inside the Acceptable Macronutrient Distribution Range of 20–35 %
 *   (Institute of Medicine, "Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat,
 *   Fatty Acids, Cholesterol, Protein, and Amino Acids", 2005). Carbohydrate is the remainder.
 *
 * Water — EFSA Panel on Dietetic Products, Nutrition and Allergies. "Scientific Opinion on
 *   Dietary Reference Values for water." EFSA Journal 2010;8(3):1459. 2.0 L/day women, 2.5 L/day men.
 *
 * Safety floor — never below BMR, and never below 1,200 kcal (women) / 1,500 kcal (men),
 *   the commonly cited minimums for unsupervised diets (e.g. Harvard Health Publishing).
 *
 * Goal adjustment (app policy, deliberately moderate): fat loss −20 % of maintenance with the
 *   deficit capped at 500 kcal/day; muscle gain +10 %; general fitness = maintenance.
 */

export type NutritionProfile = Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'goal' | 'daysPerWeek'>;

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  multiplier: number;
  calories: number;
  floor: number;
  floorApplied: boolean;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
}

export const GOAL_POLICY = { loseFatDeficit: 0.2, maxDeficitKcal: 500, buildMuscleSurplus: 0.1 } as const;
export const PROTEIN_G_PER_KG = 1.6;
export const FAT_ENERGY_SHARE = 0.25;
export const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };
export const WATER_ML: Record<Sex, number> = { male: 2500, female: 2000 };

export function mifflinStJeorBmr(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function activityMultiplier(daysPerWeek: number): number {
  if (daysPerWeek <= 1) return 1.2;
  if (daysPerWeek <= 3) return 1.375;
  if (daysPerWeek <= 5) return 1.55;
  return 1.725;
}

export function calculateTargets(p: NutritionProfile): NutritionTargets {
  const bmrRaw = mifflinStJeorBmr(p);
  const multiplier = activityMultiplier(p.daysPerWeek);
  const tdeeRaw = bmrRaw * multiplier;

  let goalKcal = tdeeRaw;
  if (p.goal === 'lose_fat') goalKcal = tdeeRaw - Math.min(tdeeRaw * GOAL_POLICY.loseFatDeficit, GOAL_POLICY.maxDeficitKcal);
  if (p.goal === 'build_muscle') goalKcal = tdeeRaw * (1 + GOAL_POLICY.buildMuscleSurplus);

  const floor = Math.round(Math.max(bmrRaw, MIN_CALORIES[p.sex]));
  const floorApplied = goalKcal < floor;
  const calories = floorApplied ? floor : Math.round(goalKcal);

  const proteinG = Math.round(PROTEIN_G_PER_KG * p.weightKg);
  const fatG = Math.round((calories * FAT_ENERGY_SHARE) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return {
    bmr: Math.round(bmrRaw),
    tdee: Math.round(tdeeRaw),
    multiplier,
    calories,
    floor,
    floorApplied,
    proteinG,
    fatG,
    carbsG,
    waterMl: WATER_ML[p.sex],
  };
}

export function sumFood(entries: ReadonlyArray<Pick<FoodEntry, 'kcal' | 'proteinG' | 'waterMl'>>): { kcal: number; proteinG: number; waterMl: number } {
  return entries.reduce(
    (t, e) => ({ kcal: t.kcal + e.kcal, proteinG: t.proteinG + e.proteinG, waterMl: t.waterMl + e.waterMl }),
    { kcal: 0, proteinG: 0, waterMl: 0 },
  );
}
```

- [x] **Step 4: Run to check it passes**

Run: `npx vitest run src/domain/nutrition.test.ts`
Expected: PASS.

- [x] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): add Mifflin-St Jeor nutrition targets with safety floor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 8: Exercise library and weekly plan

**Files:**
- Create: `src/config/exercises.ts`, `src/domain/workout/plan.ts`
- Test: `src/domain/workout/plan.test.ts`

**Interfaces:**
- Produces:
```ts
// config/exercises.ts
export interface ExerciseDef { id: string; name: string; category: ExerciseCategory; equipment: Equipment[]; weighted: boolean; alternativeId?: string }
export const EXERCISES: readonly ExerciseDef[];
export function getExercise(id: string): ExerciseDef | undefined;
export function exercisesFor(equipment: Equipment): ExerciseDef[];
// domain/workout/plan.ts
export type PlanProfile = Pick<Profile, 'daysPerWeek' | 'minutesPerSession' | 'equipment' | 'experience'>;
export function trainingWeekdays(daysPerWeek: number): number[];
export function planVolume(plan: WeekPlan): number;           // Σ sets × reps
export function capVolume(plan: WeekPlan, previousVolume: number): WeekPlan;
export function generateWeekPlan(profile: PlanProfile, weekStart: string, previous: WeekPlan | null): WeekPlan;
```

Every weighted exercise has an `alternativeId` that points to a no-equipment exercise in the same category.

- [x] **Step 1: Create `src/config/exercises.ts`**

```ts
import type { Equipment, ExerciseCategory } from '../domain/types';

export interface ExerciseDef {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** Setups that can do this exercise */
  equipment: Equipment[];
  /** Weighted exercises are logged with kg; bodyweight ones with reps only */
  weighted: boolean;
  /** No-equipment alternative for weighted exercises */
  alternativeId?: string;
}

const ANY: Equipment[] = ['none', 'dumbbells', 'gym'];
const DB: Equipment[] = ['dumbbells', 'gym'];
const GYM: Equipment[] = ['gym'];

export const EXERCISES: readonly ExerciseDef[] = [
  // push
  { id: 'pushup', name: 'Push-up', category: 'push', equipment: ANY, weighted: false },
  { id: 'pike-pushup', name: 'Pike push-up', category: 'push', equipment: ANY, weighted: false },
  { id: 'db-bench-press', name: 'Dumbbell bench press', category: 'push', equipment: DB, weighted: true, alternativeId: 'pushup' },
  { id: 'db-shoulder-press', name: 'Dumbbell shoulder press', category: 'push', equipment: DB, weighted: true, alternativeId: 'pike-pushup' },
  { id: 'bench-press', name: 'Barbell bench press', category: 'push', equipment: GYM, weighted: true, alternativeId: 'pushup' },
  { id: 'overhead-press', name: 'Overhead press', category: 'push', equipment: GYM, weighted: true, alternativeId: 'pike-pushup' },
  // pull
  { id: 'towel-row', name: 'Doorway towel row', category: 'pull', equipment: ANY, weighted: false },
  { id: 'superman', name: 'Superman raise', category: 'pull', equipment: ANY, weighted: false },
  { id: 'db-row', name: 'One-arm dumbbell row', category: 'pull', equipment: DB, weighted: true, alternativeId: 'towel-row' },
  { id: 'lat-pulldown', name: 'Lat pulldown', category: 'pull', equipment: GYM, weighted: true, alternativeId: 'towel-row' },
  { id: 'cable-row', name: 'Seated cable row', category: 'pull', equipment: GYM, weighted: true, alternativeId: 'superman' },
  // legs
  { id: 'bodyweight-squat', name: 'Bodyweight squat', category: 'legs', equipment: ANY, weighted: false },
  { id: 'reverse-lunge', name: 'Reverse lunge', category: 'legs', equipment: ANY, weighted: false },
  { id: 'glute-bridge', name: 'Glute bridge', category: 'legs', equipment: ANY, weighted: false },
  { id: 'goblet-squat', name: 'Goblet squat', category: 'legs', equipment: DB, weighted: true, alternativeId: 'bodyweight-squat' },
  { id: 'db-romanian-deadlift', name: 'Dumbbell Romanian deadlift', category: 'legs', equipment: DB, weighted: true, alternativeId: 'glute-bridge' },
  { id: 'back-squat', name: 'Barbell back squat', category: 'legs', equipment: GYM, weighted: true, alternativeId: 'bodyweight-squat' },
  { id: 'leg-press', name: 'Leg press', category: 'legs', equipment: GYM, weighted: true, alternativeId: 'reverse-lunge' },
  // core
  { id: 'dead-bug', name: 'Dead bug', category: 'core', equipment: ANY, weighted: false },
  { id: 'lying-leg-raise', name: 'Lying leg raise', category: 'core', equipment: ANY, weighted: false },
  { id: 'bicycle-crunch', name: 'Bicycle crunch', category: 'core', equipment: ANY, weighted: false },
];

export function getExercise(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function exercisesFor(equipment: Equipment): ExerciseDef[] {
  return EXERCISES.filter((e) => e.equipment.includes(equipment));
}
```

- [x] **Step 2: Write failing tests `src/domain/workout/plan.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '../../config/exercises';
import { generateWeekPlan, planVolume, trainingWeekdays, type PlanProfile } from './plan';

const beginnerHome: PlanProfile = { daysPerWeek: 3, minutesPerSession: 30, equipment: 'none', experience: 'beginner' };
const WEEK = '2026-09-21';

describe('exercise library', () => {
  it('gives every weighted exercise a no-equipment alternative in the same category', () => {
    for (const e of EXERCISES.filter((x) => x.weighted)) {
      const alt = getExercise(e.alternativeId ?? '');
      expect(alt?.equipment).toContain('none');
      expect(alt?.category).toBe(e.category);
    }
  });
});

describe('trainingWeekdays', () => {
  it('spreads sessions through the week', () => {
    expect(trainingWeekdays(1)).toEqual([1]);
    expect(trainingWeekdays(3)).toEqual([1, 3, 5]);
    expect(trainingWeekdays(4)).toEqual([1, 2, 4, 5]);
    expect(trainingWeekdays(9)).toHaveLength(7);
    expect(trainingWeekdays(0)).toEqual([1]);
  });
});

describe('generateWeekPlan', () => {
  it('builds full-body home sessions for 3 days a week', () => {
    const plan = generateWeekPlan(beginnerHome, WEEK, null);
    expect(plan.weekStart).toBe(WEEK);
    expect(plan.days.map((d) => d.focus)).toEqual(['full', 'full', 'full']);
    for (const day of plan.days) {
      expect(day.exercises).toHaveLength(4);
      for (const ex of day.exercises) {
        expect(getExercise(ex.exerciseId)?.equipment).toContain('none');
        expect(ex).toMatchObject({ sets: 2, reps: 10 });
      }
    }
    expect(planVolume(plan)).toBe(240);
  });

  it('prefers weighted lifts when a gym is available', () => {
    const plan = generateWeekPlan({ ...beginnerHome, equipment: 'gym' }, WEEK, null);
    const main = plan.days[0]!.exercises.filter((e) => getExercise(e.exerciseId)?.category !== 'core');
    expect(main.every((e) => getExercise(e.exerciseId)?.weighted)).toBe(true);
  });

  it('switches to an upper/lower split at 4+ days', () => {
    const plan = generateWeekPlan({ ...beginnerHome, daysPerWeek: 4 }, WEEK, null);
    expect(plan.days.map((d) => d.focus)).toEqual(['upper', 'lower', 'upper', 'lower']);
    const ids = plan.days[0]!.exercises.map((e) => e.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fits the session length', () => {
    expect(generateWeekPlan({ ...beginnerHome, minutesPerSession: 15 }, WEEK, null).days[0]!.exercises).toHaveLength(3);
    expect(generateWeekPlan({ ...beginnerHome, minutesPerSession: 60 }, WEEK, null).days[0]!.exercises).toHaveLength(5);
  });

  it('keeps the same plan volume week to week when nothing changes', () => {
    const previous = generateWeekPlan(beginnerHome, '2026-09-14', null);
    expect(planVolume(generateWeekPlan(beginnerHome, WEEK, previous))).toBe(planVolume(previous));
  });

  it('never grows planned volume more than 10 % over the previous week', () => {
    const previous = generateWeekPlan({ ...beginnerHome, daysPerWeek: 2 }, '2026-09-14', null);
    const next = generateWeekPlan({ ...beginnerHome, daysPerWeek: 6 }, WEEK, previous);
    expect(planVolume(next)).toBeLessThanOrEqual(Math.floor(planVolume(previous) * 1.1));
    expect(next.days.length).toBeGreaterThanOrEqual(1);
    expect(next.days.every((d) => d.exercises.every((e) => e.sets >= 1))).toBe(true);
  });
});
```

- [x] **Step 3: Run to check it fails**

Run: `npx vitest run src/domain/workout/plan.test.ts`
Expected: FAIL, module `./plan` not found.

- [x] **Step 4: Implement `src/domain/workout/plan.ts`**

```ts
import { progression } from '../../config/progression';
import { EXERCISES, type ExerciseDef } from '../../config/exercises';
import type { Equipment, ExerciseCategory, PlanDay, PlanFocus, PlannedExercise, Profile, WeekPlan } from '../types';

export type PlanProfile = Pick<Profile, 'daysPerWeek' | 'minutesPerSession' | 'equipment' | 'experience'>;

const WEEKDAYS_BY_COUNT: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

export function trainingWeekdays(daysPerWeek: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(daysPerWeek)));
  return [...WEEKDAYS_BY_COUNT[n]!];
}

function slotsFor(focus: PlanFocus, minutes: number): ExerciseCategory[] {
  const base: ExerciseCategory[] =
    focus === 'full' ? ['push', 'pull', 'legs', 'core'] : focus === 'upper' ? ['push', 'pull', 'push', 'core'] : ['legs', 'legs', 'core'];
  const extra: ExerciseCategory = focus === 'upper' ? 'pull' : 'legs';
  if (minutes < 20) return base.slice(0, 3);
  if (minutes >= 45) return [...base, extra];
  return base;
}

function candidates(category: ExerciseCategory, equipment: Equipment): ExerciseDef[] {
  const list = EXERCISES.filter((e) => e.category === category && e.equipment.includes(equipment));
  if (equipment === 'none') return list;
  return [...list.filter((e) => e.weighted), ...list.filter((e) => !e.weighted)];
}

export function planVolume(plan: WeekPlan): number {
  return plan.days.reduce((sum, day) => sum + day.exercises.reduce((s, e) => s + e.sets * e.reps, 0), 0);
}

export function capVolume(plan: WeekPlan, previousVolume: number): WeekPlan {
  if (previousVolume <= 0) return plan;
  const limit = Math.floor(previousVolume * (1 + progression.training.weeklyVolumeCap));
  const days: PlanDay[] = plan.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) }));
  const capped: WeekPlan = { ...plan, days };

  while (planVolume(capped) > limit) {
    let biggest: PlannedExercise | undefined;
    for (const day of days) {
      for (const ex of day.exercises) if (ex.sets > 1 && (!biggest || ex.sets > biggest.sets)) biggest = ex;
    }
    if (biggest) {
      biggest.sets -= 1;
      continue;
    }
    if (days.length > 1) {
      days.pop();
      continue;
    }
    break;
  }
  return capped;
}

export function generateWeekPlan(profile: PlanProfile, weekStart: string, previous: WeekPlan | null): WeekPlan {
  const weekdays = trainingWeekdays(profile.daysPerWeek);
  const split = weekdays.length >= 4;
  const sets = progression.training.setsByTier[profile.experience];
  const reps = progression.training.repsByTier[profile.experience];

  const days: PlanDay[] = weekdays.map((weekday, dayIndex) => {
    const focus: PlanFocus = split ? (dayIndex % 2 === 0 ? 'upper' : 'lower') : 'full';
    const used = new Map<ExerciseCategory, number>();
    const exercises = slotsFor(focus, profile.minutesPerSession).map((category) => {
      const list = candidates(category, profile.equipment);
      const occurrence = used.get(category) ?? 0;
      used.set(category, occurrence + 1);
      const pick = list[(dayIndex + occurrence) % list.length]!;
      return { exerciseId: pick.id, sets, reps };
    });
    return { weekday, focus, exercises };
  });

  const plan: WeekPlan = { weekStart, days };
  return previous ? capVolume(plan, planVolume(previous)) : plan;
}
```

- [x] **Step 5: Run to check it passes**

Run: `npx vitest run src/domain/workout/plan.test.ts`
Expected: PASS.

- [x] **Step 6: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): add exercise library and weekly plan with volume cap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 9: Personal records and exercise ranks

**Files:**
- Create: `src/domain/workout/records.ts`, `src/domain/workout/exerciseRank.ts`
- Test: `src/domain/workout/records.test.ts`, `src/domain/workout/exerciseRank.test.ts`

**Interfaces:**
- Produces:
```ts
// records.ts
export type SetResult = Pick<WorkoutSet, 'reps' | 'weightKg'>;
export interface ExerciseRecords { heaviestKg: number; bestOneRepMax: number; bestReps: number }
export function estimateOneRepMax(weightKg: number, reps: number): number;   // Epley
export function performance(set: SetResult, weighted: boolean): number;      // weighted → e1RM, else reps
export function computeRecords(sets: readonly SetResult[]): ExerciseRecords;
export function isPersonalRecord(previous: readonly SetResult[], next: SetResult, weighted: boolean): boolean;
// exerciseRank.ts
export function exerciseRank(sets: readonly Pick<WorkoutSet,'date'|'reps'|'weightKg'>[], weighted: boolean): { rank: Rank; ratio: number };
export function summarizeProgress(sets: readonly WorkoutSet[], isWeighted: (exerciseId: string) => boolean): { hasPR: boolean; hasSRank: boolean };
```

- [x] **Step 1: Write failing tests**

`src/domain/workout/records.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computeRecords, estimateOneRepMax, isPersonalRecord } from './records';

describe('estimateOneRepMax (Epley)', () => {
  it('computes w × (1 + reps / 30)', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.333, 2);
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe('computeRecords', () => {
  it('finds heaviest weight, best estimated 1RM and best reps', () => {
    const r = computeRecords([{ weightKg: 50, reps: 10 }, { weightKg: 60, reps: 5 }, { weightKg: 55, reps: 8 }]);
    expect(r.heaviestKg).toBe(60);
    expect(r.bestOneRepMax).toBeCloseTo(70, 5);
    expect(r.bestReps).toBe(10);
  });

  it('returns zeros for no sets', () => {
    expect(computeRecords([])).toEqual({ heaviestKg: 0, bestOneRepMax: 0, bestReps: 0 });
  });
});

describe('isPersonalRecord', () => {
  const previous = [{ weightKg: 60, reps: 5 }];
  it('is never a PR on the first ever set', () => {
    expect(isPersonalRecord([], { weightKg: 60, reps: 5 }, true)).toBe(false);
  });
  it('must strictly beat the previous best', () => {
    expect(isPersonalRecord(previous, { weightKg: 60, reps: 6 }, true)).toBe(true);
    expect(isPersonalRecord(previous, { weightKg: 60, reps: 5 }, true)).toBe(false);
  });
  it('uses reps for bodyweight exercises', () => {
    expect(isPersonalRecord([{ weightKg: 0, reps: 10 }], { weightKg: 0, reps: 11 }, false)).toBe(true);
  });
});
```

`src/domain/workout/exerciseRank.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { WorkoutSet } from '../types';
import { exerciseRank, summarizeProgress } from './exerciseRank';

const set = (date: string, reps: number, weightKg = 0, exerciseId = 'pushup'): WorkoutSet => ({ id: 0, exerciseId, date, reps, weightKg, at: `${date}T09:00:00.000Z` });

describe('exerciseRank', () => {
  it('is E with no sets', () => {
    expect(exerciseRank([], false)).toEqual({ rank: 'E', ratio: 0 });
  });

  it.each([[10, 'E'], [11, 'D'], [13, 'C'], [15, 'B'], [18, 'A'], [20, 'S']])(
    'bodyweight: from 10 reps to %i reps is rank %s', (best, rank) => {
      expect(exerciseRank([set('2026-09-01', 10), set('2026-09-20', best)], false).rank).toBe(rank);
    },
  );

  it('uses the best set of the first day as the baseline', () => {
    const sets = [set('2026-09-01', 8), set('2026-09-01', 10), set('2026-09-10', 15)];
    expect(exerciseRank(sets, false)).toEqual({ rank: 'B', ratio: 1.5 });
  });

  it('uses estimated 1RM for weighted exercises', () => {
    expect(exerciseRank([set('2026-09-01', 10, 50), set('2026-10-01', 10, 100)], true).rank).toBe('S');
  });
});

describe('summarizeProgress', () => {
  it('detects improvement and S ranks across exercises', () => {
    const sets = [set('2026-09-01', 10), set('2026-09-02', 12), set('2026-09-01', 10, 40, 'goblet-squat')];
    expect(summarizeProgress(sets, (id) => id === 'goblet-squat')).toEqual({ hasPR: true, hasSRank: false });
    expect(summarizeProgress([...sets, set('2026-09-03', 20)], () => false).hasSRank).toBe(true);
    expect(summarizeProgress([], () => false)).toEqual({ hasPR: false, hasSRank: false });
  });
});
```

- [x] **Step 2: Run to check they fail**

Run: `npx vitest run src/domain/workout`
Expected: FAIL for records and exerciseRank (modules not found).

- [x] **Step 3: Implement `src/domain/workout/records.ts`**

```ts
import type { WorkoutSet } from '../types';

export type SetResult = Pick<WorkoutSet, 'reps' | 'weightKg'>;

export interface ExerciseRecords {
  heaviestKg: number;
  bestOneRepMax: number;
  bestReps: number;
}

/** Epley B. "Poundage chart." Boyd Epley Workout, 1985: 1RM ≈ w × (1 + reps / 30). */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function performance(set: SetResult, weighted: boolean): number {
  return weighted ? estimateOneRepMax(set.weightKg, set.reps) : set.reps;
}

export function computeRecords(sets: readonly SetResult[]): ExerciseRecords {
  return sets.reduce<ExerciseRecords>(
    (r, s) => ({
      heaviestKg: Math.max(r.heaviestKg, s.weightKg),
      bestOneRepMax: Math.max(r.bestOneRepMax, estimateOneRepMax(s.weightKg, s.reps)),
      bestReps: Math.max(r.bestReps, s.reps),
    }),
    { heaviestKg: 0, bestOneRepMax: 0, bestReps: 0 },
  );
}

export function isPersonalRecord(previous: readonly SetResult[], next: SetResult, weighted: boolean): boolean {
  if (previous.length === 0) return false;
  const best = previous.reduce((m, s) => Math.max(m, performance(s, weighted)), 0);
  return performance(next, weighted) > best;
}
```

- [x] **Step 4: Implement `src/domain/workout/exerciseRank.ts`**

```ts
import { progression } from '../../config/progression';
import type { Rank, WorkoutSet } from '../types';
import { performance } from './records';

type RankedSet = Pick<WorkoutSet, 'date' | 'reps' | 'weightKg'>;

/** Rank from your own progress: best result ÷ best result on your first logged day. */
export function exerciseRank(sets: readonly RankedSet[], weighted: boolean): { rank: Rank; ratio: number } {
  if (sets.length === 0) return { rank: 'E', ratio: 0 };
  const firstDate = sets.reduce((min, s) => (s.date < min ? s.date : min), sets[0]!.date);
  const baseline = sets.filter((s) => s.date === firstDate).reduce((m, s) => Math.max(m, performance(s, weighted)), 0);
  if (baseline <= 0) return { rank: 'E', ratio: 0 };
  const best = sets.reduce((m, s) => Math.max(m, performance(s, weighted)), 0);
  const ratio = best / baseline;
  const rank = progression.exerciseRank.find((t) => ratio + 1e-9 >= t.minRatio)?.rank ?? 'E';
  return { rank, ratio };
}

export function summarizeProgress(
  sets: readonly WorkoutSet[],
  isWeighted: (exerciseId: string) => boolean,
): { hasPR: boolean; hasSRank: boolean } {
  const byExercise = new Map<string, WorkoutSet[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  let hasPR = false;
  let hasSRank = false;
  for (const [id, list] of byExercise) {
    const { rank, ratio } = exerciseRank(list, isWeighted(id));
    if (ratio > 1) hasPR = true;
    if (rank === 'S') hasSRank = true;
  }
  return { hasPR, hasSRank };
}
```

- [x] **Step 5: Run to check they pass**

Run: `npx vitest run src/domain/workout`
Expected: PASS.

- [x] **Step 6: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): add personal records and per-exercise E-S ranks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 10: Stats, achievements and number-input parsing

**Files:**
- Create: `src/domain/stats.ts`, `src/domain/achievements.ts`, `src/domain/input.ts`
- Test: `src/domain/stats.test.ts`, `src/domain/achievements.test.ts`, `src/domain/input.test.ts`

**Interfaces:**
- Produces:
```ts
// stats.ts
export const STAT_LABELS: Record<StatKey, string>;
export function initialStats(value?: number): Stats;
export function initialPlayer(): Player;
export function assignStatPoints(player: Player, allocation: Partial<Stats>): Player;   // throws Error on invalid
export function addSideQuestProgress(player: Player, stat: StatKey): Player;
// achievements.ts
export interface AchievementContext { questsCompleted: number; bestStreak: number; level: number; hasPR: boolean; hasSRank: boolean }
export interface AchievementDef { id: string; title: string; description: string; isUnlocked: (c: AchievementContext) => boolean }
export const ACHIEVEMENTS: readonly AchievementDef[];
export function newlyUnlocked(ctx: AchievementContext, unlockedIds: readonly string[]): AchievementDef[];
export function titleFor(titleId: string | null): string;
// input.ts
export interface NumberRule { min: number; max: number; integer?: boolean }
export function parseNumberInput(raw: string, rule: NumberRule): number | null;
```

- [x] **Step 1: Write failing tests**

`src/domain/stats.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { addSideQuestProgress, assignStatPoints, initialPlayer } from './stats';

describe('initialPlayer', () => {
  it('starts at level 1 with 10 in every stat', () => {
    const p = initialPlayer();
    expect(p).toMatchObject({ id: 1, level: 1, xp: 0, unspentStatPoints: 0, titleId: null, streak: 0, bestStreak: 0, questsCompleted: 0 });
    expect(Object.values(p.stats)).toEqual([10, 10, 10, 10, 10]);
    expect(Object.values(p.sideQuestStatProgress)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('assignStatPoints', () => {
  const player = { ...initialPlayer(), unspentStatPoints: 3 };

  it('moves points into stats', () => {
    const p = assignStatPoints(player, { strength: 2, agility: 1 });
    expect(p.stats.strength).toBe(12);
    expect(p.stats.agility).toBe(11);
    expect(p.unspentStatPoints).toBe(0);
  });

  it('cannot spend more points than available', () => {
    expect(() => assignStatPoints(player, { strength: 4 })).toThrow('Not enough stat points.');
  });

  it('rejects negative or fractional points', () => {
    expect(() => assignStatPoints(player, { strength: -1 })).toThrow();
    expect(() => assignStatPoints(player, { strength: 0.5 })).toThrow();
  });
});

describe('addSideQuestProgress', () => {
  it('adds +1 to the stat every 5 completions', () => {
    let p = initialPlayer();
    for (let i = 0; i < 4; i++) p = addSideQuestProgress(p, 'discipline');
    expect(p.stats.discipline).toBe(10);
    expect(p.sideQuestStatProgress.discipline).toBe(4);
    p = addSideQuestProgress(p, 'discipline');
    expect(p.stats.discipline).toBe(11);
    expect(p.sideQuestStatProgress.discipline).toBe(0);
  });
});
```

`src/domain/achievements.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { newlyUnlocked, titleFor, type AchievementContext } from './achievements';

const zero: AchievementContext = { questsCompleted: 0, bestStreak: 0, level: 1, hasPR: false, hasSRank: false };
const ids = (ctx: AchievementContext, already: string[] = []) => newlyUnlocked(ctx, already).map((a) => a.id);

describe('newlyUnlocked', () => {
  it('unlocks nothing for a new player', () => {
    expect(ids(zero)).toEqual([]);
  });

  it('unlocks each milestone', () => {
    expect(ids({ ...zero, questsCompleted: 1 })).toEqual(['first-quest']);
    expect(ids({ ...zero, bestStreak: 7 })).toEqual(['streak-7']);
    expect(ids({ ...zero, bestStreak: 30 })).toEqual(['streak-7', 'streak-30']);
    expect(ids({ ...zero, hasPR: true })).toEqual(['first-pr']);
    expect(ids({ ...zero, hasSRank: true })).toEqual(['first-s-rank']);
    expect(ids({ ...zero, level: 10 })).toEqual(['level-10']);
    expect(ids({ ...zero, questsCompleted: 100 })).toEqual(['first-quest', 'quests-100']);
  });

  it('skips achievements already unlocked', () => {
    expect(ids({ ...zero, questsCompleted: 100 }, ['first-quest'])).toEqual(['quests-100']);
  });
});

describe('titleFor', () => {
  it('maps achievement ids to titles and falls back to the default', () => {
    expect(titleFor(null)).toBe('Novice');
    expect(titleFor('streak-7')).toBe('Unbroken');
    expect(titleFor('nonsense')).toBe('Novice');
  });
});
```

`src/domain/input.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseNumberInput } from './input';

const reps = { min: 0, max: 1000, integer: true };
const kg = { min: 0, max: 1000 };

describe('parseNumberInput', () => {
  it('parses normal numbers and trims spaces', () => {
    expect(parseNumberInput('20', reps)).toBe(20);
    expect(parseNumberInput('  20 ', reps)).toBe(20);
    expect(parseNumberInput('72.5', kg)).toBe(72.5);
    expect(parseNumberInput('.5', kg)).toBe(0.5);
  });

  it('accepts a comma decimal from European keyboards', () => {
    expect(parseNumberInput('72,5', kg)).toBe(72.5);
  });

  it('rejects blanks, words, exponents and out-of-range values', () => {
    expect(parseNumberInput('', reps)).toBeNull();
    expect(parseNumberInput('abc', reps)).toBeNull();
    expect(parseNumberInput('1e9', kg)).toBeNull();
    expect(parseNumberInput('-5', reps)).toBeNull();
    expect(parseNumberInput('1001', reps)).toBeNull();
  });

  it('rejects decimals where whole numbers are required', () => {
    expect(parseNumberInput('12.5', reps)).toBeNull();
  });
});
```

- [x] **Step 2: Run to check they fail**

Run: `npx vitest run src/domain/stats.test.ts src/domain/achievements.test.ts src/domain/input.test.ts`
Expected: FAIL, modules not found.

- [x] **Step 3: Implement `src/domain/stats.ts`**

```ts
import { progression } from '../config/progression';
import { STAT_KEYS, type Player, type StatKey, type Stats } from './types';

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  agility: 'Agility',
  vitality: 'Vitality',
  endurance: 'Endurance',
  discipline: 'Discipline',
};

export function initialStats(value: number = progression.startingStatValue): Stats {
  return { strength: value, agility: value, vitality: value, endurance: value, discipline: value };
}

export function initialPlayer(): Player {
  return {
    id: 1,
    level: 1,
    xp: 0,
    unspentStatPoints: 0,
    stats: initialStats(),
    titleId: null,
    streak: 0,
    bestStreak: 0,
    questsCompleted: 0,
    sideQuestStatProgress: initialStats(0),
  };
}

export function assignStatPoints(player: Player, allocation: Partial<Stats>): Player {
  const stats = { ...player.stats };
  let total = 0;
  for (const key of STAT_KEYS) {
    const add = allocation[key] ?? 0;
    if (!Number.isInteger(add) || add < 0) throw new Error('Stat points must be whole, non-negative numbers.');
    stats[key] += add;
    total += add;
  }
  if (total > player.unspentStatPoints) throw new Error('Not enough stat points.');
  return { ...player, stats, unspentStatPoints: player.unspentStatPoints - total };
}

export function addSideQuestProgress(player: Player, stat: StatKey): Player {
  const per = progression.sideQuest.completionsPerStatPoint;
  const progress = { ...player.sideQuestStatProgress, [stat]: player.sideQuestStatProgress[stat] + 1 };
  const stats = { ...player.stats };
  if (progress[stat] >= per) {
    progress[stat] -= per;
    stats[stat] += 1;
  }
  return { ...player, stats, sideQuestStatProgress: progress };
}
```

- [x] **Step 4: Implement `src/domain/achievements.ts`**

```ts
import { progression } from '../config/progression';

export interface AchievementContext {
  questsCompleted: number;
  bestStreak: number;
  level: number;
  hasPR: boolean;
  hasSRank: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  isUnlocked: (c: AchievementContext) => boolean;
}

/** The achievement id doubles as the id of the title it unlocks. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-quest', title: 'The Awakened', description: 'Complete your first quest.', isUnlocked: (c) => c.questsCompleted >= 1 },
  { id: 'streak-7', title: 'Unbroken', description: 'Reach a 7-day streak.', isUnlocked: (c) => c.bestStreak >= 7 },
  { id: 'streak-30', title: 'Iron Will', description: 'Reach a 30-day streak.', isUnlocked: (c) => c.bestStreak >= 30 },
  { id: 'first-pr', title: 'Limit Breaker', description: 'Beat your starting best on any exercise.', isUnlocked: (c) => c.hasPR },
  { id: 'first-s-rank', title: 'Apex', description: 'Reach S rank on any exercise.', isUnlocked: (c) => c.hasSRank },
  { id: 'level-10', title: 'Gatecrasher', description: 'Reach level 10.', isUnlocked: (c) => c.level >= 10 },
  { id: 'quests-100', title: 'Relentless', description: 'Complete 100 quests.', isUnlocked: (c) => c.questsCompleted >= 100 },
];

export function newlyUnlocked(ctx: AchievementContext, unlockedIds: readonly string[]): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlockedIds.includes(a.id) && a.isUnlocked(ctx));
}

export function titleFor(titleId: string | null): string {
  return ACHIEVEMENTS.find((a) => a.id === titleId)?.title ?? progression.defaultTitle;
}
```

- [x] **Step 5: Implement `src/domain/input.ts`**

```ts
export interface NumberRule {
  min: number;
  max: number;
  integer?: boolean;
}

/** Parses what a person typed. Returns null for anything that is not a plain in-range number. */
export function parseNumberInput(raw: string, rule: NumberRule): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < rule.min || value > rule.max) return null;
  if (rule.integer && !Number.isInteger(value)) return null;
  return value;
}
```

- [x] **Step 6: Run to check they pass**

Run: `npx vitest run src/domain`
Expected: PASS, all domain tests.

- [x] **Step 7: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(domain): add stat allocation, achievements/titles and safe number parsing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 11: Dexie schema, meta store and migration framework

**Files:**
- Create: `src/domain/migrations.ts`, `src/db/schema.ts`, `src/db/meta.ts`
- Modify: `src/test/fixtures.ts` (append `freshDb`)
- Test: `src/domain/migrations.test.ts`, `src/db/schema.test.ts`, `src/db/meta.test.ts`

**Interfaces:**
- Produces:
```ts
// domain/migrations.ts
export const SCHEMA_VERSION = 1;
export const BACKUP_TABLES: readonly ['profile','player','days','sideQuests','questLog','workoutPlans','workoutSets','foodLog','achievements','meta'];
export type BackupTable = (typeof BACKUP_TABLES)[number];
export type TableData = Record<string, unknown[]>;
export type BackupMigration = (data: TableData) => TableData;
export const backupMigrations: Record<number, BackupMigration>;
export function migrateBackupData(data: TableData, fromVersion: number, toVersion?: number, migrations?: Record<number, BackupMigration>): TableData;
// db/schema.ts
export const STORES_V1: Record<BackupTable, string>;
export class AshbornDB extends Dexie { profile; player; days; sideQuests; questLog; workoutPlans; workoutSets; foodLog; achievements; meta }
export const db: AshbornDB;                       // the app's database, named 'ashborn'
export function writeTx<T>(database: AshbornDB, fn: () => Promise<T>): Promise<T>;   // rw over all tables; nests safely
// db/meta.ts
export interface MetaMap { lastOpenDate: string; lastBackupAt: string; persistResult: PersistResult; lastUrgentDate: string; medicalAck: boolean; soundOn: boolean; installedAt: string; installGuideDismissed: boolean; pendingEvents: GameEvent[] }
export function getMeta<K extends keyof MetaMap>(database: AshbornDB, key: K): Promise<MetaMap[K] | undefined>;
export function setMeta<K extends keyof MetaMap>(database: AshbornDB, key: K, value: MetaMap[K]): Promise<void>;
// test/fixtures.ts
export function freshDb(): AshbornDB;             // unique name per call, on fake-indexeddb
```

- [x] **Step 1: Write failing tests**

`src/domain/migrations.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { migrateBackupData } from './migrations';

describe('migrateBackupData', () => {
  const steps = {
    2: (d: Record<string, unknown[]>) => ({ ...d, notes: [] }),
    3: (d: Record<string, unknown[]>) => ({ ...d, extra: [1] }),
  };

  it('applies each step from the file version up to the app version', () => {
    expect(migrateBackupData({ player: [] }, 1, 3, steps)).toEqual({ player: [], notes: [], extra: [1] });
  });

  it('does nothing when versions match', () => {
    expect(migrateBackupData({ player: [] }, 3, 3, steps)).toEqual({ player: [] });
  });

  it('throws when a step is missing', () => {
    expect(() => migrateBackupData({}, 1, 4, steps)).toThrow('No migration to schema version 4.');
  });
});
```

`src/db/schema.test.ts`:
```ts
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { BACKUP_TABLES } from '../domain/migrations';
import { initialPlayer } from '../domain/stats';
import { AshbornDB, STORES_V1 } from './schema';

describe('AshbornDB', () => {
  it('declares a store for every backup table', () => {
    expect(Object.keys(STORES_V1).sort()).toEqual([...BACKUP_TABLES].sort());
  });

  it('keeps data when the app is reopened', async () => {
    const name = `reopen-${crypto.randomUUID()}`;
    const first = new AshbornDB(name);
    await first.player.put(initialPlayer());
    first.close();
    const second = new AshbornDB(name);
    expect((await second.player.get(1))?.level).toBe(1);
    second.close();
  });

  it('pattern check: adding a version with an upgrade keeps existing rows', async () => {
    const name = `upgrade-${crypto.randomUUID()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({ player: 'id' });
    await v1.table('player').put({ id: 1, level: 7 });
    v1.close();

    const v2 = new Dexie(name);
    v2.version(1).stores({ player: 'id' });
    v2.version(2)
      .stores({ player: 'id', notes: '++id' })
      .upgrade((tx) => tx.table('player').toCollection().modify((p: Record<string, unknown>) => {
        p.title = p.title ?? null;
      }));
    expect(await v2.table('player').get(1)).toEqual({ id: 1, level: 7, title: null });
    v2.close();
  });
});
```

`src/db/meta.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { freshDb } from '../test/fixtures';
import { getMeta, setMeta } from './meta';

describe('meta store', () => {
  it('returns undefined for unset keys and round-trips values', async () => {
    const db = freshDb();
    expect(await getMeta(db, 'lastOpenDate')).toBeUndefined();
    await setMeta(db, 'lastOpenDate', '2026-09-25');
    await setMeta(db, 'soundOn', false);
    expect(await getMeta(db, 'lastOpenDate')).toBe('2026-09-25');
    expect(await getMeta(db, 'soundOn')).toBe(false);
  });
});
```

- [x] **Step 2: Run to check they fail**

Run: `npx vitest run src/domain/migrations.test.ts src/db`
Expected: FAIL, modules not found.

- [x] **Step 3: Implement `src/domain/migrations.ts`**

```ts
/** Bump when the Dexie schema changes, and add a matching entry to backupMigrations. */
export const SCHEMA_VERSION = 1;

export const BACKUP_TABLES = [
  'profile', 'player', 'days', 'sideQuests', 'questLog',
  'workoutPlans', 'workoutSets', 'foodLog', 'achievements', 'meta',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type TableData = Record<string, unknown[]>;
export type BackupMigration = (data: TableData) => TableData;

/**
 * Key N upgrades backup data from schema N-1 to N.
 * Keep each step identical in effect to the Dexie `.upgrade()` for the same version.
 */
export const backupMigrations: Record<number, BackupMigration> = {};

export function migrateBackupData(
  data: TableData,
  fromVersion: number,
  toVersion: number = SCHEMA_VERSION,
  migrations: Record<number, BackupMigration> = backupMigrations,
): TableData {
  let out = data;
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    const step = migrations[version];
    if (!step) throw new Error(`No migration to schema version ${version}.`);
    out = step(out);
  }
  return out;
}
```

- [x] **Step 4: Implement `src/db/schema.ts`**

```ts
import Dexie, { type EntityTable, type Table } from 'dexie';
import type { BackupTable } from '../domain/migrations';
import type {
  AchievementRow, DayRecord, FoodEntry, MetaRow, Player, Profile, QuestLogEntry, SideQuest, WeekPlan, WorkoutSet,
} from '../domain/types';

export const STORES_V1: Record<BackupTable, string> = {
  profile: 'id',
  player: 'id',
  days: 'date',
  sideQuests: '++id',
  questLog: '++id, date, kind',
  workoutPlans: 'weekStart',
  workoutSets: '++id, exerciseId, date',
  foodLog: '++id, date',
  achievements: 'id',
  meta: 'key',
};

export class AshbornDB extends Dexie {
  declare profile: Table<Profile, number>;
  declare player: Table<Player, number>;
  declare days: Table<DayRecord, string>;
  declare sideQuests: EntityTable<SideQuest, 'id'>;
  declare questLog: EntityTable<QuestLogEntry, 'id'>;
  declare workoutPlans: Table<WeekPlan, string>;
  declare workoutSets: EntityTable<WorkoutSet, 'id'>;
  declare foodLog: EntityTable<FoodEntry, 'id'>;
  declare achievements: Table<AchievementRow, string>;
  declare meta: Table<MetaRow, string>;

  constructor(name = 'ashborn') {
    super(name);
    // RULE: never edit or delete a version block once shipped. To change the schema add
    //   this.version(N + 1).stores({...}).upgrade((tx) => ...)
    // plus backupMigrations[N + 1] in src/domain/migrations.ts, and bump SCHEMA_VERSION.
    this.version(1).stores(STORES_V1);
  }
}

export const db = new AshbornDB();

/** Read-write transaction over every table. Nested calls join the outer transaction. */
export function writeTx<T>(database: AshbornDB, fn: () => Promise<T>): Promise<T> {
  return database.transaction('rw', database.tables, fn);
}
```

- [x] **Step 5: Implement `src/db/meta.ts`**

```ts
import type { GameEvent, PersistResult } from '../domain/types';
import type { AshbornDB } from './schema';

export interface MetaMap {
  lastOpenDate: string;
  lastBackupAt: string;
  persistResult: PersistResult;
  lastUrgentDate: string;
  medicalAck: boolean;
  soundOn: boolean;
  installedAt: string;
  installGuideDismissed: boolean;
  pendingEvents: GameEvent[];
}

export async function getMeta<K extends keyof MetaMap>(database: AshbornDB, key: K): Promise<MetaMap[K] | undefined> {
  const row = await database.meta.get(key);
  return row?.value as MetaMap[K] | undefined;
}

export async function setMeta<K extends keyof MetaMap>(database: AshbornDB, key: K, value: MetaMap[K]): Promise<void> {
  await database.meta.put({ key, value });
}
```

- [x] **Step 6: Append `freshDb` to `src/test/fixtures.ts`**

Add these lines to the file (keep the existing content):
```ts
import { AshbornDB } from '../db/schema';

/** A brand-new, empty database with a unique name (fake-indexeddb in tests). */
export function freshDb(): AshbornDB {
  return new AshbornDB(`test-${crypto.randomUUID()}`);
}
```
(Put the import at the top of the file with the other import.)

- [x] **Step 7: Run to check they pass**

Run: `npx vitest run src/domain/migrations.test.ts src/db`
Expected: PASS.

- [x] **Step 8: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(db): add versioned Dexie schema, meta store and migration framework

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 12: Backup export, validation and import

**Files:**
- Create: `src/domain/validate.ts`, `src/domain/backup.ts`, `src/db/backup.ts`
- Modify: `src/test/fixtures.ts` (append `sampleBackupData`)
- Test: `src/domain/backup.test.ts`, `src/db/backup.test.ts`

**Interfaces:**
- Produces:
```ts
// domain/validate.ts
export function isRecord(v: unknown): v is Record<string, unknown>;
export const rowValidators: Record<BackupTable, (row: unknown) => boolean>;
// domain/backup.ts
export interface BackupData { profile: Profile[]; player: Player[]; days: DayRecord[]; sideQuests: SideQuest[]; questLog: QuestLogEntry[]; workoutPlans: WeekPlan[]; workoutSets: WorkoutSet[]; foodLog: FoodEntry[]; achievements: AchievementRow[]; meta: MetaRow[] }
export interface BackupFile { app: 'ashborn'; schemaVersion: number; exportedAt: string; data: BackupData }
export interface BackupSummary { playerName: string; level: number; rank: Rank; daysOfHistory: number; setsLogged: number; exportedAt: string }
export type ParseResult = { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; error: string };
export const BACKUP_REMINDER_DAYS = 7;
export function buildBackup(data: BackupData, now: Date): BackupFile;
export function backupFileName(now: Date): string;                  // ashborn-backup-YYYY-MM-DD.json
export function parseBackup(text: string, currentVersion?: number, migrations?: Record<number, BackupMigration>): ParseResult;
export function needsBackupReminder(now: Date, lastBackupAt: string | undefined, installedAt: string | undefined): boolean;
// db/backup.ts
export function exportData(database: AshbornDB): Promise<BackupData>;          // excludes meta 'pendingEvents'
export function importData(database: AshbornDB, data: BackupData): Promise<void>; // replaces everything in one transaction
// test/fixtures.ts
export function sampleBackupData(): BackupData;
```

- [x] **Step 1: Append `sampleBackupData` to `src/test/fixtures.ts`**

Add these imports at the top and the function at the bottom:
```ts
import type { BackupData } from '../domain/backup';
import { createDayRecord } from '../domain/quests/daily';
import { initialPlayer } from '../domain/stats';
import { generateWeekPlan } from '../domain/workout/plan';

export function sampleBackupData(): BackupData {
  return {
    profile: [{ ...sampleProfileInput, id: 1, createdAt: '2026-09-01T08:00:00.000Z' }],
    player: [{ ...initialPlayer(), level: 7, xp: 120, streak: 3, bestStreak: 5, questsCompleted: 12 }],
    days: [createDayRecord('2026-09-24', 'beginner', 7, null)],
    sideQuests: [{ id: 1, title: 'Read 10 pages', xp: 20, stat: 'discipline', archived: false, completions: 2 }],
    questLog: [{ id: 1, date: '2026-09-24', kind: 'side', refId: '1', xp: 20, at: '2026-09-24T18:00:00.000Z' }],
    workoutPlans: [generateWeekPlan(sampleProfileInput, '2026-09-21', null)],
    workoutSets: [{ id: 1, exerciseId: 'pushup', date: '2026-09-22', reps: 12, weightKg: 0, at: '2026-09-22T07:30:00.000Z' }],
    foodLog: [{ id: 1, date: '2026-09-24', kcal: 650, proteinG: 40, waterMl: 500, note: 'Lunch', at: '2026-09-24T12:30:00.000Z' }],
    achievements: [{ id: 'first-quest', unlockedAt: '2026-09-02T09:00:00.000Z' }],
    // sorted by key, the order Dexie returns them in
    meta: [
      { key: 'installedAt', value: '2026-09-01T08:00:00.000Z' },
      { key: 'lastOpenDate', value: '2026-09-24' },
    ],
  };
}
```

- [x] **Step 2: Write failing tests `src/domain/backup.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { sampleBackupData } from '../test/fixtures';
import { backupFileName, buildBackup, needsBackupReminder, parseBackup } from './backup';

const NOW = new Date('2026-09-25T10:00:00.000Z');
const text = (value: unknown) => JSON.stringify(value);
const file = () => buildBackup(sampleBackupData(), NOW);

describe('buildBackup / backupFileName', () => {
  it('wraps data with app name, schema version and time', () => {
    expect(file()).toMatchObject({ app: 'ashborn', schemaVersion: 1, exportedAt: NOW.toISOString() });
    expect(backupFileName(new Date(2026, 8, 25, 23, 0))).toBe('ashborn-backup-2026-09-25.json');
  });
});

describe('parseBackup', () => {
  it('accepts its own export and summarises it', () => {
    const result = parseBackup(text(file()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data).toEqual(sampleBackupData());
    expect(result.summary).toEqual({ playerName: 'Kai', level: 7, rank: 'E', daysOfHistory: 1, setsLogged: 1, exportedAt: NOW.toISOString() });
  });

  it('rejects text that is not JSON', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'This file is not valid JSON.' });
  });

  it('rejects JSON from another app', () => {
    expect(parseBackup(text({ app: 'other', schemaVersion: 1, data: {} }))).toEqual({ ok: false, error: 'This file is not an Ashborn backup.' });
    expect(parseBackup(text([1, 2]))).toEqual({ ok: false, error: 'This file is not an Ashborn backup.' });
  });

  it('rejects a backup from a newer app version', () => {
    const result = parseBackup(text({ ...file(), schemaVersion: 2 }));
    expect(result).toEqual({ ok: false, error: 'This backup was made by a newer version of Ashborn. Update the app, then try again.' });
  });

  it('rejects a missing table', () => {
    const f = file();
    const { foodLog: _removed, ...rest } = f.data;
    void _removed;
    expect(parseBackup(text({ ...f, data: rest }))).toEqual({ ok: false, error: 'This backup is missing "foodLog".' });
  });

  it('rejects a row with a wrong field type', () => {
    const f = file();
    const bad = { ...f, data: { ...f.data, player: [{ ...f.data.player[0], level: '7' }] } };
    expect(parseBackup(text(bad))).toEqual({ ok: false, error: 'This backup has an invalid entry in "player" (item 1).' });
  });

  it('rejects a backup without a player', () => {
    const f = file();
    expect(parseBackup(text({ ...f, data: { ...f.data, player: [] } }))).toEqual({ ok: false, error: 'This backup has no player data.' });
  });

  it('upgrades an older backup through the migration steps', () => {
    const f = file();
    const { player, ...rest } = f.data;
    const v1 = { ...f, schemaVersion: 1, data: { ...rest, players: player } };
    const steps = { 2: (d: Record<string, unknown[]>) => { const { players, ...others } = d; return { ...others, player: players ?? [] }; } };
    const result = parseBackup(text(v1), 2, steps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.schemaVersion).toBe(2);
  });
});

describe('needsBackupReminder', () => {
  const day = 86_400_000;
  it('reminds when the last backup is older than 7 days', () => {
    expect(needsBackupReminder(NOW, new Date(NOW.getTime() - 8 * day).toISOString(), undefined)).toBe(true);
    expect(needsBackupReminder(NOW, new Date(NOW.getTime() - 6 * day).toISOString(), undefined)).toBe(false);
  });

  it('counts from install when there has never been a backup', () => {
    expect(needsBackupReminder(NOW, undefined, new Date(NOW.getTime() - 8 * day).toISOString())).toBe(true);
    expect(needsBackupReminder(NOW, undefined, new Date(NOW.getTime() - 1 * day).toISOString())).toBe(false);
    expect(needsBackupReminder(NOW, undefined, undefined)).toBe(false);
  });
});
```

- [x] **Step 3: Write failing tests `src/db/backup.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from '../domain/backup';
import { initialPlayer } from '../domain/stats';
import { freshDb, sampleBackupData } from '../test/fixtures';
import { exportData, importData } from './backup';
import { setMeta } from './meta';

describe('database backup', () => {
  it('exports, serialises, parses and imports back identically', async () => {
    const source = freshDb();
    await importData(source, sampleBackupData());
    const exported = await exportData(source);
    expect(exported).toEqual(sampleBackupData());

    const parsed = parseBackup(JSON.stringify(buildBackup(exported, new Date())));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const target = freshDb();
    await target.player.put({ ...initialPlayer(), level: 99 });
    await importData(target, parsed.backup.data);
    expect(await exportData(target)).toEqual(exported);
  });

  it('does not export transient pending events', async () => {
    const db = freshDb();
    await importData(db, sampleBackupData());
    await setMeta(db, 'pendingEvents', [{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
    const exported = await exportData(db);
    expect(exported.meta.some((m) => m.key === 'pendingEvents')).toBe(false);
  });
});
```

- [x] **Step 4: Run to check they fail**

Run: `npx vitest run src/domain/backup.test.ts src/db/backup.test.ts`
Expected: FAIL, modules not found.

- [x] **Step 5: Implement `src/domain/validate.ts`**

```ts
import { isDateKey } from './day';
import type { BackupTable } from './migrations';
import { STAT_KEYS } from './types';

type Check = (value: unknown) => boolean;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const str: Check = (v) => typeof v === 'string';
const bool: Check = (v) => typeof v === 'boolean';
const nonNeg: Check = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const intIn = (min: number, max: number): Check => (v) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const count = intIn(0, Number.MAX_SAFE_INTEGER);
const oneOf = (...allowed: readonly unknown[]): Check => (v) => allowed.includes(v);
const nullable = (check: Check): Check => (v) => v === null || check(v);
const arrayOf = (check: Check): Check => (v) => Array.isArray(v) && v.every(check);
const shape = (spec: Record<string, Check>): Check => (v) => isRecord(v) && Object.entries(spec).every(([key, check]) => check(v[key]));
const both = (a: Check, b: Check): Check => (v) => a(v) && b(v);

const stats = shape(Object.fromEntries(STAT_KEYS.map((k) => [k, nonNeg])));
const questItem = shape({ id: str, label: str, easier: str, target: nonNeg, unit: oneOf('reps', 'min'), progress: nonNeg });
const penalty = both(questItem, shape({ xp: nonNeg, done: bool }));
const urgent = shape({ id: str, label: str, xp: nonNeg, done: bool });

export const rowValidators: Record<BackupTable, Check> = {
  profile: shape({
    id: oneOf(1), name: str, age: count, sex: oneOf('male', 'female'), heightCm: nonNeg, weightKg: nonNeg,
    goal: oneOf('lose_fat', 'build_muscle', 'get_fit'), experience: oneOf('never', 'beginner', 'intermediate', 'advanced'),
    daysPerWeek: intIn(1, 7), minutesPerSession: count, equipment: oneOf('none', 'dumbbells', 'gym'), createdAt: str,
  }),
  player: shape({
    id: oneOf(1), level: intIn(1, Number.MAX_SAFE_INTEGER), xp: nonNeg, unspentStatPoints: count, stats,
    titleId: nullable(str), streak: count, bestStreak: count, questsCompleted: count, sideQuestStatProgress: stats,
  }),
  days: shape({
    date: isDateKey, items: arrayOf(questItem), status: oneOf('open', 'partial', 'done', 'missed', 'rest'),
    penalty: nullable(penalty), urgent: nullable(urgent), xpAwarded: nonNeg,
  }),
  sideQuests: shape({ id: count, title: str, xp: nonNeg, stat: oneOf(...STAT_KEYS), archived: bool, completions: count }),
  questLog: shape({ id: count, date: isDateKey, kind: oneOf('daily', 'penalty', 'urgent', 'side'), refId: str, xp: nonNeg, at: str }),
  workoutPlans: shape({
    weekStart: isDateKey,
    days: arrayOf(shape({
      weekday: intIn(1, 7), focus: oneOf('full', 'upper', 'lower'),
      exercises: arrayOf(shape({ exerciseId: str, sets: count, reps: count })),
    })),
  }),
  workoutSets: shape({ id: count, exerciseId: str, date: isDateKey, reps: count, weightKg: nonNeg, at: str }),
  foodLog: shape({ id: count, date: isDateKey, kcal: nonNeg, proteinG: nonNeg, waterMl: nonNeg, note: str, at: str }),
  achievements: shape({ id: str, unlockedAt: str }),
  meta: (v) => isRecord(v) && typeof v.key === 'string' && v.value !== undefined,
};
```

- [x] **Step 6: Implement `src/domain/backup.ts`**

```ts
import { todayKey } from './day';
import { BACKUP_TABLES, SCHEMA_VERSION, backupMigrations, migrateBackupData, type BackupMigration, type TableData } from './migrations';
import { rankForLevel } from './rank';
import type {
  AchievementRow, DayRecord, FoodEntry, MetaRow, Player, Profile, QuestLogEntry, Rank, SideQuest, WeekPlan, WorkoutSet,
} from './types';
import { isRecord, rowValidators } from './validate';

export interface BackupData {
  profile: Profile[];
  player: Player[];
  days: DayRecord[];
  sideQuests: SideQuest[];
  questLog: QuestLogEntry[];
  workoutPlans: WeekPlan[];
  workoutSets: WorkoutSet[];
  foodLog: FoodEntry[];
  achievements: AchievementRow[];
  meta: MetaRow[];
}

export interface BackupFile {
  app: 'ashborn';
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

export interface BackupSummary {
  playerName: string;
  level: number;
  rank: Rank;
  daysOfHistory: number;
  setsLogged: number;
  exportedAt: string;
}

export type ParseResult = { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; error: string };

export const BACKUP_REMINDER_DAYS = 7;

const fail = (error: string): ParseResult => ({ ok: false, error });

export function buildBackup(data: BackupData, now: Date): BackupFile {
  return { app: 'ashborn', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data };
}

export function backupFileName(now: Date): string {
  return `ashborn-backup-${todayKey(now)}.json`;
}

export function parseBackup(
  text: string,
  currentVersion: number = SCHEMA_VERSION,
  migrations: Record<number, BackupMigration> = backupMigrations,
): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('This file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.app !== 'ashborn') return fail('This file is not an Ashborn backup.');

  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return fail('This backup has an unknown format version.');
  if (version > currentVersion) return fail('This backup was made by a newer version of Ashborn. Update the app, then try again.');
  if (!isRecord(raw.data)) return fail('This backup has no data.');

  let data: TableData;
  try {
    data = migrateBackupData(raw.data as TableData, version, currentVersion, migrations);
  } catch {
    return fail('This backup could not be upgraded to the current version.');
  }

  for (const table of BACKUP_TABLES) {
    const rows = data[table];
    if (!Array.isArray(rows)) return fail(`This backup is missing "${table}".`);
    const bad = rows.findIndex((row) => !rowValidators[table](row));
    if (bad !== -1) return fail(`This backup has an invalid entry in "${table}" (item ${bad + 1}).`);
  }

  const typed = data as unknown as BackupData;
  if (typed.profile.length !== 1 || typed.player.length !== 1) return fail('This backup has no player data.');

  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : '';
  const player = typed.player[0]!;
  const clean = Object.fromEntries(BACKUP_TABLES.map((t) => [t, typed[t]])) as unknown as BackupData;
  return {
    ok: true,
    backup: { app: 'ashborn', schemaVersion: currentVersion, exportedAt, data: clean },
    summary: {
      playerName: typed.profile[0]!.name,
      level: player.level,
      rank: rankForLevel(player.level),
      daysOfHistory: typed.days.length,
      setsLogged: typed.workoutSets.length,
      exportedAt,
    },
  };
}

export function needsBackupReminder(now: Date, lastBackupAt: string | undefined, installedAt: string | undefined): boolean {
  const reference = lastBackupAt ?? installedAt;
  if (!reference) return false;
  const time = Date.parse(reference);
  if (Number.isNaN(time)) return true;
  return now.getTime() - time > BACKUP_REMINDER_DAYS * 86_400_000;
}
```

- [x] **Step 7: Implement `src/db/backup.ts`**

```ts
import type { BackupData } from '../domain/backup';
import { writeTx, type AshbornDB } from './schema';

const TRANSIENT_META = new Set(['pendingEvents']);

export async function exportData(database: AshbornDB): Promise<BackupData> {
  const [profile, player, days, sideQuests, questLog, workoutPlans, workoutSets, foodLog, achievements, meta] = await Promise.all([
    database.profile.toArray(),
    database.player.toArray(),
    database.days.toArray(),
    database.sideQuests.toArray(),
    database.questLog.toArray(),
    database.workoutPlans.toArray(),
    database.workoutSets.toArray(),
    database.foodLog.toArray(),
    database.achievements.toArray(),
    database.meta.toArray(),
  ]);
  return {
    profile, player, days, sideQuests, questLog, workoutPlans, workoutSets, foodLog, achievements,
    meta: meta.filter((row) => !TRANSIENT_META.has(row.key)),
  };
}

/** Replaces ALL local data with the backup, atomically. Validate with parseBackup first. */
export async function importData(database: AshbornDB, data: BackupData): Promise<void> {
  await writeTx(database, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
    await database.profile.bulkPut(data.profile);
    await database.player.bulkPut(data.player);
    await database.days.bulkPut(data.days);
    await database.sideQuests.bulkPut(data.sideQuests);
    await database.questLog.bulkPut(data.questLog);
    await database.workoutPlans.bulkPut(data.workoutPlans);
    await database.workoutSets.bulkPut(data.workoutSets);
    await database.foodLog.bulkPut(data.foodLog);
    await database.achievements.bulkPut(data.achievements);
    await database.meta.bulkPut(data.meta);
  });
}
```

- [x] **Step 8: Run to check they pass**

Run: `npx vitest run src/domain/backup.test.ts src/db/backup.test.ts`
Expected: PASS.

- [x] **Step 9: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(backup): add validated JSON export/import with version migration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 13: Game engine repo: player, onboarding and days

**Files:**
- Create: `src/db/repo/player.ts`, `src/db/repo/onboarding.ts`, `src/db/repo/days.ts`, `src/db/repo/training.ts` (only `ensureWeekPlan` for now), `src/test/dbFixtures.ts`
- Test: `src/db/repo/days.test.ts`, `src/db/repo/player.test.ts`, `src/db/repo/onboarding.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–12.
- Produces:
```ts
// player.ts
export interface XpAward { amount: number; kind: QuestKind; refId: string; date: string; countsAsQuest: boolean }
export function awardXp(database: AshbornDB, award: XpAward, now: Date): Promise<void>;
export function unlockAchievements(database: AshbornDB, now: Date): Promise<void>;
export function pushEvents(database: AshbornDB, events: GameEvent[]): Promise<void>;
export function dismissEvent(database: AshbornDB): Promise<void>;           // removes the first pending event
export function assignStats(database: AshbornDB, allocation: Partial<Stats>): Promise<void>;
export function setTitle(database: AshbornDB, titleId: string | null): Promise<void>;
// onboarding.ts
export function registerPlayer(database: AshbornDB, input: ProfileInput, now: Date): Promise<void>;
export function updateProfile(database: AshbornDB, input: ProfileInput, now: Date): Promise<void>;
// days.ts
export function startDay(database: AshbornDB, now: Date, rng?: () => number): Promise<void>;
export function setItemProgress(database: AshbornDB, date: string, itemId: string, progress: number, now: Date): Promise<void>;
export function finishDay(database: AshbornDB, date: string, now: Date): Promise<number>;   // XP awarded
export function setRest(database: AshbornDB, date: string, rest: boolean): Promise<void>;
export function setPenaltyProgress(database: AshbornDB, date: string, progress: number, now: Date): Promise<void>;
export function completeUrgent(database: AshbornDB, date: string, now: Date): Promise<void>;
// training.ts (this task)
export function ensureWeekPlan(database: AshbornDB, profile: PlanProfile, date: string): Promise<void>;
// test/dbFixtures.ts
export const neverUrgent: () => number;                                   // rng that never triggers an urgent quest
export function setupPlayer(date?: string): Promise<AshbornDB>;           // fresh db + registerPlayer + startDay
export function completeDaily(database: AshbornDB, date: string): Promise<void>;
```

- [x] **Step 1: Create `src/test/dbFixtures.ts`**

```ts
import type { AshbornDB } from '../db/schema';
import { startDay, setItemProgress } from '../db/repo/days';
import { registerPlayer } from '../db/repo/onboarding';
import { at, freshDb, sampleProfileInput } from './fixtures';

export const neverUrgent = () => 0.99;

export async function setupPlayer(date = '2026-09-21'): Promise<AshbornDB> {
  const database = freshDb();
  await registerPlayer(database, sampleProfileInput, at(date));
  await startDay(database, at(date), neverUrgent);
  return database;
}

export async function completeDaily(database: AshbornDB, date: string): Promise<void> {
  const day = await database.days.get(date);
  for (const item of day?.items ?? []) await setItemProgress(database, date, item.id, item.target, at(date, '18:00'));
}
```

- [x] **Step 2: Write failing tests `src/db/repo/onboarding.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { planVolume } from '../../domain/workout/plan';
import { setupPlayer } from '../../test/dbFixtures';
import { at, sampleProfileInput } from '../../test/fixtures';
import { getMeta } from '../meta';
import { updateProfile } from './onboarding';

describe('registerPlayer', () => {
  it("creates the profile, a level 1 player, today's quest and this week's plan", async () => {
    const db = await setupPlayer('2026-09-21');
    expect(await db.profile.get(1)).toMatchObject({ name: 'Kai', experience: 'beginner' });
    expect(await db.player.get(1)).toMatchObject({ level: 1, xp: 0 });
    expect((await db.days.get('2026-09-21'))?.items.map((i) => i.target)).toEqual([10, 15, 15, 15]);
    expect(await db.workoutPlans.get('2026-09-21')).toBeTruthy();
    expect(await getMeta(db, 'lastOpenDate')).toBe('2026-09-21');
    expect(await getMeta(db, 'installedAt')).toBeTruthy();
  });
});

describe('updateProfile', () => {
  it('saves new answers, keeps progress and regenerates this week within the volume cap', async () => {
    const db = await setupPlayer('2026-09-21');
    await db.player.update(1, { level: 4 });
    const before = planVolume((await db.workoutPlans.get('2026-09-21'))!);
    await updateProfile(db, { ...sampleProfileInput, daysPerWeek: 6 }, at('2026-09-23'));
    expect((await db.profile.get(1))?.daysPerWeek).toBe(6);
    expect((await db.player.get(1))?.level).toBe(4);
    expect(planVolume((await db.workoutPlans.get('2026-09-21'))!)).toBeLessThanOrEqual(Math.floor(before * 1.1));
  });
});
```

- [x] **Step 3: Write failing tests `src/db/repo/days.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { completeDaily, neverUrgent, setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { getMeta } from '../meta';
import { completeUrgent, finishDay, setItemProgress, setPenaltyProgress, setRest, startDay } from './days';
import { dismissEvent } from './player';

describe('daily quest progress', () => {
  it('completing every item awards full XP, a streak and the first title', async () => {
    const db = await setupPlayer();
    await completeDaily(db, '2026-09-21');
    expect((await db.days.get('2026-09-21'))?.status).toBe('done');
    expect(await db.player.get(1)).toMatchObject({ xp: 65, streak: 1, bestStreak: 1, questsCompleted: 1 });
    expect(await db.achievements.get('first-quest')).toBeTruthy();
    expect(await getMeta(db, 'pendingEvents')).toEqual([{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
  });

  it('completing an already-done day twice awards once', async () => {
    const db = await setupPlayer();
    await completeDaily(db, '2026-09-21');
    await completeDaily(db, '2026-09-21');
    expect((await db.player.get(1))?.xp).toBe(65);
    expect(await db.questLog.count()).toBe(1);
  });

  it('queues a level-up event before achievement events', async () => {
    const db = await setupPlayer();
    await db.player.update(1, { xp: 70 });
    await completeDaily(db, '2026-09-21');
    expect(await db.player.get(1)).toMatchObject({ level: 2, xp: 55, unspentStatPoints: 3 });
    expect((await getMeta(db, 'pendingEvents'))?.[0]).toMatchObject({ type: 'levelUp', fromLevel: 1, toLevel: 2, statPointsGained: 3 });
    await dismissEvent(db);
    expect((await getMeta(db, 'pendingEvents'))?.[0]).toMatchObject({ type: 'achievement', id: 'first-quest' });
  });

  it('"Finish for today" gives partial XP and more progress can still complete the day', async () => {
    const db = await setupPlayer();
    const first = (await db.days.get('2026-09-21'))!.items[0]!;
    await setItemProgress(db, '2026-09-21', first.id, first.target, at('2026-09-21'));
    expect(await finishDay(db, '2026-09-21', at('2026-09-21'))).toBe(16);
    expect(await db.days.get('2026-09-21')).toMatchObject({ status: 'partial', xpAwarded: 16 });
    expect(await finishDay(db, '2026-09-21', at('2026-09-21'))).toBe(0);
    await completeDaily(db, '2026-09-21');
    expect(await db.days.get('2026-09-21')).toMatchObject({ status: 'done', xpAwarded: 65 });
    expect((await db.player.get(1))?.xp).toBe(65);
  });

  it('ignores negative or non-numeric progress', async () => {
    const db = await setupPlayer();
    await setItemProgress(db, '2026-09-21', 'pushups', -5, at('2026-09-21'));
    await setItemProgress(db, '2026-09-21', 'situps', Number.NaN, at('2026-09-21'));
    const items = (await db.days.get('2026-09-21'))!.items;
    expect(items.map((i) => i.progress)).toEqual([0, 0, 0, 0]);
  });
});

describe('startDay', () => {
  it('a missed day resets the streak and adds one penalty quest', async () => {
    const db = await setupPlayer('2026-09-21');
    await completeDaily(db, '2026-09-21');
    await startDay(db, at('2026-09-22'), neverUrgent);
    await startDay(db, at('2026-09-24'), neverUrgent);
    expect((await db.days.get('2026-09-22'))?.status).toBe('missed');
    expect((await db.days.get('2026-09-23'))?.status).toBe('missed');
    expect((await db.days.get('2026-09-24'))?.penalty).toMatchObject({ label: 'Squats', target: 15, done: false });
    expect((await db.player.get(1))?.streak).toBe(0);
  });

  it('startDay after a 3-week gap does not crash and creates one penalty', async () => {
    const db = await setupPlayer('2026-09-01');
    await startDay(db, at('2026-09-22'), neverUrgent);
    const all = await db.days.toArray();
    expect(all.filter((d) => d.status === 'missed')).toHaveLength(21);
    expect(all.filter((d) => d.penalty !== null)).toHaveLength(1);
  });

  it('a rest day keeps the streak and adds no penalty', async () => {
    const db = await setupPlayer('2026-09-21');
    await completeDaily(db, '2026-09-21');
    await startDay(db, at('2026-09-22'), neverUrgent);
    await setRest(db, '2026-09-22', true);
    await startDay(db, at('2026-09-23'), neverUrgent);
    expect((await db.player.get(1))?.streak).toBe(1);
    expect((await db.days.get('2026-09-23'))?.penalty).toBeNull();
  });

  it('rest can be undone on the same day', async () => {
    const db = await setupPlayer('2026-09-21');
    await setRest(db, '2026-09-21', true);
    await setRest(db, '2026-09-21', false);
    expect((await db.days.get('2026-09-21'))?.status).toBe('open');
  });

  it('rolls the urgent quest at most once per day', async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-22'), () => 0);
    expect((await db.days.get('2026-09-22'))?.urgent).toMatchObject({ label: 'Hold a plank for 30 seconds', done: false });
    await completeUrgent(db, '2026-09-22', at('2026-09-22'));
    await completeUrgent(db, '2026-09-22', at('2026-09-22'));
    await startDay(db, at('2026-09-22', '20:00'), () => 0);
    expect((await db.days.get('2026-09-22'))?.urgent).toMatchObject({ done: true });
    expect((await db.player.get(1))?.xp).toBe(25);
  });

  it('completes the penalty quest once for 20 XP', async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-22'), neverUrgent);
    await setPenaltyProgress(db, '2026-09-22', 15, at('2026-09-22'));
    await setPenaltyProgress(db, '2026-09-22', 15, at('2026-09-22'));
    expect((await db.days.get('2026-09-22'))?.penalty?.done).toBe(true);
    expect((await db.player.get(1))?.xp).toBe(20);
  });

  it("keeps today's quest when the clock moves backwards", async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-20'), neverUrgent);
    expect(await db.days.get('2026-09-20')).toBeUndefined();
    expect(await getMeta(db, 'lastOpenDate')).toBe('2026-09-21');
  });

  it('caps daily targets at +10 % of the quest a week earlier', async () => {
    const db = await setupPlayer('2026-09-21');
    await db.player.update(1, { level: 11 });
    await startDay(db, at('2026-09-29'), neverUrgent);
    expect((await db.days.get('2026-09-29'))?.items.map((i) => i.target)).toEqual([11, 16, 16, 16]);
  });

  it("creates next week's training plan", async () => {
    const db = await setupPlayer('2026-09-21');
    await startDay(db, at('2026-09-28'), neverUrgent);
    expect(await db.workoutPlans.get('2026-09-28')).toBeTruthy();
  });
});
```

- [x] **Step 4: Write failing tests `src/db/repo/player.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { assignStats, setTitle } from './player';

describe('player actions', () => {
  it('assigns stat points and refuses to overspend', async () => {
    const db = await setupPlayer();
    await db.player.update(1, { unspentStatPoints: 3 });
    await assignStats(db, { strength: 3 });
    expect(await db.player.get(1)).toMatchObject({ unspentStatPoints: 0, stats: { strength: 13 } });
    await expect(assignStats(db, { strength: 1 })).rejects.toThrow('Not enough stat points.');
  });

  it('only equips unlocked titles', async () => {
    const db = await setupPlayer();
    await expect(setTitle(db, 'streak-7')).rejects.toThrow('That title is still locked.');
    await db.achievements.put({ id: 'streak-7', unlockedAt: '2026-09-21T09:00:00.000Z' });
    await setTitle(db, 'streak-7');
    expect((await db.player.get(1))?.titleId).toBe('streak-7');
    await setTitle(db, null);
    expect((await db.player.get(1))?.titleId).toBeNull();
  });
});
```

- [x] **Step 5: Run to check they fail**

Run: `npx vitest run src/db/repo`
Expected: FAIL, modules not found.

- [x] **Step 6: Implement `src/db/repo/player.ts`**

```ts
import { getExercise } from '../../config/exercises';
import { newlyUnlocked } from '../../domain/achievements';
import { assignStatPoints } from '../../domain/stats';
import type { GameEvent, QuestKind, Stats } from '../../domain/types';
import { summarizeProgress } from '../../domain/workout/exerciseRank';
import { applyXp } from '../../domain/xp';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';

export interface XpAward {
  amount: number;
  kind: QuestKind;
  refId: string;
  date: string;
  countsAsQuest: boolean;
}

export async function pushEvents(database: AshbornDB, events: GameEvent[]): Promise<void> {
  if (events.length === 0) return;
  const current = (await getMeta(database, 'pendingEvents')) ?? [];
  await setMeta(database, 'pendingEvents', [...current, ...events]);
}

export async function dismissEvent(database: AshbornDB): Promise<void> {
  await writeTx(database, async () => {
    const current = (await getMeta(database, 'pendingEvents')) ?? [];
    await setMeta(database, 'pendingEvents', current.slice(1));
  });
}

export async function unlockAchievements(database: AshbornDB, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) return;
    const unlocked = (await database.achievements.toArray()).map((a) => a.id);
    const progress = summarizeProgress(await database.workoutSets.toArray(), (id) => getExercise(id)?.weighted ?? false);
    const fresh = newlyUnlocked(
      { questsCompleted: player.questsCompleted, bestStreak: player.bestStreak, level: player.level, ...progress },
      unlocked,
    );
    if (fresh.length === 0) return;
    await database.achievements.bulkPut(fresh.map((a) => ({ id: a.id, unlockedAt: now.toISOString() })));
    await pushEvents(database, fresh.map((a) => ({ type: 'achievement', id: a.id, title: a.title })));
  });
}

export async function awardXp(database: AshbornDB, award: XpAward, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) throw new Error('Player not registered.');
    const { player: leveled, levelUp } = applyXp(player, award.amount);
    const next = award.countsAsQuest ? { ...leveled, questsCompleted: leveled.questsCompleted + 1 } : leveled;
    await database.player.put(next);
    await database.questLog.add({
      date: award.date,
      kind: award.kind,
      refId: award.refId,
      xp: Math.max(0, Math.floor(award.amount)),
      at: now.toISOString(),
    });
    if (levelUp) await pushEvents(database, [{ type: 'levelUp', ...levelUp }]);
    await unlockAchievements(database, now);
  });
}

export async function assignStats(database: AshbornDB, allocation: Partial<Stats>): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) throw new Error('Player not registered.');
    await database.player.put(assignStatPoints(player, allocation));
  });
}

export async function setTitle(database: AshbornDB, titleId: string | null): Promise<void> {
  await writeTx(database, async () => {
    if (titleId !== null && !(await database.achievements.get(titleId))) throw new Error('That title is still locked.');
    await database.player.update(1, { titleId });
  });
}
```

- [x] **Step 7: Implement `src/db/repo/training.ts` (ensureWeekPlan only; Task 14 adds more)**

```ts
import { addDays, weekStartOf } from '../../domain/day';
import { generateWeekPlan, type PlanProfile } from '../../domain/workout/plan';
import type { AshbornDB } from '../schema';

export async function ensureWeekPlan(database: AshbornDB, profile: PlanProfile, date: string): Promise<void> {
  const weekStart = weekStartOf(date);
  if (await database.workoutPlans.get(weekStart)) return;
  const previous =
    (await database.workoutPlans.get(addDays(weekStart, -7))) ??
    (await database.workoutPlans.where('weekStart').below(weekStart).last()) ??
    null;
  await database.workoutPlans.put(generateWeekPlan(profile, weekStart, previous));
}
```

- [x] **Step 8: Implement `src/db/repo/onboarding.ts`**

```ts
import { addDays, todayKey, weekStartOf } from '../../domain/day';
import { createDayRecord } from '../../domain/quests/daily';
import { initialPlayer } from '../../domain/stats';
import type { ProfileInput } from '../../domain/types';
import { generateWeekPlan } from '../../domain/workout/plan';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';

export async function registerPlayer(database: AshbornDB, input: ProfileInput, now: Date): Promise<void> {
  const today = todayKey(now);
  await writeTx(database, async () => {
    await database.profile.put({ ...input, id: 1, createdAt: now.toISOString() });
    await database.player.put(initialPlayer());
    await database.days.put(createDayRecord(today, input.experience, 1, null));
    await database.workoutPlans.put(generateWeekPlan(input, weekStartOf(today), null));
    if (!(await getMeta(database, 'installedAt'))) await setMeta(database, 'installedAt', now.toISOString());
    await setMeta(database, 'lastOpenDate', today);
  });
}

/** Saves edited onboarding answers. Progress is kept; the current week's plan is rebuilt within the volume cap. */
export async function updateProfile(database: AshbornDB, input: ProfileInput, now: Date): Promise<void> {
  const weekStart = weekStartOf(todayKey(now));
  await writeTx(database, async () => {
    const existing = await database.profile.get(1);
    if (!existing) throw new Error('Player not registered.');
    await database.profile.put({ ...input, id: 1, createdAt: existing.createdAt });
    const previous =
      (await database.workoutPlans.get(weekStart)) ?? (await database.workoutPlans.get(addDays(weekStart, -7))) ?? null;
    await database.workoutPlans.put(generateWeekPlan(input, weekStart, previous));
  });
}
```

- [x] **Step 9: Implement `src/db/repo/days.ts`**

```ts
import { addDays, dateRange, todayKey } from '../../domain/day';
import { processDays } from '../../domain/dayCycle';
import { createDayRecord, dailyQuestXp, isDailyComplete, partialXp } from '../../domain/quests/daily';
import { generatePenalty } from '../../domain/quests/penalty';
import { rollUrgent } from '../../domain/quests/urgent';
import type { DayRecord, QuestItem } from '../../domain/types';
import { getMeta, setMeta } from '../meta';
import { writeTx, type AshbornDB } from '../schema';
import { awardXp } from './player';
import { ensureWeekPlan } from './training';

const MAX_PROGRESS = 100_000;

function cleanProgress(progress: number): number {
  return Number.isFinite(progress) ? Math.min(MAX_PROGRESS, Math.max(0, Math.floor(progress))) : 0;
}

/** The quest from ≥ 7 days ago (or the very first quest) that today's targets may not outgrow by > 10 %. */
async function referenceItems(database: AshbornDB, current: string): Promise<QuestItem[] | null> {
  const cutoff = addDays(current, -7);
  const older = await database.days.where('date').belowOrEqual(cutoff).reverse().filter((d) => d.items.length > 0).first();
  if (older) return older.items;
  const earliest = await database.days.orderBy('date').filter((d) => d.date < current && d.items.length > 0).first();
  return earliest?.items ?? null;
}

/** Runs the daily reset. Safe to call any number of times; call on launch, on focus and every minute. */
export async function startDay(database: AshbornDB, now: Date, rng: () => number = Math.random): Promise<void> {
  const today = todayKey(now);
  await writeTx(database, async () => {
    const profile = await database.profile.get(1);
    const player = await database.player.get(1);
    if (!profile || !player) return;

    const last = (await getMeta(database, 'lastOpenDate')) ?? null;
    const dates = last !== null && today > last ? dateRange(last, today) : [];
    const existing: Record<string, DayRecord> = {};
    for (const record of await database.days.bulkGet(dates)) if (record) existing[record.date] = record;

    const result = processDays({ lastOpenDate: last, today, days: existing, streak: player.streak, level: player.level });
    if (result.closed.length > 0) await database.days.bulkPut(result.closed);
    if (result.streak !== player.streak) await database.player.update(1, { streak: result.streak });

    const current = result.currentDate;
    let record = (await database.days.get(current)) ??
      createDayRecord(current, profile.experience, player.level, await referenceItems(database, current));
    if (result.needsPenalty && !record.penalty) record = { ...record, penalty: generatePenalty(profile.experience) };

    const lastUrgent = (await getMeta(database, 'lastUrgentDate')) ?? null;
    if (lastUrgent !== current) {
      const urgent = rollUrgent(rng, current, lastUrgent);
      if (urgent && !record.urgent) record = { ...record, urgent };
      await setMeta(database, 'lastUrgentDate', current);
    }

    await database.days.put(record);
    await setMeta(database, 'lastOpenDate', current);
    await ensureWeekPlan(database, profile, current);

    if (result.xpToAward > 0) {
      await awardXp(database, { amount: result.xpToAward, kind: 'daily', refId: 'partial', date: current, countsAsQuest: false }, now);
    }
  });
}

export async function setItemProgress(database: AshbornDB, date: string, itemId: string, progress: number, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    const player = await database.player.get(1);
    if (!record || !player || (record.status !== 'open' && record.status !== 'partial')) return;

    const items = record.items.map((item) => (item.id === itemId ? { ...item, progress: cleanProgress(progress) } : item));
    if (!isDailyComplete(items)) {
      await database.days.put({ ...record, items });
      return;
    }

    const xp = Math.max(0, dailyQuestXp(player.level) - record.xpAwarded);
    await database.days.put({ ...record, items, status: 'done', xpAwarded: record.xpAwarded + xp });
    const streak = player.streak + 1;
    await database.player.update(1, { streak, bestStreak: Math.max(player.bestStreak, streak) });
    await awardXp(database, { amount: xp, kind: 'daily', refId: date, date, countsAsQuest: true }, now);
  });
}

export async function finishDay(database: AshbornDB, date: string, now: Date): Promise<number> {
  return writeTx(database, async () => {
    const record = await database.days.get(date);
    const player = await database.player.get(1);
    if (!record || !player || (record.status !== 'open' && record.status !== 'partial')) return 0;
    const earned = partialXp(record.items, player.level) - record.xpAwarded;
    if (earned <= 0) return 0;
    await database.days.put({ ...record, status: 'partial', xpAwarded: record.xpAwarded + earned });
    await awardXp(database, { amount: earned, kind: 'daily', refId: date, date, countsAsQuest: false }, now);
    return earned;
  });
}

export async function setRest(database: AshbornDB, date: string, rest: boolean): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    if (!record) return;
    if (rest && (record.status === 'open' || record.status === 'partial')) {
      await database.days.put({ ...record, status: 'rest' });
    }
    if (!rest && record.status === 'rest') {
      await database.days.put({ ...record, status: record.xpAwarded > 0 ? 'partial' : 'open' });
    }
  });
}

export async function setPenaltyProgress(database: AshbornDB, date: string, progress: number, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    if (!record?.penalty || record.penalty.done) return;
    const value = cleanProgress(progress);
    const done = value >= record.penalty.target;
    await database.days.put({ ...record, penalty: { ...record.penalty, progress: value, done } });
    if (done) await awardXp(database, { amount: record.penalty.xp, kind: 'penalty', refId: date, date, countsAsQuest: true }, now);
  });
}

export async function completeUrgent(database: AshbornDB, date: string, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const record = await database.days.get(date);
    if (!record?.urgent || record.urgent.done) return;
    await database.days.put({ ...record, urgent: { ...record.urgent, done: true } });
    await awardXp(database, { amount: record.urgent.xp, kind: 'urgent', refId: record.urgent.id, date, countsAsQuest: true }, now);
  });
}
```

- [x] **Step 10: Run to check they pass**

Run: `npx vitest run src/db`
Expected: PASS. If a test fails, use superpowers:systematic-debugging. Do not weaken the test.

- [x] **Step 11: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(db): add game engine for onboarding, daily reset, quests, XP and events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 14: Side quests, set logging and food log

**Files:**
- Create: `src/db/repo/sideQuests.ts`, `src/db/repo/food.ts`
- Modify: `src/db/repo/training.ts` (add `logSet`, `deleteSet`)
- Test: `src/db/repo/sideQuests.test.ts`, `src/db/repo/training.test.ts`, `src/db/repo/food.test.ts`

**Interfaces:**
- Produces:
```ts
// sideQuests.ts
export interface SideQuestInput { title: string; xp: number; stat: StatKey }
export function createSideQuest(database: AshbornDB, input: SideQuestInput): Promise<number>;
export function updateSideQuest(database: AshbornDB, id: number, input: SideQuestInput): Promise<void>;
export function archiveSideQuest(database: AshbornDB, id: number): Promise<void>;
export function completeSideQuest(database: AshbornDB, id: number, now: Date): Promise<boolean>;  // false if already done today/archived
// training.ts (added)
export interface SetInput { exerciseId: string; reps: number; weightKg: number }
export function logSet(database: AshbornDB, input: SetInput, now: Date): Promise<{ isPR: boolean }>;
export function deleteSet(database: AshbornDB, id: number): Promise<void>;
// food.ts
export interface FoodInput { kcal: number; proteinG: number; waterMl: number; note?: string }
export function addFood(database: AshbornDB, input: FoodInput, now: Date): Promise<number>;
export function deleteFood(database: AshbornDB, id: number): Promise<void>;
```

- [x] **Step 1: Write failing tests**

`src/db/repo/sideQuests.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { archiveSideQuest, completeSideQuest, createSideQuest, updateSideQuest } from './sideQuests';

describe('side quests', () => {
  it('creates a quest with a trimmed name and XP clamped to 10–50', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: '  Read 10 pages ', xp: 80, stat: 'discipline' });
    expect(await db.sideQuests.get(id)).toMatchObject({ title: 'Read 10 pages', xp: 50, stat: 'discipline', archived: false, completions: 0 });
    await updateSideQuest(db, id, { title: 'Read 20 pages', xp: 5, stat: 'discipline' });
    expect(await db.sideQuests.get(id)).toMatchObject({ title: 'Read 20 pages', xp: 10 });
    await expect(createSideQuest(db, { title: '   ', xp: 20, stat: 'discipline' })).rejects.toThrow('Give the quest a name.');
  });

  it('side quest completes once per day', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: 'Drink water', xp: 20, stat: 'vitality' });
    expect(await completeSideQuest(db, id, at('2026-09-21'))).toBe(true);
    expect(await completeSideQuest(db, id, at('2026-09-21', '21:00'))).toBe(false);
    expect(await db.player.get(1)).toMatchObject({ xp: 20, questsCompleted: 1 });
    expect(await completeSideQuest(db, id, at('2026-09-22'))).toBe(true);
    expect((await db.player.get(1))?.xp).toBe(40);
  });

  it('every 5 completions raise the linked stat by 1', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: 'Study 1 hour', xp: 10, stat: 'discipline' });
    for (const day of ['21', '22', '23', '24', '25']) await completeSideQuest(db, id, at(`2026-09-${day}`));
    expect((await db.player.get(1))?.stats.discipline).toBe(11);
    expect((await db.sideQuests.get(id))?.completions).toBe(5);
  });

  it('archived quests cannot be completed', async () => {
    const db = await setupPlayer();
    const id = await createSideQuest(db, { title: 'Stretch', xp: 10, stat: 'agility' });
    await archiveSideQuest(db, id);
    expect(await completeSideQuest(db, id, at('2026-09-21'))).toBe(false);
  });
});
```

`src/db/repo/training.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { deleteSet, logSet } from './training';

describe('logSet', () => {
  it('detects PRs and unlocks Limit Breaker', async () => {
    const db = await setupPlayer();
    expect(await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-09-21'))).toEqual({ isPR: false });
    expect(await logSet(db, { exerciseId: 'pushup', reps: 12, weightKg: 0 }, at('2026-09-23'))).toEqual({ isPR: true });
    expect(await db.achievements.get('first-pr')).toBeTruthy();
  });

  it('unlocks Apex on the first S-rank exercise', async () => {
    const db = await setupPlayer();
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-09-21'));
    await logSet(db, { exerciseId: 'pushup', reps: 20, weightKg: 0 }, at('2026-10-21'));
    expect(await db.achievements.get('first-s-rank')).toBeTruthy();
  });

  it('stores 0 kg for bodyweight exercises', async () => {
    const db = await setupPlayer();
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 20 }, at('2026-09-21'));
    expect((await db.workoutSets.toArray())[0]).toMatchObject({ exerciseId: 'pushup', reps: 10, weightKg: 0, date: '2026-09-21' });
  });

  it('rejects bad input without saving anything', async () => {
    const db = await setupPlayer();
    const now = at('2026-09-21');
    await expect(logSet(db, { exerciseId: 'nope', reps: 5, weightKg: 0 }, now)).rejects.toThrow('Unknown exercise.');
    await expect(logSet(db, { exerciseId: 'pushup', reps: 0, weightKg: 0 }, now)).rejects.toThrow();
    await expect(logSet(db, { exerciseId: 'pushup', reps: 5.5, weightKg: 0 }, now)).rejects.toThrow();
    await expect(logSet(db, { exerciseId: 'goblet-squat', reps: 8, weightKg: Number.NaN }, now)).rejects.toThrow();
    await expect(logSet(db, { exerciseId: 'goblet-squat', reps: 8, weightKg: 0 }, now)).rejects.toThrow('Enter the weight you lifted.');
    expect(await db.workoutSets.count()).toBe(0);
  });

  it('deletes a set', async () => {
    const db = await setupPlayer();
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-09-21'));
    const [set] = await db.workoutSets.toArray();
    await deleteSet(db, set!.id);
    expect(await db.workoutSets.count()).toBe(0);
  });
});
```

`src/db/repo/food.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { addFood, deleteFood } from './food';

describe('food log', () => {
  it('adds and deletes entries for today', async () => {
    const db = await setupPlayer();
    const id = await addFood(db, { kcal: 500, proteinG: 30, waterMl: 0, note: ' Lunch ' }, at('2026-09-21', '12:00'));
    expect(await db.foodLog.get(id)).toMatchObject({ date: '2026-09-21', kcal: 500, proteinG: 30, waterMl: 0, note: 'Lunch' });
    await deleteFood(db, id);
    expect(await db.foodLog.count()).toBe(0);
  });

  it('rejects negative, non-numeric and empty entries', async () => {
    const db = await setupPlayer();
    const now = at('2026-09-21');
    await expect(addFood(db, { kcal: -1, proteinG: 0, waterMl: 0 }, now)).rejects.toThrow();
    await expect(addFood(db, { kcal: Number.NaN, proteinG: 0, waterMl: 0 }, now)).rejects.toThrow();
    await expect(addFood(db, { kcal: 0, proteinG: 0, waterMl: 0 }, now)).rejects.toThrow('Enter calories, protein or water.');
    expect(await db.foodLog.count()).toBe(0);
  });
});
```

- [x] **Step 2: Run to check they fail**

Run: `npx vitest run src/db/repo`
Expected: FAIL for the three new files (missing exports/modules). Task 13 tests still pass.

- [x] **Step 3: Implement `src/db/repo/sideQuests.ts`**

```ts
import { progression } from '../../config/progression';
import { todayKey } from '../../domain/day';
import { addSideQuestProgress } from '../../domain/stats';
import { STAT_KEYS, type StatKey } from '../../domain/types';
import { writeTx, type AshbornDB } from '../schema';
import { awardXp } from './player';

export interface SideQuestInput {
  title: string;
  xp: number;
  stat: StatKey;
}

function clean(input: SideQuestInput): SideQuestInput {
  const title = input.title.trim().slice(0, 60);
  if (!title) throw new Error('Give the quest a name.');
  if (!STAT_KEYS.includes(input.stat)) throw new Error('Choose a stat for this quest.');
  const { minXp, maxXp } = progression.sideQuest;
  const xp = Number.isFinite(input.xp) ? Math.min(maxXp, Math.max(minXp, Math.round(input.xp))) : minXp;
  return { title, xp, stat: input.stat };
}

export async function createSideQuest(database: AshbornDB, input: SideQuestInput): Promise<number> {
  return database.sideQuests.add({ ...clean(input), archived: false, completions: 0 });
}

export async function updateSideQuest(database: AshbornDB, id: number, input: SideQuestInput): Promise<void> {
  await database.sideQuests.update(id, clean(input));
}

export async function archiveSideQuest(database: AshbornDB, id: number): Promise<void> {
  await database.sideQuests.update(id, { archived: true });
}

export async function completeSideQuest(database: AshbornDB, id: number, now: Date): Promise<boolean> {
  const date = todayKey(now);
  return writeTx(database, async () => {
    const quest = await database.sideQuests.get(id);
    const player = await database.player.get(1);
    if (!quest || quest.archived || !player) return false;
    const doneToday = await database.questLog
      .where('date').equals(date)
      .filter((entry) => entry.kind === 'side' && entry.refId === String(id))
      .count();
    if (doneToday > 0) return false;
    await database.sideQuests.update(id, { completions: quest.completions + 1 });
    await database.player.put(addSideQuestProgress(player, quest.stat));
    await awardXp(database, { amount: quest.xp, kind: 'side', refId: String(id), date, countsAsQuest: true }, now);
    return true;
  });
}
```

- [x] **Step 4: Add `logSet` and `deleteSet` to `src/db/repo/training.ts`**

Add these imports next to the existing ones:
```ts
import { getExercise } from '../../config/exercises';
import { todayKey } from '../../domain/day';
import { isPersonalRecord } from '../../domain/workout/records';
import { writeTx } from '../schema';
import { unlockAchievements } from './player';
```
(`AshbornDB` is already imported as a type. Merge the `../schema` imports into one line: `import { writeTx, type AshbornDB } from '../schema';`.)

Append:
```ts
export interface SetInput {
  exerciseId: string;
  reps: number;
  weightKg: number;
}

export async function logSet(database: AshbornDB, input: SetInput, now: Date): Promise<{ isPR: boolean }> {
  const exercise = getExercise(input.exerciseId);
  if (!exercise) throw new Error('Unknown exercise.');
  if (!Number.isInteger(input.reps) || input.reps < 1 || input.reps > 1000) throw new Error('Reps must be a whole number from 1 to 1000.');
  if (!Number.isFinite(input.weightKg) || input.weightKg < 0 || input.weightKg > 1000) throw new Error('Weight must be between 0 and 1000 kg.');
  if (exercise.weighted && input.weightKg <= 0) throw new Error('Enter the weight you lifted.');

  return writeTx(database, async () => {
    const previous = await database.workoutSets.where('exerciseId').equals(exercise.id).toArray();
    const set = {
      exerciseId: exercise.id,
      date: todayKey(now),
      reps: input.reps,
      weightKg: exercise.weighted ? input.weightKg : 0,
      at: now.toISOString(),
    };
    await database.workoutSets.add(set);
    await unlockAchievements(database, now);
    return { isPR: isPersonalRecord(previous, set, exercise.weighted) };
  });
}

export async function deleteSet(database: AshbornDB, id: number): Promise<void> {
  await database.workoutSets.delete(id);
}
```

- [x] **Step 5: Implement `src/db/repo/food.ts`**

```ts
import { todayKey } from '../../domain/day';
import type { AshbornDB } from '../schema';

export interface FoodInput {
  kcal: number;
  proteinG: number;
  waterMl: number;
  note?: string;
}

const LIMITS = { kcal: 20_000, proteinG: 1_000, waterMl: 10_000 } as const;

export async function addFood(database: AshbornDB, input: FoodInput, now: Date): Promise<number> {
  for (const key of ['kcal', 'proteinG', 'waterMl'] as const) {
    const value = input[key];
    if (!Number.isFinite(value) || value < 0 || value > LIMITS[key]) throw new Error(`Amounts must be between 0 and ${LIMITS[key]}.`);
  }
  if (input.kcal === 0 && input.proteinG === 0 && input.waterMl === 0) throw new Error('Enter calories, protein or water.');
  return database.foodLog.add({
    date: todayKey(now),
    kcal: Math.round(input.kcal),
    proteinG: Math.round(input.proteinG),
    waterMl: Math.round(input.waterMl),
    note: (input.note ?? '').trim().slice(0, 80),
    at: now.toISOString(),
  });
}

export async function deleteFood(database: AshbornDB, id: number): Promise<void> {
  await database.foodLog.delete(id);
}
```

- [x] **Step 6: Run to check they pass**

Run: `npx vitest run src/db`
Expected: PASS.

- [x] **Step 7: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(db): add side quests, set logging with PRs, and food log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 15: iPhone platform helpers (audio, standalone, storage, file save)

**Files:**
- Create: `src/platform/audio.ts`, `src/platform/standalone.ts`, `src/platform/storage.ts`, `src/platform/download.ts`
- Test: `src/platform/audio.test.ts`, `src/platform/standalone.test.ts`, `src/platform/storage.test.ts`, `src/platform/download.test.ts`

**Interfaces:**
- Produces:
```ts
// audio.ts
export type SoundName = 'chime' | 'complete' | 'levelUp' | 'tap';
export function setSoundEnabled(on: boolean): void;
export function unlockAudio(): void;                                 // call inside a user gesture
export function installAudioUnlock(target?: Document): () => void;   // unlocks on first tap; returns cleanup
export function playSound(name: SoundName): void;                    // silent on any failure
export function resetAudioForTests(): void;
// standalone.ts
export function detectStandalone(nav: { standalone?: boolean } | undefined, matchMedia: ((query: string) => { matches: boolean }) | undefined): boolean;
export function isStandalone(): boolean;
// storage.ts
export function requestPersist(storage?: { persist?: () => Promise<boolean> }): Promise<PersistResult>;
// download.ts
export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled';
export function saveBackupFile(json: string, fileName: string): Promise<SaveOutcome>;
```

iPhone facts behind these helpers. Check each on MDN before relying on it and don't guess:
- iPhone Safari has no Vibration API.
- Web Audio only starts after `AudioContext.resume()` is called inside a user gesture. The silent switch mutes Web Audio.
- `navigator.standalone` is `true` for home-screen apps.
- `navigator.storage.persist()` is supported in Safari 17+.
- `navigator.share({ files })` (iOS 15+) opens the share sheet, which has "Save to Files".

- [x] **Step 1: Write failing tests**

`src/platform/standalone.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { detectStandalone } from './standalone';

describe('detectStandalone', () => {
  it('is true for iPhone home screen apps', () => {
    expect(detectStandalone({ standalone: true }, undefined)).toBe(true);
  });
  it('is true when the display-mode media query matches', () => {
    expect(detectStandalone({}, () => ({ matches: true }))).toBe(true);
  });
  it('is false in a normal Safari tab', () => {
    expect(detectStandalone({ standalone: false }, () => ({ matches: false }))).toBe(false);
  });
  it('is false when matchMedia is missing or throws', () => {
    expect(detectStandalone(undefined, undefined)).toBe(false);
    expect(detectStandalone({}, () => { throw new Error('unsupported'); })).toBe(false);
  });
});
```

`src/platform/storage.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { requestPersist } from './storage';

describe('requestPersist', () => {
  it('reports unsupported when the API is missing', async () => {
    expect(await requestPersist({})).toBe('unsupported');
  });
  it('reports granted or denied', async () => {
    expect(await requestPersist({ persist: async () => true })).toBe('granted');
    expect(await requestPersist({ persist: async () => false })).toBe('denied');
  });
  it('treats an error as denied', async () => {
    expect(await requestPersist({ persist: async () => { throw new Error('nope'); } })).toBe('denied');
  });
});
```

`src/platform/audio.test.ts`:
```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAudioUnlock, playSound, resetAudioForTests, setSoundEnabled, unlockAudio } from './audio';

class FakeContext {
  static instances: FakeContext[] = [];
  state = 'suspended';
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  createBuffer = vi.fn(() => ({}));
  createBufferSource = vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() }));
  createOscillator = vi.fn(() => ({ type: '', frequency: { value: 0 }, connect: vi.fn((node: unknown) => node), start: vi.fn(), stop: vi.fn() }));
  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn((node: unknown) => node),
  }));
  constructor() {
    FakeContext.instances.push(this);
  }
}

afterEach(() => {
  resetAudioForTests();
  setSoundEnabled(true);
  FakeContext.instances = [];
  vi.unstubAllGlobals();
});

describe('audio', () => {
  it('stays silent when Web Audio does not exist', () => {
    expect(() => {
      unlockAudio();
      playSound('chime');
    }).not.toThrow();
  });

  it('resumes the context on unlock and then plays tones', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    expect(ctx.resume).toHaveBeenCalled();
    playSound('complete');
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('plays nothing before unlock or when sound is off', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    playSound('chime');
    expect(FakeContext.instances).toHaveLength(0);
    unlockAudio();
    setSoundEnabled(false);
    playSound('chime');
    expect(FakeContext.instances[0]!.createOscillator).not.toHaveBeenCalled();
  });

  it('unlocks on the first tap only', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const cleanup = installAudioUnlock(document);
    document.dispatchEvent(new Event('click'));
    document.dispatchEvent(new Event('click'));
    expect(FakeContext.instances).toHaveLength(1);
    expect(FakeContext.instances[0]!.resume).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
```

`src/platform/download.test.ts`:
```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBackupFile } from './download';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
});

function stubObjectUrls() {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:backup'), configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
}

describe('saveBackupFile', () => {
  it('uses the share sheet when files can be shared', async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    expect(await saveBackupFile('{}', 'ashborn-backup-2026-09-25.json')).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
  });

  it('reports a cancelled share', async () => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: async () => { throw new DOMException('cancel', 'AbortError'); }, configurable: true });
    expect(await saveBackupFile('{}', 'b.json')).toBe('cancelled');
  });

  it('falls back to a download link otherwise', async () => {
    stubObjectUrls();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await saveBackupFile('{}', 'b.json')).toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2: Run to check they fail**

Run: `npx vitest run src/platform`
Expected: FAIL, modules not found.

- [x] **Step 3: Implement `src/platform/standalone.ts`**

```ts
type MatchMedia = (query: string) => { matches: boolean };

export function detectStandalone(nav: { standalone?: boolean } | undefined, matchMedia: MatchMedia | undefined): boolean {
  if (nav?.standalone === true) return true; // iPhone Safari home-screen app
  try {
    return matchMedia?.('(display-mode: standalone)').matches ?? false;
  } catch {
    return false;
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const matchMedia = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined;
  return detectStandalone(navigator as Navigator & { standalone?: boolean }, matchMedia);
}
```

- [x] **Step 4: Implement `src/platform/storage.ts`**

```ts
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
```

- [x] **Step 5: Implement `src/platform/audio.ts`**

```ts
export type SoundName = 'chime' | 'complete' | 'levelUp' | 'tap';

let context: AudioContext | null = null;
let enabled = true;

/** [frequency Hz, start offset s, duration s] */
const NOTES: Record<SoundName, Array<[number, number, number]>> = {
  tap: [[880, 0, 0.05]],
  chime: [[1318.5, 0, 0.35], [1975.5, 0.06, 0.4]],
  complete: [[659.3, 0, 0.12], [987.8, 0.1, 0.25]],
  levelUp: [[523.3, 0, 0.18], [659.3, 0.15, 0.18], [784, 0.3, 0.18], [1046.5, 0.45, 0.6]],
};

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function resetAudioForTests(): void {
  context = null;
}

function createContext(): AudioContext | null {
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** Must run inside a tap handler: iPhone Safari only starts audio from a user gesture. */
export function unlockAudio(): void {
  try {
    context ??= createContext();
    if (!context) return;
    if (context.state === 'suspended') void context.resume().catch(() => {});
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 22050);
    source.connect(context.destination);
    source.start(0);
  } catch {
    // Audio unavailable: stay silent.
  }
}

export function installAudioUnlock(target: Document = document): () => void {
  const handler = () => {
    unlockAudio();
    cleanup();
  };
  const cleanup = () => {
    target.removeEventListener('touchend', handler, true);
    target.removeEventListener('click', handler, true);
  };
  target.addEventListener('touchend', handler, true);
  target.addEventListener('click', handler, true);
  return cleanup;
}

export function playSound(name: SoundName): void {
  if (!enabled || !context || context.state !== 'running') return;
  try {
    const t0 = context.currentTime;
    for (const [frequency, start, duration] of NOTES[name]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + duration);
      osc.connect(gain).connect(context.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + duration + 0.05);
    }
  } catch {
    // Never let sound break the app.
  }
}
```

- [x] **Step 6: Implement `src/platform/download.ts`**

```ts
export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Saves the backup file. On iPhone the share sheet ("Save to Files") is the reliable path;
 * elsewhere, or if sharing is refused, fall back to a normal download link.
 */
export async function saveBackupFile(json: string, fileName: string): Promise<SaveOutcome> {
  const file = new File([json], fileName, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'cancelled';
      // NotAllowedError etc.: fall through to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
```

- [x] **Step 7: Run to check they pass**

Run: `npx vitest run src/platform`
Expected: PASS.

- [x] **Step 8: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(platform): add iPhone-safe audio unlock, standalone detection, persist and file save

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 16: UI building blocks

**Files:**
- Create: `src/ui/hooks/useReducedMotion.ts`, `src/ui/hooks/data.ts`, `src/ui/components/SystemWindow.tsx`, `Button.tsx`, `ProgressBar.tsx`, `NumberField.tsx`, `TextField.tsx`, `ChoiceGroup.tsx`, `Typewriter.tsx`, `TabBar.tsx`, `Screen.tsx`, `RankBadge.tsx` (all in `src/ui/components/`), `src/test/uiFixtures.ts`
- Test: `src/ui/components/Typewriter.test.tsx`, `src/ui/components/NumberField.test.tsx`, `src/ui/components/TabBar.test.tsx`

**Interfaces:**
- Produces:
```ts
useReducedMotion(): boolean
useProfile(): Profile | undefined;  usePlayer(): Player | undefined;  useMeta<K extends keyof MetaMap>(key: K): MetaMap[K] | undefined
<SystemWindow title?: string className?: string>{children}</SystemWindow>
<Button variant?: 'primary'|'ghost'|'danger' ...buttonProps />
<ProgressBar value max label />
<NumberField label unit? value: number|null onChange(n: number|null) rule: NumberRule decimal? />   // value is the initial value only; remount with `key` to reset
<TextField label value onChange maxLength? />
<ChoiceGroup<T> legend options: Choice<T>[] value: T|null onChange columns?: 1|2 />   // Choice<T> = { value: T; label: string; hint?: string }
<Typewriter text speedMs? onDone? sound? className? />
type Tab = 'status'|'quests'|'training'|'nutrition'|'settings';  <TabBar tab onChange />
<Screen title>{children}</Screen>
<RankBadge rank size?: 'sm'|'md' />      // role="img" aria-label="Rank X"
// test/uiFixtures.ts
seedApp(date?: string): Promise<void>     // resets the app db singleton and registers Kai
emptyApp(): Promise<void>                 // resets the app db singleton to empty (new player)
mockReducedMotion(matches: boolean): void
```

- [ ] **Step 1: Create `src/test/uiFixtures.ts`**

```ts
import { vi } from 'vitest';
import { startDay } from '../db/repo/days';
import { registerPlayer } from '../db/repo/onboarding';
import { db } from '../db/schema';
import { neverUrgent } from './dbFixtures';
import { at, sampleProfileInput } from './fixtures';

/** Empties the app's database singleton and registers the sample player on `date`. */
export async function seedApp(date = '2026-09-21'): Promise<void> {
  await db.delete();
  await db.open();
  await registerPlayer(db, sampleProfileInput, at(date));
  await startDay(db, at(date), neverUrgent);
}

export async function emptyApp(): Promise<void> {
  await db.delete();
  await db.open();
}

export function mockReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
```

- [ ] **Step 2: Write failing tests**

`src/ui/components/Typewriter.test.tsx`:
```tsx
// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockReducedMotion } from '../../test/uiFixtures';
import { Typewriter } from './Typewriter';

const visible = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]')?.textContent;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Typewriter', () => {
  it('shows the whole message at once with reduced motion', () => {
    mockReducedMotion(true);
    const { container } = render(<Typewriter text="Player registered." sound={false} />);
    expect(visible(container)).toBe('Player registered.');
  });

  it('types the message out over time, then calls onDone once', () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { container } = render(<Typewriter text="Hi!" speedMs={10} sound={false} onDone={onDone} />);
    expect(visible(container)).not.toContain('Hi!');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(visible(container)).toBe('Hi!');
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('always gives screen readers the full text', () => {
    mockReducedMotion(false);
    const { container } = render(<Typewriter text="Daily quest ready." sound={false} />);
    expect(container.querySelector('.sr-only')?.textContent).toBe('Daily quest ready.');
  });
});
```

`src/ui/components/NumberField.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberField } from './NumberField';

describe('NumberField', () => {
  it('reports parsed numbers, including comma decimals', () => {
    const onChange = vi.fn();
    render(<NumberField label="Weight" unit="kg" decimal value={null} onChange={onChange} rule={{ min: 30, max: 300 }} />);
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '72,5' } });
    expect(onChange).toHaveBeenLastCalledWith(72.5);
  });

  it('reports null and shows a hint for invalid input', () => {
    const onChange = vi.fn();
    render(<NumberField label="Age" value={null} onChange={onChange} rule={{ min: 13, max: 100, integer: true }} />);
    const input = screen.getByLabelText('Age');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Enter a number from 13 to 100.')).toBeTruthy();
  });

  it('uses a 16px font so iPhone Safari does not zoom', () => {
    render(<NumberField label="Age" value={30} onChange={() => {}} rule={{ min: 13, max: 100 }} />);
    expect(screen.getByLabelText('Age').className).toContain('text-base');
  });
});
```

`src/ui/components/TabBar.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('shows five labelled tabs and marks the current one', () => {
    render(<TabBar tab="status" onChange={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Status' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Quests' }).getAttribute('aria-current')).toBeNull();
  });

  it('switches tabs', () => {
    const onChange = vi.fn();
    render(<TabBar tab="status" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Training' }));
    expect(onChange).toHaveBeenCalledWith('training');
  });
});
```

- [ ] **Step 3: Run to check they fail**

Run: `npx vitest run src/ui`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement hooks**

`src/ui/hooks/useReducedMotion.ts`:
```ts
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getSnapshot(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
```

`src/ui/hooks/data.ts`:
```ts
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
```

- [ ] **Step 5: Implement components**

`src/ui/components/SystemWindow.tsx`:
```tsx
import { useId, type ReactNode } from 'react';

interface Props {
  title?: string;
  className?: string;
  children: ReactNode;
}

export function SystemWindow({ title, className = '', children }: Props) {
  const id = useId();
  return (
    <section className={`system-window p-4 ${className}`} aria-labelledby={title ? id : undefined}>
      {title && (
        <h2 id={id} className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-glow">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
```

`src/ui/components/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

const STYLES: Record<Variant, string> = {
  primary: 'border-glow bg-glow/15 text-ink active:bg-glow/30',
  ghost: 'border-glow-soft text-muted active:text-ink',
  danger: 'border-danger text-danger active:bg-danger/10',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`min-h-11 min-w-11 rounded border px-4 py-2 text-base font-medium transition-colors duration-150 disabled:opacity-40 ${STYLES[variant]} ${className}`}
      {...rest}
    />
  );
}
```

`src/ui/components/ProgressBar.tsx`:
```tsx
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-glow-soft/30"
    >
      <div className="h-full bg-glow shadow-[0_0_8px_var(--color-glow)] transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}
```

`src/ui/components/NumberField.tsx`:
```tsx
import { useId, useState } from 'react';
import { parseNumberInput, type NumberRule } from '../../domain/input';

interface Props {
  label: string;
  unit?: string;
  /** Initial value only. Give the field a new `key` to reset it. */
  value: number | null;
  onChange: (value: number | null) => void;
  rule: NumberRule;
  decimal?: boolean;
}

export function NumberField({ label, unit, value, onChange, rule, decimal = false }: Props) {
  const id = useId();
  const [text, setText] = useState(value === null ? '' : String(value));
  const invalid = text.trim() !== '' && parseNumberInput(text, rule) === null;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        {label}
        {unit ? ` (${unit})` : ''}
      </label>
      <input
        id={id}
        inputMode={decimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        value={text}
        aria-invalid={invalid}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNumberInput(e.target.value, rule));
        }}
        className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink focus:border-glow focus:outline-none"
      />
      {invalid && (
        <p className="mt-1 text-sm text-danger">
          Enter a number from {rule.min} to {rule.max}.
        </p>
      )}
    </div>
  );
}
```

`src/ui/components/TextField.tsx`:
```tsx
import { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function TextField({ label, value, onChange, maxLength = 60 }: Props) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink focus:border-glow focus:outline-none"
      />
    </div>
  );
}
```

`src/ui/components/ChoiceGroup.tsx`:
```tsx
export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  legend: string;
  options: ReadonlyArray<Choice<T>>;
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2;
}

export function ChoiceGroup<T extends string>({ legend, options, value, onChange, columns = 2 }: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm text-muted">{legend}</legend>
      <div className={`grid gap-2 ${columns === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-11 rounded border px-3 py-2 text-left text-base transition-colors duration-150 ${
                selected ? 'border-glow bg-glow/15 text-ink' : 'border-glow-soft text-muted'
              }`}
            >
              <span className="block">{option.label}</span>
              {option.hint && <span className="block text-sm text-muted">{option.hint}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
```

`src/ui/components/Typewriter.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import { playSound } from '../../platform/audio';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  text: string;
  speedMs?: number;
  onDone?: () => void;
  sound?: boolean;
  className?: string;
}

/** System message typed out with a soft chime. Remount with a new `key` for a new message. */
export function Typewriter({ text, speedMs = 28, onDone, sound = true, className = '' }: Props) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  const shown = reduced ? text.length : Math.min(tick, text.length);
  const done = shown >= text.length;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (sound) playSound('chime');
  }, [sound]);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setTick((t) => t + 1), speedMs);
    return () => clearInterval(timer);
  }, [done, speedMs]);

  useEffect(() => {
    if (done) onDoneRef.current?.();
  }, [done]);

  return (
    <p className={`text-base leading-relaxed text-ink ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        {!done && <span className="text-glow">▍</span>}
      </span>
    </p>
  );
}
```

`src/ui/components/TabBar.tsx`:
```tsx
export type Tab = 'status' | 'quests' | 'training' | 'nutrition' | 'settings';

const TABS: ReadonlyArray<{ id: Tab; label: string; icon: string }> = [
  { id: 'status', label: 'Status', icon: 'M12 2l8.66 5v10L12 22l-8.66-5V7z' },
  { id: 'quests', label: 'Quests', icon: 'M5 21V4h12l-2 4 2 4H5' },
  { id: 'training', label: 'Training', icon: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12' },
  { id: 'nutrition', label: 'Nutrition', icon: 'M12 3c3.5 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.5 6-11z' },
  { id: 'settings', label: 'Settings', icon: 'M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M7 16v4' },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-glow-soft bg-void/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <li key={t.id} className="flex-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onChange(t.id)}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs ${active ? 'text-glow' : 'text-muted'}`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

`src/ui/components/Screen.tsx`:
```tsx
import type { ReactNode } from 'react';

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="safe-top safe-x mx-auto max-w-md pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <h1 className="pb-3 pt-4 text-lg font-semibold tracking-wide text-ink">{title}</h1>
      <div className="space-y-4">{children}</div>
    </main>
  );
}
```

`src/ui/components/RankBadge.tsx`:
```tsx
import type { Rank } from '../../domain/types';

export function RankBadge({ rank, size = 'md' }: { rank: Rank; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9 text-base' : 'h-14 w-14 text-2xl';
  return (
    <div
      role="img"
      aria-label={`Rank ${rank}`}
      className={`flex shrink-0 items-center justify-center rounded border border-glow font-bold text-glow shadow-[0_0_10px_rgb(58_184_255/0.5)] ${box}`}
    >
      {rank}
    </div>
  );
}
```

- [ ] **Step 6: Run to check they pass**

Run: `npx vitest run src/ui`
Expected: PASS.

- [ ] **Step 7: Gate and commit**

Run: `npm run typecheck; npm run lint`. If `eslint-plugin-react-hooks` flags a pattern, fix the code the way the rule message suggests. Do not disable the rule.

```powershell
git add -A
git commit -m @'
feat(ui): add system window, typewriter, tab bar and form building blocks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 17: Awakening (onboarding), medical notice and install guide

**Files:**
- Create: `src/ui/screens/ProfileForm.tsx`, `src/ui/overlays/MedicalNotice.tsx`, `src/ui/overlays/InstallGuide.tsx`, `src/ui/screens/Awakening.tsx`
- Test: `src/ui/screens/ProfileForm.test.tsx`, `src/ui/overlays/InstallGuide.test.tsx`, `src/ui/screens/Awakening.test.tsx`

**Interfaces:**
- Produces:
```ts
<ProfileForm initial?: ProfileInput submitLabel: string onSubmit(value: ProfileInput) />
export const PROFILE_RULES: { age; heightCm; weightKg; daysPerWeek; minutesPerSession }   // NumberRule each
<MedicalNotice onAccept?: () => void acceptLabel?: string />
<InstallGuide onClose: () => void />     // role="dialog" aria-label="Install Ashborn", button "Continue in Safari"
<Awakening />                            // form → notice → "Player Registered" → Begin (registers, requests persist)
```

- [ ] **Step 1: Write failing tests**

`src/ui/screens/ProfileForm.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sampleProfileInput } from '../../test/fixtures';
import { ProfileForm } from './ProfileForm';

function fill() {
  fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Kai' } });
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Male' }));
  fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '180' } });
  fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '80' } });
  fireEvent.click(screen.getByRole('button', { name: /^Get fit/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Beginner/ }));
  fireEvent.change(screen.getByLabelText('Days per week'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Minutes per session'), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: /^No equipment/ }));
}

describe('ProfileForm', () => {
  it('lists what is missing and does not submit', () => {
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Continue" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Enter your name.');
    expect(alert.textContent).toContain('Choose your equipment.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the answers as a typed profile', () => {
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Continue" onSubmit={onSubmit} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith(sampleProfileInput);
  });

  it('pre-fills when editing', () => {
    render(<ProfileForm initial={sampleProfileInput} submitLabel="Save answers" onSubmit={() => {}} />);
    expect((screen.getByLabelText('Player name') as HTMLInputElement).value).toBe('Kai');
    expect(screen.getByRole('button', { name: 'Male' }).getAttribute('aria-pressed')).toBe('true');
  });
});
```

`src/ui/overlays/InstallGuide.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InstallGuide } from './InstallGuide';

describe('InstallGuide', () => {
  it('explains Share → Add to Home Screen and can be dismissed', () => {
    const onClose = vi.fn();
    render(<InstallGuide onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Install Ashborn' });
    expect(dialog.textContent).toContain('Share');
    expect(dialog.textContent).toContain('Add to Home Screen');
    fireEvent.click(screen.getByRole('button', { name: 'Continue in Safari' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

`src/ui/screens/Awakening.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { emptyApp } from '../../test/uiFixtures';
import { Awakening } from './Awakening';

beforeEach(emptyApp);

describe('Awakening', () => {
  it('walks through questions, health notice and registration', async () => {
    render(<Awakening />);
    fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Kai' } });
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Male' }));
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /^Get fit/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Never trained/ }));
    fireEvent.change(screen.getByLabelText('Days per week'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Minutes per session'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /^No equipment/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText(/not medical advice/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I understand' }));

    expect(screen.getByRole('heading', { name: 'Player Registered' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));

    await waitFor(async () => expect((await db.profile.get(1))?.experience).toBe('never'));
    expect(await getMeta(db, 'medicalAck')).toBe(true);
    expect(await getMeta(db, 'persistResult')).toBe('unsupported');
  });
});
```

- [ ] **Step 2: Run to check they fail**

Run: `npx vitest run src/ui/screens src/ui/overlays`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/ui/screens/ProfileForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import type { NumberRule } from '../../domain/input';
import type { Equipment, Experience, Goal, ProfileInput, Sex } from '../../domain/types';
import { Button } from '../components/Button';
import { ChoiceGroup, type Choice } from '../components/ChoiceGroup';
import { NumberField } from '../components/NumberField';
import { SystemWindow } from '../components/SystemWindow';
import { TextField } from '../components/TextField';

export const PROFILE_RULES = {
  age: { min: 13, max: 100, integer: true },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
  daysPerWeek: { min: 1, max: 7, integer: true },
  minutesPerSession: { min: 10, max: 180, integer: true },
} satisfies Record<string, NumberRule>;

const SEX: Choice<Sex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];
const GOALS: Choice<Goal>[] = [
  { value: 'lose_fat', label: 'Lose fat' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'get_fit', label: 'Get fit', hint: 'Feel better, move more' },
];
const EXPERIENCE: Choice<Experience>[] = [
  { value: 'never', label: 'Never trained', hint: 'Very gentle start' },
  { value: 'beginner', label: 'Beginner', hint: 'Some activity, little structure' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Train most weeks' },
  { value: 'advanced', label: 'Advanced', hint: 'Years of steady training' },
];
const EQUIPMENT: Choice<Equipment>[] = [
  { value: 'none', label: 'No equipment', hint: 'Home workouts' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'gym', label: 'Full gym' },
];

interface Props {
  initial?: ProfileInput;
  submitLabel: string;
  onSubmit: (value: ProfileInput) => void;
}

export function ProfileForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState<number | null>(initial?.age ?? null);
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [heightCm, setHeightCm] = useState<number | null>(initial?.heightCm ?? null);
  const [weightKg, setWeightKg] = useState<number | null>(initial?.weightKg ?? null);
  const [goal, setGoal] = useState<Goal | null>(initial?.goal ?? null);
  const [experience, setExperience] = useState<Experience | null>(initial?.experience ?? null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(initial?.daysPerWeek ?? null);
  const [minutesPerSession, setMinutesPerSession] = useState<number | null>(initial?.minutesPerSession ?? null);
  const [equipment, setEquipment] = useState<Equipment | null>(initial?.equipment ?? null);
  const [errors, setErrors] = useState<string[]>([]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const problems: string[] = [];
    if (!name.trim()) problems.push('Enter your name.');
    if (age === null) problems.push('Enter your age (13–100).');
    if (sex === null) problems.push('Choose your sex.');
    if (heightCm === null) problems.push('Enter your height (100–250 cm).');
    if (weightKg === null) problems.push('Enter your weight (30–300 kg).');
    if (goal === null) problems.push('Choose a goal.');
    if (experience === null) problems.push('Choose your experience.');
    if (daysPerWeek === null) problems.push('Enter training days per week (1–7).');
    if (minutesPerSession === null) problems.push('Enter minutes per session (10–180).');
    if (equipment === null) problems.push('Choose your equipment.');
    if (
      problems.length > 0 || age === null || sex === null || heightCm === null || weightKg === null || goal === null ||
      experience === null || daysPerWeek === null || minutesPerSession === null || equipment === null
    ) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    onSubmit({ name: name.trim().slice(0, 30), age, sex, heightCm, weightKg, goal, experience, daysPerWeek, minutesPerSession, equipment });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <SystemWindow title="Player">
        <div className="space-y-3">
          <TextField label="Player name" value={name} onChange={setName} maxLength={30} />
          <NumberField label="Age" value={age} onChange={setAge} rule={PROFILE_RULES.age} />
          <ChoiceGroup legend="Sex (used for the calorie formula)" options={SEX} value={sex} onChange={setSex} />
          <NumberField label="Height" unit="cm" decimal value={heightCm} onChange={setHeightCm} rule={PROFILE_RULES.heightCm} />
          <NumberField label="Weight" unit="kg" decimal value={weightKg} onChange={setWeightKg} rule={PROFILE_RULES.weightKg} />
        </div>
      </SystemWindow>
      <SystemWindow title="Goal">
        <div className="space-y-3">
          <ChoiceGroup legend="Main goal" options={GOALS} value={goal} onChange={setGoal} columns={1} />
          <ChoiceGroup legend="Training experience" options={EXPERIENCE} value={experience} onChange={setExperience} columns={1} />
        </div>
      </SystemWindow>
      <SystemWindow title="Training">
        <div className="space-y-3">
          <NumberField label="Days per week" value={daysPerWeek} onChange={setDaysPerWeek} rule={PROFILE_RULES.daysPerWeek} />
          <NumberField label="Minutes per session" value={minutesPerSession} onChange={setMinutesPerSession} rule={PROFILE_RULES.minutesPerSession} />
          <ChoiceGroup legend="Equipment" options={EQUIPMENT} value={equipment} onChange={setEquipment} columns={1} />
        </div>
      </SystemWindow>
      {errors.length > 0 && (
        <div role="alert" className="rounded border border-danger p-3 text-danger">
          <p className="mb-1 font-medium">Please fix:</p>
          <ul className="list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Implement `src/ui/overlays/MedicalNotice.tsx`**

```tsx
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function MedicalNotice({ onAccept, acceptLabel = 'I understand' }: { onAccept?: () => void; acceptLabel?: string }) {
  return (
    <SystemWindow title="Health notice">
      <div className="space-y-3 text-base text-ink">
        <p>Ashborn is a game for building habits. It is not medical advice.</p>
        <p>
          Check with a doctor before starting a new exercise or nutrition program, especially if you have a health condition,
          an injury, or are pregnant.
        </p>
        <p>Stop any exercise that causes pain, dizziness or shortness of breath. Rest days are always allowed and never penalised.</p>
      </div>
      {onAccept && (
        <Button className="mt-4 w-full" onClick={onAccept}>
          {acceptLabel}
        </Button>
      )}
    </SystemWindow>
  );
}
```

- [ ] **Step 5: Implement `src/ui/overlays/InstallGuide.tsx`**

```tsx
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function InstallGuide({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install Ashborn"
      className="safe-x fixed inset-0 z-50 flex items-end bg-void/80"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <SystemWindow title="Install Ashborn" className="mx-auto w-full max-w-md">
        <ol className="list-decimal space-y-2 pl-5 text-base">
          <li>
            Tap the <strong>Share</strong> button in Safari (the square with an arrow pointing up).
          </li>
          <li>
            Scroll down, tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
          </li>
          <li>Open Ashborn from the new icon on your home screen. It runs full screen and works offline.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">
          Install first, then create your player. On iPhone, Safari and the installed app keep separate data.
        </p>
        <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
          Continue in Safari
        </Button>
      </SystemWindow>
    </div>
  );
}
```

Before committing, confirm the "separate data" statement against WebKit or Apple documentation (search "home screen web app storage separate from Safari"). If the documentation does not support it, change the sentence to: "Install first, then create your player, so your progress lives in the app."

- [ ] **Step 6: Implement `src/ui/screens/Awakening.tsx`**

```tsx
import { useState } from 'react';
import { setMeta } from '../../db/meta';
import { registerPlayer } from '../../db/repo/onboarding';
import { db } from '../../db/schema';
import { STAT_LABELS } from '../../domain/stats';
import { STAT_KEYS, type ProfileInput } from '../../domain/types';
import { progression } from '../../config/progression';
import { playSound } from '../../platform/audio';
import { requestPersist } from '../../platform/storage';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { Typewriter } from '../components/Typewriter';
import { MedicalNotice } from '../overlays/MedicalNotice';
import { ProfileForm } from './ProfileForm';

type Step = 'form' | 'notice' | 'registered';

export function Awakening() {
  const [step, setStep] = useState<Step>('form');
  const [input, setInput] = useState<ProfileInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    if (!input || busy) return;
    setBusy(true);
    const persist = requestPersist(); // started inside the tap, as Safari prefers
    try {
      await registerPlayer(db, input, new Date());
      await setMeta(db, 'medicalAck', true);
      await setMeta(db, 'persistResult', await persist);
      playSound('levelUp');
    } catch {
      setError('Could not save your player. Please try again.');
      setBusy(false);
    }
  }

  if (step === 'form') {
    return (
      <Screen title="Awakening">
        <SystemWindow title="System">
          <Typewriter text="A new player has been detected. Answer the System to begin." />
        </SystemWindow>
        <ProfileForm
          submitLabel="Continue"
          onSubmit={(value) => {
            setInput(value);
            setStep('notice');
          }}
        />
      </Screen>
    );
  }

  if (step === 'notice' || !input) {
    return (
      <Screen title="Awakening">
        <MedicalNotice onAccept={() => setStep('registered')} />
      </Screen>
    );
  }

  return (
    <Screen title="Awakening">
      <SystemWindow title="Player Registered">
        <Typewriter text={`Welcome, ${input.name}. Level 1. Rank E. Your first daily quest is ready.`} />
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {STAT_KEYS.map((key) => (
            <div key={key} className="flex justify-between">
              <dt className="text-muted">{STAT_LABELS[key]}</dt>
              <dd className="tabular-nums text-ink">{progression.startingStatValue}</dd>
            </div>
          ))}
        </dl>
        {error && (
          <p role="alert" className="mt-3 text-danger">
            {error}
          </p>
        )}
        <Button className="mt-4 w-full" disabled={busy} onClick={() => void begin()}>
          Begin
        </Button>
      </SystemWindow>
    </Screen>
  );
}
```

- [ ] **Step 7: Run to check they pass**

Run: `npx vitest run src/ui`
Expected: PASS.

- [ ] **Step 8: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(ui): add Awakening onboarding, health notice and install guide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 18: Status window (home)

**Files:**
- Create: `src/ui/overlays/BackupReminder.tsx`, `src/ui/screens/StatusScreen.tsx`
- Test: `src/ui/screens/StatusScreen.test.tsx`

**Interfaces:**
- Consumes: `usePlayer`, `useProfile`, `assignStats`, `setTitle`, `xpToNext`, `rankForLevel`, `titleFor`, `ACHIEVEMENTS`, `needsBackupReminder`.
- Produces: `<StatusScreen onNavigate: (tab: Tab) => void />`, `<BackupReminder onOpenSettings: () => void />`. Test ids: `level`, `stat-<key>`.

- [ ] **Step 1: Write failing tests `src/ui/screens/StatusScreen.test.tsx`**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { StatusScreen } from './StatusScreen';

describe('StatusScreen', () => {
  it('shows name, level, XP, rank and title', async () => {
    await seedApp();
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByText('Kai')).toBeTruthy();
    expect(screen.getByTestId('level').textContent).toBe('1');
    expect(screen.getByText('0 / 80 XP')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Rank E' })).toBeTruthy();
    expect(screen.getAllByText('Novice').length).toBeGreaterThan(0);
  });

  it('lets the player assign unspent stat points', async () => {
    await seedApp();
    await db.player.update(1, { unspentStatPoints: 3 });
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByText('3 points to assign')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add point to Strength' }));
    expect(screen.getByTestId('stat-strength').textContent).toBe('11');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm stats' }));
    await waitFor(async () => expect((await db.player.get(1))?.stats.strength).toBe(11));
  });

  it('shows the backup reminder after 7 days without a backup', async () => {
    await seedApp();
    await setMeta(db, 'installedAt', '2026-01-01T00:00:00.000Z');
    const onNavigate = vi.fn();
    render(<StatusScreen onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Go to backup' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });
});
```

- [ ] **Step 2: Run to check it fails**

Run: `npx vitest run src/ui/screens/StatusScreen.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/ui/overlays/BackupReminder.tsx`**

```tsx
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function BackupReminder({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <SystemWindow title="Warning">
      <p className="text-base">Back up your progress. Your last backup is more than 7 days old, or you have never made one.</p>
      <p className="mt-1 text-sm text-muted">Your data lives only on this phone.</p>
      <Button className="mt-3 w-full" onClick={onOpenSettings}>
        Go to backup
      </Button>
    </SystemWindow>
  );
}
```

- [ ] **Step 4: Implement `src/ui/screens/StatusScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { progression } from '../../config/progression';
import { getMeta } from '../../db/meta';
import { assignStats, setTitle } from '../../db/repo/player';
import { db } from '../../db/schema';
import { ACHIEVEMENTS, titleFor } from '../../domain/achievements';
import { needsBackupReminder } from '../../domain/backup';
import { rankForLevel } from '../../domain/rank';
import { STAT_LABELS } from '../../domain/stats';
import { STAT_KEYS, type StatKey, type Stats } from '../../domain/types';
import { xpToNext } from '../../domain/xp';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { RankBadge } from '../components/RankBadge';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import type { Tab } from '../components/TabBar';
import { usePlayer, useProfile } from '../hooks/data';
import { BackupReminder } from '../overlays/BackupReminder';

export function StatusScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const player = usePlayer();
  const profile = useProfile();
  const unlockedIds = useLiveQuery(async () => (await db.achievements.toArray()).map((a) => a.id), [], [] as string[]);
  const showReminder = useLiveQuery(
    async () => needsBackupReminder(new Date(), await getMeta(db, 'lastBackupAt'), await getMeta(db, 'installedAt')),
    [],
    false,
  );
  const [allocation, setAllocation] = useState<Partial<Stats>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player || !profile) {
    return (
      <Screen title="Status">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  const need = xpToNext(player.level);
  const rank = rankForLevel(player.level);
  const spent = STAT_KEYS.reduce((sum, key) => sum + (allocation[key] ?? 0), 0);
  const left = player.unspentStatPoints - spent;
  const change = (key: StatKey, delta: number) =>
    setAllocation((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) }));

  async function confirm() {
    setBusy(true);
    try {
      await assignStats(db, allocation);
      setAllocation({});
      setError(null);
      playSound('complete');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Status">
      {showReminder && <BackupReminder onOpenSettings={() => onNavigate('settings')} />}

      <SystemWindow title="Status">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-ink">{profile.name}</p>
            <p className="text-sm text-muted">
              Title: <span className="text-ink">{titleFor(player.titleId)}</span>
            </p>
          </div>
          <RankBadge rank={rank} />
        </div>
        <div className="mb-1 mt-4 flex items-baseline justify-between">
          <p className="text-lg">
            Level <span data-testid="level">{player.level}</span>
          </p>
          <p className="text-sm tabular-nums text-muted">
            {player.xp} / {need} XP
          </p>
        </div>
        <ProgressBar value={player.xp} max={need} label="Experience" />
        <p className="mt-3 text-sm text-muted">
          Streak: <span className="text-ink">{player.streak} days</span> · Best {player.bestStreak}
        </p>
      </SystemWindow>

      <SystemWindow title="Stats">
        {player.unspentStatPoints > 0 && <p className="mb-2 text-sm text-gold">{left} points to assign</p>}
        <ul className="space-y-2">
          {STAT_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between">
              <span>{STAT_LABELS[key]}</span>
              <span className="flex items-center gap-2">
                {player.unspentStatPoints > 0 && (
                  <Button variant="ghost" aria-label={`Remove point from ${STAT_LABELS[key]}`} disabled={!allocation[key]} onClick={() => change(key, -1)}>
                    −
                  </Button>
                )}
                <span className="w-10 text-center text-lg tabular-nums" data-testid={`stat-${key}`}>
                  {player.stats[key] + (allocation[key] ?? 0)}
                </span>
                {player.unspentStatPoints > 0 && (
                  <Button variant="ghost" aria-label={`Add point to ${STAT_LABELS[key]}`} disabled={left <= 0} onClick={() => change(key, 1)}>
                    +
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {spent > 0 && (
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void confirm()}>
            Confirm stats
          </Button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-danger">
            {error}
          </p>
        )}
      </SystemWindow>

      <SystemWindow title="Titles">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Displayed title</span>
          <select
            value={player.titleId ?? ''}
            onChange={(e) => void setTitle(db, e.target.value || null)}
            className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink"
          >
            <option value="">{progression.defaultTitle}</option>
            {ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)).map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <ul className="mt-3 space-y-1 text-sm">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id);
            return (
              <li key={a.id} className={unlocked ? 'text-ink' : 'text-muted'}>
                <span aria-hidden="true">{unlocked ? '◆ ' : '◇ '}</span>
                <span className="sr-only">{unlocked ? 'Unlocked: ' : 'Locked: '}</span>
                {a.title}: {a.description}
              </li>
            );
          })}
        </ul>
      </SystemWindow>
    </Screen>
  );
}
```

- [ ] **Step 5: Run to check it passes**

Run: `npx vitest run src/ui/screens/StatusScreen.test.tsx`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(ui): add status window with stats, titles and backup reminder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 19: Quests screen (daily, penalty, urgent, side quests, rest)

**Files:**
- Create: `src/ui/screens/QuestsScreen.tsx`
- Test: `src/ui/screens/QuestsScreen.test.tsx`

**Interfaces:**
- Consumes: `setItemProgress`, `finishDay`, `setRest`, `setPenaltyProgress`, `completeUrgent` (Task 13); `createSideQuest`, `completeSideQuest`, `archiveSideQuest` (Task 14).
- Produces: `<QuestsScreen />`. Accessible names used by e2e tests:
  - `Complete <item label>` for each daily item
  - `Complete penalty quest`, `Complete urgent quest`, `Complete <side quest title>`
  - `Rest today`, `Finish for today`, `Add quest`
  - fields `Quest name` and `Reward (XP)`

- [ ] **Step 1: Write failing tests `src/ui/screens/QuestsScreen.test.tsx`**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { QuestsScreen } from './QuestsScreen';

beforeEach(() => seedApp('2026-09-21'));

describe('QuestsScreen', () => {
  it('lists the four daily items with easier options', async () => {
    render(<QuestsScreen />);
    expect(await screen.findByRole('button', { name: 'Complete Push-ups' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Complete Walk' })).toBeTruthy();
    expect(screen.getByText('Easier: Knee or wall push-ups')).toBeTruthy();
  });

  it('completes an item', async () => {
    render(<QuestsScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Complete Push-ups' }));
    await waitFor(async () => expect((await db.days.get('2026-09-21'))?.items[0]?.progress).toBe(10));
  });

  it('saves typed reps', async () => {
    render(<QuestsScreen />);
    fireEvent.change(await screen.findByLabelText('Sit-ups done so far'), { target: { value: '7' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1]!);
    await waitFor(async () => expect((await db.days.get('2026-09-21'))?.items[1]?.progress).toBe(7));
  });

  it('takes a rest day without penalty', async () => {
    render(<QuestsScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rest today' }));
    expect(await screen.findByText('Rest day. Your streak is safe.')).toBeTruthy();
    expect((await db.days.get('2026-09-21'))?.status).toBe('rest');
  });

  it('adds and completes a side quest', async () => {
    render(<QuestsScreen />);
    fireEvent.change(await screen.findByLabelText('Quest name'), { target: { value: 'Read 10 pages' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add quest' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Complete Read 10 pages' }));
    await waitFor(async () => expect((await db.player.get(1))?.xp).toBe(20));
  });
});
```

- [ ] **Step 2: Run to check it fails**

Run: `npx vitest run src/ui/screens/QuestsScreen.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/ui/screens/QuestsScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { completeUrgent, finishDay, setItemProgress, setPenaltyProgress, setRest } from '../../db/repo/days';
import { archiveSideQuest, completeSideQuest, createSideQuest } from '../../db/repo/sideQuests';
import { db } from '../../db/schema';
import { parseNumberInput } from '../../domain/input';
import { dailyQuestXp, partialXp } from '../../domain/quests/daily';
import { STAT_LABELS } from '../../domain/stats';
import { STAT_KEYS, type DayRecord, type PenaltyQuest, type QuestItem, type StatKey, type UrgentQuest } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { NumberField } from '../components/NumberField';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { TextField } from '../components/TextField';
import { useMeta, usePlayer } from '../hooks/data';

const unitLabel = (unit: QuestItem['unit']) => (unit === 'min' ? 'min' : 'reps');

export function QuestsScreen() {
  const today = useMeta('lastOpenDate');
  const day = useLiveQuery(() => (today ? db.days.get(today) : undefined), [today]);
  const player = usePlayer();

  if (!today || !day || !player) {
    return (
      <Screen title="Quests">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  return (
    <Screen title="Quests">
      {day.urgent && <UrgentCard date={today} quest={day.urgent} />}
      {day.penalty && <PenaltyCard date={today} quest={day.penalty} />}
      <DailyQuestCard day={day} level={player.level} />
      <SideQuests date={today} />
    </Screen>
  );
}

function DailyQuestCard({ day, level }: { day: DayRecord; level: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const open = day.status === 'open' || day.status === 'partial';
  const canFinish = partialXp(day.items, level) - day.xpAwarded > 0;

  async function finish() {
    const xp = await finishDay(db, day.date, new Date());
    setMessage(xp > 0 ? `Progress saved. +${xp} XP.` : null);
  }

  return (
    <SystemWindow title="Daily Quest">
      <p className="mb-3 text-sm text-muted">Finish every task before midnight for {dailyQuestXp(level)} XP.</p>
      {day.status === 'done' && (
        <p role="status" className="mb-3 text-glow">
          Quest complete. +{day.xpAwarded} XP earned today.
        </p>
      )}
      {day.status === 'rest' && (
        <p role="status" className="mb-3 text-glow">
          Rest day. Your streak is safe.
        </p>
      )}
      <ul className="space-y-3">
        {day.items.map((item) => (
          <QuestItemRow key={item.id} date={day.date} item={item} disabled={!open} />
        ))}
      </ul>
      {open && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={!canFinish} onClick={() => void finish()}>
            Finish for today
          </Button>
          <Button variant="ghost" onClick={() => void setRest(db, day.date, true)}>
            Rest today
          </Button>
        </div>
      )}
      {day.status === 'rest' && (
        <Button variant="ghost" className="mt-3 w-full" onClick={() => void setRest(db, day.date, false)}>
          Undo rest
        </Button>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm text-glow">
          {message}
        </p>
      )}
    </SystemWindow>
  );
}

function QuestItemRow({ date, item, disabled }: { date: string; item: QuestItem; disabled: boolean }) {
  const [text, setText] = useState('');
  const done = item.progress >= item.target;

  async function save(value: number) {
    await setItemProgress(db, date, item.id, value, new Date());
    playSound(value >= item.target ? 'complete' : 'tap');
    setText('');
  }

  return (
    <li className="rounded border border-glow-soft/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={done ? 'text-glow' : 'text-ink'}>{item.label}</p>
          <p className="text-sm text-muted">Easier: {item.easier}</p>
        </div>
        <p className="tabular-nums">
          {Math.min(item.progress, item.target)}/{item.target} {unitLabel(item.unit)}
        </p>
      </div>
      {!done && !disabled && (
        <div className="mt-2 flex gap-2">
          <input
            aria-label={`${item.label} done so far`}
            inputMode="numeric"
            placeholder={unitLabel(item.unit)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-11 w-20 rounded border border-glow-soft bg-void px-3 text-base text-ink"
          />
          <Button
            variant="ghost"
            onClick={() => {
              const value = parseNumberInput(text, { min: 0, max: 100_000, integer: true });
              if (value !== null) void save(value);
            }}
          >
            Save
          </Button>
          <Button className="flex-1" aria-label={`Complete ${item.label}`} onClick={() => void save(item.target)}>
            Complete
          </Button>
        </div>
      )}
    </li>
  );
}

function PenaltyCard({ date, quest }: { date: string; quest: PenaltyQuest }) {
  return (
    <SystemWindow title="Penalty Quest">
      <p className="text-sm text-muted">You missed a day. Here is one small extra task. No pressure.</p>
      <p className="mt-2">
        {quest.label}: {quest.target} {unitLabel(quest.unit)} <span className="text-sm text-muted">(easier: {quest.easier})</span>
      </p>
      {quest.done ? (
        <p role="status" className="mt-2 text-glow">
          Penalty cleared. +{quest.xp} XP
        </p>
      ) : (
        <Button
          className="mt-3 w-full"
          aria-label="Complete penalty quest"
          onClick={() => {
            void setPenaltyProgress(db, date, quest.target, new Date());
            playSound('complete');
          }}
        >
          Complete (+{quest.xp} XP)
        </Button>
      )}
    </SystemWindow>
  );
}

function UrgentCard({ date, quest }: { date: string; quest: UrgentQuest }) {
  return (
    <SystemWindow title="Urgent Quest">
      <p className="text-base">{quest.label}</p>
      <p className="text-sm text-muted">Optional. Skip it if today isn't right.</p>
      {quest.done ? (
        <p role="status" className="mt-2 text-glow">
          Cleared. +{quest.xp} XP
        </p>
      ) : (
        <Button
          className="mt-3 w-full"
          aria-label="Complete urgent quest"
          onClick={() => {
            void completeUrgent(db, date, new Date());
            playSound('complete');
          }}
        >
          Complete (+{quest.xp} XP)
        </Button>
      )}
    </SystemWindow>
  );
}

function SideQuests({ date }: { date: string }) {
  const quests = useLiveQuery(() => db.sideQuests.filter((q) => !q.archived).toArray(), [], []);
  const doneIds = useLiveQuery(
    async () => (await db.questLog.where('date').equals(date).filter((e) => e.kind === 'side').toArray()).map((e) => e.refId),
    [date],
    [] as string[],
  );
  const [title, setTitle] = useState('');
  const [xp, setXp] = useState<number | null>(20);
  const [stat, setStat] = useState<StatKey>('discipline');
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    try {
      await createSideQuest(db, { title, xp: xp ?? 20, stat });
      setTitle('');
      setXp(20);
      setFormKey((k) => k + 1);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <SystemWindow title="Side Quests">
      {quests.length === 0 && <p className="text-sm text-muted">Add your own habits: study, drink water, read…</p>}
      <ul className="space-y-2">
        {quests.map((q) => {
          const done = doneIds.includes(String(q.id));
          return (
            <li key={q.id} className="flex items-center gap-2 rounded border border-glow-soft/60 p-3">
              <div className="flex-1">
                <p className={done ? 'text-glow' : 'text-ink'}>{q.title}</p>
                <p className="text-sm text-muted">
                  +{q.xp} XP · {STAT_LABELS[q.stat]}
                </p>
              </div>
              {done ? (
                <span className="text-sm text-glow">Done today</span>
              ) : (
                <Button
                  aria-label={`Complete ${q.title}`}
                  onClick={() => {
                    void completeSideQuest(db, q.id, new Date());
                    playSound('complete');
                  }}
                >
                  Done
                </Button>
              )}
              <Button
                variant="ghost"
                aria-label={`Remove ${q.title}`}
                onClick={() => {
                  if (window.confirm(`Remove "${q.title}"?`)) void archiveSideQuest(db, q.id);
                }}
              >
                ✕
              </Button>
            </li>
          );
        })}
      </ul>
      <form key={formKey} onSubmit={(e) => void add(e)} className="mt-4 space-y-3">
        <TextField label="Quest name" value={title} onChange={setTitle} />
        <NumberField label="Reward" unit="XP" value={xp} onChange={setXp} rule={{ min: 10, max: 50, integer: true }} />
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Boosts</span>
          <select
            value={stat}
            onChange={(e) => setStat(e.target.value as StatKey)}
            className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink"
          >
            {STAT_KEYS.map((key) => (
              <option key={key} value={key}>
                {STAT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full">
          Add quest
        </Button>
      </form>
    </SystemWindow>
  );
}
```

- [ ] **Step 4: Run to check it passes**

Run: `npx vitest run src/ui/screens/QuestsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(ui): add quests screen with daily, penalty, urgent and side quests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 20: Training screen (weekly plan, set logger, records, ranks)

**Files:**
- Create: `src/ui/screens/TrainingScreen.tsx`
- Test: `src/ui/screens/TrainingScreen.test.tsx`

**Interfaces:**
- Consumes: `logSet`, `deleteSet`, `getExercise`, `exercisesFor`, `computeRecords`, `exerciseRank`, `weekStartOf`, `isoWeekday`.
- Produces: `<TrainingScreen />`.

- [ ] **Step 1: Write failing tests `src/ui/screens/TrainingScreen.test.tsx`**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { TrainingScreen } from './TrainingScreen';

beforeEach(() => seedApp('2026-09-21'));

describe('TrainingScreen', () => {
  it("shows this week's plan with today marked", async () => {
    render(<TrainingScreen />);
    expect(await screen.findByText('Monday · Full body · Today')).toBeTruthy();
    expect(screen.getByText('Wednesday · Full body')).toBeTruthy();
  });

  it('logs a set and shows it in records', async () => {
    render(<TrainingScreen />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^Push-up/ }))[0]!);
    fireEvent.change(await screen.findByLabelText('Reps'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log set' }));
    expect(await screen.findByText('Set logged.')).toBeTruthy();
    expect(await db.workoutSets.count()).toBe(1);
    expect(await screen.findByText('Best 12 reps')).toBeTruthy();
  });

  it('asks for reps before logging', async () => {
    render(<TrainingScreen />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^Push-up/ }))[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Log set' }));
    expect(await screen.findByText('Enter the reps you did.')).toBeTruthy();
    expect(await db.workoutSets.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Run to check it fails**

Run: `npx vitest run src/ui/screens/TrainingScreen.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/ui/screens/TrainingScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { exercisesFor, getExercise } from '../../config/exercises';
import { deleteSet, logSet } from '../../db/repo/training';
import { db } from '../../db/schema';
import { isoWeekday, weekStartOf } from '../../domain/day';
import type { PlanFocus, WorkoutSet } from '../../domain/types';
import { exerciseRank } from '../../domain/workout/exerciseRank';
import { computeRecords } from '../../domain/workout/records';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { NumberField } from '../components/NumberField';
import { RankBadge } from '../components/RankBadge';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { useMeta, useProfile } from '../hooks/data';

const WEEKDAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FOCUS_LABEL: Record<PlanFocus, string> = { full: 'Full body', upper: 'Upper body', lower: 'Lower body' };

export function TrainingScreen() {
  const today = useMeta('lastOpenDate');
  const profile = useProfile();
  const plan = useLiveQuery(() => (today ? db.workoutPlans.get(weekStartOf(today)) : undefined), [today]);
  const allSets = useLiveQuery(() => db.workoutSets.toArray(), [], [] as WorkoutSet[]);
  const [selected, setSelected] = useState<string | null>(null);

  if (!today || !profile) {
    return (
      <Screen title="Training">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  const todayWeekday = isoWeekday(today);
  const loggedIds = [...new Set(allSets.map((s) => s.exerciseId))];

  return (
    <Screen title="Training">
      {selected && <ExerciseLogger key={selected} exerciseId={selected} onClose={() => setSelected(null)} />}

      <SystemWindow title="This week">
        {!plan ? (
          <p className="text-muted">Your plan appears after the daily reset.</p>
        ) : (
          <ul className="space-y-3">
            {plan.days.map((day) => (
              <li key={day.weekday}>
                <p className={day.weekday === todayWeekday ? 'text-glow' : 'text-ink'}>
                  {WEEKDAY_NAMES[day.weekday]} · {FOCUS_LABEL[day.focus]}
                  {day.weekday === todayWeekday ? ' · Today' : ''}
                </p>
                <ul className="mt-1 space-y-1">
                  {day.exercises.map((planned, index) => (
                    <li key={`${planned.exerciseId}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setSelected(planned.exerciseId)}
                        className="flex min-h-11 w-full items-center justify-between rounded border border-glow-soft/60 px-3 text-left"
                      >
                        <span>{getExercise(planned.exerciseId)?.name ?? planned.exerciseId}</span>
                        <span className="text-sm text-muted">
                          {planned.sets} × {planned.reps}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">Days not listed are rest days. Rest is always allowed.</p>
      </SystemWindow>

      <SystemWindow title="Log any exercise">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Exercise</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setSelected(e.target.value);
            }}
            className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink"
          >
            <option value="">Choose…</option>
            {exercisesFor(profile.equipment).map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </label>
      </SystemWindow>

      <SystemWindow title="Records">
        {loggedIds.length === 0 ? (
          <p className="text-sm text-muted">Log a set to start tracking records and ranks.</p>
        ) : (
          <ul className="space-y-2">
            {loggedIds.map((id) => {
              const exercise = getExercise(id);
              if (!exercise) return null;
              const sets = allSets.filter((s) => s.exerciseId === id);
              const records = computeRecords(sets);
              const { rank } = exerciseRank(sets, exercise.weighted);
              return (
                <li key={id} className="flex items-center gap-2">
                  <button type="button" className="min-h-11 flex-1 text-left" onClick={() => setSelected(id)}>
                    {exercise.name}
                    <span className="block text-sm text-muted">
                      {exercise.weighted
                        ? `Heaviest ${records.heaviestKg} kg · est. 1RM ${records.bestOneRepMax.toFixed(1)} kg`
                        : `Best ${records.bestReps} reps`}
                    </span>
                  </button>
                  <RankBadge rank={rank} size="sm" />
                </li>
              );
            })}
          </ul>
        )}
      </SystemWindow>
    </Screen>
  );
}

function ExerciseLogger({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const sets = useLiveQuery(() => db.workoutSets.where('exerciseId').equals(exerciseId).toArray(), [exerciseId], [] as WorkoutSet[]);
  const [reps, setReps] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [repsKey, setRepsKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const exercise = getExercise(exerciseId);
  if (!exercise) return null;

  const alternative = exercise.alternativeId ? getExercise(exercise.alternativeId) : undefined;
  const recent = [...sets].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const { rank } = exerciseRank(sets, exercise.weighted);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reps === null) {
      setMessage('Enter the reps you did.');
      return;
    }
    try {
      const { isPR } = await logSet(db, { exerciseId, reps, weightKg: weight ?? 0 }, new Date());
      setMessage(isPR ? 'New personal record!' : 'Set logged.');
      playSound(isPR ? 'levelUp' : 'complete');
      setReps(null);
      setRepsKey((k) => k + 1);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <SystemWindow title={exercise.name}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">Rank from your own progress</p>
        <RankBadge rank={rank} />
      </div>
      {alternative && <p className="mb-3 text-sm text-muted">No equipment today? Try {alternative.name}.</p>}
      <form onSubmit={(e) => void submit(e)} className="grid grid-cols-2 gap-2">
        <NumberField key={`reps-${repsKey}`} label="Reps" value={null} onChange={setReps} rule={{ min: 1, max: 1000, integer: true }} />
        {exercise.weighted && <NumberField label="Weight" unit="kg" decimal value={weight} onChange={setWeight} rule={{ min: 0, max: 1000 }} />}
        <Button type="submit" className="col-span-2">
          Log set
        </Button>
      </form>
      {message && (
        <p role="status" className="mt-2 text-glow">
          {message}
        </p>
      )}
      {recent.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {recent.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <span>
                {s.date} · {s.reps} reps{exercise.weighted ? ` × ${s.weightKg} kg` : ''}
              </span>
              <Button variant="ghost" aria-label={`Delete set from ${s.date}`} onClick={() => void deleteSet(db, s.id)}>
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="ghost" className="mt-3 w-full" onClick={onClose}>
        Close
      </Button>
    </SystemWindow>
  );
}
```

- [ ] **Step 4: Run to check it passes**

Run: `npx vitest run src/ui/screens/TrainingScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(ui): add training screen with weekly plan, set logger and ranks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 21: Nutrition screen

**Files:**
- Create: `src/ui/screens/NutritionScreen.tsx`
- Test: `src/ui/screens/NutritionScreen.test.tsx`

**Interfaces:**
- Consumes: `calculateTargets`, `sumFood`, `MIN_CALORIES`, `addFood`, `deleteFood`.
- Produces: `<NutritionScreen />`.

- [ ] **Step 1: Write failing tests `src/ui/screens/NutritionScreen.test.tsx`**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { NutritionScreen } from './NutritionScreen';

beforeEach(() => seedApp('2026-09-21'));

describe('NutritionScreen', () => {
  it("shows today's targets from the profile", async () => {
    render(<NutritionScreen />);
    expect(await screen.findByText('0 / 2448 kcal')).toBeTruthy();
    expect(screen.getByText('0 / 128 g')).toBeTruthy();
    expect(screen.getByText('0 / 2500 ml')).toBeTruthy();
  });

  it('explains the safety floor when it applies', async () => {
    await db.profile.update(1, { goal: 'lose_fat', daysPerWeek: 1 });
    render(<NutritionScreen />);
    expect(await screen.findByText(/safe minimum for you/)).toBeTruthy();
  });

  it('quick-adds water', async () => {
    render(<NutritionScreen />);
    fireEvent.click(await screen.findByRole('button', { name: '+250 ml water' }));
    expect(await screen.findByText('Logged.')).toBeTruthy();
    expect((await db.foodLog.toArray())[0]?.waterMl).toBe(250);
  });

  it('refuses an empty entry', async () => {
    render(<NutritionScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter calories, protein or water.')).toBeTruthy();
  });
});
```

The floor case: male, 80 kg, 180 cm, 30 years old, fat loss, 1 day a week. BMR is 1780 and TDEE is 2136. A 20 % deficit gives 1709, which is below BMR, so the floor applies.

- [ ] **Step 2: Run to check it fails**

Run: `npx vitest run src/ui/screens/NutritionScreen.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/ui/screens/NutritionScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { addFood, deleteFood, type FoodInput } from '../../db/repo/food';
import { db } from '../../db/schema';
import { calculateTargets, MIN_CALORIES, sumFood } from '../../domain/nutrition';
import type { FoodEntry, Goal } from '../../domain/types';
import { Button } from '../components/Button';
import { NumberField } from '../components/NumberField';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { TextField } from '../components/TextField';
import { useMeta, useProfile } from '../hooks/data';

const GOAL_TEXT: Record<Goal, string> = {
  lose_fat: 'lose fat: 20 % below maintenance, never more than 500 kcal',
  build_muscle: 'build muscle: 10 % above maintenance',
  get_fit: 'get fit: maintenance',
};

function Target({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {value} / {target} {unit}
        </span>
      </div>
      <ProgressBar value={value} max={target} label={label} />
    </div>
  );
}

export function NutritionScreen() {
  const profile = useProfile();
  const today = useMeta('lastOpenDate');
  const entries = useLiveQuery(() => (today ? db.foodLog.where('date').equals(today).toArray() : []), [today], [] as FoodEntry[]);
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [water, setWater] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) {
    return (
      <Screen title="Nutrition">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  const targets = calculateTargets(profile);
  const totals = sumFood(entries);

  async function add(input: FoodInput): Promise<boolean> {
    try {
      await addFood(db, input, new Date());
      setMessage('Logged.');
      return true;
    } catch (err) {
      setMessage((err as Error).message);
      return false;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await add({ kcal: kcal ?? 0, proteinG: protein ?? 0, waterMl: water ?? 0, note });
    if (!ok) return;
    setKcal(null);
    setProtein(null);
    setWater(null);
    setNote('');
    setFormKey((k) => k + 1);
  }

  return (
    <Screen title="Nutrition">
      <SystemWindow title="Today's targets">
        <Target label="Calories" value={totals.kcal} target={targets.calories} unit="kcal" />
        <Target label="Protein" value={totals.proteinG} target={targets.proteinG} unit="g" />
        <Target label="Water" value={totals.waterMl} target={targets.waterMl} unit="ml" />
        <p className="text-sm text-muted">
          Carbs about {targets.carbsG} g · Fat about {targets.fatG} g
        </p>
        {targets.floorApplied && (
          <p className="mt-3 rounded border border-gold/60 p-3 text-sm text-gold">
            Your calorie target is held at {targets.floor} kcal, the safe minimum for you: never below your resting energy use or{' '}
            {MIN_CALORIES[profile.sex]} kcal. Eating less than this without medical supervision is not recommended.
          </p>
        )}
        <details className="mt-3 text-sm text-muted">
          <summary className="min-h-11 cursor-pointer py-2">How these are calculated</summary>
          <p>
            Resting energy (Mifflin-St Jeor): {targets.bmr} kcal. Multiplied by your activity factor {targets.multiplier}, that gives
            maintenance of {targets.tdee} kcal. Goal: {GOAL_TEXT[profile.goal]}. Protein is 1.6 g per kg, fat is 25 % of calories and carbs are the rest.
            Water follows the EFSA guideline.
          </p>
        </details>
      </SystemWindow>

      <SystemWindow title="Log food">
        <form key={formKey} onSubmit={(e) => void submit(e)} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Calories" unit="kcal" value={null} onChange={setKcal} rule={{ min: 0, max: 20_000 }} />
            <NumberField label="Protein" unit="g" decimal value={null} onChange={setProtein} rule={{ min: 0, max: 1_000 }} />
          </div>
          <NumberField label="Water" unit="ml" value={null} onChange={setWater} rule={{ min: 0, max: 10_000, integer: true }} />
          <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={80} />
          <Button type="submit" className="w-full">
            Add
          </Button>
        </form>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => void add({ kcal: 0, proteinG: 0, waterMl: 250 })}>
            +250 ml water
          </Button>
          <Button variant="ghost" onClick={() => void add({ kcal: 0, proteinG: 0, waterMl: 500 })}>
            +500 ml water
          </Button>
        </div>
        {message && (
          <p role="status" className="mt-2 text-sm text-glow">
            {message}
          </p>
        )}
      </SystemWindow>

      <SystemWindow title="Today's log">
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet today.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <span>
                  {e.kcal} kcal · {e.proteinG} g protein · {e.waterMl} ml{e.note ? ` · ${e.note}` : ''}
                </span>
                <Button variant="ghost" aria-label="Delete entry" onClick={() => void deleteFood(db, e.id)}>
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>
    </Screen>
  );
}
```

- [ ] **Step 4: Run to check it passes**

Run: `npx vitest run src/ui/screens/NutritionScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(ui): add nutrition targets and manual food log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 22: Settings (backup, storage, sound, profile, limits)

**Files:**
- Create: `src/ui/screens/SettingsScreen.tsx`
- Test: `src/ui/screens/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `exportData`, `importData`, `buildBackup`, `backupFileName`, `parseBackup`, `saveBackupFile`, `requestPersist`, `updateProfile`, `startDay`, `isStandalone`, `ProfileForm`, `MedicalNotice`.
- Produces: `<SettingsScreen onShowInstallGuide: () => void />`. Accessible names used in tests: file input `Import backup file`, buttons `Export backup`, `Replace my data`, `Cancel`, switch `Sound`.

- [ ] **Step 1: Write failing tests `src/ui/screens/SettingsScreen.test.tsx`**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { buildBackup } from '../../domain/backup';
import { sampleBackupData } from '../../test/fixtures';
import { seedApp } from '../../test/uiFixtures';
import { SettingsScreen } from './SettingsScreen';

beforeEach(() => seedApp('2026-09-21'));

const pick = (input: HTMLElement, text: string) =>
  fireEvent.change(input, { target: { files: [new File([text], 'backup.json', { type: 'application/json' })] } });

describe('SettingsScreen', () => {
  it('invalid file leaves data untouched', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    pick(await screen.findByLabelText('Import backup file'), '{oops');
    expect((await screen.findByRole('alert')).textContent).toContain('This file is not valid JSON.');
    expect((await db.profile.get(1))?.name).toBe('Kai');
  });

  it('restores a valid backup only after confirmation', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    const data = sampleBackupData();
    data.profile[0] = { ...data.profile[0]!, name: 'Rin' };
    pick(await screen.findByLabelText('Import backup file'), JSON.stringify(buildBackup(data, new Date())));
    expect(await screen.findByText(/Rin · Level 7 · Rank E/)).toBeTruthy();
    expect((await db.profile.get(1))?.name).toBe('Kai');
    fireEvent.click(screen.getByRole('button', { name: 'Replace my data' }));
    await waitFor(async () => expect((await db.profile.get(1))?.name).toBe('Rin'));
    expect(await screen.findByText('Backup restored.')).toBeTruthy();
  });

  it('toggles sound', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    const toggle = await screen.findByRole('switch', { name: 'Sound' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(async () => expect(await getMeta(db, 'soundOn')).toBe(false));
  });

  it('lists the known limits', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    expect(await screen.findByText(/No Apple Health/)).toBeTruthy();
    expect(screen.getByText(/No reminders yet/)).toBeTruthy();
  });
});
```

If jsdom's `File` has no `text()` method, change the screen to read the file with `await new Response(file).text()` instead. Do not mock it in the test.

- [ ] **Step 2: Run to check it fails**

Run: `npx vitest run src/ui/screens/SettingsScreen.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/ui/screens/SettingsScreen.tsx`**

```tsx
import { useState, type ChangeEvent } from 'react';
import { exportData, importData } from '../../db/backup';
import { setMeta } from '../../db/meta';
import { startDay } from '../../db/repo/days';
import { updateProfile } from '../../db/repo/onboarding';
import { db } from '../../db/schema';
import { backupFileName, buildBackup, parseBackup, type ParseResult } from '../../domain/backup';
import type { PersistResult, Profile, ProfileInput } from '../../domain/types';
import { saveBackupFile } from '../../platform/download';
import { isStandalone } from '../../platform/standalone';
import { requestPersist } from '../../platform/storage';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { useMeta, useProfile } from '../hooks/data';
import { MedicalNotice } from '../overlays/MedicalNotice';
import { ProfileForm } from './ProfileForm';

const PERSIST_TEXT: Record<PersistResult, string> = {
  granted: "Protected. The browser will not clear Ashborn's data on its own.",
  denied: 'Not protected. iPhone may clear website data after a long time unused, so keep regular backups.',
  unsupported: "This browser can't protect storage. Keep regular backups.",
};

const MAX_BACKUP_BYTES = 20_000_000;

function toInput(p: Profile): ProfileInput {
  return {
    name: p.name, age: p.age, sex: p.sex, heightCm: p.heightCm, weightKg: p.weightKg, goal: p.goal,
    experience: p.experience, daysPerWeek: p.daysPerWeek, minutesPerSession: p.minutesPerSession, equipment: p.equipment,
  };
}

export function SettingsScreen({ onShowInstallGuide }: { onShowInstallGuide: () => void }) {
  const profile = useProfile();
  const lastBackupAt = useMeta('lastBackupAt');
  const persistResult = useMeta('persistResult');
  const soundOn = useMeta('soundOn') ?? true;
  const [message, setMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState<Extract<ParseResult, { ok: true }> | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    try {
      const now = new Date();
      const json = JSON.stringify(buildBackup(await exportData(db), now), null, 2);
      const outcome = await saveBackupFile(json, backupFileName(now));
      if (outcome !== 'cancelled') {
        await setMeta(db, 'lastBackupAt', now.toISOString());
        setMessage('Backup saved. Keep the file somewhere safe, such as iCloud Drive.');
      }
    } catch {
      setMessage('Could not create the backup. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPending(null);
    setImportError(null);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setImportError('This file is too large to be an Ashborn backup.');
      return;
    }
    const result = parseBackup(await file.text());
    if (result.ok) setPending(result);
    else setImportError(result.error);
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      await importData(db, pending.backup.data);
      await startDay(db, new Date());
      setPending(null);
      setMessage('Backup restored.');
    } catch {
      setImportError('Restoring failed. Your data was not changed.');
    } finally {
      setBusy(false);
    }
  }

  async function protect() {
    await setMeta(db, 'persistResult', await requestPersist());
  }

  async function saveProfile(input: ProfileInput) {
    await updateProfile(db, input, new Date());
    setEditing(false);
    setMessage('Answers saved. Your plan has been updated.');
  }

  return (
    <Screen title="Settings">
      {message && (
        <p role="status" className="text-glow">
          {message}
        </p>
      )}

      <SystemWindow title="Backup">
        <p className="text-sm text-muted">
          All progress lives only on this phone. Deleting the app or clearing Safari data erases it unless you have a backup.
        </p>
        <p className="mt-2 text-sm">Last backup: {lastBackupAt ? new Date(lastBackupAt).toLocaleDateString() : 'Never'}</p>
        <Button className="mt-3 w-full" disabled={busy} onClick={() => void exportBackup()}>
          Export backup
        </Button>
        <label className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center rounded border border-glow-soft px-4 text-base text-muted">
          Import backup
          <input type="file" accept=".json,application/json" aria-label="Import backup file" className="sr-only" onChange={(e) => void chooseFile(e)} />
        </label>
        {importError && (
          <p role="alert" className="mt-2 text-danger">
            {importError}
          </p>
        )}
        {pending && (
          <div className="mt-3 rounded border border-gold/60 p-3">
            <p className="text-sm text-gold">This will replace everything on this phone with:</p>
            <p className="mt-1">
              {pending.summary.playerName} · Level {pending.summary.level} · Rank {pending.summary.rank}
            </p>
            <p className="text-sm text-muted">
              {pending.summary.daysOfHistory} days of history · {pending.summary.setsLogged} sets logged
              {pending.summary.exportedAt ? ` · saved ${new Date(pending.summary.exportedAt).toLocaleDateString()}` : ''}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => void confirmImport()}>
                Replace my data
              </Button>
            </div>
          </div>
        )}
      </SystemWindow>

      <SystemWindow title="Storage protection">
        <p className="text-sm">{persistResult ? PERSIST_TEXT[persistResult] : 'Not requested yet.'}</p>
        {persistResult !== 'granted' && (
          <Button variant="ghost" className="mt-3 w-full" onClick={() => void protect()}>
            Ask to protect my data
          </Button>
        )}
      </SystemWindow>

      <SystemWindow title="Sound">
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          aria-label="Sound"
          onClick={() => void setMeta(db, 'soundOn', !soundOn)}
          className="flex min-h-11 w-full items-center justify-between rounded border border-glow-soft px-3 text-base"
        >
          <span>Sound effects</span>
          <span className={soundOn ? 'text-glow' : 'text-muted'}>{soundOn ? 'On' : 'Off'}</span>
        </button>
        <p className="mt-2 text-sm text-muted">iPhone's silent switch also mutes app sounds.</p>
      </SystemWindow>

      <SystemWindow title="Your answers">
        {editing && profile ? (
          <ProfileForm initial={toInput(profile)} submitLabel="Save answers" onSubmit={(v) => void saveProfile(v)} />
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setEditing(true)}>
            Edit my answers
          </Button>
        )}
        <p className="mt-2 text-sm text-muted">Your level, stats and history are kept.</p>
      </SystemWindow>

      {!isStandalone() && (
        <SystemWindow title="Install">
          <Button variant="ghost" className="w-full" onClick={onShowInstallGuide}>
            How to install on iPhone
          </Button>
        </SystemWindow>
      )}

      <MedicalNotice />

      <SystemWindow title="Known limits">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>No Apple Health or step counting. Enter steps and workouts yourself.</li>
          <li>No home screen widgets.</li>
          <li>No reminders yet. iPhone web apps need a server for notifications; this is planned for phase 2.</li>
          <li>Data stays on this phone only. Export a backup regularly.</li>
        </ul>
      </SystemWindow>

      <p className="pb-4 text-center text-xs text-muted">Ashborn v1 · No accounts, no tracking. Your data never leaves this device.</p>
    </Screen>
  );
}
```

- [ ] **Step 4: Run to check it passes**

Run: `npx vitest run src/ui/screens/SettingsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `npm run typecheck; npm run lint`

```powershell
git add -A
git commit -m @'
feat(ui): add settings with backup export/import, storage protection and sound

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 23: Level-up and title overlays, day cycle, and the app shell

**Files:**
- Create: `src/ui/overlays/LevelUpOverlay.tsx`, `src/ui/overlays/AchievementToast.tsx`, `src/ui/overlays/EventHost.tsx`, `src/ui/hooks/useDayCycle.ts`
- Modify: `src/App.tsx` (replace entirely), `src/App.test.tsx` (replace entirely)
- Test: `src/ui/overlays/EventHost.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Produces:
```ts
<LevelUpOverlay event: LevelUpEvent onClose />   // role="dialog" aria-label="Level up: level N", button "Continue"
<AchievementToast title onDone />                // role="status", auto-dismiss after 3.5 s, does not block taps
<EventHost />                                     // shows pendingEvents[0]
useDayCycle(active: boolean): void                // startDay on launch, on visibility, every 60 s after midnight
```

- [ ] **Step 1: Write failing tests**

`src/ui/overlays/EventHost.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta, setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { EventHost } from './EventHost';

beforeEach(() => seedApp());

describe('EventHost', () => {
  it('shows a level-up and removes it on Continue', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'levelUp', fromLevel: 9, toLevel: 10, fromRank: 'E', toRank: 'D', statPointsGained: 8 }]);
    render(<EventHost />);
    const dialog = await screen.findByRole('dialog', { name: 'Level up: level 10' });
    expect(dialog.textContent).toContain('Rank up: E → D');
    expect(dialog.textContent).toContain('+8 stat points');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });

  it('shows an unlocked title as a non-blocking toast', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
    render(<EventHost />);
    const toast = await screen.findByRole('status');
    expect(toast.textContent).toContain('The Awakened');
    expect(toast.className).toContain('pointer-events-none');
  });
});
```

`src/App.test.tsx` (replace the Task 1 smoke test):
```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { emptyApp, seedApp } from './test/uiFixtures';

describe('App', () => {
  it('greets a new player with the install guide and the Awakening', async () => {
    await emptyApp();
    render(<App />);
    expect(await screen.findByRole('dialog', { name: 'Install Ashborn' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue in Safari' }));
    expect(await screen.findByRole('heading', { name: 'Awakening' })).toBeTruthy();
  });

  it('shows the status window and tab bar for a registered player', async () => {
    await seedApp();
    render(<App />);
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Status', level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));
    expect(await screen.findByRole('heading', { name: 'Quests', level: 1 })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to check they fail**

Run: `npx vitest run src/App.test.tsx src/ui/overlays/EventHost.test.tsx`
Expected: FAIL, modules not found and the old App has no Awakening.

- [ ] **Step 3: Implement overlays**

`src/ui/overlays/LevelUpOverlay.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import type { LevelUpEvent } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function LevelUpOverlay({ event, onClose }: { event: LevelUpEvent; onClose: () => void }) {
  const closed = useRef(false);
  const close = () => {
    if (closed.current) return;
    closed.current = true;
    onClose();
  };

  useEffect(() => {
    playSound('levelUp');
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Level up: level ${event.toLevel}`}
      onClick={close}
      className="safe-x fixed inset-0 z-50 flex items-center justify-center bg-void/90"
    >
      <div className="level-burst w-full max-w-sm">
        <SystemWindow title="System" className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-glow">Level up</p>
          <p className="my-2 text-5xl font-bold text-ink drop-shadow-[0_0_12px_var(--color-glow)]">Lv. {event.toLevel}</p>
          {event.toRank !== event.fromRank && (
            <p className="text-lg text-gold">
              Rank up: {event.fromRank} → {event.toRank}
            </p>
          )}
          <p className="mt-2 text-muted">+{event.statPointsGained} stat points to assign</p>
          <Button
            className="mt-4 w-full"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            Continue
          </Button>
        </SystemWindow>
      </div>
    </div>
  );
}
```

`src/ui/overlays/AchievementToast.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { playSound } from '../../platform/audio';
import { SystemWindow } from '../components/SystemWindow';

export function AchievementToast({ title, onDone }: { title: string; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    playSound('chime');
    const timer = setTimeout(() => onDoneRef.current(), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className="safe-x pointer-events-none fixed inset-x-0 top-0 z-40"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <SystemWindow className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.2em] text-glow">Title unlocked</p>
        <p className="text-lg text-ink">“{title}”</p>
        <p className="text-sm text-muted">Equip it from your Status window.</p>
      </SystemWindow>
    </div>
  );
}
```

`src/ui/overlays/EventHost.tsx`:
```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta } from '../../db/meta';
import { dismissEvent } from '../../db/repo/player';
import { db } from '../../db/schema';
import type { GameEvent } from '../../domain/types';
import { AchievementToast } from './AchievementToast';
import { LevelUpOverlay } from './LevelUpOverlay';

export function EventHost() {
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  const event = events[0];
  if (!event) return null;
  if (event.type === 'levelUp') {
    return <LevelUpOverlay key={`level-${event.toLevel}`} event={event} onClose={() => void dismissEvent(db)} />;
  }
  return <AchievementToast key={`title-${event.id}`} title={event.title} onDone={() => void dismissEvent(db)} />;
}
```

- [ ] **Step 4: Implement `src/ui/hooks/useDayCycle.ts`**

```ts
import { useEffect } from 'react';
import { startDay } from '../../db/repo/days';
import { db } from '../../db/schema';
import { shouldRollOver, todayKey } from '../../domain/day';

/** Runs the daily reset on launch, when the app returns to the foreground, and after local midnight. */
export function useDayCycle(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let current: string | null = null;
    const run = () => {
      const now = new Date();
      if (!shouldRollOver(current, now)) return;
      current = todayKey(now);
      startDay(db, now).catch((error: unknown) => console.error('Daily reset failed', error));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    run();
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(run, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [active]);
}
```

- [ ] **Step 5: Replace `src/App.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getMeta, setMeta } from './db/meta';
import { db } from './db/schema';
import { installAudioUnlock, setSoundEnabled } from './platform/audio';
import { isStandalone } from './platform/standalone';
import { TabBar, type Tab } from './ui/components/TabBar';
import { useDayCycle } from './ui/hooks/useDayCycle';
import { EventHost } from './ui/overlays/EventHost';
import { InstallGuide } from './ui/overlays/InstallGuide';
import { Awakening } from './ui/screens/Awakening';
import { NutritionScreen } from './ui/screens/NutritionScreen';
import { QuestsScreen } from './ui/screens/QuestsScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { StatusScreen } from './ui/screens/StatusScreen';
import { TrainingScreen } from './ui/screens/TrainingScreen';

export default function App() {
  const profile = useLiveQuery(async () => (await db.profile.get(1)) ?? null, [], 'loading' as const);
  const guideDismissed = useLiveQuery(async () => (await getMeta(db, 'installGuideDismissed')) ?? false, [], true);
  const soundOn = useLiveQuery(async () => (await getMeta(db, 'soundOn')) ?? true, [], true);
  const [tab, setTab] = useState<Tab>('status');
  const [guideRequested, setGuideRequested] = useState(false);
  const registered = profile !== 'loading' && profile !== null;

  useEffect(() => installAudioUnlock(), []);
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);
  useDayCycle(registered);

  if (profile === 'loading') return <div className="min-h-dvh bg-void" />;

  const showGuide = !isStandalone() && (guideRequested || !guideDismissed);
  const closeGuide = () => {
    setGuideRequested(false);
    void setMeta(db, 'installGuideDismissed', true);
  };

  return (
    <>
      {registered ? (
        <>
          {tab === 'status' && <StatusScreen onNavigate={setTab} />}
          {tab === 'quests' && <QuestsScreen />}
          {tab === 'training' && <TrainingScreen />}
          {tab === 'nutrition' && <NutritionScreen />}
          {tab === 'settings' && <SettingsScreen onShowInstallGuide={() => setGuideRequested(true)} />}
          <TabBar tab={tab} onChange={setTab} />
          <EventHost />
        </>
      ) : (
        <Awakening />
      )}
      {showGuide && <InstallGuide onClose={closeGuide} />}
    </>
  );
}
```

- [ ] **Step 6: Run the whole unit suite**

Run: `npm test`
Expected: PASS, every test file.

- [ ] **Step 7: Look at it in the in-app browser**

Create `.claude/launch.json` with a configuration named `ashborn-dev` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 5173`). Start it with the Browser pane's `preview_start`, navigate to `http://localhost:5173/ashborn/`, set the viewport to the `mobile` preset, and walk through the flow:
1. install guide
2. Awakening
3. Begin
4. Status
5. Quests: complete all items
6. Status shows 65 / 80 XP

Take a screenshot of the Status window. Check that nothing sits under the notch area or the tab bar, and that text is readable. Reset the viewport to `desktop` afterwards.

- [ ] **Step 8: Gate and commit**

Run: `npm run check`
Expected: all green.

```powershell
git add -A
git commit -m @'
feat(app): wire tabs, daily reset, level-up overlay and title toasts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 24: PWA manifest, original icons and offline service worker

**Files:**
- Create: `public/icon.svg`, `scripts/generate-icons.mjs`, generated `public/apple-touch-icon.png`, `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`
- Modify: `vite.config.ts`, `src/main.tsx`, `tsconfig.json` (`types`)

**Interfaces:**
- Produces: `dist/manifest.webmanifest`, `dist/sw.js` (Workbox `generateSW` precaching every built asset), `npm run icons`.

This task downloads the Playwright WebKit browser (about 100 MB, into the Playwright cache under your user folder). It is part of the approved Playwright stack. Task 25 needs it too.

- [ ] **Step 1: Install the WebKit browser for Playwright**

Run: `npx playwright install webkit`
Expected: "webkit … downloaded" or "already installed". Do not install any other browsers.

- [ ] **Step 2: Create the original emblem `public/icon.svg`**

A rising blue flame inside a thin hexagon ring, drawn for this project:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%">
      <stop offset="0" stop-color="#0d1a33"/>
      <stop offset="1" stop-color="#05070d"/>
    </radialGradient>
    <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#1d5c85"/>
      <stop offset="0.6" stop-color="#3ab8ff"/>
      <stop offset="1" stop-color="#e6f1ff"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <polygon points="256,56 429,156 429,356 256,456 83,356 83,156" fill="none" stroke="#3ab8ff" stroke-width="10" stroke-opacity="0.55" filter="url(#glow)"/>
  <path d="M256 120 C 300 190, 340 230, 330 300 C 322 356, 290 386, 256 396 C 222 386, 190 356, 182 300 C 172 230, 212 190, 256 120 Z" fill="url(#flame)" filter="url(#glow)"/>
  <path d="M256 220 C 276 262, 290 290, 282 322 C 276 346, 266 356, 256 360 C 246 356, 236 346, 230 322 C 222 290, 236 262, 256 220 Z" fill="#05070d" fill-opacity="0.55"/>
  <circle cx="190" cy="170" r="7" fill="#3ab8ff"/>
  <circle cx="330" cy="150" r="5" fill="#3ab8ff"/>
  <circle cx="352" cy="228" r="4" fill="#e6f1ff"/>
</svg>
```

- [ ] **Step 3: Create `scripts/generate-icons.mjs`**

```js
// Renders public/icon.svg into the PNG icons iPhone and the web manifest need.
// Uses Playwright's WebKit (already a dev dependency), so no extra image packages.
import { readFile } from 'node:fs/promises';
import { webkit } from '@playwright/test';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8');

const targets = [
  { file: 'public/apple-touch-icon.png', size: 180, padding: 0 },
  { file: 'public/pwa-192.png', size: 192, padding: 0 },
  { file: 'public/pwa-512.png', size: 512, padding: 0 },
  // Maskable icons keep the emblem inside the central safe zone.
  { file: 'public/pwa-maskable-512.png', size: 512, padding: 0.12 },
];

const browser = await webkit.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { file, size, padding } of targets) {
  const inner = Math.round(size * (1 - 2 * padding));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;width:${size}px;height:${size}px;background:#05070d;display:grid;place-items:center">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</body></html>',
  );
  await page.screenshot({ path: file });
  console.log(`wrote ${file} (${size}x${size})`);
}
await browser.close();
```

- [ ] **Step 4: Generate and verify the icons**

Run: `npm run icons`
Then:
```powershell
node -e "const fs=require('fs');for(const f of ['public/apple-touch-icon.png','public/pwa-192.png','public/pwa-512.png','public/pwa-maskable-512.png']){const b=fs.readFileSync(f);console.log(f,b.readUInt32BE(16)+'x'+b.readUInt32BE(20))}"
```
Expected: `180x180`, `192x192`, `512x512`, `512x512`. Open `public/pwa-512.png` with the Read tool to check it visually: a glowing blue flame in a hexagon on near-black.

- [ ] **Step 5: Add the PWA plugin to `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/ashborn/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/ashborn/',
        name: 'Ashborn',
        short_name: 'Ashborn',
        description: 'Level up in real life: daily quests, ranks and stats for your workouts and habits.',
        start_url: '/ashborn/',
        scope: '/ashborn/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#05070d',
        theme_color: '#05070d',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
```

- [ ] **Step 6: Register the service worker in `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

In `tsconfig.json` change `"types": ["vite/client"]` to `"types": ["vite/client", "vite-plugin-pwa/client"]`.

- [ ] **Step 7: Build and inspect the output**

Run: `npm run build`
Then:
```powershell
node -e "const m=JSON.parse(require('fs').readFileSync('dist/manifest.webmanifest','utf8'));console.log(m.display,m.start_url,m.icons.length);const sw=require('fs').readFileSync('dist/sw.js','utf8');console.log(sw.includes('index.html'),/assets\/index-[\w-]+\.js/.test(sw))"
```
Expected: `standalone /ashborn/ 3`, then `true true`. Also check that `dist/index.html` contains `href="/ashborn/apple-touch-icon.png"` and a `<link rel="manifest" href="/ashborn/manifest.webmanifest">`.

- [ ] **Step 8: Gate and commit**

Run: `npm run check`

```powershell
git add -A
git commit -m @'
feat(pwa): add manifest, original icons and offline service worker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 25: End-to-end tests on iPhone WebKit

**Files:**
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/onboarding.spec.ts`, `e2e/daily-quest.spec.ts`, `e2e/level-up.spec.ts`, `e2e/pwa.spec.ts`

**Interfaces:**
- Consumes: accessible names from Tasks 16–23.
- Produces: `npm run e2e` runs 4 spec files on the `iphone-webkit` project against `vite preview`.

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/ashborn/',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iphone-webkit',
      use: { ...devices['iPhone 15'], browserName: 'webkit' },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/ashborn/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

If `devices['iPhone 15']` is undefined in the installed Playwright, use the newest `iPhone` entry listed in `node_modules/playwright-core/lib/server/deviceDescriptorsSource.json`.

- [ ] **Step 2: Create `e2e/helpers.ts`**

```ts
import { expect, type Page } from '@playwright/test';

export async function onboard(page: Page, name = 'Kai'): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: 'Continue in Safari' }).click();
  await page.getByLabel('Player name').fill(name);
  await page.getByLabel('Age').fill('30');
  await page.getByRole('button', { name: 'Male', exact: true }).click();
  await page.getByLabel('Height (cm)').fill('180');
  await page.getByLabel('Weight (kg)').fill('80');
  await page.getByRole('button', { name: /^Get fit/ }).click();
  await page.getByRole('button', { name: /^Beginner/ }).click();
  await page.getByLabel('Days per week').fill('3');
  await page.getByLabel('Minutes per session').fill('30');
  await page.getByRole('button', { name: /^No equipment/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'I understand' }).click();
  await expect(page.getByRole('heading', { name: 'Player Registered' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

export async function completeDailyQuest(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Quests', exact: true }).click();
  for (const label of ['Push-ups', 'Sit-ups', 'Squats', 'Walk']) {
    await page.getByRole('button', { name: `Complete ${label}`, exact: true }).click();
  }
  await expect(page.getByText(/Quest complete/)).toBeVisible();
}
```

- [ ] **Step 3: Create the specs**

`e2e/onboarding.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

test('a new player completes the Awakening and lands on the status window', async ({ page }) => {
  await onboard(page);
  await expect(page.getByRole('heading', { name: 'Status', level: 1 })).toBeVisible();
  await expect(page.getByText('Kai', { exact: true })).toBeVisible();
  await expect(page.getByTestId('level')).toHaveText('1');
  await expect(page.getByRole('img', { name: 'Rank E' })).toBeVisible();
});

test('shows the install guide in Safari and keeps inputs at 16px', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: 'Install Ashborn' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue in Safari' }).click();
  const fontSize = await page.getByLabel('Player name').evaluate((el) => getComputedStyle(el).fontSize);
  expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);
});
```

`e2e/daily-quest.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { completeDailyQuest, onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

test('completing the daily quest awards XP and starts a streak', async ({ page }) => {
  await onboard(page);
  await completeDailyQuest(page);
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByText('65 / 80 XP')).toBeVisible();
  await expect(page.getByText(/Streak: 1 days/)).toBeVisible();
});
```

`e2e/level-up.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { completeDailyQuest, onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

test('levelling up shows the level-up screen and grants stat points', async ({ page }) => {
  await onboard(page);
  await completeDailyQuest(page); // 65 XP of 80

  await page.getByLabel('Quest name').fill('Drink water');
  await page.getByLabel('Reward (XP)').fill('20');
  await page.getByRole('button', { name: 'Add quest' }).click();
  await page.getByRole('button', { name: 'Complete Drink water' }).click(); // 85 XP → level 2

  const dialog = page.getByRole('dialog', { name: /Level up/ });
  await expect(dialog).toBeVisible({ timeout: 10_000 }); // waits behind the 3.5 s title toast
  await expect(dialog.getByText('Lv. 2')).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByTestId('level')).toHaveText('2');
  await expect(page.getByText('3 points to assign')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add point to Strength' }).click();
  await page.getByRole('button', { name: 'Confirm stats' }).click();
  await expect(page.getByTestId('stat-strength')).toHaveText('13');
  await expect(page.getByText(/points to assign/)).toBeHidden();
});
```

`e2e/pwa.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('ships an installable manifest, iPhone icon and safe-area viewport', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest).toMatchObject({
    name: 'Ashborn', short_name: 'Ashborn', display: 'standalone', start_url: '/ashborn/',
    theme_color: '#05070d', background_color: '#05070d',
  });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

  const size = await page.evaluate(async () => {
    const img = new Image();
    img.src = document.querySelector('link[rel="apple-touch-icon"]')!.getAttribute('href')!;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(size).toEqual([180, 180]);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('viewport-fit=cover');
});

test('the service worker precaches the app shell', async ({ request }) => {
  const sw = await (await request.get('sw.js')).text();
  expect(sw).toContain('index.html');
  expect(sw).toMatch(/assets\/index-[\w-]+\.js/);
});

test('reloads offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Awakening' })).toBeVisible();
});
```

- [ ] **Step 4: Run the e2e suite**

Run: `npm run e2e`
Expected: 7 tests pass on `iphone-webkit`.

If a test fails, use superpowers:systematic-debugging and look at the trace (`npx playwright show-trace test-results/…/trace.zip`). Only the offline test has an allowed fallback. If it fails **only** because Playwright's WebKit on Windows never gets a controlling service worker (confirm this: `navigator.serviceWorker.controller` stays `null` after the first reload), change it to `test.fixme(...)` with a comment explaining why. Offline mode is then covered by the precache test plus the manual check on the phone in Task 26. Report this to the owner.

- [ ] **Step 5: Gate and commit**

Run: `npm run check`

```powershell
git add -A
git commit -m @'
test(e2e): cover onboarding, daily quest, level-up and PWA on iPhone WebKit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 26: GitHub Pages deployment and README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`
- Modify: `docs/plan.md` (mark progress)

**Interfaces:**
- Produces: every push to `main` builds and deploys to `https://ebon6011.github.io/ashborn/`.

- [ ] **Step 1: Check the current major versions of the GitHub Actions used**

Open https://github.com/actions/checkout, https://github.com/actions/setup-node, https://github.com/actions/configure-pages, https://github.com/actions/upload-pages-artifact and https://github.com/actions/deploy-pages in the Browser pane. Note each latest major version (`vN`) and use it below if it is newer than the version written here.

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Create `README.md`**

````markdown
# Ashborn

Ashborn turns your workouts and daily habits into a game. You get a glowing "System" status window, daily quests, levels, ranks from E to S, and stats you build in real life.

It's a free web app that you install on your iPhone from Safari. It works offline. It has no accounts, no ads and no tracking, and all your data stays on your phone.

**Live app:** https://ebon6011.github.io/ashborn/

---

## 1. Run it on your PC

You need Node.js (LTS) and Git.

```bash
npm install
npx playwright install webkit
npm run dev
```

Open the address it prints (http://localhost:5173/ashborn/).

Useful commands:

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app locally while you work on it |
| `npm test` | Runs the unit tests |
| `npm run e2e` | Runs the iPhone (WebKit) browser tests |
| `npm run check` | Type check + lint + unit tests + build, all in one |
| `npm run icons` | Remakes the app icons from `public/icon.svg` |

## 2. Publish it to GitHub Pages (one-time setup)

1. On github.com, create a new **public** repository named `ashborn` under the `ebon6011` account. Leave it empty: no README and no licence.
2. In that repository, go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. On your PC, in this folder, run:
   ```bash
   git remote add origin https://github.com/ebon6011/ashborn.git
   ```
   ```bash
   git push -u origin main
   ```
4. Open the **Actions** tab on GitHub and wait for "Deploy to GitHub Pages" to show a green tick (about 2 minutes).
5. Your app is live at https://ebon6011.github.io/ashborn/.

After that, every `git push` to `main` publishes a new version automatically.

## 3. Install it on your iPhone

1. Open **Safari** on your iPhone. It must be Safari, not another browser.
2. Go to https://ebon6011.github.io/ashborn/.
3. Tap the **Share** button (the square with an arrow pointing up).
4. Scroll down and tap **Add to Home Screen**, then **Add**.
5. Open **Ashborn** from your home screen. It opens full screen like a normal app.
6. Create your player there, in the installed app. On iPhone, Safari and the installed app keep separate data.

After the first open, the app works without internet. Updates download by themselves the next time you open it online.

## 4. Back up and restore

Your progress lives **only on your phone**. It is erased if you delete the Ashborn icon or clear Safari's website data. Back it up regularly. The app reminds you when your last backup is more than 7 days old.

**Back up:** Settings → **Export backup** → choose **Save to Files** (iCloud Drive is a good place).

**Restore:** Settings → **Import backup** → pick your `ashborn-backup-YYYY-MM-DD.json` file. The app checks the file and shows you what it contains, and nothing changes until you tap **Replace my data**.

Backups from older versions of Ashborn still import. They are upgraded automatically.

## 5. What's done and what's planned

**Done in version 1**

- Awakening (onboarding): gentle beginner and no-equipment modes, plus a health notice
- Status window: level, E–S rank, title, XP bar, and five stats with points you assign yourself
- Daily Quest: small safe penalty quests for missed days, streaks, a midnight reset in your time zone, and rest days that are never penalised
- Side quests you create yourself, and an optional Urgent Quest (at most once a day)
- Weekly workout plan and logging of sets, reps and kg, with personal records and an E–S rank per exercise based on your own progress
- Nutrition targets (Mifflin-St Jeor, with a safe minimum) and a manual food and water log
- Achievements and titles
- Level-up screen with sound; glowing system windows; typewriter messages
- Offline support, iPhone install guide, backup and restore, and storage protection
- Unit tests and iPhone WebKit browser tests; automatic deployment

**Known limits (iPhone web apps can't do these)**

- No Apple Health or step counting. You enter steps and workouts yourself.
- No home screen widgets.
- No reminders yet. Notifications need a small server (see phase 2).
- The iPhone silent switch also mutes app sounds.

**Planned (phase 2, after version 1 works on your phone)**

- Daily reminder notifications through web push, using a free scheduled sender (for example a Cloudflare Worker). Cost and setup will be explained first.
- Optional cloud sync between devices
- Progress charts

## Balance tweaks

Every game number (XP curve, rank levels, stat points, quest sizes, penalty and urgent quests, exercise-rank thresholds) is in [`src/config/progression.ts`](src/config/progression.ts). The nutrition formulas and their sources are in [`src/domain/nutrition.ts`](src/domain/nutrition.ts).
````

- [ ] **Step 4: Final verification**

Run: `npm run check`
Then: `npm run e2e`
Both must pass. Paste the pass counts into the task report.

- [ ] **Step 5: Mark the plan complete and commit**

Tick every checkbox in `docs/plan.md` for Tasks 1–26 that was actually completed, then commit:

```powershell
git add -A
git commit -m @'
ci: deploy to GitHub Pages on push; add plain-language README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

- [ ] **Step 6: Publish (needs the owner)**

Pushing publishes code publicly, so stop and ask the owner to confirm. The owner must first create the empty public `ebon6011/ashborn` repo and set Pages → Source → GitHub Actions (README §2). After they say yes, run:
```powershell
git remote add origin https://github.com/ebon6011/ashborn.git
git push -u origin main
```
Then watch the Actions run in the Browser pane until it is green, and open https://ebon6011.github.io/ashborn/ to confirm the app loads.

- [ ] **Step 7: Owner checks on the iPhone (manual)**

Ask the owner to:
1. install from Safari;
2. open from the home screen and create a player;
3. turn on Airplane Mode, close the app fully and reopen it, and check that it still works;
4. complete a daily quest and hear the chime (silent switch off);
5. export a backup to Files.

Record the results in `docs/plan.md` under a "Device check" heading.
