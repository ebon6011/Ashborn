// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { StatusScreen } from './StatusScreen';

describe('StatusScreen', () => {
  it('shows name, level, XP, rank and title', async () => {
    await seedApp();
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByText('Kai')).toBeTruthy();
    expect(screen.getByTestId('level').textContent).toBe('1');
    expect(screen.getByText('0 / 80 XP')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Rank E' })).toBeTruthy();
    expect(screen.getAllByText('Novice').length).toBeGreaterThan(0);
  });

  it('lets the player assign unspent stat points', async () => {
    await seedApp();
    await db.player.update(1, { unspentStatPoints: 3 });
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByText('3 points to assign')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add point to Strength' }));
    expect(screen.getByTestId('stat-strength').textContent).toBe('11');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm stats' }));
    await waitFor(async () => expect((await db.player.get(1))?.stats.strength).toBe(11));
  });

  it('uses singular "day" for a streak of exactly one', async () => {
    await seedApp();
    await db.player.update(1, { streak: 1 });
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByText('1 day')).toBeTruthy();
  });

  it('uses plural "days" for a streak other than one', async () => {
    await seedApp();
    await db.player.update(1, { streak: 2 });
    render(<StatusScreen onNavigate={() => {}} />);
    expect(await screen.findByText('2 days')).toBeTruthy();
  });

  it('shows the backup reminder after 7 days without a backup', async () => {
    await seedApp();
    await setMeta(db, 'installedAt', '2026-01-01T00:00:00.000Z');
    const onNavigate = vi.fn();
    render(<StatusScreen onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Go to backup' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('shows the emblem, held Shields and an Inventory button', async () => {
    await seedApp();
    await db.player.update(1, { shields: 2 });
    const onOpenInventory = vi.fn();
    render(<StatusScreen onNavigate={() => {}} onOpenInventory={onOpenInventory} />);
    expect(await screen.findByTestId('emblem')).toBeTruthy();
    expect(screen.getByText(/2 Shields/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    expect(onOpenInventory).toHaveBeenCalledOnce();
  });

  it('hides the Shield count when none are held', async () => {
    await seedApp();
    render(<StatusScreen onNavigate={() => {}} />);
    await screen.findByTestId('emblem');
    expect(screen.queryByText(/Shield/)).toBeNull();
  });
});
