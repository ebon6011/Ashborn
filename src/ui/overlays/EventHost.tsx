import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { getMeta } from '../../db/meta';
import { dismissEvent } from '../../db/repo/player';
import { db } from '../../db/schema';
import { dropStaleBossAlerts } from '../../db/repo/boss';
import { todayKey, weekStartOf } from '../../domain/day';
import type { GameEvent } from '../../domain/types';
import { AchievementToast } from './AchievementToast';
import { BossAppearedOverlay } from './BossAppearedOverlay';
import { BossDefeatedOverlay } from './BossDefeatedOverlay';
import { LevelUpOverlay } from './LevelUpOverlay';

export function EventHost({ onAssignPoints }: { onAssignPoints?: () => void } = {}) {
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  const event = events[0];
  // Judged by the phone's real date, so last week's alert never flashes while the new day loads.
  // The drop filters by content (never "remove the first one"), so a repeat can't lose another event.
  const today = todayKey(new Date());
  const stale = event?.type === 'bossAppeared' && event.weekStart < weekStartOf(today);
  useEffect(() => {
    if (stale) void dropStaleBossAlerts(db, today);
  }, [stale, event, today]);

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
