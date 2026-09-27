import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** Counts from `from` to `to` over `durationMs` (after `delayMs`). Reduced motion: the final number at once. */
export function useCountUp(from: number, to: number, durationMs: number, delayMs = 0): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (reduced || from === to) return;
    let frame = 0;
    let startAt: number | null = null;
    const tick = (now: number) => {
      startAt ??= now + delayMs;
      const t = Math.min(1, Math.max(0, (now - startAt) / durationMs));
      setValue(Math.round(from + (to - from) * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs, delayMs, reduced]);
  return reduced || from === to ? to : value;
}
