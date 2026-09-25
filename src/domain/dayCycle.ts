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
    if (record.status === 'open' || record.status === 'partial') {
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
