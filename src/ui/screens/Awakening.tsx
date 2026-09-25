import { useState } from 'react';
import { setMeta } from '../../db/meta';
import { registerPlayer } from '../../db/repo/onboarding';
import { db } from '../../db/schema';
import { STAT_LABELS } from '../../domain/stats';
import { STAT_KEYS, type ProfileInput } from '../../domain/types';
import { progression } from '../../config/progression';
import { playSound } from '../../platform/audio';
import { requestPersist } from '../../platform/storage';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { Typewriter } from '../components/Typewriter';
import { MedicalNotice } from '../overlays/MedicalNotice';
import { ProfileForm } from './ProfileForm';

type Step = 'form' | 'notice' | 'registered';

export function Awakening() {
  const [step, setStep] = useState<Step>('form');
  const [input, setInput] = useState<ProfileInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    if (!input || busy) return;
    setBusy(true);
    const persist = requestPersist(); // started inside the tap, as Safari prefers
    try {
      await registerPlayer(db, input, new Date());
      await setMeta(db, 'medicalAck', true);
      await setMeta(db, 'persistResult', await persist);
      playSound('levelUp');
    } catch {
      setError('Could not save your player. Please try again.');
      setBusy(false);
    }
  }

  if (step === 'form') {
    return (
      <Screen title="Awakening">
        <SystemWindow title="System">
          <Typewriter text="A new player has been detected. Answer the System to begin." />
        </SystemWindow>
        <ProfileForm
          submitLabel="Continue"
          onSubmit={(value) => {
            setInput(value);
            setStep('notice');
          }}
        />
      </Screen>
    );
  }

  if (step === 'notice' || !input) {
    return (
      <Screen title="Awakening">
        <MedicalNotice onAccept={() => setStep('registered')} />
      </Screen>
    );
  }

  return (
    <Screen title="Awakening">
      <SystemWindow title="Player Registered">
        <Typewriter text={`Welcome, ${input.name}. Level 1. Rank E. Your first daily quest is ready.`} />
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {STAT_KEYS.map((key) => (
            <div key={key} className="flex justify-between">
              <dt className="text-muted">{STAT_LABELS[key]}</dt>
              <dd className="tabular-nums text-ink">{progression.startingStatValue}</dd>
            </div>
          ))}
        </dl>
        {error && (
          <p role="alert" className="mt-3 text-danger">
            {error}
          </p>
        )}
        <Button className="mt-4 w-full" disabled={busy} onClick={() => void begin()}>
          Begin
        </Button>
      </SystemWindow>
    </Screen>
  );
}
