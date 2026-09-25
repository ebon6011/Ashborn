import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta } from '../../db/meta';
import { dismissEvent } from '../../db/repo/player';
import { db } from '../../db/schema';
import type { GameEvent } from '../../domain/types';
import { AchievementToast } from './AchievementToast';
import { LevelUpOverlay } from './LevelUpOverlay';

export function EventHost() {
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], [] as GameEvent[]);
  const event = events[0];
  if (!event) return null;
  if (event.type === 'levelUp') {
    return <LevelUpOverlay key={`level-${event.toLevel}`} event={event} onClose={() => void dismissEvent(db)} />;
  }
  return <AchievementToast key={`title-${event.id}`} title={event.title} onDone={() => void dismissEvent(db)} />;
}
