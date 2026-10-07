// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMeta, setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { at } from '../../test/fixtures';
import { mockReducedMotion, seedApp } from '../../test/uiFixtures';
import { EventHost } from './EventHost';

// Counters roll up over time; with reduced motion they show the final numbers at once.
// The phone's clock says Monday 2026-09-21 (the seeded day) unless a test moves it.
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at('2026-09-21'));
  mockReducedMotion(true);
  await seedApp();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('EventHost', () => {
  it('shows a level-up and removes it on Continue', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'levelUp', fromLevel: 9, toLevel: 10, fromRank: 'E', toRank: 'D', statPointsGained: 8 }]);
    render(<EventHost />);
    const dialog = await screen.findByRole('dialog', { name: 'Level up: level 10' });
    expect(dialog.textContent).toContain('Rank up: E → D');
    expect(dialog.textContent).toContain('+8 stat points');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });

  it('shows an unlocked title as a non-blocking toast', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
    render(<EventHost />);
    const toast = await screen.findByRole('status');
    expect(toast.textContent).toContain('The Awakened');
    expect(toast.className).toContain('pointer-events-none');
  });

  it('Assign points dismisses the level-up and opens the stats', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'levelUp', fromLevel: 1, toLevel: 2, fromRank: 'E', toRank: 'E', statPointsGained: 3 }]);
    const onAssignPoints = vi.fn();
    render(<EventHost onAssignPoints={onAssignPoints} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Assign points' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
    expect(onAssignPoints).toHaveBeenCalledOnce();
  });

  it('shows the boss alert for this week and removes it on Accept', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'bossAppeared', weekStart: '2026-09-21', bossId: 'thessrak' }]);
    render(<EventHost />);
    const dialog = await screen.findByRole('dialog', { name: 'A Boss has appeared' });
    expect(dialog.textContent).toContain('Thessrak');
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });

  it('silently drops a boss alert from a week that is already over', async () => {
    await setMeta(db, 'pendingEvents', [
      { type: 'bossAppeared', weekStart: '2026-09-14', bossId: 'thessrak' },
      { type: 'achievement', id: 'first-quest', title: 'The Awakened' },
    ]);
    render(<EventHost />);
    expect((await screen.findByRole('status')).textContent).toContain('The Awakened');
    expect(screen.queryByRole('dialog', { name: 'A Boss has appeared' })).toBeNull();
    expect(await getMeta(db, 'pendingEvents')).toEqual([{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
  });

  it('never flashes last week’s alert while the new day is still loading', async () => {
    vi.setSystemTime(at('2026-09-29')); // a week later; lastOpenDate is still 2026-09-21
    await setMeta(db, 'pendingEvents', [
      { type: 'bossAppeared', weekStart: '2026-09-21', bossId: 'thessrak' },
      { type: 'achievement', id: 'first-quest', title: 'The Awakened' },
    ]);
    render(<EventHost />);
    expect((await screen.findByRole('status')).textContent).toContain('The Awakened');
    expect(screen.queryByRole('dialog', { name: 'A Boss has appeared' })).toBeNull();
    expect(await getMeta(db, 'pendingEvents')).toEqual([{ type: 'achievement', id: 'first-quest', title: 'The Awakened' }]);
  });

  it('shows the Shield note, then the item reward screen', async () => {
    await setMeta(db, 'pendingEvents', [
      { type: 'shieldUsed', count: 1, streak: 9 },
      { type: 'itemObtained', source: 'boss', itemId: null, shield: true },
    ]);
    render(<EventHost />);
    expect((await screen.findByRole('status')).textContent).toContain('Your 9-day streak is safe');
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toHaveLength(1), { timeout: 5000 });
    fireEvent.click(await screen.findByRole('button', { name: 'Later' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  }, 10_000);

  it('celebrates a defeated boss and removes it on Continue', async () => {
    await setMeta(db, 'pendingEvents', [{ type: 'bossDefeated', bossId: 'mawgrath', xp: 110, title: 'Colossus Breaker' }]);
    render(<EventHost />);
    const dialog = await screen.findByRole('dialog', { name: 'Boss defeated' });
    expect(dialog.textContent).toContain('Mawgrath');
    expect(dialog.textContent).toContain('+110 XP');
    expect(dialog.textContent).toContain('Colossus Breaker');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });

  it('two identical reward screens in a row can both be closed', async () => {
    const complete = { type: 'itemObtained' as const, source: 'boss' as const, itemId: null, shield: false };
    await setMeta(db, 'pendingEvents', [complete, complete]);
    render(<EventHost />);
    fireEvent.click(await screen.findByRole('button', { name: 'Later' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toHaveLength(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Later' }));
    await waitFor(async () => expect(await getMeta(db, 'pendingEvents')).toEqual([]));
  });
});
