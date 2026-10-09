import { describe, expect, it } from 'vitest';
import { backupMigrations, migrateBackupData, SCHEMA_VERSION } from './migrations';

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

  it('step 2 adds an empty boss history to version 1 backups', () => {
    expect(backupMigrations[2]!({ player: [] })).toEqual({ player: [], bosses: [] });
    expect(backupMigrations[2]!({ bosses: [{ weekStart: '2026-09-28' }] })).toEqual({ bosses: [{ weekStart: '2026-09-28' }] });
  });

  it('step 3 adds an empty inventory and default equipped items / Shields, keeping existing values', () => {
    expect(backupMigrations[3]!({ player: [{ id: 1, level: 4 }] })).toEqual({
      player: [{ id: 1, level: 4, themeId: null, frameId: null, shields: 0 }],
      inventory: [],
    });
    expect(backupMigrations[3]!({ player: [{ id: 1, shields: 2, themeId: 'theme-ember' }], inventory: [{ itemId: 'theme-ember' }] })).toEqual({
      player: [{ id: 1, shields: 2, themeId: 'theme-ember', frameId: null }],
      inventory: [{ itemId: 'theme-ember' }],
    });
  });

  it('step 4 adds the class fields with safe defaults, keeping existing values', () => {
    expect(SCHEMA_VERSION).toBe(4);
    expect(backupMigrations[4]!({ player: [{ id: 1, level: 12 }] })).toEqual({
      player: [{ id: 1, level: 12, classId: null, classChosenAt: null, trialDone: false }],
    });
    expect(backupMigrations[4]!({ player: [{ id: 1, classId: 'bulwark', classChosenAt: '2026-10-01', trialDone: true }] })).toEqual({
      player: [{ id: 1, classId: 'bulwark', classChosenAt: '2026-10-01', trialDone: true }],
    });
  });
});
