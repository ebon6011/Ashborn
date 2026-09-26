import { useLiveQuery } from 'dexie-react-hooks';
import { CHANGELOG, PRE_TRACKING_VERSION, unseenEntries, type ChangelogEntry } from '../../data/changelog';
import { getMeta, setMeta } from '../../db/meta';
import { db } from '../../db/schema';
import type { GameEvent } from '../../domain/types';
import { Button } from '../components/Button';
import { SystemWindow } from '../components/SystemWindow';
import { Typewriter } from '../components/Typewriter';

/**
 * What to show, or nothing. `null` means "still loading": the window never renders until both the
 * last seen version and the pending level-up/title events are known, so it can't blink on at launch.
 */
export function whatsNewToShow(lastSeen: string | null, events: readonly GameEvent[] | null): ChangelogEntry[] {
  if (lastSeen === null || events === null || events.length > 0) return [];
  return unseenEntries(CHANGELOG, lastSeen);
}

/** Shown once after an update: every changelog entry newer than the last version the player saw. */
export function WhatsNewWindow() {
  const lastSeen = useLiveQuery(
    async () => {
      const stored: unknown = await getMeta(db, 'lastSeenVersion');
      // A missing or damaged value (e.g. from an old or hand-edited backup) falls back to the baseline.
      return typeof stored === 'string' && /^\d+(\.\d+)*$/.test(stored) ? stored : PRE_TRACKING_VERSION;
    },
    [],
    null,
  );
  const events = useLiveQuery(async () => (await getMeta(db, 'pendingEvents')) ?? [], [], null);
  const entries = whatsNewToShow(lastSeen, events);
  const newest = entries[0];
  if (!newest) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="What’s new" className="safe-x fixed inset-0 z-50 flex items-center justify-center bg-void/85">
      <SystemWindow title="System" className="max-h-[80dvh] w-full max-w-md overflow-y-auto">
        <Typewriter key={newest.version} text={`System update complete: Version ${newest.version}`} />
        {entries.map((entry) => (
          <div key={entry.version} className="mt-3">
            <p className="text-sm text-glow">
              Version {entry.version}
              {entry.title ? ` · ${entry.title}` : ''}
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
              {entry.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ))}
        <Button className="mt-4 w-full" onClick={() => void setMeta(db, 'lastSeenVersion', __APP_VERSION__)}>
          Close
        </Button>
      </SystemWindow>
    </div>
  );
}
