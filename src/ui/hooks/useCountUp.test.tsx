// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockReducedMotion } from '../../test/uiFixtures';
import { useCountUp } from './useCountUp';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useCountUp', () => {
  it('jumps straight to the final number with reduced motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useCountUp(4, 5, 700));
    expect(result.current).toBe(5);
  });

  it('counts from the start to the end over the duration', () => {
    mockReducedMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result } = renderHook(() => useCountUp(0, 8, 700));
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(8);
  });
});
