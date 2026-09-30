import { describe, expect, it } from 'vitest';
import { ALL_BOSSES, BOSSES, getBoss, RETIRED_BOSSES } from '../config/bosses';
import { progression } from '../config/progression';
import {
  applyDamage,
  bossDaysLeft,
  bossForWeek,
  bossMaxHp,
  bossRewardXp,
  bossScale,
  createBossRecord,
  exerciseBossCategory,
  hitDamage,
  penaltyCategory,
  plannedSetsPerDay,
  questItemCategory,
  trainingSetBase,
} from './boss';
import { addDays } from './day';
import type { BossRecord } from './types';

const S = progression.boss.sessionDamage;
/** One full daily quest: four items of a quarter session each, none on the weakness. */
const fullSession = (boss: BossRecord) => 4 * hitDamage(boss, S / 4, null);

describe('roster and rotation', () => {
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

  it('never repeats the same boss two weeks running, and cycles every 8 weeks', () => {
    const start = '2026-09-28';
    for (let i = 0; i < 20; i++) {
      const a = bossForWeek(addDays(start, 7 * i)).id;
      expect(bossForWeek(addDays(start, 7 * (i + 1))).id).not.toBe(a);
      expect(bossForWeek(addDays(start, 7 * (i + 8))).id).toBe(a);
    }
    expect(bossForWeek('2025-12-29').id).toBeTruthy(); // weeks before the epoch still work
  });
});

describe('scaling', () => {
  it('HP numbers grow with level and experience', () => {
    expect(bossMaxHp(bossScale(1, 'beginner'))).toBe(360);
    expect(bossScale(20, 'advanced')).toBeGreaterThan(bossScale(1, 'beginner'));
  });

  it.each([
    ['never', 1],
    ['beginner', 1],
    ['beginner', 12],
    ['intermediate', 7],
    ['advanced', 20],
    ['advanced', 55],
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
    expect(hitDamage(boss, 0, null)).toBe(0);
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
    const hit = applyDamage({ ...boss, hp: 20 }, 50, now);
    expect(hit.boss.hp).toBe(0);
    expect(hit.defeatedNow).toBe(true);
    expect(hit.boss.defeatedAt).toBe(now.toISOString());
    const again = applyDamage(hit.boss, 50, now);
    expect(again.defeatedNow).toBe(false);
    expect(again.boss).toEqual(hit.boss);
  });

  it('splits a training session over the planned sets and caps base damage per day', () => {
    expect(
      plannedSetsPerDay({
        weekStart: '2026-09-28',
        days: [
          { weekday: 1, focus: 'full', exercises: [{ exerciseId: 'pushup', sets: 2, reps: 10 }, { exerciseId: 'dead-bug', sets: 2, reps: 10 }] },
          { weekday: 3, focus: 'full', exercises: [{ exerciseId: 'pushup', sets: 4, reps: 10 }] },
        ],
      }),
    ).toBe(4);
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
