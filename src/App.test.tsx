// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { emptyApp, seedApp } from './test/uiFixtures';

describe('App', () => {
  it('greets a new player with the install guide and the Awakening', async () => {
    await emptyApp();
    render(<App />);
    expect(await screen.findByRole('dialog', { name: 'Install Ashborn' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue in Safari' }));
    expect(await screen.findByRole('heading', { name: 'Awakening' })).toBeTruthy();
  });

  it('shows the status window and tab bar for a registered player', async () => {
    await seedApp();
    render(<App />);
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Status', level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));
    expect(await screen.findByRole('heading', { name: 'Quests', level: 1 })).toBeTruthy();
  });
});
