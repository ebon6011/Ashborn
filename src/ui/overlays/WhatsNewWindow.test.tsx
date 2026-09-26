// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta, setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { WhatsNewWindow } from './WhatsNewWindow';

const settle = () => new Promise((r) => setTimeout(r, 50));

beforeEach(() => seedApp('2026-09-21'));

describe('WhatsNewWindow', () => {
  it('shows nothing to a new player', async () => {
    render(<WhatsNewWindow />);
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the changelog only once per version', async () => {
    await setMeta(db, 'lastSeenVersion', '1.1.0');
    const { unmount } = render(<WhatsNewWindow />);
    const dialog = await screen.findByRole('dialog', { name: 'What’s new' });
    expect(dialog.textContent).toContain('Version 1.2.0');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(async () => expect(await getMeta(db, 'lastSeenVersion')).toBe(__APP_VERSION__));
    unmount();
    render(<WhatsNewWindow />);
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('treats an install from before tracking as having seen 1.1.0', async () => {
    await db.meta.delete('lastSeenVersion');
    render(<WhatsNewWindow />);
    expect((await screen.findByRole('dialog')).textContent).toContain('Version 1.2.0');
  });

  it('waits while a level-up is pending', async () => {
    await setMeta(db, 'lastSeenVersion', '1.1.0');
    await setMeta(db, 'pendingEvents', [{ type: 'levelUp', fromLevel: 1, toLevel: 2, fromRank: 'E', toRank: 'E', statPointsGained: 3 }]);
    render(<WhatsNewWindow />);
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    await setMeta(db, 'pendingEvents', []);
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
