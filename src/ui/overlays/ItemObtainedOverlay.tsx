import { useRef } from 'react';
import { getItem } from '../../config/items';
import { equipFrame, equipTheme } from '../../db/repo/inventory';
import { setTitle } from '../../db/repo/player';
import { db } from '../../db/schema';
import type { GameEvent } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { Emblem } from '../components/Emblem';
import { SystemWindow } from '../components/SystemWindow';

const KIND_LABEL = { theme: 'Window theme', frame: 'Emblem frame', title: 'Title' } as const;
const SOURCE_LABEL = { boss: 'Boss win', streak: '7-day streak', rankUp: 'Exercise rank-up' } as const;

interface Props {
  event: Extract<GameEvent, { type: 'itemObtained' }>;
  playerName: string;
  onClose: () => void;
}

/** "Item obtained". Silent until a button is tapped (iPhone: sound only after a tap). */
export function ItemObtainedOverlay({ event, playerName, onClose }: Props) {
  const item = event.itemId ? getItem(event.itemId) : undefined;
  const done = useRef(false);
  const finish = async (equip: boolean) => {
    if (done.current) return;
    done.current = true;
    playSound('achievement');
    try {
      if (equip && item) {
        if (item.kind === 'theme') await equipTheme(db, item.id);
        else if (item.kind === 'frame') await equipFrame(db, item.id);
        else await setTitle(db, item.id);
      }
    } catch {
      // Equipping failed (e.g. the item is gone). Still close: the backdrop is inert, so a stuck screen would trap the player.
    }
    onClose();
  };

  const name = item ? item.name : event.shield ? 'Streak Shield' : 'Collection complete';
  const detail = item ? KIND_LABEL[item.kind] : event.shield ? 'Saves your streak for one missed day' : 'You have found every item. Well done!';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Item obtained"
      className="safe-x fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void/90"
    >
      <div className="level-burst relative w-full max-w-sm">
        <SystemWindow className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Item obtained</p>
          <p className="mt-1 text-sm text-muted">{`From: ${SOURCE_LABEL[event.source]}`}</p>
          <div className="my-3 flex justify-center">
            {item?.kind === 'frame' ? (
              <Emblem name={playerName} frameId={item.id} size={80} />
            ) : item?.kind === 'theme' ? (
              <span aria-hidden="true" className="block h-16 w-24 rounded border-2" style={{ borderColor: item.glow, boxShadow: `0 0 16px ${item.glow}` }} />
            ) : (
              <span aria-hidden="true" className="text-5xl">
                {event.shield ? '🛡' : item ? '◆' : '✦'}
              </span>
            )}
          </div>
          <p className="text-lg text-ink">{name}</p>
          <p className="text-sm text-muted">{detail}</p>
          <div className={`mt-4 grid gap-2 ${item ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {item && <Button onClick={() => void finish(true)}>Equip now</Button>}
            <Button variant="ghost" onClick={() => void finish(false)}>
              Later
            </Button>
          </div>
        </SystemWindow>
      </div>
    </div>
  );
}
