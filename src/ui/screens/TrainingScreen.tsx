import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { exercisesFor, getExercise } from '../../config/exercises';
import { deleteSet, logSet } from '../../db/repo/training';
import { db } from '../../db/schema';
import { isoWeekday, weekStartOf } from '../../domain/day';
import type { PlanFocus, WorkoutSet } from '../../domain/types';
import { exerciseRank } from '../../domain/workout/exerciseRank';
import { computeRecords } from '../../domain/workout/records';
import { playSound } from '../../platform/audio';
import { Button } from '../components/Button';
import { NumberField } from '../components/NumberField';
import { RankBadge } from '../components/RankBadge';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { useMeta, useProfile } from '../hooks/data';

const WEEKDAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FOCUS_LABEL: Record<PlanFocus, string> = { full: 'Full body', upper: 'Upper body', lower: 'Lower body' };

export function TrainingScreen() {
  const today = useMeta('lastOpenDate');
  const profile = useProfile();
  const plan = useLiveQuery(() => (today ? db.workoutPlans.get(weekStartOf(today)) : undefined), [today]);
  const allSets = useLiveQuery(() => db.workoutSets.toArray(), [], [] as WorkoutSet[]);
  const [selected, setSelected] = useState<string | null>(null);

  if (!today || !profile) {
    return (
      <Screen title="Training">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  const todayWeekday = isoWeekday(today);
  const loggedIds = [...new Set(allSets.map((s) => s.exerciseId))];

  return (
    <Screen title="Training">
      {selected && <ExerciseLogger key={selected} exerciseId={selected} onClose={() => setSelected(null)} />}

      <SystemWindow title="This week">
        {!plan ? (
          <p className="text-muted">Your plan appears after the daily reset.</p>
        ) : (
          <ul className="space-y-3">
            {plan.days.map((day) => (
              <li key={day.weekday}>
                <p className={day.weekday === todayWeekday ? 'text-glow' : 'text-ink'}>
                  {WEEKDAY_NAMES[day.weekday]} · {FOCUS_LABEL[day.focus]}
                  {day.weekday === todayWeekday ? ' · Today' : ''}
                </p>
                <ul className="mt-1 space-y-1">
                  {day.exercises.map((planned, index) => (
                    <li key={`${planned.exerciseId}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setSelected(planned.exerciseId)}
                        className="flex min-h-11 w-full items-center justify-between rounded border border-glow-soft/60 px-3 text-left"
                      >
                        <span>{getExercise(planned.exerciseId)?.name ?? planned.exerciseId}</span>
                        <span className="text-sm text-muted">
                          {planned.sets} × {planned.reps}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">Not a training day? Tap Rest today on the Quests tab to keep your streak.</p>
      </SystemWindow>

      <SystemWindow title="Log any exercise">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Exercise</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setSelected(e.target.value);
            }}
            className="min-h-11 w-full rounded border border-glow-soft bg-void px-3 text-base text-ink"
          >
            <option value="">Choose…</option>
            {exercisesFor(profile.equipment).map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </label>
      </SystemWindow>

      <SystemWindow title="Records">
        {loggedIds.length === 0 ? (
          <p className="text-sm text-muted">Log a set to start tracking records and ranks.</p>
        ) : (
          <ul className="space-y-2">
            {loggedIds.map((id) => {
              const exercise = getExercise(id);
              if (!exercise) return null;
              const sets = allSets.filter((s) => s.exerciseId === id);
              const records = computeRecords(sets);
              const { rank } = exerciseRank(sets, exercise.weighted);
              return (
                <li key={id} className="flex items-center gap-2">
                  <button type="button" className="min-h-11 flex-1 text-left" onClick={() => setSelected(id)}>
                    {exercise.name}
                    <span className="block text-sm text-muted">
                      {exercise.weighted
                        ? `Heaviest ${records.heaviestKg} kg · est. 1RM ${records.bestOneRepMax.toFixed(1)} kg`
                        : `Best ${records.bestReps} reps`}
                    </span>
                  </button>
                  <RankBadge rank={rank} size="sm" />
                </li>
              );
            })}
          </ul>
        )}
      </SystemWindow>
    </Screen>
  );
}

function ExerciseLogger({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const sets = useLiveQuery(() => db.workoutSets.where('exerciseId').equals(exerciseId).toArray(), [exerciseId], [] as WorkoutSet[]);
  const [reps, setReps] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [repsKey, setRepsKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const exercise = getExercise(exerciseId);
  if (!exercise) return null;

  const alternative = exercise.alternativeId ? getExercise(exercise.alternativeId) : undefined;
  const recent = [...sets].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const { rank } = exerciseRank(sets, exercise.weighted);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reps === null) {
      setMessage('Enter the reps you did.');
      return;
    }
    try {
      const { isPR } = await logSet(db, { exerciseId, reps, weightKg: weight ?? 0 }, new Date());
      setMessage(isPR ? 'New personal record!' : 'Set logged.');
      playSound(isPR ? 'levelUp' : 'complete');
      setReps(null);
      setRepsKey((k) => k + 1);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <SystemWindow title={exercise.name}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">Rank from your own progress</p>
        <RankBadge rank={rank} />
      </div>
      {alternative && <p className="mb-3 text-sm text-muted">No equipment today? Try {alternative.name}.</p>}
      <form onSubmit={(e) => void submit(e)} className="grid grid-cols-2 gap-2">
        <NumberField key={`reps-${repsKey}`} label="Reps" value={null} onChange={setReps} rule={{ min: 1, max: 1000, integer: true }} />
        {exercise.weighted && <NumberField label="Weight" unit="kg" decimal value={weight} onChange={setWeight} rule={{ min: 0, max: 1000 }} />}
        <Button type="submit" className="col-span-2">
          Log set
        </Button>
      </form>
      {message && (
        <p role="status" className="mt-2 text-glow">
          {message}
        </p>
      )}
      {recent.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {recent.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <span>
                {s.date} · {s.reps} reps{exercise.weighted ? ` × ${s.weightKg} kg` : ''}
              </span>
              <Button variant="ghost" aria-label={`Delete set from ${s.date}`} onClick={() => void deleteSet(db, s.id)}>
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="ghost" className="mt-3 w-full" onClick={onClose}>
        Close
      </Button>
    </SystemWindow>
  );
}
