import { CHANGELOG, type ChangelogEntry } from '../../data/changelog';
import { SystemWindow } from '../components/SystemWindow';

function formatDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Notes({ notes }: { notes: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

export function WhatsNew({ entries = CHANGELOG }: { entries?: readonly ChangelogEntry[] }) {
  const [latest, ...older] = entries;
  if (!latest) return null;
  return (
    <SystemWindow title={'What’s new'}>
      <p className="text-base text-glow">Version {latest.version}</p>
      <p className="text-sm text-muted">
        {formatDate(latest.date)}
        {latest.title ? ` · ${latest.title}` : ''}
      </p>
      <Notes notes={latest.notes} />
      {older.map((entry) => (
        <details key={entry.version} className="mt-3 border-t border-glow-soft/40 pt-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted">
            Version {entry.version} · {formatDate(entry.date)}
            {entry.title ? ` · ${entry.title}` : ''}
          </summary>
          <Notes notes={entry.notes} />
        </details>
      ))}
    </SystemWindow>
  );
}
