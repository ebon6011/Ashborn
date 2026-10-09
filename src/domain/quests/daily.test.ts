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

describe('class quest mix', () => {
  it('no class and Wayfarer are identical to the v1.6.0 quest', () => {
    const base = generateDailyItems('beginner', 12, null);
    expect(generateDailyItems('beginner', 12, null, null)).toEqual(base);
    expect(generateDailyItems('beginner', 12, null, 'wayfarer')).toEqual(base);
  });

  it.each([
    ['ironclad', 'pushups'],
    ['galestrider', 'cardio'],
    ['bulwark', 'squats'],
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
