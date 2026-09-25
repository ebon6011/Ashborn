import { describe, expect, it } from 'vitest';
import { migrateBackupData } from './migrations';

describe('migrateBackupData', () => {
  const steps = {
    2: (d: Record<string, unknown[]>) => ({ ...d, notes: [] }),
    3: (d: Record<string, unknown[]>) => ({ ...d, extra: [1] }),
  };

  it('applies each step from the file version up to the app version', () => {
    expect(migrateBackupData({ player: [] }, 1, 3, steps)).toEqual({ player: [], notes: [], extra: [1] });
  });

  it('does nothing when versions match', () => {
    expect(migrateBackupData({ player: [] }, 3, 3, steps)).toEqual({ player: [] });
  });

  it('throws when a step is missing', () => {
    expect(() => migrateBackupData({}, 1, 4, steps)).toThrow('No migration to schema version 4.');
  });
});
