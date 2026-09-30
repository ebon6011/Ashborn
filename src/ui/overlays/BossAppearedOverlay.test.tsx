// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playSound } from '../../platform/audio';
import { BossAppearedOverlay } from './BossAppearedOverlay';

vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }));
beforeEach(() => vi.mocked(playSound).mockClear());

describe('BossAppearedOverlay', () => {
  it('warns about the new boss, silently, and accepts with a chime', () => {
    const onAccept = vi.fn();
    render(<BossAppearedOverlay bossId="grolmak" weekStart="2026-10-05" today="2026-10-05" onAccept={onAccept} />);
    const dialog = screen.getByRole('dialog', { name: 'A Boss has appeared' });
    expect(dialog.textContent).toContain('⚠ WARNING');
    expect(dialog.textContent).toContain('Grolmak, the Warbound Chieftain');
    expect(dialog.textContent).toContain('Weak to upper body');
    expect(dialog.textContent).toContain('7 days to defeat it');
    expect(dialog.querySelector('[data-testid="boss-art"]')).not.toBeNull();
    expect(playSound).not.toHaveBeenCalled();

    fireEvent.click(dialog); // backdrop taps do nothing
    expect(onAccept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(playSound).toHaveBeenCalledWith('chime');
    expect(onAccept).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('says "1 day" on the last day', () => {
    render(<BossAppearedOverlay bossId="grolmak" weekStart="2026-10-05" today="2026-10-11" onAccept={() => {}} />);
    expect(screen.getByRole('dialog').textContent).toContain('1 day to defeat it');
  });
});
