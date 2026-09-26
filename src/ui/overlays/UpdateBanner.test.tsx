// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { markUpdateReady, resetUpdatesForTests, setApplyUpdate } from '../../platform/updates';
import { resetBusyForTests, setBusy } from '../busy';
import { UpdateBanner } from './UpdateBanner';

afterEach(() => {
  resetUpdatesForTests();
  resetBusyForTests();
});

describe('UpdateBanner', () => {
  it('stays hidden until an update is ready', () => {
    render(<UpdateBanner />);
    expect(screen.queryByText('A new update is ready')).toBeNull();
    act(() => markUpdateReady());
    expect(screen.getByText('A new update is ready')).toBeTruthy();
  });

  it('does not interrupt an active workout: hidden while the set logger is open', () => {
    markUpdateReady();
    setBusy('set-logger', true);
    render(<UpdateBanner />);
    expect(screen.queryByText('A new update is ready')).toBeNull();
    act(() => setBusy('set-logger', false));
    expect(screen.getByText('A new update is ready')).toBeTruthy();
  });

  it('updates only when the player taps Update now', () => {
    const apply = vi.fn(async () => {});
    setApplyUpdate(apply);
    markUpdateReady();
    render(<UpdateBanner />);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(apply).toHaveBeenCalledOnce();
  });

  it('makes room at the bottom of screens while it is showing', () => {
    const html = document.documentElement;
    markUpdateReady();
    const { unmount } = render(<UpdateBanner />);
    expect(html.hasAttribute('data-update-banner')).toBe(true);
    act(() => setBusy('set-logger', true));
    expect(html.hasAttribute('data-update-banner')).toBe(false);
    act(() => setBusy('set-logger', false));
    expect(html.hasAttribute('data-update-banner')).toBe(true);
    unmount();
    expect(html.hasAttribute('data-update-banner')).toBe(false);
  });
});
