// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChangelogEntry } from '../../data/changelog';
import { WhatsNew } from './WhatsNew';

const entries: ChangelogEntry[] = [
  { version: '1.1.0', date: '2026-09-27', notes: ['New: a What’s new list.'] },
  { version: '1.0.0', date: '2026-09-26', title: 'Ashborn is here!', notes: ['Create your player.'] },
];

describe('WhatsNew', () => {
  it('shows the newest version in full', () => {
    render(<WhatsNew entries={entries} />);
    expect(screen.getByRole('heading', { name: 'What’s new' })).toBeTruthy();
    expect(screen.getByText('Version 1.1.0')).toBeTruthy();
    expect(screen.getByText('New: a What’s new list.')).toBeTruthy();
  });

  it('keeps older versions folded until tapped', () => {
    render(<WhatsNew entries={entries} />);
    const older = screen.getByText(/Version 1\.0\.0/);
    const details = older.closest('details')!;
    expect(details.open).toBe(false);
    fireEvent.click(older);
    expect(details.open).toBe(true);
    expect(screen.getByText('Create your player.')).toBeTruthy();
    expect(screen.getByText(/Ashborn is here!/)).toBeTruthy();
  });
});
