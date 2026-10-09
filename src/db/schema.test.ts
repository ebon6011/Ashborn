import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { BACKUP_TABLES } from '../domain/migrations';
import { initialPlayer } from '../domain/stats';
import { sampleBackupData } from '../test/fixtures';
import { AshbornDB, STORES_V1, STORES_V2, STORES_V3 } from './schema';

describe('AshbornDB', () => {
  it('declares a store for every backup table', () => {
    expect(Object.keys(STORES_V3).sort()).toEqual([...BACKUP_TABLES].sort());
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

  it('upgrades a version 1 database to the latest version without losing anything', async () => {
    const name = `v1-${crypto.randomUUID()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores(STORES_V1);
    const data = sampleBackupData() as unknown as Record<string, unknown[]>;
    for (const table of Object.keys(STORES_V1)) await v1.table(table).bulkPut(data[table]!);
    v1.close();

    const v2 = new AshbornDB(name);
    await v2.open();
    expect(v2.verno).toBe(4);
    for (const table of Object.keys(STORES_V1)) expect(await v2.table(table).toArray()).toEqual(data[table]);
    expect(await v2.bosses.count()).toBe(0);
    v2.close();
  });

  it('upgrades a version 2 (v1.5.0) database to version 3 without losing anything', async () => {
    const name = `v2-${crypto.randomUUID()}`;
    const v2 = new Dexie(name);
    v2.version(1).stores(STORES_V1);
    v2.version(2).stores(STORES_V2);
    const data = sampleBackupData() as unknown as Record<string, unknown[]>;
    // A real v1.5.0 player row: no themeId / frameId / shields.
    const oldPlayer = {
      id: 1, level: 12, xp: 40, unspentStatPoints: 2,
      stats: { strength: 14, agility: 11, vitality: 12, endurance: 10, discipline: 13 },
      titleId: 'boss-mawgrath', streak: 9, bestStreak: 21, questsCompleted: 60,
      sideQuestStatProgress: { strength: 0, agility: 1, vitality: 0, endurance: 0, discipline: 2 },
    };
    for (const table of Object.keys(STORES_V2)) await v2.table(table).bulkPut(table === 'player' ? [oldPlayer] : data[table]!);
    v2.close();

    const v3 = new AshbornDB(name);
    await v3.open();
    expect(v3.verno).toBe(4);
    expect(await v3.player.get(1)).toEqual({ ...oldPlayer, themeId: null, frameId: null, shields: 0, classId: null, classChosenAt: null, trialDone: false });
    for (const table of Object.keys(STORES_V2)) if (table !== 'player') expect(await v3.table(table).toArray()).toEqual(data[table]);
    expect(await v3.inventory.count()).toBe(0);
    v3.close();
  });

  it('upgrades a version 3 (v1.6.0) database to version 4 without losing anything', async () => {
    const name = `v3-${crypto.randomUUID()}`;
    const v3 = new Dexie(name);
    v3.version(1).stores(STORES_V1);
    v3.version(2).stores(STORES_V2);
    v3.version(3).stores(STORES_V3);
    const data = sampleBackupData() as unknown as Record<string, unknown[]>;
    const v3Row: Record<string, unknown> = { ...(data.player![0] as Record<string, unknown>), level: 14, streak: 9, themeId: 'theme-ember', shields: 1 };
    const { classId: _c, classChosenAt: _a, trialDone: _d, ...oldPlayer } = v3Row;
    void [_c, _a, _d];
    const inventory = [{ itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' }];
    for (const table of Object.keys(STORES_V3)) {
      await v3.table(table).bulkPut(table === 'player' ? [oldPlayer] : table === 'inventory' ? inventory : data[table]!);
    }
    v3.close();

    const v4 = new AshbornDB(name);
    await v4.open();
    expect(v4.verno).toBe(4);
    expect(await v4.player.get(1)).toEqual({ ...oldPlayer, classId: null, classChosenAt: null, trialDone: false });
    expect(await v4.inventory.toArray()).toEqual(inventory);
    for (const table of Object.keys(STORES_V3)) if (table !== 'player' && table !== 'inventory') expect(await v4.table(table).toArray()).toEqual(data[table]);
    v4.close();
  });
});
