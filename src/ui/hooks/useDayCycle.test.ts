// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const startDay = vi.fn();
vi.mock('../../db/repo/days', () => ({ startDay: (...args: unknown[]) => startDay(...args) }));

import { useDayCycle } from './useDayCycle';

describe('useDayCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21, 9, 0));
    startDay.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries the daily reset on the next tick after a failed attempt, instead of giving up for the day', async () => {
    startDay.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useDayCycle(true));
    expect(startDay).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0); // let the rejection settle

    // Same day, one minute later: a fixed implementation retries because the failed
    // attempt never marked the day as current.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(startDay).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0); // let the resolution settle

    // Another minute later, same day: now that the reset succeeded it must not retry again.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(startDay).toHaveBeenCalledTimes(2);

    consoleError.mockRestore();
  });
});
