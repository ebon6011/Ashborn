// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { InventoryScreen } from './InventoryScreen';

const root = document.documentElement;
beforeEach(async () => {
  await seedApp('2026-10-05');
  await db.inventory.bulkPut([
    { itemId: 'theme-ember', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'boss' },
    { itemId: 'frame-flame-halo', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'streak' },
    { itemId: 'title-ironheart', obtainedAt: '2026-10-05T10:00:00.000Z', source: 'rankUp' },
  ]);
  root.style.setProperty('--color-glow', '#3ab8ff');
});

describe('InventoryScreen', () => {
  it('lists themes with counts and hidden unfound items', async () => {
    render(<InventoryScreen onBack={() => {}} />);
    expect(await screen.findByText('2 of 16 found')).toBeTruthy();
    expect(screen.getAllByText('? ? ?')).toHaveLength(14);
    expect(screen.getByRole('button', { name: /System Blue/ }).textContent).toContain('Equipped');
  });

  it('previews without saving, Equip saves, leaving restores the equipped theme', async () => {
    const { unmount } = render(<InventoryScreen onBack={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Ember/ }));
    expect(root.style.getPropertyValue('--color-glow')).toBe('#ff8a3d');
    expect((await db.player.get(1))!.themeId).toBeNull();
    unmount();
    expect(root.style.getPropertyValue('--color-glow')).toBe('#3ab8ff');

    render(<InventoryScreen onBack={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Ember/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Equip Ember' }));
    await waitFor(async () => expect((await db.player.get(1))!.themeId).toBe('theme-ember'));
  });

  it('frames, titles and shields tabs', async () => {
    await db.player.update(1, { shields: 1 });
    const onBack = vi.fn();
    render(<InventoryScreen onBack={onBack} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Frames' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Flame Halo/ }));
    expect(screen.getByTestId('emblem').getAttribute('data-frame')).toBe('frame-flame-halo');
    fireEvent.click(screen.getByRole('button', { name: 'Equip Flame Halo' }));
    await waitFor(async () => expect((await db.player.get(1))!.frameId).toBe('frame-flame-halo'));

    fireEvent.click(screen.getByRole('tab', { name: 'Titles' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Equip Ironheart' }));
    await waitFor(async () => expect((await db.player.get(1))!.titleId).toBe('title-ironheart'));

    fireEvent.click(screen.getByRole('tab', { name: 'Shields' }));
    expect(await screen.findByText('1 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
