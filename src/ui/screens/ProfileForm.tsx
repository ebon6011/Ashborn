import { useState, type FormEvent } from 'react';
import type { NumberRule } from '../../domain/input';
import type { Equipment, Experience, Goal, ProfileInput, Sex } from '../../domain/types';
import { Button } from '../components/Button';
import { ChoiceGroup, type Choice } from '../components/ChoiceGroup';
import { NumberField } from '../components/NumberField';
import { SystemWindow } from '../components/SystemWindow';
import { TextField } from '../components/TextField';

export const PROFILE_RULES = {
  age: { min: 13, max: 100, integer: true },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
  daysPerWeek: { min: 1, max: 7, integer: true },
  minutesPerSession: { min: 10, max: 180, integer: true },
} satisfies Record<string, NumberRule>;

const SEX: Choice<Sex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];
const GOALS: Choice<Goal>[] = [
  { value: 'lose_fat', label: 'Lose fat' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'get_fit', label: 'Get fit', hint: 'Feel better, move more' },
];
const EXPERIENCE: Choice<Experience>[] = [
  { value: 'never', label: 'Never trained', hint: 'Very gentle start' },
  { value: 'beginner', label: 'Beginner', hint: 'Some activity, little structure' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Train most weeks' },
  { value: 'advanced', label: 'Advanced', hint: 'Years of steady training' },
];
const EQUIPMENT: Choice<Equipment>[] = [
  { value: 'none', label: 'No equipment', hint: 'Home workouts' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'gym', label: 'Full gym' },
];

interface Props {
  initial?: ProfileInput;
  submitLabel: string;
  onSubmit: (value: ProfileInput) => void;
  onCancel?: () => void;
}

export function ProfileForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState<number | null>(initial?.age ?? null);
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [heightCm, setHeightCm] = useState<number | null>(initial?.heightCm ?? null);
  const [weightKg, setWeightKg] = useState<number | null>(initial?.weightKg ?? null);
  const [goal, setGoal] = useState<Goal | null>(initial?.goal ?? null);
  const [experience, setExperience] = useState<Experience | null>(initial?.experience ?? null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(initial?.daysPerWeek ?? null);
  const [minutesPerSession, setMinutesPerSession] = useState<number | null>(initial?.minutesPerSession ?? null);
  const [equipment, setEquipment] = useState<Equipment | null>(initial?.equipment ?? null);
  const [errors, setErrors] = useState<string[]>([]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const problems: string[] = [];
    if (!name.trim()) problems.push('Enter your name.');
    if (age === null) problems.push('Enter your age (13–100).');
    if (sex === null) problems.push('Choose your sex.');
    if (heightCm === null) problems.push('Enter your height (100–250 cm).');
    if (weightKg === null) problems.push('Enter your weight (30–300 kg).');
    if (goal === null) problems.push('Choose a goal.');
    if (experience === null) problems.push('Choose your experience.');
    if (daysPerWeek === null) problems.push('Enter training days per week (1–7).');
    if (minutesPerSession === null) problems.push('Enter minutes per session (10–180).');
    if (equipment === null) problems.push('Choose your equipment.');
    if (
      problems.length > 0 || age === null || sex === null || heightCm === null || weightKg === null || goal === null ||
      experience === null || daysPerWeek === null || minutesPerSession === null || equipment === null
    ) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    onSubmit({ name: name.trim().slice(0, 30), age, sex, heightCm, weightKg, goal, experience, daysPerWeek, minutesPerSession, equipment });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <SystemWindow title="Player">
        <div className="space-y-3">
          <TextField label="Player name" value={name} onChange={setName} maxLength={30} />
          <NumberField label="Age" value={age} onChange={setAge} rule={PROFILE_RULES.age} />
          <ChoiceGroup legend="Sex (used for the calorie formula)" options={SEX} value={sex} onChange={setSex} />
          <NumberField label="Height" unit="cm" decimal value={heightCm} onChange={setHeightCm} rule={PROFILE_RULES.heightCm} />
          <NumberField label="Weight" unit="kg" decimal value={weightKg} onChange={setWeightKg} rule={PROFILE_RULES.weightKg} />
        </div>
      </SystemWindow>
      <SystemWindow title="Goal">
        <div className="space-y-3">
          <ChoiceGroup legend="Main goal" options={GOALS} value={goal} onChange={setGoal} columns={1} />
          <ChoiceGroup legend="Training experience" options={EXPERIENCE} value={experience} onChange={setExperience} columns={1} />
        </div>
      </SystemWindow>
      <SystemWindow title="Training">
        <div className="space-y-3">
          <NumberField label="Days per week" value={daysPerWeek} onChange={setDaysPerWeek} rule={PROFILE_RULES.daysPerWeek} />
          <NumberField label="Minutes per session" value={minutesPerSession} onChange={setMinutesPerSession} rule={PROFILE_RULES.minutesPerSession} />
          <ChoiceGroup legend="Equipment" options={EQUIPMENT} value={equipment} onChange={setEquipment} columns={1} />
        </div>
      </SystemWindow>
      {errors.length > 0 && (
        <div role="alert" className="rounded border border-danger p-3 text-danger">
          <p className="mb-1 font-medium">Please fix:</p>
          <ul className="list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <div className={onCancel ? 'grid grid-cols-2 gap-2' : ''}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className={onCancel ? '' : 'w-full'}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
