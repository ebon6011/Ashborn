import { describe, expect, it } from 'vitest';
import { CLASSES, CLASS_IDS, getClass } from '../config/classes';
import { canChangeClass, classMultiplier, daysUntilClassChange, sideQuestXp, trialAvailable, trialItems } from './classes';
import { generateDailyItems } from './quests/daily';

const chosen = (classChosenAt: string) => ({ trialDone: true, classId: 'ironclad' as const, classChosenAt });

describe('classes', () => {
  it('has 4 original classes with stable ids, stats and focus', () => {
    expect(CLASS_IDS).toEqual(['ironclad', 'galestrider', 'bulwark', 'wayfarer']);
    expect(CLASSES.map((c) => [c.id, c.stat, c.focus])).toEqual([
      ['ironclad', 'strength', 'pushups'],
      ['galestrider', 'agility', 'cardio'],
      ['bulwark', 'endurance', 'squats'],
      ['wayfarer', 'discipline', null],
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

  it('a wrong phone clock never stretches the wait past 30 days', () => {
    // Chosen while the clock was a year fast; the clock is now correct.
    expect(daysUntilClassChange(chosen('2027-10-01'), '2026-10-09')).toBe(30);
    expect(canChangeClass(chosen('2027-10-01'), '2026-10-09')).toBe(false);
  });
});
