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
import { ClassChoiceOverlay } from './ClassChoiceOverlay';
import { ItemObtainedOverlay } from './ItemObtainedOverlay';
import { LevelUpOverlay } from './LevelUpOverlay';
import { ShieldToast } from './ShieldToast';

export function EventHost({ onAssignPoints }: { onAssignPoints?: () => void } = {}) {
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  const playerName = useLiveQuery(async () => (await db.profile.get(1))?.name ?? '', [], '');
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
  if (event.type === 'shieldUsed') {
    return <ShieldToast key={`shield-${event.streak}-${event.count}`} count={event.count} streak={event.streak} onDone={() => void dismissEvent(db)} />;
  }
  if (event.type === 'itemObtained') {
    return (
      <ItemObtainedOverlay
        // The queue length changes after every dismiss, so back-to-back identical rewards get fresh screens.
        key={`item-${events.length}-${event.itemId ?? (event.shield ? 'shield' : 'complete')}`}
        event={event}
        playerName={playerName}
        onClose={() => void dismissEvent(db)}
      />
    );
  }
  if (event.type === 'classChoice') return <ClassChoiceOverlay key={`class-${events.length}`} onClose={() => void dismissEvent(db)} />;
  return (
    <BossDefeatedOverlay key={`boss-${event.bossId}`} bossId={event.bossId} xp={event.xp} title={event.title} onClose={() => void dismissEvent(db)} />
  );
}
