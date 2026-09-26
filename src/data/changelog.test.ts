import { describe, expect, it } from 'vitest';
import { isDateKey } from '../domain/day';
import { CHANGELOG, compareVersions } from './changelog';

describe('changelog', () => {
  it('has an entry for the current app version at the top (rule: every release adds one)', () => {
    expect(CHANGELOG[0]?.version).toBe(__APP_VERSION__);
  });

  it('lists versions newest first, each once', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(compareVersions(CHANGELOG[i - 1]!.version, CHANGELOG[i]!.version)).toBeGreaterThan(0);
    }
  });

  it('gives every entry a real date and at least one note', () => {
    for (const entry of CHANGELOG) {
      expect(isDateKey(entry.date)).toBe(true);
      expect(entry.notes.length).toBeGreaterThan(0);
      for (const note of entry.notes) expect(note.trim().length).toBeGreaterThan(0);
    }
  });

  it('compares versions numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBeLessThan(0);
  });
});
