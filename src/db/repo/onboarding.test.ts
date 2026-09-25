import { describe, expect, it } from 'vitest';
import { planVolume } from '../../domain/workout/plan';
import { setupPlayer } from '../../test/dbFixtures';
import { at, sampleProfileInput } from '../../test/fixtures';
import { getMeta } from '../meta';
import { updateProfile } from './onboarding';

describe('registerPlayer', () => {
  it("creates the profile, a level 1 player, today's quest and this week's plan", async () => {
    const db = await setupPlayer('2026-09-21');
    expect(await db.profile.get(1)).toMatchObject({ name: 'Kai', experience: 'beginner' });
    expect(await db.player.get(1)).toMatchObject({ level: 1, xp: 0 });
    expect((await db.days.get('2026-09-21'))?.items.map((i) => i.target)).toEqual([10, 15, 15, 15]);
    expect(await db.workoutPlans.get('2026-09-21')).toBeTruthy();
    expect(await getMeta(db, 'lastOpenDate')).toBe('2026-09-21');
    expect(await getMeta(db, 'installedAt')).toBeTruthy();
  });
});

describe('updateProfile', () => {
  it('saves new answers, keeps progress and regenerates this week within the volume cap', async () => {
    const db = await setupPlayer('2026-09-21');
    await db.player.update(1, { level: 4 });
    const before = planVolume((await db.workoutPlans.get('2026-09-21'))!);
    await updateProfile(db, { ...sampleProfileInput, daysPerWeek: 6 }, at('2026-09-23'));
    expect((await db.profile.get(1))?.daysPerWeek).toBe(6);
    expect((await db.player.get(1))?.level).toBe(4);
    expect(planVolume((await db.workoutPlans.get('2026-09-21'))!)).toBeLessThanOrEqual(Math.floor(before * 1.1));
  });
});
