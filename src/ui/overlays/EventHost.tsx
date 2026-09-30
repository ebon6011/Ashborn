import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta } from '../../db/meta';
import { dismissEvent } from '../../db/repo/player';
import { db } from '../../db/schema';
import type { GameEvent } from '../../domain/types';
import { AchievementToast } from './AchievementToast';
import { BossDefeatedOverlay } from './BossDefeatedOverlay';
import { LevelUpOverlay } from './LevelUpOverlay';

export function EventHost({ onAssignPoints }: { onAssignPoints?: () => void } = {}) {
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  const event = events[0];
  if (!event) return null;
  if (event.type === 'levelUp') {
    return (
      <LevelUpOverlay
        key={`level-${event.toLevel}`}
        event={event}
        onClose={() => void dismissEvent(db)}
        onAssign={() => {
          void dismissEvent(db);
          onAssignPoints?.();
        }}
      />
    );
  }
  if (event.type === 'achievement') {
    return <AchievementToast key={`title-${event.id}`} title={event.title} onDone={() => void dismissEvent(db)} />;
  }
  if (event.type === 'bossAppeared') return null;
  return (
    <BossDefeatedOverlay key={`boss-${event.bossId}`} bossId={event.bossId} xp={event.xp} title={event.title} onClose={() => void dismissEvent(db)} />
  );
}
