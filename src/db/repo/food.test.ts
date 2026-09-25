import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { addFood, deleteFood } from './food';

describe('food log', () => {
  it('adds and deletes entries for today', async () => {
    const db = await setupPlayer();
    const id = await addFood(db, { kcal: 500, proteinG: 30, waterMl: 0, note: ' Lunch ' }, at('2026-09-21', '12:00'));
    expect(await db.foodLog.get(id)).toMatchObject({ date: '2026-09-21', kcal: 500, proteinG: 30, waterMl: 0, note: 'Lunch' });
    await deleteFood(db, id);
    expect(await db.foodLog.count()).toBe(0);
  });

  it('rejects negative, non-numeric and empty entries', async () => {
    const db = await setupPlayer();
    const now = at('2026-09-21');
    await expect(addFood(db, { kcal: -1, proteinG: 0, waterMl: 0 }, now)).rejects.toThrow();
    await expect(addFood(db, { kcal: Number.NaN, proteinG: 0, waterMl: 0 }, now)).rejects.toThrow();
    await expect(addFood(db, { kcal: 0, proteinG: 0, waterMl: 0 }, now)).rejects.toThrow('Enter calories, protein or water.');
    expect(await db.foodLog.count()).toBe(0);
  });
});
