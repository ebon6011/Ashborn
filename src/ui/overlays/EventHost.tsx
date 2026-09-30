import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { getMeta } from '../../db/meta';
import { dismissEvent } from '../../db/repo/player';
import { db } from '../../db/schema';
import { weekStartOf } from '../../domain/day';
import type { GameEvent } from '../../domain/types';
import { useMeta } from '../hooks/data';
import { AchievementToast } from './AchievementToast';
import { BossAppearedOverlay } from './BossAppearedOverlay';
import { BossDefeatedOverlay } from './BossDefeatedOverlay';
import { LevelUpOverlay } from './LevelUpOverlay';

export function EventHost({ onAssignPoints }: { onAssignPoints?: () => void } = {}) {
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  const today = useMeta('lastOpenDate');
  const event = events[0];
  // A Boss alert for a week that's already over (app closed before Accept) is dropped, not shown.
  const stale = event?.type === 'bossAppeared' && today != null && event.weekStart !== weekStartOf(today);
  useEffect(() => {
    if (stale) void dismissEvent(db);
  }, [stale, event]);

  if (!event || stale) return null;
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
  if (event.type === 'bossAppeared') {
    if (today == null) return null;
    return (
      <BossAppearedOverlay
        key={`appeared-${event.weekStart}`}
        bossId={event.bossId}
        weekStart={event.weekStart}
        today={today}
        onAccept={() => void dismissEvent(db)}
      />
    );
  }
  return (
    <BossDefeatedOverlay key={`boss-${event.bossId}`} bossId={event.bossId} xp={event.xp} title={event.title} onClose={() => void dismissEvent(db)} />
  );
}
