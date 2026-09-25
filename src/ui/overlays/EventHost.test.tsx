// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta, setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { EventHost } from './EventHost';

beforeEach(() => seedApp());

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
});
