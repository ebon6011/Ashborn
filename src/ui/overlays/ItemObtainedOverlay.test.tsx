// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { playSound } from '../../platform/audio';
import { seedApp } from '../../test/uiFixtures';
import { ItemObtainedOverlay } from './ItemObtainedOverlay';

vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }));
beforeEach(async () => {
  vi.mocked(playSound).mockClear();
  await seedApp('2026-10-05');
  await db.inventory.put({ itemId: 'frame-flame-halo', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'streak' });
});

describe('ItemObtainedOverlay', () => {
  it('shows the item silently; Equip now equips and closes', async () => {
    const onClose = vi.fn();
    render(<ItemObtainedOverlay event={{ type: 'itemObtained', source: 'streak', itemId: 'frame-flame-halo', shield: false }} playerName="Kai" onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Item obtained' });
    expect(dialog.textContent).toContain('Flame Halo');
    expect(dialog.textContent).toContain('Emblem frame');
    expect(dialog.textContent).toContain('From: 7-day streak');
    expect(playSound).not.toHaveBeenCalled();
    fireEvent.click(dialog); // backdrop taps do nothing
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Equip now' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect((await db.player.get(1))!.frameId).toBe('frame-flame-halo');
    expect(playSound).toHaveBeenCalledWith('achievement');
  });

  it('Later just closes; a Shield and "complete" have no Equip now', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ItemObtainedOverlay event={{ type: 'itemObtained', source: 'boss', itemId: null, shield: true }} playerName="Kai" onClose={onClose} />,
    );
    expect(screen.getByRole('dialog').textContent).toContain('Streak Shield');
    expect(screen.queryByRole('button', { name: 'Equip now' })).toBeNull();
    rerender(<ItemObtainedOverlay event={{ type: 'itemObtained', source: 'boss', itemId: null, shield: false }} playerName="Kai" onClose={onClose} />);
    expect(screen.getByRole('dialog').textContent).toContain('Collection complete');
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect((await db.player.get(1))!.frameId).toBeNull();
  });
});
