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
