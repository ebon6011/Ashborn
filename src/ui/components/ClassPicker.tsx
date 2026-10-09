import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { CLASSES } from '../../config/classes';
import { progression } from '../../config/progression';
import { chooseClass } from '../../db/repo/classes';
import { db } from '../../db/schema';
import { canChangeClass, daysUntilClassChange } from '../../domain/classes';
import { todayKey } from '../../domain/day';
import type { ClassId } from '../../domain/types';
import { playSound } from '../../platform/audio';
import { Button } from './Button';
import { ClassIcon } from './ClassIcon';

const FOCUS_LABEL = { pushups: 'more push-ups', situps: 'more sit-ups', squats: 'more squats', cardio: 'a longer walk or jog' } as const;
const STAT_NAME = { strength: 'Strength', agility: 'Agility', vitality: 'Vitality', endurance: 'Endurance', discipline: 'Discipline' } as const;

/** The 4 classes with a Become button. Respects the change cooldown. */
export function ClassPicker({ onChosen, onLater }: { onChosen?: () => void; onLater?: () => void }) {
  const player = useLiveQuery(() => db.player.get(1), []);
  const [selected, setSelected] = useState<ClassId | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!player) return null;

  const today = todayKey(new Date());
  const allowed = canChangeClass(player, today);
  const wait = daysUntilClassChange(player, today);
  const pick = selected ?? player.classId ?? CLASSES[0]!.id;
  const def = CLASSES.find((c) => c.id === pick)!;
  const bonus = Math.round(progression.classes.sideQuestXpBonus * 100);

  async function become() {
    try {
      await chooseClass(db, pick, new Date());
      playSound('achievement');
      onChosen?.();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Classes" className="space-y-2">
        {CLASSES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={pick === c.id}
            onClick={() => setSelected(c.id)}
            className={`flex min-h-14 w-full items-center gap-3 rounded border p-3 text-left ${pick === c.id ? 'border-glow' : 'border-glow-soft'}`}
          >
            <ClassIcon classId={c.id} size={32} />
            <span>
              <span className="block text-ink">
                {c.name}
                {player.classId === c.id ? ' · current' : ''}
              </span>
              <span className="block text-sm text-muted">{`${STAT_NAME[c.stat]} +${bonus}% XP · ${c.focus ? FOCUS_LABEL[c.focus] : 'balanced'}`}</span>
            </span>
          </button>
        ))}
      </div>
      {!allowed && wait > 0 && <p className="mt-3 text-sm text-muted">{`You can change class in ${wait} ${wait === 1 ? 'day' : 'days'}.`}</p>}
      <Button className="mt-3 w-full" disabled={!allowed} onClick={() => void become()}>{`Become ${def.name}`}</Button>
      {onLater && (
        <Button variant="ghost" className="mt-2 w-full" onClick={onLater}>
          Later
        </Button>
      )}
      <p className="mt-2 text-center text-xs text-muted">{`You can change class again after ${progression.classes.changeCooldownDays} days.`}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
