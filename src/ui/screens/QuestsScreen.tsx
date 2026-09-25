import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { completeUrgent, finishDay, setItemProgress, setPenaltyProgress, setRest } from '../../db/repo/days';
import { archiveSideQuest, completeSideQuest, createSideQuest } from '../../db/repo/sideQuests';
import { db } from '../../db/schema';
import { parseNumberInput } from '../../domain/input';
import { dailyQuestXp, partialXp } from '../../domain/quests/daily';
import { STAT_LABELS } from '../../domain/stats';
import { STAT_KEYS, type DayRecord, type PenaltyQuest, type QuestItem, type StatKey, type UrgentQuest } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { NumberField } from '../components/NumberField';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { TextField } from '../components/TextField';
import { useMeta, usePlayer } from '../hooks/data';

const unitLabel = (unit: QuestItem['unit']) => (unit === 'min' ? 'min' : 'reps');

export function QuestsScreen() {
  const today = useMeta('lastOpenDate');
  const day = useLiveQuery(() => (today ? db.days.get(today) : undefined), [today]);
  const player = usePlayer();

  if (!today || !day || !player) {
    return (
      <Screen title="Quests">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  return (
    <Screen title="Quests">
      {day.urgent && <UrgentCard date={today} quest={day.urgent} />}
      {day.penalty && <PenaltyCard date={today} quest={day.penalty} />}
      <DailyQuestCard day={day} level={player.level} />
      <SideQuests date={today} />
    </Screen>
  );
}

function DailyQuestCard({ day, level }: { day: DayRecord; level: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const open = day.status === 'open' || day.status === 'partial';
  const canFinish = partialXp(day.items, level) - day.xpAwarded > 0;

  async function finish() {
    const xp = await finishDay(db, day.date, new Date());
    setMessage(xp > 0 ? `Progress saved. +${xp} XP.` : null);
  }

  return (
    <SystemWindow title="Daily Quest">
      <p className="mb-3 text-sm text-muted">Finish every task before midnight for {dailyQuestXp(level)} XP.</p>
      {day.status === 'done' && (
        <p role="status" className="mb-3 text-glow">
          Quest complete. +{day.xpAwarded} XP earned today.
        </p>
      )}
      {day.status === 'rest' && (
        <p role="status" className="mb-3 text-glow">
          Rest day. Your streak is safe.
        </p>
      )}
      <ul className="space-y-3">
        {day.items.map((item) => (
          <QuestItemRow key={item.id} date={day.date} item={item} disabled={!open} />
        ))}
      </ul>
      {open && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={!canFinish} onClick={() => void finish()}>
            Finish for today
          </Button>
          <Button variant="ghost" onClick={() => void setRest(db, day.date, true)}>
            Rest today
          </Button>
        </div>
      )}
      {day.status === 'rest' && (
        <Button variant="ghost" className="mt-3 w-full" onClick={() => void setRest(db, day.date, false)}>
          Undo rest
        </Button>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm text-glow">
          {message}
        </p>
      )}
    </SystemWindow>
  );
}

function QuestItemRow({ date, item, disabled }: { date: string; item: QuestItem; disabled: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const done = item.progress >= item.target;

  async function save(value: number) {
    await setItemProgress(db, date, item.id, value, new Date());
    playSound(value >= item.target ? 'complete' : 'tap');
    setText('');
    setError(null);
  }

  return (
    <li className="rounded border border-glow-soft/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={done ? 'text-glow' : 'text-ink'}>{item.label}</p>
          <p className="text-sm text-muted">Easier: {item.easier}</p>
        </div>
        <p className="tabular-nums">
          {Math.min(item.progress, item.target)}/{item.target} {unitLabel(item.unit)}
        </p>
      </div>
      {!done && !disabled && (
        <div className="mt-2 flex gap-2">
          <input
            aria-label={`${item.label} done so far`}
            inputMode="numeric"
            placeholder={unitLabel(item.unit)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-11 w-20 rounded border border-glow-soft bg-void px-3 text-base text-ink"
          />
          <Button
            variant="ghost"
            onClick={() => {
              const value = parseNumberInput(text, { min: 0, max: 100_000, integer: true });
              if (value !== null) void save(value);
              else setError('Enter a whole number.');
            }}
          >
            Save
          </Button>
          <Button className="flex-1" aria-label={`Complete ${item.label}`} onClick={() => void save(item.target)}>
            Complete
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

function PenaltyCard({ date, quest }: { date: string; quest: PenaltyQuest }) {
  return (
    <SystemWindow title="Penalty Quest">
      <p className="text-sm text-muted">You missed a day. Here is one small extra task. No pressure.</p>
      <p className="mt-2">
        {quest.label}: {quest.target} {unitLabel(quest.unit)} <span className="text-sm text-muted">(easier: {quest.easier})</span>
      </p>
      {quest.done ? (
        <p role="status" className="mt-2 text-glow">
          Penalty cleared. +{quest.xp} XP
        </p>
      ) : (
        <Button
          className="mt-3 w-full"
          aria-label="Complete penalty quest"
          onClick={() => {
            void setPenaltyProgress(db, date, quest.target, new Date());
            playSound('complete');
          }}
        >
          Complete (+{quest.xp} XP)
        </Button>
      )}
    </SystemWindow>
  );
}

function UrgentCard({ date, quest }: { date: string; quest: UrgentQuest }) {
  return (
    <SystemWindow title="Urgent Quest">
      <p className="text-base">{quest.label}</p>
      <p className="text-sm text-muted">Optional. Skip it if today isn't right.</p>
      {quest.done ? (
        <p role="status" className="mt-2 text-glow">
          Cleared. +{quest.xp} XP
        </p>
      ) : (
        <Button
          className="mt-3 w-full"
          aria-label="Complete urgent quest"
          onClick={() => {
            void completeUrgent(db, date, new Date());
            playSound('complete');
          }}
        >
          Complete (+{quest.xp} XP)
        </Button>
      )}
    </SystemWindow>
  );
}

function SideQuests({ date }: { date: string }) {
  const quests = useLiveQuery(() => db.sideQuests.filter((q) => !q.archived).toArray(), [], []);
  const doneIds = useLiveQuery(
    async () => (await db.questLog.where('date').equals(date).filter((e) => e.kind === 'side').toArray()).map((e) => e.refId),
    [date],
    [] as string[],
  );
  const [title, setTitle] = useState('');
  const [xp, setXp] = useState<number | null>(20);
  const [stat, setStat] = useState<StatKey>('discipline');
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    try {
      await createSideQuest(db, { title, xp: xp ?? 20, stat });
      setTitle('');
      setXp(20);
      setFormKey((k) => k + 1);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <SystemWindow title="Side Quests">
      {quests.length === 0 && <p className="text-sm text-muted">Add your own habits: study, drink water, read…</p>}
      <ul className="space-y-2">
        {quests.map((q) => {
          const done = doneIds.includes(String(q.id));
          return (
            <li key={q.id} className="flex items-center gap-2 rounded border border-glow-soft/60 p-3">
              <div className="flex-1">
                <p className={done ? 'text-glow' : 'text-ink'}>{q.title}</p>
                <p className="text-sm text-muted">
                  +{q.xp} XP · {STAT_LABELS[q.stat]}
                </p>
              </div>
              {done ? (
                <span className="text-sm text-glow">Done today</span>
              ) : (
                <Button
                  aria-label={`Complete ${q.title}`}
                  onClick={() => {
                    void completeSideQuest(db, q.id, new Date());
                    playSound('complete');
                  }}
                >
                  Done
                </Button>
              )}
              <Button
                variant="ghost"
                aria-label={`Remove ${q.title}`}
                onClick={() => {
                  if (window.confirm(`Remove "${q.title}"?`)) void archiveSideQuest(db, q.id);
                }}
              >
                ✕
              </Button>
            </li>
          );
        })}
      </ul>
      <form key={formKey} onSubmit={(e) => void add(e)} className="mt-4 space-y-3">
        <TextField label="Quest name" value={title} onChange={setTitle} />
        <NumberField label="Reward" unit="XP" value={xp} onChange={setXp} rule={{ min: 10, max: 50, integer: true }} />
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Boosts</span>
          <select
            value={stat}
            onChange={(e) => setStat(e.target.value as StatKey)}
            className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink"
          >
            {STAT_KEYS.map((key) => (
              <option key={key} value={key}>
                {STAT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full">
          Add quest
        </Button>
      </form>
    </SystemWindow>
  );
}
