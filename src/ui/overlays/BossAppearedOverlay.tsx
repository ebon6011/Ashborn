import { useRef } from 'react';
import { getBoss } from '../../config/bosses';
import { bossDaysLeft, bossForWeek } from '../../domain/boss';
import { playSound } from '../../platform/audio';
import { BossArt } from '../components/BossArt';
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';
import { WEAKNESS_LABEL } from '../screens/BossCard';

interface Props {
  bossId: string;
  weekStart: string;
  today: string;
  onAccept: () => void;
}

/** Shown once when a new week's Boss arrives. Silent until Accept is tapped (iPhone: sound only after a tap). */
export function BossAppearedOverlay({ bossId, weekStart, today, onAccept }: Props) {
  const def = getBoss(bossId) ?? bossForWeek(weekStart);
  const days = bossDaysLeft(weekStart, today);
  const done = useRef(false);
  const accept = () => {
    if (done.current) return;
    done.current = true;
    playSound('chime');
    onAccept();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="A Boss has appeared"
      className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-void/90"
    >
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-danger">⚠ WARNING</p>
          <p className="mt-1 text-lg font-semibold text-ink">A Boss has appeared</p>
          <BossArt def={def} className="mx-auto my-3 h-48 w-40" />
          <p className="text-lg text-ink">{`${def.name}, ${def.epithet}`}</p>
          <p className="mt-1 inline-block rounded border border-gold/60 px-2 text-xs text-gold">{`Weak to ${WEAKNESS_LABEL[def.weakness]}`}</p>
          <p className="mt-2 text-sm text-muted">{`${days} ${days === 1 ? 'day' : 'days'} to defeat it`}</p>
          <Button className="mt-4 w-full" onClick={accept}>
            Accept
          </Button>
        </SystemWindow>
      </div>
    </div>
  );
}
