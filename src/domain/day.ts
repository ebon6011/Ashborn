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
