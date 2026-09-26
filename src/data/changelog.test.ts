import { describe, expect, it } from 'vitest';
import { isDateKey } from '../domain/day';
import { CHANGELOG, compareVersions, PRE_TRACKING_VERSION, unseenEntries, type ChangelogEntry } from './changelog';

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

describe('unseenEntries', () => {
  const log: ChangelogEntry[] = [
    { version: '1.3.0', date: '2026-10-05', notes: ['c'] },
    { version: '1.2.0', date: '2026-09-27', notes: ['b'] },
    { version: '1.1.0', date: '2026-09-27', notes: ['a'] },
  ];
  it('returns entries newer than the last seen version, newest first', () => {
    expect(unseenEntries(log, '1.1.0').map((e) => e.version)).toEqual(['1.3.0', '1.2.0']);
  });
  it('returns nothing when the player has seen the latest', () => {
    expect(unseenEntries(log, '1.3.0')).toEqual([]);
    expect(unseenEntries(log, '9.0.0')).toEqual([]);
  });
  it('treats installs from before tracking as having seen 1.1.0', () => {
    expect(PRE_TRACKING_VERSION).toBe('1.1.0');
  });
});
