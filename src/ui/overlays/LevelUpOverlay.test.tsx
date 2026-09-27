// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playSound } from '../../platform/audio';
import { mockReducedMotion } from '../../test/uiFixtures';
import css from '../../index.css?raw';
import { LevelUpOverlay } from './LevelUpOverlay';

vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }));

const levelUp = { fromLevel: 4, toLevel: 5, fromRank: 'E', toRank: 'E', statPointsGained: 3 } as const;
const rankUp = { fromLevel: 9, toLevel: 10, fromRank: 'E', toRank: 'D', statPointsGained: 8 } as const;

beforeEach(() => {
  mockReducedMotion(true);
  vi.mocked(playSound).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('LevelUpOverlay', () => {
  it('shows the new level and points', () => {
    render(<LevelUpOverlay event={levelUp} onClose={() => {}} onAssign={() => {}} />);
    expect(screen.getByTestId('levelup-level').textContent).toBe('5');
    expect(screen.getByTestId('levelup-points').textContent).toBe('3');
    expect(playSound).toHaveBeenCalledWith('levelUp');
  });

  it('celebrates a rank up in gold with its own sound', () => {
    render(<LevelUpOverlay event={rankUp} onClose={() => {}} onAssign={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Level up: level 10' });
    expect(dialog.getAttribute('data-variant')).toBe('rank');
    expect(dialog.textContent).toContain('Rank up: E → D');
    expect(playSound).toHaveBeenCalledWith('rankUp');
    expect(playSound).not.toHaveBeenCalledWith('levelUp');
  });

  it('Assign points opens the stats; Continue and the backdrop close it once', () => {
    const onClose = vi.fn();
    const onAssign = vi.fn();
    const { unmount } = render(<LevelUpOverlay event={levelUp} onClose={onClose} onAssign={onAssign} />);
    fireEvent.click(screen.getByRole('button', { name: 'Assign points' }));
    fireEvent.click(screen.getByRole('dialog'));
    expect(onAssign).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    unmount();
    render(<LevelUpOverlay event={levelUp} onClose={onClose} onAssign={onAssign} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('flips the rank badge in place, one badge on top of the other', () => {
    const { container } = render(<LevelUpOverlay event={rankUp} onClose={() => {}} onAssign={() => {}} />);
    const out = container.querySelector('.rank-flip-out')!;
    const into = container.querySelector('.rank-flip-in')!;
    expect(out.parentElement).toBe(into.parentElement);
    expect(out.className).toContain('[grid-area:1/1]');
    expect(into.className).toContain('[grid-area:1/1]');
  });

  it('shows the new rank instantly with reduced motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.rank-flip-in[^}]*animation:\s*none/);
    expect(reduced).toMatch(/\.rank-flip-out[^}]*opacity:\s*0/);
  });
});
