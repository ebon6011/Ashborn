import { describe, expect, it } from 'vitest';
import { addDays } from './day';
import { MAX_BACKFILL_DAYS, processDays } from './dayCycle';
import { createDayRecord, partialXp } from './quests/daily';
import type { DayRecord } from './types';

const open = (date: string): DayRecord => createDayRecord(date, 'beginner', 1, null);
const base = { streak: 5, level: 1, shields: 0 };

describe('processDays', () => {
  it('does nothing on the very first run', () => {
    const r = processDays({ ...base, lastOpenDate: null, today: '2026-09-25', days: {} });
    expect(r).toEqual({ closed: [], streak: 5, xpToAward: 0, needsPenalty: false, currentDate: '2026-09-25', shieldsUsed: 0 });
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

  it('does not re-award XP for a day already finished as partial with no further progress', () => {
    const day = { ...open('2026-09-24'), status: 'partial' as const, xpAwarded: 16 };
    const r = processDays({ ...base, lastOpenDate: '2026-09-24', today: '2026-09-25', days: { '2026-09-24': day } });
    expect(r.xpToAward).toBe(0);
    expect(r.closed[0]).toMatchObject({ status: 'missed', xpAwarded: 16 });
    expect(r.needsPenalty).toBe(true);
  });

  it('awards the missing XP for a partial day whose items progressed further before midnight', () => {
    const day = { ...open('2026-09-24'), status: 'partial' as const, xpAwarded: 16 };
    for (let i = 1; i < day.items.length; i++) {
      day.items[i] = { ...day.items[i]!, progress: day.items[i]!.target };
    }
    const expectedXp = partialXp(day.items, base.level) - 16;
    const r = processDays({ ...base, lastOpenDate: '2026-09-24', today: '2026-09-25', days: { '2026-09-24': day } });
    expect(expectedXp).toBeGreaterThan(0);
    expect(r.xpToAward).toBe(expectedXp);
    expect(r.closed[0]).toMatchObject({ status: 'missed', xpAwarded: 16 + expectedXp });
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
    expect(r).toEqual({ closed: [], streak: 5, xpToAward: 0, needsPenalty: false, currentDate: '2026-09-25', shieldsUsed: 0 });
  });
});

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
    expect(r.closed).toHaveLength(2);
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
