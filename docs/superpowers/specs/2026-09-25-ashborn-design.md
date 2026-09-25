# Ashborn — Design Spec (v1)

Date: 2026-09-25
Status: Approved in brainstorming, awaiting written-spec review

## 1. Intent

A personal, offline-first, free Progressive Web App that turns workouts and daily habits into an RPG, in the style of a glowing blue "System" from dark fantasy fiction. Built on a Windows PC, hosted on GitHub Pages, installed on the owner's iPhone via Safari "Add to Home Screen".

- **User:** one person (the owner). Fitness level: *active on and off* (can do ~10–20 push-ups, walk/jog 20 min) → starts on the **Beginner** tier.
- **Success:** installs on iPhone, runs full screen and fully offline, progress survives updates, backup/restore works, all 8 core features work, zero TypeScript/lint errors, unit + WebKit e2e tests pass, auto-deploys on push to `main`.

### Naming and originality
- App name: **Ashborn**. The owner chose this name knowingly, overriding their own "no character names" rule for this one name only.
- Everything else stays original: no other names, logos, artwork or copied text from any existing app or series. All copy, titles and icons are invented for this project.

## 2. Constraints

- Stack (fixed): Vite + React + TypeScript, Tailwind CSS, vite-plugin-pwa, Dexie.js, Vitest, Playwright (WebKit, iPhone profile), GitHub Pages via GitHub Actions.
- Approved extra packages: `dexie-react-hooks`; dev-only `fake-indexeddb`, `@testing-library/react`, `jsdom`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `@vitejs/plugin-react`, `@tailwindcss/vite`. Anything else needs approval.
- No backend, login, accounts, subscriptions, ads, analytics or tracking.
- No router library, no state library (Option A — lean).
- Units: metric only (kg, cm, L).
- Hosting URL: `https://ebon6011.github.io/ashborn/` → Vite `base: '/ashborn/'`.
- No Xcode/macOS tooling. No system software installed by the assistant.

## 3. Architecture

```
src/
  config/
    progression.ts     # ONE balance file: XP curve, rank thresholds, stat points, rewards, quest tiers, exercise-rank ratios, urgent-quest chance
    exercises.ts       # exercise library with equipment variants
  domain/              # pure TS, no React, no Dexie — fully unit tested
    xp.ts rank.ts day.ts nutrition.ts backup.ts achievements.ts stats.ts
    quests/daily.ts quests/penalty.ts quests/urgent.ts quests/side.ts
    workout/plan.ts workout/exerciseRank.ts workout/records.ts
  db/
    schema.ts          # Dexie class, version(n).stores(...).upgrade(...)
    repo/*.ts          # small read/write helpers used by UI
  platform/
    audio.ts           # Web Audio synth tones, unlock on first tap, silent failure
    standalone.ts      # detect installed mode (navigator.standalone / display-mode)
    storage.ts         # navigator.storage.persist() once, result stored in meta
  ui/
    components/  SystemWindow, Typewriter, TabBar, ProgressBar, RankBadge, NumberInput …
    screens/     Awakening, Status, Quests, Training, Nutrition, Settings
    overlays/    LevelUp, InstallGuide, MedicalNotice, BackupReminder
  App.tsx main.tsx
```

Rules: UI reads/writes only through `db/repo` and calls `domain/` for all logic. `domain/` never touches the database, the DOM or the clock directly (the current date/time is passed in, which keeps tests deterministic).

Navigation: a `tab` state in `App.tsx` drives the bottom tab bar; overlays are rendered conditionally. Live data comes from `useLiveQuery` (dexie-react-hooks).

## 4. Data model (Dexie schema v1)

| Table | Key | Contents |
|---|---|---|
| `profile` | `id` (always 1) | name, age, sex (`male`/`female`), heightCm, weightKg, goal (`lose_fat`/`build_muscle`/`get_fit`), experience (`never`/`beginner`/`intermediate`/`advanced`), daysPerWeek (1–7), minutesPerSession, equipment (`none`/`dumbbells`/`gym`), createdAt |
| `player` | `id` (1) | level, xp (into current level), unspentStatPoints, stats {strength, agility, vitality, endurance, discipline}, titleId, streak, bestStreak, questsCompleted, sideQuestStatProgress {stat: count} |
| `days` | `date` (local `YYYY-MM-DD`) | dailyItems [{id, exercise, target, unit, done}], status (`open`/`done`/`missed`/`rest`), penalty {item, done} or null, urgent {task, xp, done} or null, xpAwarded |
| `sideQuests` | `++id` | title, xp (10–50), stat, archived |
| `questLog` | `++id`, `date`, `kind` | kind (`daily`/`penalty`/`urgent`/`side`), refId, xp, at |
| `workoutPlan` | `weekStart` | days [{weekday, exercises [{exerciseId, sets, reps}]}] |
| `workoutSets` | `++id`, `exerciseId`, `date` | reps, weightKg (0 for bodyweight), at |
| `foodLog` | `++id`, `date` | kcal, proteinG, waterMl, note, at |
| `achievements` | `id` | unlockedAt |
| `meta` | `key` | lastProcessedDate, lastBackupAt, persistResult, lastUrgentDate, medicalAck, soundOn, installedAt |

**Migrations:** every schema change adds a new `db.version(n)` with an `upgrade()` step; old versions are never edited. The same migration functions are reused when importing an older backup.

## 5. Daily reset

On app start and whenever the app becomes visible again (`visibilitychange`), `processDays(lastProcessedDate, today, days, profile)` in `domain/day.ts` walks every local date after the last processed one up to yesterday:
- `done` → streak +1 (at completion time).
- `rest` → streak unchanged, no penalty.
- `open` / missing → marked `missed`, streak reset to 0.
- If one or more days were missed, **exactly one** penalty quest is attached to today (never stacked).
Then today's row is created with a freshly generated Daily Quest. "Today" is the phone's local date (`YYYY-MM-DD` from local time), so resets happen at local midnight and DST days are handled by date arithmetic, not by adding 24h.

The Daily Quest exists every day, independent of the weekly training plan. A day becomes a rest day only when the user taps **"Rest today"** (available any day, no limit). **Rest is always allowed and never penalized.**

## 6. Game rules (all numbers in `config/progression.ts`)

- **XP to next level:** `round(80 × L^1.3)`. Overflow carries over; multiple level-ups in one award are supported.
- **Ranks by level:** E 1–9, D 10–19, C 20–34, B 35–49, A 50–69, S 70+.
- **Stat points:** +3 per level, +5 extra on rank-up. Assigned manually; unspent points are kept. Stats are a character sheet only; they don't change difficulty.
- **Daily Quest items:** push-ups, sit-ups, squats, walk/run.

| Tier | Push-ups | Sit-ups | Squats | Cardio |
|---|---|---|---|---|
| never (gentle) | 5 knee/wall | 10 crunches | 10 chair squats | 10 min walk |
| beginner | 10 | 15 | 15 | 15 min walk |
| intermediate | 20 | 25 | 30 | 20 min jog |
| advanced | 30 | 40 | 40 | 25 min run |

  Targets scale by +5% per level above 1 (rounded), capped so no target exceeds 110% of the same item's target 7 days earlier. Gentle variants are always shown as an option.
- **Daily Quest XP:** `60 + 5 × level` when all items are done; partial completion gives proportional XP (average fraction of each item's target done, each capped at 100%), awarded when the user taps "Finish for today" or automatically at the daily reset. A partially completed day still counts as `missed` for the streak and penalty.
- **Penalty quest:** one small item (e.g. 10 min walk or 15 squats, tier-scaled); reward 20 XP; skipping has no further consequence.
- **Side quests:** user-created (title, XP 10–50, stat). Every 5 completions → +1 to that stat.
- **Urgent Quest:** on first open of a day, 30% chance; short optional task (e.g. 30 s plank, a glass of water, 5 min stretch); 25 XP bonus; max once per day. Randomness is injected so tests are deterministic.
- **Exercise rank:** ratio of current best to first logged result. Weighted: estimated 1RM by Epley (`w × (1 + reps/30)`); bodyweight: best reps. E < 1.10, D ≥ 1.10, C ≥ 1.25, B ≥ 1.50, A ≥ 1.75, S ≥ 2.00.
- **PRs:** heaviest weight per exercise, best estimated 1RM, best reps.
- **Achievements → titles:** First quest → "The Awakened"; 7-day streak → "Unbroken"; 30-day streak → "Iron Will"; first PR → "Limit Breaker"; first S-rank exercise → "Apex"; level 10 → "Gatecrasher"; 100 quests → "Relentless". The user picks which unlocked title to display.

## 7. Screens

Bottom tab bar (≥44 px targets, safe-area padded): **Status · Quests · Training · Nutrition · Settings**.

- **Awakening** (first run): name, age, sex, height, weight, goal, experience, days/week, minutes/session, equipment → one-time medical notice (must acknowledge) → "Player Registered" status window with typewriter text and chime. The "Begin" tap unlocks audio and requests persistent storage once.
- **Status:** name, title (selectable), level, rank badge, XP bar, 5 stats with +/- for assigning points (confirm to lock in), streak. Backup reminder banner when last backup > 7 days old (or never, and install > 7 days old).
- **Quests:** Daily Quest (tap to check, or type reps), penalty quest, urgent quest, side quest list with create/edit/complete/archive, "Rest today" button.
- **Training:** weekly plan (1–3 days/week full body; 4+ upper/lower split; exercise choice by equipment, always with a no-equipment alternative), per-exercise set logger (reps, kg), PRs and rank per exercise. Week-over-week planned volume never grows > 10%.
- **Nutrition:** today's targets vs logged totals (kcal, protein, carbs, fat, water); quick-add form (kcal, protein, water); explanation when the safety floor applied.
- **Settings:** export backup, import backup (validate → summary → confirm), last backup date, persistent storage status, sound on/off, edit onboarding answers (progress kept), medical notice, known limits.
- **Level Up overlay:** ~2 s animation + sound, tap to skip, shows new level/rank and points gained.
- **Install guide overlay:** shown on first launch when not in standalone mode: Share → Add to Home Screen → open from the icon. Hidden in standalone mode.

## 8. Nutrition (`domain/nutrition.ts`, sources in comments)

- BMR — Mifflin MD, St Jeor ST et al., Am J Clin Nutr 1990: men `10w + 6.25h − 5a + 5`; women `10w + 6.25h − 5a − 161`.
- Activity multipliers (standard): 0–1 days 1.2; 2–3 days 1.375; 4–5 days 1.55; 6–7 days 1.725.
- Goal: lose fat −20% of TDEE, deficit capped at 500 kcal; build muscle +10%; get fit = maintenance.
- Safety floor: target ≥ max(BMR, 1500 kcal men / 1200 kcal women); UI explains when applied.
- Protein 1.6 g/kg (ISSN position stand on protein and exercise, 2017: 1.4–2.0 g/kg). Fat 25% of kcal (within the AMDR 20–35%). Carbs = remainder.
- Water: EFSA 2010 adequate intake, 2.0 L/day women, 2.5 L/day men.
- Food log is manual (kcal, protein, water). No food database in v1.

## 9. iPhone and PWA requirements

- Manifest: name "Ashborn", short_name "Ashborn", `display: standalone`, `start_url`/`scope` `/ashborn/`, theme and background near-black.
- Icons: original SVG emblem, rendered to PNG by a Playwright script: `apple-touch-icon` 180×180, 192, 512, 512 maskable.
- `viewport-fit=cover`; `env(safe-area-inset-*)` on header/tab bar/overlays.
- All inputs ≥ 16 px font.
- No Vibration API; feedback is visual + sound.
- Audio: a single `AudioContext` resumed on the first user tap; every play wrapped in try/catch; sound toggle in Settings.
- Standalone detection: `navigator.standalone === true || matchMedia('(display-mode: standalone)').matches`.
- `navigator.storage.persist()` requested once after a user tap; result (`granted`/`denied`/`unsupported`) stored and shown in Settings.
- Service worker via vite-plugin-pwa (`generateSW`, precache all build assets, `registerType: 'autoUpdate'`); fully offline after first load.

## 10. Design direction

Near-black background (`#05070d`-ish), electric blue glow (`#3ab8ff`-ish) on system windows, thin 1 px borders, subtle hologram shimmer. System messages type out with a soft chime. Mobile-first, one-handed, bottom tabs, readable sizes, WCAG AA contrast, labels/aria for screen readers. `prefers-reduced-motion`: typewriter shows instantly, shimmer/pulse off, level-up becomes a fade. Animations < 400 ms except level-up.

## 11. Safety

- One-time medical notice ("not medical advice; check with a doctor before starting a new program"), re-readable in Settings.
- No extreme calorie deficits (floor above).
- No planned volume jump > ~10% week over week (daily quest and weekly plan).
- Rest always allowed, never penalized. Penalty quests are small and safe.

## 12. Backup and restore

- Export: JSON `{ app: "ashborn", schemaVersion, exportedAt, data: { <table>: rows[] } }`, downloaded as `ashborn-backup-YYYY-MM-DD.json`; updates `lastBackupAt`.
- Import: parse → check `app === "ashborn"` → reject `schemaVersion` newer than the app → migrate older versions → validate every row's shape (hand-written validators, no extra library) → show summary (player level, days of history, sets logged) → confirm → replace all tables in one Dexie transaction. Invalid files produce a clear error and change nothing.
- Reminder banner if last backup > 7 days old.

## 13. Testing and quality

- **Vitest unit tests:** XP/levels/overflow/stat points; rank boundaries; daily quest generation per tier/equipment and the 10% cap; daily reset (missed, multi-missed single penalty, rest, after-midnight, DST); penalty/urgent rules; exercise rank, Epley, PRs; achievements; nutrition worked examples, floor, macros; backup round-trip, rejection cases, migration; Dexie migrations on `fake-indexeddb`.
- **Playwright (WebKit, iPhone 15 device profile):** onboarding → Player Registered; complete daily quest → XP increases; level-up overlay → assign stat points.
- **Gates:** `typecheck`, `lint`, `test`, `e2e`, `build` all pass with zero errors before any task is reported done.

## 14. Deploy

GitHub Actions on push to `main`: `npm ci` → typecheck → lint → unit tests → build → `actions/upload-pages-artifact` → `actions/deploy-pages`. E2E runs locally (can be added to CI later). The owner creates the `ebon6011/ashborn` repo, pushes, and sets Pages source to "GitHub Actions".

## 15. Known limits (documented, not worked around)

No Apple Health or step counting (manual entry). No home-screen widgets. No reminders in v1 (web push needs a server; phase 2). Data lives only on the device; deleting the app or clearing Safari data erases it unless backed up.

## 16. Phase 2 (not in v1)

Web push reminders (e.g. Cloudflare Worker cron; cost and setup explained before building), optional cloud sync, progress charts.

## 17. Deliverables

Zero-error build and lint; unit + e2e tests above; GitHub Actions deploy workflow; plain-language `README.md` (run locally, publish, install on iPhone, backup/restore, done vs planned); `docs/plan.md` kept current; a git commit after every completed task.
