// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema';
import { playSound } from '../../platform/audio';
import { at } from '../../test/fixtures';
import { seedApp } from '../../test/uiFixtures';
import { ClassPicker } from './ClassPicker';

vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }));
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at('2026-10-05'));
  vi.mocked(playSound).mockClear();
  await seedApp('2026-10-05');
  await db.player.update(1, { level: 12, trialDone: true });
});
afterEach(() => vi.useRealTimers());

describe('ClassPicker', () => {
  it('lists the 4 classes and becomes the chosen one, with a sound only on the tap', async () => {
    const onChosen = vi.fn();
    render(<ClassPicker onChosen={onChosen} />);
    for (const name of ['Ironclad', 'Galestrider', 'Bulwark', 'Wayfarer']) expect(await screen.findByRole('radio', { name: new RegExp(name) })).toBeTruthy();
    expect(playSound).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: /Bulwark/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Become Bulwark' }));
    await waitFor(() => expect(onChosen).toHaveBeenCalledOnce());
    expect((await db.player.get(1))!.classId).toBe('bulwark');
    expect(playSound).toHaveBeenCalledWith('achievement');
  });

  it('shows the cooldown and disables Become', async () => {
    await db.player.update(1, { classId: 'ironclad', classChosenAt: '2026-09-25' });
    render(<ClassPicker />);
    expect(await screen.findByText('You can change class in 20 days.')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Wayfarer/ }));
    expect((screen.getByRole('button', { name: 'Become Wayfarer' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers Later when asked', async () => {
    const onLater = vi.fn();
    render(<ClassPicker onLater={onLater} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Later' }));
    expect(onLater).toHaveBeenCalledOnce();
  });
});
