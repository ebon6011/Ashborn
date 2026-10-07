import { ALL_ITEMS, type ItemKind } from '../config/items';
import { progression } from '../config/progression';
import type { ItemSource } from './types';

export type { ItemSource } from './types';
export type DropResult = { kind: 'item'; itemId: string } | { kind: 'shield' } | { kind: 'complete' };

const KINDS = ['theme', 'frame', 'title', 'shield'] as const;

/**
 * One drop. Picks a kind by the source's rates among the kinds that can still give something
 * (unowned items left; Shields below the cap), then a random unowned item of that kind.
 */
export function rollDrop(source: ItemSource, owned: ReadonlySet<string>, shields: number, rng: () => number): DropResult {
  const rates = progression.items.dropRates[source];
  const pool = (kind: ItemKind) => ALL_ITEMS.filter((i) => i.kind === kind && !owned.has(i.id));
  const available = KINDS.filter((k) => (k === 'shield' ? shields < progression.items.maxShields : pool(k).length > 0) && rates[k] > 0);
  if (available.length === 0) return { kind: 'complete' };

  const total = available.reduce((sum, k) => sum + rates[k], 0);
  let roll = rng() * total;
  let kind = available[available.length - 1]!;
  for (const k of available) {
    if (roll < rates[k]) {
      kind = k;
      break;
    }
    roll -= rates[k];
  }
  if (kind === 'shield') return { kind: 'shield' };
  const items = pool(kind);
  return { kind: 'item', itemId: items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!.id };
}
