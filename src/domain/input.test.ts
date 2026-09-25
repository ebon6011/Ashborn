import { describe, expect, it } from 'vitest';
import { parseNumberInput } from './input';

const reps = { min: 0, max: 1000, integer: true };
const kg = { min: 0, max: 1000 };

describe('parseNumberInput', () => {
  it('parses normal numbers and trims spaces', () => {
    expect(parseNumberInput('20', reps)).toBe(20);
    expect(parseNumberInput('  20 ', reps)).toBe(20);
    expect(parseNumberInput('72.5', kg)).toBe(72.5);
    expect(parseNumberInput('.5', kg)).toBe(0.5);
  });

  it('accepts a comma decimal from European keyboards', () => {
    expect(parseNumberInput('72,5', kg)).toBe(72.5);
  });

  it('rejects blanks, words, exponents and out-of-range values', () => {
    expect(parseNumberInput('', reps)).toBeNull();
    expect(parseNumberInput('abc', reps)).toBeNull();
    expect(parseNumberInput('1e9', kg)).toBeNull();
    expect(parseNumberInput('-5', reps)).toBeNull();
    expect(parseNumberInput('1001', reps)).toBeNull();
  });

  it('rejects decimals where whole numbers are required', () => {
    expect(parseNumberInput('12.5', reps)).toBeNull();
  });
});
