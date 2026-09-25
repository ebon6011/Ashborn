// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { QuestsScreen } from './QuestsScreen';

beforeEach(() => seedApp('2026-09-21'));

describe('QuestsScreen', () => {
  it('lists the four daily items with easier options', async () => {
    render(<QuestsScreen />);
    expect(await screen.findByRole('button', { name: 'Complete Push-ups' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Complete Walk' })).toBeTruthy();
    expect(screen.getByText('Easier: Knee or wall push-ups')).toBeTruthy();
  });

  it('completes an item', async () => {
    render(<QuestsScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Complete Push-ups' }));
    await waitFor(async () => expect((await db.days.get('2026-09-21'))?.items[0]?.progress).toBe(10));
  });

  it('saves typed reps', async () => {
    render(<QuestsScreen />);
    fireEvent.change(await screen.findByLabelText('Sit-ups done so far'), { target: { value: '7' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1]!);
    await waitFor(async () => expect((await db.days.get('2026-09-21'))?.items[1]?.progress).toBe(7));
  });

  it('shows an inline error for invalid "done so far" input instead of doing nothing', async () => {
    render(<QuestsScreen />);
    fireEvent.change(await screen.findByLabelText('Sit-ups done so far'), { target: { value: 'abc' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1]!);
    expect((await screen.findByRole('alert')).textContent).toBe('Enter a whole number.');
    expect((await db.days.get('2026-09-21'))?.items[1]?.progress).toBe(0);
  });

  it('takes a rest day without penalty', async () => {
    render(<QuestsScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rest today' }));
    expect(await screen.findByText('Rest day. Your streak is safe.')).toBeTruthy();
    expect((await db.days.get('2026-09-21'))?.status).toBe('rest');
  });

  it('adds and completes a side quest', async () => {
    render(<QuestsScreen />);
    fireEvent.change(await screen.findByLabelText('Quest name'), { target: { value: 'Read 10 pages' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add quest' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Complete Read 10 pages' }));
    await waitFor(async () => expect((await db.player.get(1))?.xp).toBe(20));
  });

  it('edits a side quest title and XP', async () => {
    render(<QuestsScreen />);
    fireEvent.change(await screen.findByLabelText('Quest name'), { target: { value: 'Read 10 pages' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add quest' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Read 10 pages' }));
    const nameInput = screen.getByLabelText('Quest name') as HTMLInputElement;
    expect(nameInput.value).toBe('Read 10 pages');
    fireEvent.change(nameInput, { target: { value: 'Read 20 pages' } });
    fireEvent.change(screen.getByLabelText('Reward (XP)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Read 20 pages')).toBeTruthy();
    const quest = (await db.sideQuests.toArray())[0]!;
    expect(quest.title).toBe('Read 20 pages');
    expect(quest.xp).toBe(30);
  });

  it('cancels editing a side quest without changing it', async () => {
    render(<QuestsScreen />);
    fireEvent.change(await screen.findByLabelText('Quest name'), { target: { value: 'Read 10 pages' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add quest' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Read 10 pages' }));
    fireEvent.change(screen.getByLabelText('Quest name'), { target: { value: 'Should not save' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Read 10 pages')).toBeTruthy();
    expect(screen.queryByText('Should not save')).toBeNull();
  });
});
