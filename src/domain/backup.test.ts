import { describe, expect, it } from 'vitest';
import { sampleBackupData } from '../test/fixtures';
import { backupFileName, buildBackup, needsBackupReminder, parseBackup } from './backup';
import { SCHEMA_VERSION } from './migrations';

const NOW = new Date('2026-09-25T10:00:00.000Z');
const text = (value: unknown) => JSON.stringify(value);
const file = () => buildBackup(sampleBackupData(), NOW);

describe('buildBackup / backupFileName', () => {
  it('wraps data with app name, schema version and time', () => {
    expect(file()).toMatchObject({ app: 'ashborn', schemaVersion: SCHEMA_VERSION, exportedAt: NOW.toISOString() });
    expect(backupFileName(new Date(2026, 8, 25, 23, 0))).toBe('ashborn-backup-2026-09-25.json');
  });
});

describe('parseBackup', () => {
  it('accepts its own export and summarises it', () => {
    const result = parseBackup(text(file()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data).toEqual(sampleBackupData());
    expect(result.summary).toEqual({ playerName: 'Kai', level: 7, rank: 'E', daysOfHistory: 1, setsLogged: 1, exportedAt: NOW.toISOString() });
  });

  it('rejects text that is not JSON', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'This file is not valid JSON.' });
  });

  it('rejects JSON from another app', () => {
    expect(parseBackup(text({ app: 'other', schemaVersion: 1, data: {} }))).toEqual({ ok: false, error: 'This file is not an Ashborn backup.' });
    expect(parseBackup(text([1, 2]))).toEqual({ ok: false, error: 'This file is not an Ashborn backup.' });
  });

  it('rejects a backup from a newer app version', () => {
    const result = parseBackup(text({ ...file(), schemaVersion: SCHEMA_VERSION + 1 }));
    expect(result).toEqual({ ok: false, error: 'This backup was made by a newer version of Ashborn. Update the app, then try again.' });
  });

  it('rejects a missing table', () => {
    const f = file();
    const { foodLog: _removed, ...rest } = f.data;
    void _removed;
    expect(parseBackup(text({ ...f, data: rest }))).toEqual({ ok: false, error: 'This backup is missing "foodLog".' });
  });

  it('rejects a row with a wrong field type', () => {
    const f = file();
    const bad = { ...f, data: { ...f.data, player: [{ ...f.data.player[0], level: '7' }] } };
    expect(parseBackup(text(bad))).toEqual({ ok: false, error: 'This backup has an invalid entry in "player" (item 1).' });
  });

  it('rejects a backup without a player', () => {
    const f = file();
    expect(parseBackup(text({ ...f, data: { ...f.data, player: [] } }))).toEqual({ ok: false, error: 'This backup has no player data.' });
  });

  it('upgrades an older backup through the migration steps', () => {
    const f = file();
    const { player, ...rest } = f.data;
    const v1 = { ...f, schemaVersion: 1, data: { ...rest, players: player } };
    const steps = { 2: (d: Record<string, unknown[]>) => { const { players, ...others } = d; return { ...others, player: players ?? [] }; } };
    const result = parseBackup(text(v1), 2, steps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.schemaVersion).toBe(2);
  });
});

describe('needsBackupReminder', () => {
  const day = 86_400_000;
  it('reminds when the last backup is older than 7 days', () => {
    expect(needsBackupReminder(NOW, new Date(NOW.getTime() - 8 * day).toISOString(), undefined)).toBe(true);
    expect(needsBackupReminder(NOW, new Date(NOW.getTime() - 6 * day).toISOString(), undefined)).toBe(false);
  });

  it('counts from install when there has never been a backup', () => {
    expect(needsBackupReminder(NOW, undefined, new Date(NOW.getTime() - 8 * day).toISOString())).toBe(true);
    expect(needsBackupReminder(NOW, undefined, new Date(NOW.getTime() - 1 * day).toISOString())).toBe(false);
    expect(needsBackupReminder(NOW, undefined, undefined)).toBe(false);
  });

  it('imports a version 1 backup with an empty boss history', () => {
    const { bosses: _none, ...v1data } = sampleBackupData() as unknown as Record<string, unknown[]>;
    void _none;
    const result = parseBackup(text({ app: 'ashborn', schemaVersion: 1, exportedAt: NOW.toISOString(), data: v1data }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.bosses).toEqual([]);
  });

  it('rejects a malformed boss row', () => {
    const f = file();
    const result = parseBackup(text({ ...f, data: { ...f.data, bosses: [{ weekStart: 'x' }] } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('"bosses"');
  });
});
