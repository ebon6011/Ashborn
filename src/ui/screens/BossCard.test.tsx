// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { bossForWeek } from '../../domain/boss';
import { seedApp } from '../../test/uiFixtures';
import { BossCard, WEAKNESS_LABEL } from './BossCard';

const MONDAY = '2026-09-28';
beforeEach(() => seedApp(MONDAY));

describe('BossCard', () => {
  it('shows this week’s boss with HP, weakness and days left', async () => {
    const def = bossForWeek(MONDAY);
    render(<BossCard />);
    expect(await screen.findByText(def.name)).toBeTruthy();
    expect(screen.getByText(def.epithet)).toBeTruthy();
    expect(screen.getByText(`Weak to ${WEAKNESS_LABEL[def.weakness]}`)).toBeTruthy();
    expect(screen.getByText('360 / 360 HP')).toBeTruthy();
    expect(screen.getByText('7 days left')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: `${def.name} HP` })).toBeTruthy();
  });

  it('shows the victory once defeated', async () => {
    await db.bosses.update(MONDAY, { hp: 0, defeatedAt: '2026-09-30T18:00:00.000Z' });
    render(<BossCard />);
    expect(await screen.findByText('Defeated')).toBeTruthy();
  });
});
