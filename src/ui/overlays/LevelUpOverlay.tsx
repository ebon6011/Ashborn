import { useEffect, useRef, type CSSProperties } from 'react';
import type { LevelUpEvent } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { RankBadge } from '../components/RankBadge';
import { SystemWindow } from '../components/SystemWindow';
import { useCountUp } from '../hooks/useCountUp';

/** 24 particle end points around the centre, alternating near/far. */
const BURST: ReadonlyArray<[number, number]> = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * 15 * Math.PI) / 180;
  const radius = i % 2 === 0 ? 120 : 170;
  return [Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)];
});

interface Props {
  event: LevelUpEvent;
  onClose: () => void;
  onAssign: () => void;
}

export function LevelUpOverlay({ event, onClose, onAssign }: Props) {
  const rankUp = event.toRank !== event.fromRank;
  const level = useCountUp(event.fromLevel, event.toLevel, 700);
  const points = useCountUp(0, event.statPointsGained, 700, 700);
  const done = useRef(false);
  const finish = (then: () => void) => {
    if (done.current) return;
    done.current = true;
    then();
  };

  useEffect(() => {
    playSound(rankUp ? 'rankUp' : 'levelUp');
  }, [rankUp]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Level up: level ${event.toLevel}`}
      data-variant={rankUp ? 'rank' : 'level'}
      onClick={() => finish(onClose)}
      className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-void/90"
    >
      <div aria-hidden="true" className={`levelup-glow ${rankUp ? 'levelup-glow-gold' : ''}`} />
      <div aria-hidden="true" className="levelup-burst">
        {BURST.map(([dx, dy], i) => (
          <span key={i} className="burst-particle" style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${(i % 4) * 20}ms` } as CSSProperties} />
        ))}
      </div>
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow title="System" className="text-center">
          <p className={`text-sm uppercase tracking-[0.3em] ${rankUp ? 'text-gold' : 'text-glow'}`}>{rankUp ? 'Rank up' : 'Level up'}</p>
          <p className="my-2 text-5xl font-bold text-ink drop-shadow-[0_0_12px_var(--color-glow)]">
            Lv. <span data-testid="levelup-level">{level}</span>
          </p>
          {rankUp && (
            <>
              <p className="sr-only">
                Rank up: {event.fromRank} → {event.toRank}
              </p>
              {/* Both badges share one grid cell, so the new rank flips in exactly where the old one was. */}
              <div aria-hidden="true" className="my-2 grid justify-items-center [perspective:400px]">
                <div className="rank-flip-out [grid-area:1/1]">
                  <RankBadge rank={event.fromRank} />
                </div>
                <div className="rank-flip-in [grid-area:1/1]">
                  <RankBadge rank={event.toRank} />
                </div>
              </div>
            </>
          )}
          <p className="mt-2 text-muted">
            +<span data-testid="levelup-points">{points}</span> stat points to assign
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                finish(onAssign);
              }}
            >
              Assign points
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                finish(onClose);
              }}
            >
              Continue
            </Button>
          </div>
        </SystemWindow>
      </div>
    </div>
  );
}
