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
  /** Streak Shields held. */
  shields: number;
}

export interface ProcessDaysResult {
  closed: DayRecord[];
  streak: number;
  xpToAward: number;
  needsPenalty: boolean;
  currentDate: string;
  /** Shields spent to keep the streak (0 when none could save it). */
  shieldsUsed: number;
}

function missedPlaceholder(date: string): DayRecord {
  return { date, items: [], status: 'missed', penalty: null, urgent: null, xpAwarded: 0 };
}

export function processDays(input: ProcessDaysInput): ProcessDaysResult {
  const { lastOpenDate, today, level } = input;
  let streak = input.streak;

  if (lastOpenDate === null || today <= lastOpenDate) {
    const currentDate = lastOpenDate !== null && today < lastOpenDate ? lastOpenDate : today;
    return { closed: [], streak, xpToAward: 0, needsPenalty: false, currentDate, shieldsUsed: 0 };
  }

  const dates = dateRange(lastOpenDate, today);
  const firstRecorded = Math.max(0, dates.length - MAX_BACKFILL_DAYS);
  const closed: DayRecord[] = [];
  let xpToAward = 0;
  let needsPenalty = false;

  // Days that would break the streak: not done, not rest, not already closed as missed.
  const breaking = new Set(
    dates.filter((date) => {
      const record = input.days[date];
      return !(record && (record.status === 'done' || record.status === 'rest' || record.status === 'missed'));
    }),
  );
  // Shields only spend when there is a streak to save and they can cover every breaking day.
  const shielded = input.streak > 0 && breaking.size > 0 && breaking.size <= input.shields;
  const mark = shielded ? { shielded: true as const } : {};

  dates.forEach((date, index) => {
    const record = input.days[date];
    if (!breaking.has(date)) return;

    needsPenalty = true;
    if (!shielded) streak = 0;

    if (!record) {
      if (index >= firstRecorded) closed.push({ ...missedPlaceholder(date), ...mark });
      return;
    }

    let xpAwarded = record.xpAwarded;
    if (record.status === 'open' || record.status === 'partial') {
      const earned = partialXp(record.items, level) - record.xpAwarded;
      if (earned > 0) {
        xpToAward += earned;
        xpAwarded += earned;
      }
    }
    closed.push({ ...record, status: 'missed', xpAwarded, ...mark });
  });

  return { closed, streak, xpToAward, needsPenalty, currentDate: today, shieldsUsed: shielded ? breaking.size : 0 };
}
