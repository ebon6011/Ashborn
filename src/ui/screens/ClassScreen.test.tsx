// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { ClassScreen } from './ClassScreen';

beforeEach(() => seedApp('2026-10-05'));

describe('ClassScreen', () => {
  it('before level 10 it explains the Trial', async () => {
    render(<ClassScreen onBack={() => {}} />);
    expect(await screen.findByText(/Reach level 10/)).toBeTruthy();
  });

  it('with the Trial open it points to the Quests screen', async () => {
    await db.player.update(1, { level: 10 });
    await setMeta(db, 'classTrial', { items: [], createdAt: '2026-10-05' });
    render(<ClassScreen onBack={() => {}} />);
    expect(await screen.findByText(/Finish the Trial on the Quests screen/)).toBeTruthy();
  });

  it('after the Trial it shows the picker', async () => {
    await db.player.update(1, { level: 10, trialDone: true });
    render(<ClassScreen onBack={() => {}} />);
    expect(await screen.findByRole('radio', { name: /Ironclad/ })).toBeTruthy();
  });
});
