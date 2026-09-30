/**
 * "What's new" list shown in Settings. Newest first.
 *
 * Every release: bump "version" in package.json and add an entry at the TOP here with the
 * same version. Write notes for the player: short, friendly, no tech words.
 * A test fails if the top entry doesn't match the app version.
 */

export interface ChangelogEntry {
  version: string;
  /** Release day as YYYY-MM-DD */
  date: string;
  title?: string;
  notes: string[];
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: '2026-09-30',
    title: 'New Bosses',
    notes: [
      'Eight brand-new Bosses with fresh, scarier looks.',
      'A warning now pops up when a new Boss arrives each Monday.',
      'Titles you have already won are kept.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-09-28',
    notes: [
      'A new Boss appears every Monday. Work out and finish quests to deal damage — hit its weakness for double.',
      'Beat it by Sunday for bonus XP and a rare title. Miss it? No problem, a new one arrives next week.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-09-27',
    notes: [
      'Ashborn sounds and feels more alive: new sound effects, a volume control and optional tap sounds in Settings.',
      'Levelling up is a bigger moment, and clearing your daily quest earns a Quest Cleared stamp.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-09-27',
    notes: [
      'Updates now wait for you: tap “Update now” when you’re ready, and see what changed right after.',
      'New “Check for updates” button in Settings.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-27',
    notes: ['New: a “What’s new” list here in Settings, so you can see what changed in each update.'],
  },
  {
    version: '1.0.0',
    date: '2026-09-26',
    title: 'Ashborn is here!',
    notes: [
      'Create your player and get daily quests, levels and ranks from E to S.',
      'Log workouts and meals, and earn titles for your progress.',
      'Works offline once installed, and your data stays on your phone.',
      'A glowing gate and a shadow army now watch over your screens.',
    ],
  },
];

/** Every install from before What's New tracking had seen up to this version. */
export const PRE_TRACKING_VERSION = '1.1.0';

/** Changelog entries newer than the version the player last saw, newest first. */
export function unseenEntries(changelog: readonly ChangelogEntry[], lastSeen: string): ChangelogEntry[] {
  return changelog.filter((entry) => compareVersions(entry.version, lastSeen) > 0);
}

/** Compares "1.10.0" and "1.9.0" by number. Positive if a is newer than b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
