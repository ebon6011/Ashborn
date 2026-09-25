import { useEffect, useRef } from 'react';
import type { LevelUpEvent } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

export function LevelUpOverlay({ event, onClose }: { event: LevelUpEvent; onClose: () => void }) {
  const closed = useRef(false);
  const close = () => {
    if (closed.current) return;
    closed.current = true;
    onClose();
  };

  useEffect(() => {
    playSound('levelUp');
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Level up: level ${event.toLevel}`}
      onClick={close}
      className="safe-x fixed inset-0 z-50 flex items-center justify-center bg-void/90"
    >
      <div className="level-burst w-full max-w-sm">
        <SystemWindow title="System" className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-glow">Level up</p>
          <p className="my-2 text-5xl font-bold text-ink drop-shadow-[0_0_12px_var(--color-glow)]">Lv. {event.toLevel}</p>
          {event.toRank !== event.fromRank && (
            <p className="text-lg text-gold">
              Rank up: {event.fromRank} → {event.toRank}
            </p>
          )}
          <p className="mt-2 text-muted">+{event.statPointsGained} stat points to assign</p>
          <Button
            className="mt-4 w-full"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            Continue
          </Button>
        </SystemWindow>
      </div>
    </div>
  );
}
