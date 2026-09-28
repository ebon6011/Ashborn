import { useEffect, useRef } from 'react';
import { getBoss } from '../../config/bosses';
import { playSound } from '../../platform/audio';
import { BossSilhouette } from '../components/BossSilhouette';
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';

interface Props {
  bossId: string;
  xp: number;
  /** Newly unlocked title, or null if the player already had it */
  title: string | null;
  onClose: () => void;
}

export function BossDefeatedOverlay({ bossId, xp, title, onClose }: Props) {
  const def = getBoss(bossId);
  const done = useRef(false);
  const close = () => {
    if (done.current) return;
    done.current = true;
    onClose();
  };

  useEffect(() => {
    playSound('rankUp');
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Boss defeated"
      data-variant="rank"
      onClick={close}
      className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-void/90"
    >
      <div aria-hidden="true" className="levelup-glow levelup-glow-gold" />
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow title="System" className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Boss defeated</p>
          {def && <BossSilhouette silhouette={def.silhouette} className="mx-auto my-2 h-20 w-20 opacity-50" />}
          <p className="text-lg text-ink">{def ? `${def.name}, ${def.epithet}` : 'The Boss'}</p>
          <p className="mt-2 text-2xl font-bold text-ink drop-shadow-[0_0_12px_var(--color-glow)]">+{xp} XP</p>
          {title && <p className="mt-1 text-gold">Title unlocked: {title}</p>}
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
