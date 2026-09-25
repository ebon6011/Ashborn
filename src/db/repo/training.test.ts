import { describe, expect, it } from 'vitest';
import { setupPlayer } from '../../test/dbFixtures';
import { at } from '../../test/fixtures';
import { deleteSet, logSet } from './training';

describe('logSet', () => {
  it('detects PRs and unlocks Limit Breaker', async () => {
    const db = await setupPlayer();
    expect(await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-09-21'))).toEqual({ isPR: false });
    expect(await logSet(db, { exerciseId: 'pushup', reps: 12, weightKg: 0 }, at('2026-09-23'))).toEqual({ isPR: true });
    expect(await db.achievements.get('first-pr')).toBeTruthy();
  });

  it('unlocks Apex on the first S-rank exercise', async () => {
    const db = await setupPlayer();
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-09-21'));
    await logSet(db, { exerciseId: 'pushup', reps: 20, weightKg: 0 }, at('2026-10-21'));
    expect(await db.achievements.get('first-s-rank')).toBeTruthy();
  });

  it('stores 0 kg for bodyweight exercises', async () => {
    const db = await setupPlayer();
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 20 }, at('2026-09-21'));
    expect((await db.workoutSets.toArray())[0]).toMatchObject({ exerciseId: 'pushup', reps: 10, weightKg: 0, date: '2026-09-21' });
  });

  it('rejects bad input without saving anything', async () => {
    const db = await setupPlayer();
    const now = at('2026-09-21');
    await expect(logSet(db, { exerciseId: 'nope', reps: 5, weightKg: 0 }, now)).rejects.toThrow('Unknown exercise.');
    await expect(logSet(db, { exerciseId: 'pushup', reps: 0, weightKg: 0 }, now)).rejects.toThrow();
    await expect(logSet(db, { exerciseId: 'pushup', reps: 5.5, weightKg: 0 }, now)).rejects.toThrow();
    await expect(logSet(db, { exerciseId: 'goblet-squat', reps: 8, weightKg: Number.NaN }, now)).rejects.toThrow();
    await expect(logSet(db, { exerciseId: 'goblet-squat', reps: 8, weightKg: 0 }, now)).rejects.toThrow('Enter the weight you lifted.');
    expect(await db.workoutSets.count()).toBe(0);
  });

  it('deletes a set', async () => {
    const db = await setupPlayer();
    await logSet(db, { exerciseId: 'pushup', reps: 10, weightKg: 0 }, at('2026-09-21'));
    const [set] = await db.workoutSets.toArray();
    await deleteSet(db, set!.id);
    expect(await db.workoutSets.count()).toBe(0);
  });
});
