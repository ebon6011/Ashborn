import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from '../domain/backup';
import { BACKUP_TABLES } from '../domain/migrations';
import { initialPlayer } from '../domain/stats';
import { freshDb, sampleBackupData } from '../test/fixtures';
import { exportData, importData } from './backup';
import { setMeta } from './meta';

describe('database backup', () => {
  it('exports, serialises, parses and imports back identically', async () => {
    const source = freshDb();
    await importData(source, sampleBackupData());
    const exported = await exportData(source);
    expect(exported).toEqual(sampleBackupData());

    const parsed = parseBackup(JSON.stringify(buildBackup(exported, new Date())));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const target = freshDb();
    await target.player.put({ ...initialPlayer(), level: 99 });
    await importData(target, parsed.backup.data);
    expect(await exportData(target)).toEqual(exported);
  });

  it('exports exactly the tables listed in BACKUP_TABLES', async () => {
    const source = freshDb();
    await importData(source, sampleBackupData());
    const exported = await exportData(source);
    expect(Object.keys(exported).sort()).toEqual([...BACKUP_TABLES].sort());
  });

  it('does not export transient pending events', async () => {
    const db = freshDb();
    await importData(db, sampleBackupData());
    await setMeta(db, 'pendingEvents', [{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
    const exported = await exportData(db);
    expect(exported.meta.some((m) => m.key === 'pendingEvents')).toBe(false);
  });
});
