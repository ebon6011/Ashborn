import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { addFood, deleteFood, type FoodInput } from '../../db/repo/food';
import { db } from '../../db/schema';
import { calculateTargets, MIN_CALORIES, sumFood } from '../../domain/nutrition';
import type { FoodEntry, Goal } from '../../domain/types';
import { Button } from '../components/Button';
import { NumberField } from '../components/NumberField';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { TextField } from '../components/TextField';
import { useMeta, useProfile } from '../hooks/data';

const GOAL_TEXT: Record<Goal, string> = {
  lose_fat: 'lose fat: 20 % below maintenance, never more than 500 kcal',
  build_muscle: 'build muscle: 10 % above maintenance',
  get_fit: 'get fit: maintenance',
};

function Target({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {value} / {target} {unit}
        </span>
      </div>
      <ProgressBar value={value} max={target} label={label} />
    </div>
  );
}

export function NutritionScreen() {
  const profile = useProfile();
  const today = useMeta('lastOpenDate');
  const entries = useLiveQuery(() => (today ? db.foodLog.where('date').equals(today).toArray() : []), [today], [] as FoodEntry[]);
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [water, setWater] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) {
    return (
      <Screen title="Nutrition">
        <p className="text-muted">Loading…</p>
      </Screen>
    );
  }

  const targets = calculateTargets(profile);
  const totals = sumFood(entries);

  async function add(input: FoodInput): Promise<boolean> {
    try {
      await addFood(db, input, new Date());
      setMessage('Logged.');
      return true;
    } catch (err) {
      setMessage((err as Error).message);
      return false;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await add({ kcal: kcal ?? 0, proteinG: protein ?? 0, waterMl: water ?? 0, note });
    if (!ok) return;
    setKcal(null);
    setProtein(null);
    setWater(null);
    setNote('');
    setFormKey((k) => k + 1);
  }

  return (
    <Screen title="Nutrition">
      <SystemWindow title="Today's targets">
        <Target label="Calories" value={totals.kcal} target={targets.calories} unit="kcal" />
        <Target label="Protein" value={totals.proteinG} target={targets.proteinG} unit="g" />
        <Target label="Water" value={totals.waterMl} target={targets.waterMl} unit="ml" />
        <p className="text-sm text-muted">
          Carbs about {targets.carbsG} g · Fat about {targets.fatG} g
        </p>
        {targets.minorHeldAtMaintenance && (
          <p className="mt-3 rounded border border-gold/60 p-3 text-sm text-gold">
            Under 18: no calorie deficit. Your target is kept at maintenance.
          </p>
        )}
        {targets.floorApplied && (
          <p className="mt-3 rounded border border-gold/60 p-3 text-sm text-gold">
            Your calorie target is held at {targets.floor} kcal, the safe minimum for you: never below your resting energy use or{' '}
            {MIN_CALORIES[profile.sex]} kcal. Eating less than this without medical supervision is not recommended.
          </p>
        )}
        <details className="mt-3 text-sm text-muted">
          <summary className="min-h-11 cursor-pointer py-2">How these are calculated</summary>
          <p>
            Resting energy (Mifflin-St Jeor): {targets.bmr} kcal. Multiplied by your activity factor {targets.multiplier}, that gives
            maintenance of {targets.tdee} kcal. Goal: {GOAL_TEXT[profile.goal]}. Protein is 1.6 g per kg, fat is 25 % of calories and carbs are the rest.
            Water follows the EFSA guideline.
          </p>
        </details>
      </SystemWindow>

      <SystemWindow title="Log food">
        <form key={formKey} onSubmit={(e) => void submit(e)} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Calories" unit="kcal" value={null} onChange={setKcal} rule={{ min: 0, max: 20_000 }} />
            <NumberField label="Protein" unit="g" decimal value={null} onChange={setProtein} rule={{ min: 0, max: 1_000 }} />
          </div>
          <NumberField label="Water" unit="ml" value={null} onChange={setWater} rule={{ min: 0, max: 10_000, integer: true }} />
          <TextField label="Note (optional)" value={note} onChange={setNote} maxLength={80} />
          <Button type="submit" className="w-full">
            Add
          </Button>
        </form>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => void add({ kcal: 0, proteinG: 0, waterMl: 250 })}>
            +250 ml water
          </Button>
          <Button variant="ghost" onClick={() => void add({ kcal: 0, proteinG: 0, waterMl: 500 })}>
            +500 ml water
          </Button>
        </div>
        {message && (
          <p role="status" className="mt-2 text-sm text-glow">
            {message}
          </p>
        )}
      </SystemWindow>

      <SystemWindow title="Today's log">
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet today.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <span>
                  {e.kcal} kcal · {e.proteinG} g protein · {e.waterMl} ml{e.note ? ` · ${e.note}` : ''}
                </span>
                <Button variant="ghost" aria-label="Delete entry" onClick={() => void deleteFood(db, e.id)}>
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>
    </Screen>
  );
}
