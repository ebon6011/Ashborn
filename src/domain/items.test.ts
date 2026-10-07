import { describe, expect, it } from 'vitest';
import { ALL_BOSSES } from '../config/bosses';
import { ALL_ITEMS, FRAMES, getItem, getTheme, THEMES, TITLES } from '../config/items';
import { progression } from '../config/progression';
import { ACHIEVEMENTS } from './achievements';
import { rollDrop, type ItemSource } from './items';

/** Deterministic PRNG (mulberry32) so rate tests never flake. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SOURCES: ItemSource[] = ['boss', 'streak', 'rankUp'];

describe('item catalogue', () => {
  it('has 15 themes, 15 frames and 30 titles with unique, stable ids', () => {
    expect(THEMES).toHaveLength(15);
    expect(FRAMES).toHaveLength(15);
    expect(TITLES).toHaveLength(30);
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(60);
    for (const t of THEMES) expect(t.id).toMatch(/^theme-[a-z-]+$/);
    for (const f of FRAMES) expect(f.id).toMatch(/^frame-[a-z-]+$/);
    for (const t of TITLES) expect(t.id).toMatch(/^title-[a-z-]+$/);
    expect(getItem('theme-ember')?.name).toBe('Ember');
    expect(getItem('nope')).toBeUndefined();
  });

  it('never uses red or gold accents, and falls back to the default theme', () => {
    for (const t of THEMES) expect(['#ff5c7a', '#ffd166']).not.toContain(t.glow);
    expect(getTheme(null).glow).toBe('#3ab8ff');
    expect(getTheme('theme-nope').glow).toBe('#3ab8ff');
    expect(getTheme('theme-ember').glow).toBe('#ff8a3d');
  });

  it('item titles are unique across achievements and bosses', () => {
    const all = [...ACHIEVEMENTS.map((a) => a.title), ...ALL_BOSSES.map((b) => b.title), ...TITLES.map((t) => t.name), progression.defaultTitle];
    expect(new Set(all).size).toBe(all.length);
  });

  it('each source’s drop rates add up to 1', () => {
    for (const s of SOURCES) {
      const r = progression.items.dropRates[s];
      expect(r.theme + r.frame + r.title + r.shield).toBeCloseTo(1, 9);
    }
    expect(progression.items.maxShields).toBe(2);
    expect(progression.items.streakDropEvery).toBe(7);
  });
});

describe('rollDrop', () => {
  it.each(SOURCES)('matches the configured rates for %s (±2 points over 20 000 rolls)', (source) => {
    const rng = seeded(42);
    const counts = { theme: 0, frame: 0, title: 0, shield: 0 };
    const N = 20_000;
    for (let i = 0; i < N; i++) {
      const r = rollDrop(source, new Set(), 0, rng);
      if (r.kind === 'shield') counts.shield++;
      else if (r.kind === 'item') counts[getItem(r.itemId)!.kind]++;
    }
    const rates = progression.items.dropRates[source];
    for (const k of ['theme', 'frame', 'title', 'shield'] as const) expect(Math.abs(counts[k] / N - rates[k])).toBeLessThan(0.02);
  });

  it('never gives an owned item, and skips a complete kind', () => {
    const owned = new Set(THEMES.map((t) => t.id));
    const rng = seeded(7);
    for (let i = 0; i < 2000; i++) {
      const r = rollDrop('boss', owned, 0, rng);
      if (r.kind === 'item') {
        expect(owned.has(r.itemId)).toBe(false);
        expect(getItem(r.itemId)!.kind).not.toBe('theme');
      }
    }
  });

  it('skips shields at the cap, and collects every item exactly once', () => {
    const owned = new Set<string>();
    const rng = seeded(9);
    for (let i = 0; i < 60; i++) {
      const r = rollDrop('streak', owned, progression.items.maxShields, rng);
      expect(r.kind).toBe('item');
      if (r.kind === 'item') owned.add(r.itemId);
    }
    expect(owned.size).toBe(60);
    expect(rollDrop('streak', owned, 1, rng)).toEqual({ kind: 'shield' });
    expect(rollDrop('streak', owned, 2, rng)).toEqual({ kind: 'complete' });
  });
});
