import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { progression } from '../../config/progression';
import { getMeta } from '../../db/meta';
import { assignStats, setTitle } from '../../db/repo/player';
import { db } from '../../db/schema';
import { ACHIEVEMENTS, titleFor } from '../../domain/achievements';
import { needsBackupReminder } from '../../domain/backup';
import { rankForLevel } from '../../domain/rank';
import { STAT_LABELS } from '../../domain/stats';
import { STAT_KEYS, type StatKey, type Stats } from '../../domain/types';
import { xpToNext } from '../../domain/xp';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { RankBadge } from '../components/RankBadge';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import type { Tab } from '../components/TabBar';
import { usePlayer, useProfile } from '../hooks/data';
import { BackupReminder } from '../overlays/BackupReminder';

export function StatusScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const player = usePlayer();
  const profile = useProfile();
  const unlockedIds = useLiveQuery(async () => (await db.achievements.toArray()).map((a) => a.id), [], [] as string[]);
  const showReminder = useLiveQuery(
    async () => needsBackupReminder(new Date(), await getMeta(db, 'lastBackupAt'), await getMeta(db, 'installedAt')),
    [],
    false,
  );
  const [allocation, setAllocation] = useState<Partial<Stats>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player || !profile) {
    return (
      <Screen title="Status">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  const need = xpToNext(player.level);
  const rank = rankForLevel(player.level);
  const spent = STAT_KEYS.reduce((sum, key) => sum + (allocation[key] ?? 0), 0);
  const left = player.unspentStatPoints - spent;
  const change = (key: StatKey, delta: number) =>
    setAllocation((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) }));

  async function confirm() {
    setBusy(true);
    try {
      await assignStats(db, allocation);
      setAllocation({});
      setError(null);
      playSound('complete');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Status">
      {showReminder && <BackupReminder onOpenSettings={() => onNavigate('settings')} />}

      <SystemWindow title="Status">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-ink">{profile.name}</p>
            <p className="text-sm text-muted">
              Title: <span className="text-ink">{titleFor(player.titleId)}</span>
            </p>
          </div>
          <RankBadge rank={rank} />
        </div>
        <div className="mb-1 mt-4 flex items-baseline justify-between">
          <p className="text-lg">
            Level <span data-testid="level">{player.level}</span>
          </p>
          <p className="text-sm tabular-nums text-muted">
            {player.xp} / {need} XP
          </p>
        </div>
        <ProgressBar value={player.xp} max={need} label="Experience" />
        <p className="mt-3 text-sm text-muted">
          Streak: <span className="text-ink">{player.streak} days</span> · Best {player.bestStreak}
        </p>
      </SystemWindow>

      <SystemWindow title="Stats">
        {player.unspentStatPoints > 0 && <p className="mb-2 text-sm text-gold">{left} points to assign</p>}
        <ul className="space-y-2">
          {STAT_KEYS.map((key) => (
            <li key={key} className="flex items-center justify-between">
              <span>{STAT_LABELS[key]}</span>
              <span className="flex items-center gap-2">
                {player.unspentStatPoints > 0 && (
                  <Button variant="ghost" aria-label={`Remove point from ${STAT_LABELS[key]}`} disabled={!allocation[key]} onClick={() => change(key, -1)}>
                    −
                  </Button>
                )}
                <span className="w-10 text-center text-lg tabular-nums" data-testid={`stat-${key}`}>
                  {player.stats[key] + (allocation[key] ?? 0)}
                </span>
                {player.unspentStatPoints > 0 && (
                  <Button variant="ghost" aria-label={`Add point to ${STAT_LABELS[key]}`} disabled={left <= 0} onClick={() => change(key, 1)}>
                    +
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {spent > 0 && (
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void confirm()}>
            Confirm stats
          </Button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-danger">
            {error}
          </p>
        )}
      </SystemWindow>

      <SystemWindow title="Titles">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Displayed title</span>
          <select
            value={player.titleId ?? ''}
            onChange={(e) => void setTitle(db, e.target.value || null)}
            className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink"
          >
            <option value="">{progression.defaultTitle}</option>
            {ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)).map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <ul className="mt-3 space-y-1 text-sm">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id);
            return (
              <li key={a.id} className={unlocked ? 'text-ink' : 'text-muted'}>
                <span aria-hidden="true">{unlocked ? '◆ ' : '◇ '}</span>
                <span className="sr-only">{unlocked ? 'Unlocked: ' : 'Locked: '}</span>
                {a.title}: {a.description}
              </li>
            );
          })}
        </ul>
      </SystemWindow>
    </Screen>
  );
}
