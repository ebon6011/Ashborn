import { useEffect, useRef } from 'react';
import { playSound } from '../../platform/audio';
import { SystemWindow } from '../components/SystemWindow';

export function AchievementToast({ title, onDone }: { title: string; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    playSound('chime');
    const timer = setTimeout(() => onDoneRef.current(), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className="safe-x pointer-events-none fixed inset-x-0 top-0 z-40"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <SystemWindow className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.2em] text-glow">Title unlocked</p>
        <p className="text-lg text-ink">“{title}”</p>
        <p className="text-sm text-muted">Equip it from your Status window.</p>
      </SystemWindow>
    </div>
  );
}
