import { useEffect } from 'react';
import { startDay } from '../../db/repo/days';
import { db } from '../../db/schema';
import { shouldRollOver, todayKey } from '../../domain/day';

/** Runs the daily reset on launch, when the app returns to the foreground, and after local midnight. */
export function useDayCycle(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let current: string | null = null;
    const run = () => {
      const now = new Date();
      if (!shouldRollOver(current, now)) return;
      const key = todayKey(now);
      startDay(db, now)
        .then(() => {
          current = key;
        })
        .catch((error: unknown) => console.error('Daily reset failed', error));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    run();
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(run, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [active]);
}
