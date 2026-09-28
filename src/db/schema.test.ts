import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { BACKUP_TABLES } from '../domain/migrations';
import { initialPlayer } from '../domain/stats';
import { sampleBackupData } from '../test/fixtures';
import { AshbornDB, STORES_V1, STORES_V2 } from './schema';

describe('AshbornDB', () => {
  it('declares a store for every backup table', () => {
    expect(Object.keys(STORES_V2).sort()).toEqual([...BACKUP_TABLES].sort());
  });

  it('keeps data when the app is reopened', async () => {
    const name = `reopen-${crypto.randomUUID()}`;
    const first = new AshbornDB(name);
    await first.player.put(initialPlayer());
    first.close();
    const second = new AshbornDB(name);
    expect((await second.player.get(1))?.level).toBe(1);
    second.close();
  });

  it('pattern check: adding a version with an upgrade keeps existing rows', async () => {
    const name = `upgrade-${crypto.randomUUID()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({ player: 'id' });
    await v1.table('player').put({ id: 1, level: 7 });
    v1.close();

    const v2 = new Dexie(name);
    v2.version(1).stores({ player: 'id' });
    v2.version(2)
      .stores({ player: 'id', notes: '++id' })
      .upgrade((tx) => tx.table('player').toCollection().modify((p: Record<string, unknown>) => {
        p.title = p.title ?? null;
      }));
    expect(await v2.table('player').get(1)).toEqual({ id: 1, level: 7, title: null });
    v2.close();
  });

  it('upgrades a version 1 database to version 2 without losing anything', async () => {
    const name = `v1-${crypto.randomUUID()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores(STORES_V1);
    const data = sampleBackupData() as unknown as Record<string, unknown[]>;
    for (const table of Object.keys(STORES_V1)) await v1.table(table).bulkPut(data[table]!);
    v1.close();

    const v2 = new AshbornDB(name);
    await v2.open();
    expect(v2.verno).toBe(2);
    for (const table of Object.keys(STORES_V1)) expect(await v2.table(table).toArray()).toEqual(data[table]);
    expect(await v2.bosses.count()).toBe(0);
    v2.close();
  });
});
