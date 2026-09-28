import { useLiveQuery } from 'dexie-react-hooks';
import { getBoss } from '../../config/bosses';
import { bossTitleId } from '../../db/repo/boss';
import { db } from '../../db/schema';
import { titleFor } from '../../domain/achievements';
import { bossDaysLeft } from '../../domain/boss';
import { weekStartOf } from '../../domain/day';
import type { BossCategory } from '../../domain/types';
import { BossSilhouette } from '../components/BossSilhouette';
import { ProgressBar } from '../components/ProgressBar';
import { SystemWindow } from '../components/SystemWindow';
import { useMeta } from '../hooks/data';

export const WEAKNESS_LABEL: Record<BossCategory, string> = { legs: 'legs', core: 'core', cardio: 'cardio', upper: 'upper body' };

/** This week's Boss on the Status screen. */
export function BossCard() {
  const today = useMeta('lastOpenDate');
  const weekStart = today ? weekStartOf(today) : null;
  const boss = useLiveQuery(() => (weekStart ? db.bosses.get(weekStart) : undefined), [weekStart]);
  const rewardXp = useLiveQuery(
    async () => (weekStart ? (await db.questLog.where('kind').equals('boss').filter((e) => e.refId === weekStart).first())?.xp : undefined),
    [weekStart],
  );
  const def = boss ? getBoss(boss.bossId) : undefined;
  if (!today || !boss || !def) return null;

  const daysLeft = bossDaysLeft(boss.weekStart, today);
  return (
    <SystemWindow title="Weekly Boss">
      <div className="flex items-center gap-3">
        <BossSilhouette silhouette={def.silhouette} className={`h-24 w-24 shrink-0 ${boss.defeatedAt ? 'opacity-40' : ''}`} />
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink">{def.name}</p>
          <p className="text-sm text-muted">{def.epithet}</p>
          <p className="mt-1 inline-block rounded border border-gold/60 px-2 text-xs text-gold">{`Weak to ${WEAKNESS_LABEL[def.weakness]}`}</p>
        </div>
      </div>
      <div className="mb-1 mt-3 flex items-baseline justify-between text-sm">
        <span className="tabular-nums text-ink">{`${boss.hp} / ${boss.maxHp} HP`}</span>
        <span className="text-muted">{boss.defeatedAt ? 'Defeated' : daysLeft === 1 ? 'Last day' : `${daysLeft} days left`}</span>
      </div>
      <ProgressBar value={boss.hp} max={boss.maxHp} label={`${def.name} HP`} />
      {boss.defeatedAt ? (
        <p className="mt-2 text-sm text-gold">
          {rewardXp ? `+${rewardXp} XP · ` : ''}Title: {titleFor(bossTitleId(def.id))}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">{def.story}</p>
      )}
    </SystemWindow>
  );
}
