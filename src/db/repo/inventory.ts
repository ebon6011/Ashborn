import { getItem } from '../../config/items';
import { rollDrop, type ItemSource } from '../../domain/items';
import { writeTx, type AshbornDB } from '../schema';
import { pushEvents } from './player';

let testRng: (() => number) | null = null;
/** Tests only: make every drop deterministic. Pass null to restore Math.random. */
export function setDropRngForTests(fn: (() => number) | null): void {
  testRng = fn;
}

export async function ownedItemIds(database: AshbornDB): Promise<Set<string>> {
  return new Set((await database.inventory.toArray()).map((r) => r.itemId));
}

/** Rolls one drop for `source`, saves it, and queues the reward screen. */
export async function grantDrop(database: AshbornDB, source: ItemSource, now: Date, rng: () => number = testRng ?? Math.random): Promise<void> {
  await writeTx(database, async () => {
    const player = await database.player.get(1);
    if (!player) return;
    const result = rollDrop(source, await ownedItemIds(database), player.shields, rng);
    if (result.kind === 'item') {
      await database.inventory.put({ itemId: result.itemId, obtainedAt: now.toISOString(), source });
      await pushEvents(database, [{ type: 'itemObtained', source, itemId: result.itemId, shield: false }]);
    } else if (result.kind === 'shield') {
      await database.player.update(1, { shields: player.shields + 1 });
      await pushEvents(database, [{ type: 'itemObtained', source, itemId: null, shield: true }]);
    } else {
      await pushEvents(database, [{ type: 'itemObtained', source, itemId: null, shield: false }]);
    }
  });
}

/** Equips an owned theme or frame (null = the default). */
async function equip(database: AshbornDB, field: 'themeId' | 'frameId', kind: 'theme' | 'frame', itemId: string | null): Promise<void> {
  await writeTx(database, async () => {
    if (itemId !== null && (getItem(itemId)?.kind !== kind || !(await database.inventory.get(itemId)))) {
      throw new Error('You have not found that item yet.');
    }
    await database.player.update(1, { [field]: itemId });
  });
}

export const equipTheme = (database: AshbornDB, itemId: string | null) => equip(database, 'themeId', 'theme', itemId);
export const equipFrame = (database: AshbornDB, itemId: string | null) => equip(database, 'frameId', 'frame', itemId);
