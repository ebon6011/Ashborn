import { useEffect, useRef } from 'react';
import { SystemWindow } from '../components/SystemWindow';

/** Non-blocking note after the daily reset used a Shield. Silent (it appears without a tap). */
export function ShieldToast({ count, streak, onDone }: { count: number; streak: number; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), 3500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div role="status" className="safe-x pointer-events-none fixed inset-x-0 top-0 z-40" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <SystemWindow className="mx-auto max-w-md">
        <p className="text-ink">
          <span aria-hidden="true">🛡 </span>
          {`${count === 1 ? 'Streak Shield' : `${count} Streak Shields`} used. Your ${streak}-day streak is safe.`}
        </p>
      </SystemWindow>
    </div>
  );
}
