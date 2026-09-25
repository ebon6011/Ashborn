import { describe, expect, it } from 'vitest';
import { freshDb } from '../test/fixtures';
import { getMeta, setMeta } from './meta';

describe('meta store', () => {
  it('returns undefined for unset keys and round-trips values', async () => {
    const db = freshDb();
    expect(await getMeta(db, 'lastOpenDate')).toBeUndefined();
    await setMeta(db, 'lastOpenDate', '2026-09-25');
    await setMeta(db, 'soundOn', false);
    expect(await getMeta(db, 'lastOpenDate')).toBe('2026-09-25');
    expect(await getMeta(db, 'soundOn')).toBe(false);
  });
});
