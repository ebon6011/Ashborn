import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from '../domain/backup';
import { BACKUP_TABLES } from '../domain/migrations';
import { initialPlayer } from '../domain/stats';
import { freshDb, sampleBackupData } from '../test/fixtures';
import { exportData, importData } from './backup';
import { setMeta } from './meta';
import { setupPlayer } from '../test/dbFixtures';

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

  it('round trip: inventory, equipped items, shields and shielded days survive export → import → export', async () => {
    const database = await setupPlayer('2026-10-05');
    await database.inventory.bulkPut([
      { itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' },
      { itemId: 'frame-flame-halo', obtainedAt: '2026-10-05T11:00:00.000Z', source: 'streak' },
      { itemId: 'title-ironheart', obtainedAt: '2026-10-05T12:00:00.000Z', source: 'rankUp' },
    ]);
    await database.player.update(1, { themeId: 'theme-ember', frameId: 'frame-flame-halo', titleId: 'title-ironheart', shields: 2 });
    const day = (await database.days.get('2026-10-05'))!;
    await database.days.put({ ...day, date: '2026-10-04', status: 'missed', shielded: true });

    const first = await exportData(database);
    expect(first.inventory).toHaveLength(3);
    const parsed = parseBackup(JSON.stringify(buildBackup(first, new Date('2026-10-06T08:00:00Z'))));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const other = freshDb();
    await importData(other, parsed.backup.data);
    expect(await exportData(other)).toEqual(first);
  });
});
