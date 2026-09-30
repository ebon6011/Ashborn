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
  it('shows the new boss art, dimmed once defeated', async () => {
    const { container } = render(<BossCard />);
    await screen.findByText(bossForWeek(MONDAY).name);
    const img = container.querySelector('[data-testid="boss-art"]')!;
    expect(img.getAttribute('src')).toBe(bossForWeek(MONDAY).art);
    expect(img.className).not.toContain('grayscale');
    await db.bosses.update(MONDAY, { hp: 0, defeatedAt: '2026-09-30T18:00:00.000Z' });
    await screen.findByText('Defeated');
    expect(container.querySelector('[data-testid="boss-art"]')!.className).toContain('grayscale');
  });

  it('v1.4.0 data: a retired boss week keeps working with its old look', async () => {
    await db.bosses.update(MONDAY, { bossId: 'mawgrath', hp: 250 });
    const { container } = render(<BossCard />);
    expect(await screen.findByText('Mawgrath')).toBeTruthy();
    expect(screen.getByText('250 / 360 HP')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
