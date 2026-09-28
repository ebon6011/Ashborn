# Weekly Boss (v1.4.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native, in-session), with superpowers:test-driven-development and superpowers:verification-before-completion. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A new original Boss every Monday whose HP the week's quests and training wear down (weakness = double), with bonus XP and a Boss title on victory and no penalty on defeat.

**Architecture:** Pure rules in `src/domain/boss.ts` (+ roster in `src/config/bosses.ts`, numbers in `src/config/progression.ts`). A new Dexie table `bosses` (schema v2, key `weekStart`) holds one record per week. `src/db/repo/boss.ts` creates the week's Boss and applies damage inside the existing write transactions; the existing quest/set/side-quest repo functions call it. UI: a Boss window on Status and a "Boss defeated" overlay via the existing event queue.

**Tech Stack:** existing only.

**Spec:** `docs/superpowers/specs/2026-09-28-weekly-boss-design.md`

## Global Constraints
- CLAUDE.md Update Rules (TDD; never lose data → versioned migration + upgrade test; v1.4.0 + changelog; original only; no packages; iPhone-first; balance numbers only in `src/config/progression.ts`; commit per task).
- Week = Monday 00:00 → Sunday 23:59 local (`weekStartOf`, date keys).
- HP rounds DOWN, damage rounds UP → 3 full sessions always win.
- Victory rewards exactly once. Undefeated Boss: no penalty.

## Review Focus
1. A day's items completed one by one vs all at once → same total damage; re-saving a done item deals nothing (Task 3 test).
2. Logging 40 sets in one day → base training damage stops at 1 session (Task 1 + Task 3 tests).
3. The Boss is defeated by a hit that also levels the player up → both events queue, level-up first (Task 3 test).
4. App not opened on Monday; first open on Thursday → that week's Boss exists and shows 4 days left (Task 3 test).
5. Restoring a v1 backup after updating → imports with an empty Boss history (Task 2 test).

---

### Task 1: Roster, numbers and pure Boss rules

**Files:** Create `src/config/bosses.ts`, `src/domain/boss.ts`, `src/domain/boss.test.ts`. Modify `src/domain/types.ts`, `src/config/progression.ts`.

**Produces:**
```ts
// types.ts
export type BossCategory = 'legs' | 'core' | 'cardio' | 'upper';
export interface BossRecord { weekStart: string; bossId: string; scale: number; maxHp: number; hp: number; defeatedAt: string | null; trainingBase: Record<string, number> }
export type QuestKind = 'daily' | 'penalty' | 'urgent' | 'side' | 'boss';
// GameEvent gains: | { type: 'bossDefeated'; bossId: string; xp: number; title: string | null }
// config/bosses.ts
export type Silhouette = 'colossus' | 'treant' | 'serpent' | 'titan' | 'wraith' | 'hound' | 'brute' | 'knight';
export interface BossDef { id: string; name: string; epithet: string; weakness: BossCategory; title: string; story: string; silhouette: Silhouette }
export const BOSSES: readonly BossDef[];
export function getBoss(id: string): BossDef | undefined;
// domain/boss.ts
export const ROSTER_EPOCH = '2026-01-05';
export function bossForWeek(weekStart: string): BossDef;
export function bossScale(level: number, experience: Experience): number;
export function bossMaxHp(scale: number): number;
export function createBossRecord(weekStart: string, level: number, experience: Experience): BossRecord;
export function questItemCategory(itemId: string): BossCategory | null;
export function exerciseBossCategory(category: ExerciseCategory): BossCategory;
export function penaltyCategory(label: string): BossCategory;
export function hitDamage(boss: BossRecord, base: number, category: BossCategory | null): number;
export function applyDamage(boss: BossRecord, amount: number, now: Date): { boss: BossRecord; defeatedNow: boolean };
export function plannedSetsPerDay(plan: WeekPlan | undefined): number;
export function trainingSetBase(plannedPerDay: number, alreadyToday: number): number;
export function bossRewardXp(level: number): number;
export function bossDaysLeft(weekStart: string, today: string): number;
```

- [ ] **Step 1: Failing tests** `src/domain/boss.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { progression } from '../config/progression';
import { BOSSES } from '../config/bosses';
import { addDays } from './day';
import {
  applyDamage, bossDaysLeft, bossForWeek, bossMaxHp, bossRewardXp, bossScale, createBossRecord, exerciseBossCategory,
  hitDamage, penaltyCategory, plannedSetsPerDay, questItemCategory, trainingSetBase,
} from './boss';

const S = progression.boss.sessionDamage;
const fullSession = (boss: ReturnType<typeof createBossRecord>) =>
  ['pushups', 'situps', 'squats', 'cardio'].map((id) => hitDamage(boss, S / 4, null)).reduce((a, b) => a + b, 0);

describe('roster and rotation', () => {
  it('has 8 original bosses, 2 per weakness, each with its own title', () => {
    expect(BOSSES).toHaveLength(8);
    for (const w of ['legs', 'core', 'cardio', 'upper']) expect(BOSSES.filter((b) => b.weakness === w)).toHaveLength(2);
    expect(new Set(BOSSES.map((b) => b.title)).size).toBe(8);
  });
  it('never repeats the same boss two weeks running, and cycles every 8 weeks', () => {
    const start = '2026-09-28';
    for (let i = 0; i < 20; i++) {
      const a = bossForWeek(addDays(start, 7 * i)).id;
      expect(bossForWeek(addDays(start, 7 * (i + 1))).id).not.toBe(a);
      expect(bossForWeek(addDays(start, 7 * (i + 8))).id).toBe(a);
    }
    expect(bossForWeek('2025-12-29').id).toBeTruthy(); // before the epoch still works
  });
});

describe('scaling', () => {
  it('HP numbers grow with level and experience', () => {
    expect(bossMaxHp(bossScale(1, 'beginner'))).toBe(360);
    expect(bossScale(20, 'advanced')).toBeGreaterThan(bossScale(1, 'beginner'));
  });
  it.each([
    ['never', 1], ['beginner', 1], ['beginner', 12], ['intermediate', 7], ['advanced', 20], ['advanced', 55],
  ] as const)('a %s player at level %i wins in exactly 3 full daily quests (no weakness hits)', (tier, level) => {
    const boss = createBossRecord('2026-09-28', level, tier);
    const session = fullSession(boss);
    expect(2 * session).toBeLessThan(boss.maxHp);
    expect(3 * session).toBeGreaterThanOrEqual(boss.maxHp);
  });
});

describe('damage', () => {
  const boss = createBossRecord('2026-09-28', 1, 'beginner'); // scale 1.2, 360 HP
  it('deals a quarter session per daily item, double on the weakness, rounded up', () => {
    expect(hitDamage(boss, S / 4, null)).toBe(30);
    expect(hitDamage(boss, S / 4, bossForWeek(boss.weekStart).weakness)).toBe(60);
    expect(hitDamage(createBossRecord('2026-09-28', 3, 'beginner'), S / 4, null)).toBe(33); // 25 × 1.32 = 33
  });
  it('maps quest items, exercises and penalties to weaknesses', () => {
    expect(questItemCategory('pushups')).toBe('upper');
    expect(questItemCategory('situps')).toBe('core');
    expect(questItemCategory('squats')).toBe('legs');
    expect(questItemCategory('cardio')).toBe('cardio');
    expect(questItemCategory('penalty')).toBeNull();
    expect(exerciseBossCategory('push')).toBe('upper');
    expect(exerciseBossCategory('pull')).toBe('upper');
    expect(exerciseBossCategory('legs')).toBe('legs');
    expect(exerciseBossCategory('core')).toBe('core');
    expect(penaltyCategory('Walk')).toBe('cardio');
    expect(penaltyCategory('Squats')).toBe('legs');
  });
  it('never goes below 0 HP and reports the defeating hit once', () => {
    const now = new Date('2026-09-30T18:00:00Z');
    const nearly = { ...boss, hp: 20 };
    const hit = applyDamage(nearly, 50, now);
    expect(hit.boss.hp).toBe(0);
    expect(hit.defeatedNow).toBe(true);
    expect(hit.boss.defeatedAt).toBe(now.toISOString());
    const again = applyDamage(hit.boss, 50, now);
    expect(again.defeatedNow).toBe(false);
    expect(again.boss).toEqual(hit.boss);
  });
  it('splits a training session over the planned sets and caps base damage per day', () => {
    expect(plannedSetsPerDay({ weekStart: '2026-09-28', days: [
      { weekday: 1, focus: 'full', exercises: [{ exerciseId: 'pushup', sets: 2, reps: 10 }, { exerciseId: 'dead-bug', sets: 2, reps: 10 }] },
      { weekday: 3, focus: 'full', exercises: [{ exerciseId: 'pushup', sets: 4, reps: 10 }] },
    ] })).toBe(4);
    expect(plannedSetsPerDay(undefined)).toBe(8);
    expect(trainingSetBase(4, 0)).toBe(S / 4);
    expect(trainingSetBase(4, S - 10)).toBe(10);
    expect(trainingSetBase(4, S)).toBe(0);
  });
});

describe('rewards and time', () => {
  it('rewards 100 + 10 per level', () => {
    expect(bossRewardXp(1)).toBe(110);
    expect(bossRewardXp(10)).toBe(200);
  });
  it('counts days left Monday 7 → Sunday 1', () => {
    expect(bossDaysLeft('2026-09-28', '2026-09-28')).toBe(7);
    expect(bossDaysLeft('2026-09-28', '2026-10-01')).toBe(4);
    expect(bossDaysLeft('2026-09-28', '2026-10-04')).toBe(1);
  });
});
```
- [ ] **Step 2:** `npx vitest run src/domain/boss.test.ts` → FAIL (modules missing).
- [ ] **Step 3: Implement.**
  - `types.ts`: add `BossCategory`, `BossRecord`, `'boss'` to `QuestKind`, and the `bossDefeated` `GameEvent` member exactly as in **Produces**.
  - `progression.ts`: extend `ProgressionConfig` with
    ```ts
    boss: {
      sessionsToWin: number; sessionDamage: number; weaknessMultiplier: number;
      chip: { sideQuest: number; penalty: number }; trainingDailyCapSessions: number; defaultSetsPerDay: number;
      scale: { perLevel: number; byTier: Record<Experience, number> }; xpReward: { base: number; perLevel: number };
    };
    ```
    and values `{ sessionsToWin: 3, sessionDamage: 100, weaknessMultiplier: 2, chip: { sideQuest: 0.1, penalty: 0.25 }, trainingDailyCapSessions: 1, defaultSetsPerDay: 8, scale: { perLevel: 0.05, byTier: { never: 1, beginner: 1.2, intermediate: 1.5, advanced: 1.8 } }, xpReward: { base: 100, perLevel: 10 } }` with a comment per line.
  - `config/bosses.ts`: the 8 bosses from the spec table, each with a one-line original `story`:
    - mawgrath: "A walking ruin of fused stone. Every step it takes shakes the gate."
    - vessik: "Its roots drink the strength of anyone who stands still too long."
    - ulgara: "A coiled serpent-queen who crushes the careless in her rings."
    - brakmor: "A titan with a belly of solid rock. Only an iron core can crack it."
    - sylreth: "A wraith of ash that outpaces anything that stops to breathe."
    - korrun: "A hound that never tires. It hunts the ones who stop running."
    - grimhald: "A brute with arms like battering rams. Meet force with force."
    - zereth: "A fallen knight bound in chains, still swinging a blade no one can lift."
  - `domain/boss.ts`:
    ```ts
    import { BOSSES, type BossDef } from '../config/bosses';
    import { progression } from '../config/progression';
    import { daysBetween } from './day';
    import type { BossCategory, BossRecord, ExerciseCategory, Experience, WeekPlan } from './types';

    /** A Monday; rotation counts whole weeks from here. */
    export const ROSTER_EPOCH = '2026-01-05';
    const cfg = progression.boss;

    export function bossForWeek(weekStart: string): BossDef {
      const weeks = Math.floor(daysBetween(ROSTER_EPOCH, weekStart) / 7);
      return BOSSES[((weeks % BOSSES.length) + BOSSES.length) % BOSSES.length]!;
    }
    export function bossScale(level: number, experience: Experience): number {
      return cfg.scale.byTier[experience] * (1 + cfg.scale.perLevel * (Math.max(1, level) - 1));
    }
    export function bossMaxHp(scale: number): number {
      return Math.floor(cfg.sessionsToWin * cfg.sessionDamage * scale);
    }
    export function createBossRecord(weekStart: string, level: number, experience: Experience): BossRecord {
      const scale = bossScale(level, experience);
      const maxHp = bossMaxHp(scale);
      return { weekStart, bossId: bossForWeek(weekStart).id, scale, maxHp, hp: maxHp, defeatedAt: null, trainingBase: {} };
    }
    const ITEM_CATEGORY: Record<string, BossCategory> = { pushups: 'upper', situps: 'core', squats: 'legs', cardio: 'cardio' };
    export function questItemCategory(itemId: string): BossCategory | null {
      return ITEM_CATEGORY[itemId] ?? null;
    }
    export function exerciseBossCategory(category: ExerciseCategory): BossCategory {
      return category === 'push' || category === 'pull' ? 'upper' : category;
    }
    export function penaltyCategory(label: string): BossCategory {
      return /walk|jog|run/i.test(label) ? 'cardio' : 'legs';
    }
    /** Damage for one hit: base (in session-damage points) × the boss's scale, doubled on its weakness, rounded UP. */
    export function hitDamage(boss: BossRecord, base: number, category: BossCategory | null): number {
      if (base <= 0) return 0;
      const weak = category !== null && category === bossForWeek(boss.weekStart).weakness;
      return Math.ceil(base * boss.scale * (weak ? cfg.weaknessMultiplier : 1) - 1e-9);
    }
    export function applyDamage(boss: BossRecord, amount: number, now: Date): { boss: BossRecord; defeatedNow: boolean } {
      if (boss.defeatedAt || amount <= 0) return { boss, defeatedNow: false };
      const hp = Math.max(0, boss.hp - amount);
      return hp === 0
        ? { boss: { ...boss, hp, defeatedAt: now.toISOString() }, defeatedNow: true }
        : { boss: { ...boss, hp }, defeatedNow: false };
    }
    export function plannedSetsPerDay(plan: WeekPlan | undefined): number {
      if (!plan || plan.days.length === 0) return cfg.defaultSetsPerDay;
      const sets = plan.days.reduce((s, d) => s + d.exercises.reduce((t, e) => t + e.sets, 0), 0);
      return Math.max(1, Math.round(sets / plan.days.length));
    }
    /** Base damage for one logged set, respecting the daily training cap (before scale/weakness). */
    export function trainingSetBase(plannedPerDay: number, alreadyToday: number): number {
      const cap = cfg.trainingDailyCapSessions * cfg.sessionDamage;
      return Math.max(0, Math.min(cfg.sessionDamage / Math.max(1, plannedPerDay), cap - alreadyToday));
    }
    export function bossRewardXp(level: number): number {
      return cfg.xpReward.base + cfg.xpReward.perLevel * level;
    }
    /** Monday = 7 … Sunday = 1. */
    export function bossDaysLeft(weekStart: string, today: string): number {
      return Math.max(1, 7 - daysBetween(weekStart, today));
    }
    ```
- [ ] **Step 4:** → PASS; `npm run typecheck; npm run lint`; `npm test` green (QuestKind/GameEvent additions compile everywhere).
- [ ] **Step 5:** commit `feat(boss): original roster, balance numbers and pure boss rules`.

---

### Task 2: Storage v2 — `bosses` table, migrations, backups

**Files:** Modify `src/domain/migrations.ts`, `src/domain/migrations.test.ts`, `src/db/schema.ts`, `src/db/schema.test.ts`, `src/domain/validate.ts`, `src/domain/backup.ts`, `src/domain/backup.test.ts`, `src/db/backup.ts`, `src/test/fixtures.ts`.

- [ ] **Step 1: Failing tests.**
  - `schema.test.ts`: change the store test to `Object.keys(STORES_V2)` vs `BACKUP_TABLES`; add
```ts
  it('upgrades a version 1 database to version 2 without losing anything', async () => {
    const name = `v1-${crypto.randomUUID()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores(STORES_V1);
    const data = sampleBackupData();
    for (const table of Object.keys(STORES_V1) as (keyof typeof STORES_V1)[]) {
      await v1.table(table).bulkPut((data as Record<string, unknown[]>)[table]!);
    }
    v1.close();
    const v2 = new AshbornDB(name);
    for (const table of Object.keys(STORES_V1)) {
      expect(await v2.table(table).toArray()).toEqual((data as Record<string, unknown[]>)[table]);
    }
    expect(await v2.bosses.count()).toBe(0);
    expect(v2.verno).toBe(2);
    v2.close();
  });
```
  - `migrations.test.ts`: `it('step 2 adds an empty boss history to version 1 backups', () => { expect(backupMigrations[2]!({ player: [] })).toEqual({ player: [], bosses: [] }); expect(SCHEMA_VERSION).toBe(2); });`
  - `backup.test.ts`: `it('imports a version 1 backup with an empty boss history', ...)` — build a v1 file: `{ app: 'ashborn', schemaVersion: 1, exportedAt, data: <sampleBackupData() without bosses> }` → `parseBackup` ok, `backup.data.bosses` equals `[]`. And `it('rejects a malformed boss row', ...)` with `bosses: [{ weekStart: 'x' }]` → error mentioning `"bosses"`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: Implement.**
  - `migrations.ts`: `SCHEMA_VERSION = 2`; `BACKUP_TABLES` gains `'bosses'`; `backupMigrations = { 2: (d) => ({ ...d, bosses: Array.isArray(d.bosses) ? d.bosses : [] }) }`.
  - `schema.ts`: `export const STORES_V1 = { …the 10 v1 stores… } as const;` (typed `Record<Exclude<BackupTable, 'bosses'>, string>`), `export const STORES_V2: Record<BackupTable, string> = { ...STORES_V1, bosses: 'weekStart' };`, `declare bosses: Table<BossRecord, string>;`, and in the constructor keep `this.version(1).stores(STORES_V1);` and add `this.version(2).stores(STORES_V2); // adds bosses; no data changes (matches backupMigrations[2])`.
  - `validate.ts`: `kind: oneOf('daily', 'penalty', 'urgent', 'side', 'boss')`; add `bosses: shape({ weekStart: isDateKey, bossId: str, scale: nonNeg, maxHp: count, hp: count, defeatedAt: nullable(str), trainingBase: isRecord })`.
  - `backup.ts` (domain): `BackupData` gains `bosses: BossRecord[]`. `db/backup.ts`: export/import include `bosses`. `fixtures.ts` `sampleBackupData()` gains `bosses: []`.
- [ ] **Step 4:** → PASS; `npm test` green.
- [ ] **Step 5:** commit `feat(boss): schema v2 with a bosses table, migrations and backup support`.

---

### Task 3: Boss engine — weekly creation, damage hooks, victory once

**Files:** Create `src/db/repo/boss.ts`, `src/db/repo/boss.test.ts`. Modify `src/db/repo/days.ts`, `src/db/repo/sideQuests.ts`, `src/db/repo/training.ts`, `src/db/repo/onboarding.ts`, `src/domain/achievements.ts`, `src/domain/achievements.test.ts`.

**Produces:** `ensureWeekBoss(database, date): Promise<void>`; `dealBossDamage(database, hit: { base: number; category: BossCategory | null; date: string }, now): Promise<void>`; `dealTrainingDamage(database, hit: { category: BossCategory; date: string }, now): Promise<void>`; `bossTitleId(bossId): string` (= `boss-${bossId}`); `titleFor` knows Boss titles; `ALL_TITLES: { id: string; title: string; description: string }[]`.

- [ ] **Step 1: Failing tests** `src/db/repo/boss.test.ts` (use `setupPlayer`, `completeDaily`, `neverUrgent`, `at`; 2026-09-28 is a Monday; its Boss is `bossForWeek('2026-09-28')`):
```ts
it('creates this week’s boss on registration and on the first open of a week', async () => {
  const db = await setupPlayer('2026-09-28');
  expect(await db.bosses.get('2026-09-28')).toMatchObject({ hp: 360, maxHp: 360, defeatedAt: null });
  await startDay(db, at('2026-10-08'), neverUrgent); // a Thursday, week of 2026-10-05
  expect(await db.bosses.get('2026-10-05')).toBeTruthy();
});
it('each daily item deals damage once, weakness double', async () => { /* complete items one by one on 2026-09-28; hp = 360 − Σ hitDamage; re-saving an item deals nothing */ });
it('a beginner defeats the boss with 3 full daily quests and is rewarded once', async () => {
  const db = await setupPlayer('2026-09-28');
  for (const d of ['2026-09-28', '2026-09-29', '2026-09-30']) { await startDay(db, at(d), neverUrgent); await completeDaily(db, d); }
  const boss = (await db.bosses.get('2026-09-28'))!;
  expect(boss.hp).toBe(0);
  expect(boss.defeatedAt).not.toBeNull();
  const def = bossForWeek('2026-09-28');
  expect(await db.achievements.get(`boss-${def.id}`)).toBeTruthy();
  const bossXp = (await db.questLog.toArray()).filter((e) => e.kind === 'boss');
  expect(bossXp).toHaveLength(1);
  const events = (await getMeta(db, 'pendingEvents')) ?? [];
  expect(events.filter((e) => e.type === 'bossDefeated')).toHaveLength(1);
  await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-10-01'));
  expect((await db.questLog.toArray()).filter((e) => e.kind === 'boss')).toHaveLength(1);
});
it('training sets deal damage up to one session per day', async () => {
  /* setupPlayer 2026-09-28; log 40 push-up sets on 2026-09-28; base capped at 100 → damage = hitDamage(boss, 100, 'upper') at most */
});
it('side quests and the penalty quest chip the boss', async () => { /* side quest −ceil(10×scale); penalty on a missed-day date −ceil(25×scale×(weak?2:1)) */ });
it('a defeating hit that also levels up queues the level-up first', async () => { /* set boss hp 1 and player xp to xpToNext−1; complete one item → events[0].type levelUp, then bossDefeated */ });
it('last week’s boss takes no damage and a new week starts fresh', async () => { /* setupPlayer 2026-09-28; startDay 2026-10-05; complete items; 2026-09-28 boss hp unchanged; 2026-10-05 boss damaged */ });
```
Write each `/* … */` test fully in code while implementing Step 1 (same helpers; assert exact HP numbers computed with `hitDamage`). `achievements.test.ts`: `titleFor('boss-mawgrath')` → `'Colossus Breaker'`; `ALL_TITLES` contains every achievement and all 8 Boss titles.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: Implement** `src/db/repo/boss.ts`:
```ts
import { getBoss } from '../../config/bosses';
import { progression } from '../../config/progression';
import { applyDamage, bossForWeek, bossRewardXp, createBossRecord, hitDamage, plannedSetsPerDay, trainingSetBase } from '../../domain/boss';
import { weekStartOf } from '../../domain/day';
import type { BossCategory } from '../../domain/types';
import { writeTx, type AshbornDB } from '../schema';
import { awardXp, pushEvents } from './player';

export const bossTitleId = (bossId: string) => `boss-${bossId}`;

export async function ensureWeekBoss(database: AshbornDB, date: string): Promise<void> {
  await writeTx(database, async () => {
    const weekStart = weekStartOf(date);
    if (await database.bosses.get(weekStart)) return;
    const [player, profile] = await Promise.all([database.player.get(1), database.profile.get(1)]);
    if (!player || !profile) return;
    await database.bosses.put(createBossRecord(weekStart, player.level, profile.experience));
  });
}

export async function dealBossDamage(database: AshbornDB, hit: { base: number; category: BossCategory | null; date: string }, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const boss = await database.bosses.get(weekStartOf(hit.date));
    if (!boss || boss.defeatedAt) return;
    const { boss: next, defeatedNow } = applyDamage(boss, hitDamage(boss, hit.base, hit.category), now);
    if (next === boss) return;
    await database.bosses.put(next);
    if (!defeatedNow) return;
    const player = await database.player.get(1);
    const def = getBoss(boss.bossId) ?? bossForWeek(boss.weekStart);
    const xp = bossRewardXp(player?.level ?? 1);
    await awardXp(database, { amount: xp, kind: 'boss', refId: boss.weekStart, date: hit.date, countsAsQuest: false }, now);
    const titleId = bossTitleId(def.id);
    const hadTitle = Boolean(await database.achievements.get(titleId));
    if (!hadTitle) await database.achievements.put({ id: titleId, unlockedAt: now.toISOString() });
    await pushEvents(database, [{ type: 'bossDefeated', bossId: def.id, xp, title: hadTitle ? null : def.title }]);
  });
}

export async function dealTrainingDamage(database: AshbornDB, hit: { category: BossCategory; date: string }, now: Date): Promise<void> {
  await writeTx(database, async () => {
    const weekStart = weekStartOf(hit.date);
    const boss = await database.bosses.get(weekStart);
    if (!boss || boss.defeatedAt) return;
    const already = boss.trainingBase[hit.date] ?? 0;
    const base = trainingSetBase(plannedSetsPerDay(await database.workoutPlans.get(weekStart)), already);
    if (base <= 0) return;
    await database.bosses.put({ ...boss, trainingBase: { ...boss.trainingBase, [hit.date]: already + base } });
    await dealBossDamage(database, { base, category: hit.category, date: hit.date }, now);
  });
}

export const CHIP = {
  sideQuest: progression.boss.chip.sideQuest * progression.boss.sessionDamage,
  penalty: progression.boss.chip.penalty * progression.boss.sessionDamage,
};
```
Hooks (all inside the existing transactions):
  - `days.ts` `setItemProgress`: before the `isDailyComplete` branch, for every item whose progress crossed its target in this call (`old.progress < old.target && new.progress >= new.target`), `await dealBossDamage(database, { base: progression.boss.sessionDamage / items.length, category: questItemCategory(item.id), date }, now)`. `setPenaltyProgress`: when it becomes done, `await dealBossDamage(database, { base: CHIP.penalty, category: penaltyCategory(record.penalty.label), date }, now)`. `startDay`: after `ensureWeekPlan`, `await ensureWeekBoss(database, current)`.
  - `sideQuests.ts` `completeSideQuest`: after awarding, `await dealBossDamage(database, { base: CHIP.sideQuest, category: null, date }, now)`.
  - `training.ts` `logSet`: after `workoutSets.add`, `await dealTrainingDamage(database, { category: exerciseBossCategory(exercise.category), date: set.date }, now)`.
  - `onboarding.ts` `registerPlayer`: last line in the transaction `await ensureWeekBoss(database, today)`.
  - `achievements.ts`: `import { BOSSES } from '../config/bosses'`; `export const ALL_TITLES = [...ACHIEVEMENTS.map(({ id, title, description }) => ({ id, title, description })), ...BOSSES.map((b) => ({ id: `boss-${b.id}`, title: b.title, description: `Defeat ${b.name}, ${b.epithet}.` }))];` and `titleFor` searches `ALL_TITLES`.
- [ ] **Step 4:** → PASS; `npm test` green.
- [ ] **Step 5:** commit `feat(boss): weekly boss engine — damage from quests and training, victory rewards once`.

---

### Task 4: Boss on the Status screen and the "Boss defeated" moment

**Files:** Create `src/ui/components/BossSilhouette.tsx`, `src/ui/screens/BossCard.tsx`, `src/ui/screens/BossCard.test.tsx`, `src/ui/overlays/BossDefeatedOverlay.tsx`. Modify `src/ui/screens/StatusScreen.tsx`, `src/ui/overlays/EventHost.tsx`, `src/ui/overlays/EventHost.test.tsx`.

- [ ] **Step 1: Failing tests.** `BossCard.test.tsx` (jsdom, `seedApp('2026-09-28')`):
```tsx
it('shows this week’s boss with HP, weakness and days left', async () => {
  render(<BossCard />);
  const def = bossForWeek('2026-09-28');
  expect(await screen.findByText(def.name)).toBeTruthy();
  expect(screen.getByText(`Weak to ${WEAKNESS_LABEL[def.weakness]}`)).toBeTruthy();
  expect(screen.getByText('360 / 360 HP')).toBeTruthy();
  expect(screen.getByText('7 days left')).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: `${def.name} HP` })).toBeTruthy();
});
it('shows the victory once defeated', async () => {
  await db.bosses.update('2026-09-28', { hp: 0, defeatedAt: '2026-09-30T18:00:00.000Z' });
  render(<BossCard />);
  expect(await screen.findByText('Defeated')).toBeTruthy();
});
```
`EventHost.test.tsx`: a pending `{ type: 'bossDefeated', bossId: 'mawgrath', xp: 110, title: 'Colossus Breaker' }` shows a dialog named "Boss defeated" containing "Mawgrath", "+110 XP" and "Colossus Breaker"; Continue removes it.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: Implement.**
  - `BossSilhouette.tsx`: `({ silhouette, className }) => <svg viewBox="0 0 100 100" aria-hidden …><path d={SHAPES[s].path} fill="#02040a" stroke="rgb(58 184 255 / 0.5)" strokeWidth={1}/>{eyes as two small #3ab8ff circles}</svg>` with original paths:
    - colossus `M14 100 L18 62 C14 58 12 50 16 44 L26 40 C30 30 38 24 50 24 C62 24 70 30 74 40 L84 44 C88 50 86 58 82 62 L86 100 Z`, eyes (44,36) (56,36)
    - treant `M40 100 L42 70 L30 58 L22 36 L30 40 L34 30 L38 44 L44 30 L50 16 L56 30 L62 44 L66 30 L70 40 L78 36 L70 58 L58 70 L60 100 Z`, eyes (46,40) (54,40)
    - serpent `M20 100 C20 80 40 78 50 70 C62 60 44 50 50 38 C54 28 68 26 72 34 C76 42 70 46 64 44 C60 52 76 60 70 74 C64 88 44 86 44 100 Z`, eyes (62,34) (68,33)
    - titan `M22 100 L26 50 L18 46 L24 30 L40 28 L42 18 L58 18 L60 28 L76 30 L82 46 L74 50 L78 100 Z`, eyes (46,24) (54,24)
    - wraith `M50 18 C58 18 62 26 62 34 L90 30 L70 48 L78 100 L64 86 L56 100 L50 88 L44 100 L36 86 L22 100 L30 48 L10 30 L38 34 C38 26 42 18 50 18 Z`, eyes (46,28) (54,28)
    - hound `M8 100 L14 74 C14 64 24 58 36 58 L60 58 C66 50 70 40 80 38 L88 30 L90 42 L94 48 L86 56 L84 70 L88 100 L76 100 L72 80 L40 80 L32 100 Z`, eyes (84,42) (88,44)
    - brute `M30 100 L32 66 L14 70 L10 52 L26 42 C28 32 38 26 50 26 C62 26 72 32 74 42 L90 52 L86 70 L68 66 L70 100 Z`, eyes (45,36) (55,36)
    - knight `M38 100 L40 64 L30 60 L32 40 L40 36 L40 24 L50 14 L60 24 L60 36 L68 40 L70 60 L60 64 L62 100 Z M72 20 L76 20 L76 80 L72 80 Z`, eyes (46,28) (54,28)
  - `BossCard.tsx`: `export const WEAKNESS_LABEL: Record<BossCategory, string> = { legs: 'legs', core: 'core', cardio: 'cardio', upper: 'upper body' };` reads `lastOpenDate` → `weekStartOf` → `db.bosses.get`; renders a `SystemWindow title="Weekly Boss"`: silhouette (h-24), name + epithet, `Weak to …` badge, `ProgressBar label={`${name} HP`}`, `{hp} / {maxHp} HP`, `{n === 1 ? 'Last day' : `${n} days left`}`, story; when defeated: "Defeated" + reward line (XP from `bossRewardXp` is shown via the questLog entry of kind `boss` for that week, title via `titleFor(bossTitleId)`).
  - `StatusScreen.tsx`: render `<BossCard />` after the Status window. Titles select/list use `ALL_TITLES` (list shows achievements always, Boss titles only once unlocked).
  - `BossDefeatedOverlay.tsx`: like `LevelUpOverlay` (gold glow + particles, `playSound('rankUp')`, one-shot guard): dialog `aria-label="Boss defeated"`, text "BOSS DEFEATED", `{name}, {epithet}`, `+{xp} XP`, and either `Title unlocked: {title}` or nothing, button "Continue". `EventHost` renders it for `bossDefeated`.
- [ ] **Step 4:** → PASS; `npm test` green.
- [ ] **Step 5:** commit `feat(boss): weekly boss on the Status screen and a Boss defeated moment`.

---

### Task 5: Release 1.4.0, docs, e2e, verify

**Files:** Modify `src/data/changelog.ts`, `package.json` (`npm version 1.4.0 --no-git-tag-version`), `README.md`, `docs/credits.md`, `e2e/onboarding.spec.ts`.

- [ ] **Step 1:** Bump to 1.4.0 → `npx vitest run src/data` FAILS (guard) → add changelog entry `{ version: '1.4.0', date: '2026-09-28', notes: ['A new Boss appears every Monday. Work out and finish quests to deal damage — hit its weakness for double.', 'Beat it by Sunday for bonus XP and a rare title. Miss it? No problem, a new one arrives next week.'] }` → PASS.
- [ ] **Step 2:** e2e: in `onboarding.spec.ts` first test, also `await expect(page.getByRole('heading', { name: 'Weekly Boss' })).toBeVisible();` and the HP text matches `/\d+ \/ \d+ HP/`.
- [ ] **Step 3:** README "Done" gains "Weekly Boss fights with original bosses and titles"; `docs/credits.md` Art gains "Boss silhouettes (`src/ui/components/BossSilhouette.tsx`): original, drawn in code".
- [ ] **Step 4: Verify.** `npm run check`; `npm run e2e` (incl. load speed); `npm run size` vs v1.3.0 (code 439.1 KB / gzip 136.1 KB). Browser pane (mobile): Status shows the Boss window; complete the daily quest → HP drops; set HP to 1 via the app's modules and complete an item → Boss defeated window.
- [ ] **Step 5:** commit `chore(release): v1.4.0 — weekly boss`; ask the owner before pushing.
