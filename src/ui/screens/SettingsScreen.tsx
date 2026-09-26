import { useState, type ChangeEvent } from 'react';
import { exportData, importData } from '../../db/backup';
import { setMeta } from '../../db/meta';
import { startDay } from '../../db/repo/days';
import { updateProfile } from '../../db/repo/onboarding';
import { db } from '../../db/schema';
import { backupFileName, buildBackup, parseBackup, type ParseResult } from '../../domain/backup';
import type { PersistResult, Profile, ProfileInput } from '../../domain/types';
import { saveBackupFile } from '../../platform/download';
import { checkForUpdates, type UpdateCheck } from '../../platform/updates';
import { isStandalone } from '../../platform/standalone';
import { requestPersist } from '../../platform/storage';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';
import { useMeta, useProfile } from '../hooks/data';
import { MedicalNotice } from '../overlays/MedicalNotice';
import { ProfileForm } from './ProfileForm';
import { WhatsNew } from './WhatsNew';

const PERSIST_TEXT: Record<PersistResult, string> = {
  granted: "Protected. The browser will not clear Ashborn's data on its own.",
  denied: 'Not protected. iPhone may clear website data after a long time unused, so keep regular backups.',
  unsupported: "This browser can't protect storage. Keep regular backups.",
};

const UPDATE_TEXT: Record<UpdateCheck, string> = {
  available: 'An update is ready — tap Update now.',
  none: 'You have the latest version.',
  offline: 'You’re offline — try again later.',
  unsupported: 'Updates aren’t available here.',
};

const MAX_BACKUP_BYTES = 20_000_000;

function toInput(p: Profile): ProfileInput {
  return {
    name: p.name, age: p.age, sex: p.sex, heightCm: p.heightCm, weightKg: p.weightKg, goal: p.goal,
    experience: p.experience, daysPerWeek: p.daysPerWeek, minutesPerSession: p.minutesPerSession, equipment: p.equipment,
  };
}

export function SettingsScreen({ onShowInstallGuide }: { onShowInstallGuide: () => void }) {
  const profile = useProfile();
  const lastBackupAt = useMeta('lastBackupAt');
  const persistResult = useMeta('persistResult');
  const soundOn = useMeta('soundOn') ?? true;
  const [message, setMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState<Extract<ParseResult, { ok: true }> | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkUpdates() {
    setChecking(true);
    setUpdateMessage(UPDATE_TEXT[await checkForUpdates()]);
    setChecking(false);
  }

  async function exportBackup() {
    setBusy(true);
    try {
      const now = new Date();
      const json = JSON.stringify(buildBackup(await exportData(db), now), null, 2);
      const outcome = await saveBackupFile(json, backupFileName(now));
      if (outcome !== 'cancelled') {
        await setMeta(db, 'lastBackupAt', now.toISOString());
        setMessage(
          outcome === 'downloaded'
            ? 'Backup file created. Check your Downloads or Files app.'
            : 'Backup saved. Keep the file somewhere safe, such as iCloud Drive.',
        );
      }
    } catch {
      setMessage('Could not create the backup. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPending(null);
    setImportError(null);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setImportError('This file is too large to be an Ashborn backup.');
      return;
    }
    const text = typeof file.text === 'function' ? await file.text() : await new Response(file).text();
    const result = parseBackup(text);
    if (result.ok) setPending(result);
    else setImportError(result.error);
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      await importData(db, pending.backup.data);
      await startDay(db, new Date());
      setPending(null);
      setMessage('Backup restored.');
    } catch {
      setImportError('Restoring failed. Your data was not changed.');
    } finally {
      setBusy(false);
    }
  }

  async function protect() {
    await setMeta(db, 'persistResult', await requestPersist());
  }

  async function saveProfile(input: ProfileInput) {
    await updateProfile(db, input, new Date());
    setEditing(false);
    setMessage('Answers saved. Your plan has been updated.');
  }

  return (
    <Screen title="Settings">
      {message && (
        <p role="status" className="text-glow">
          {message}
        </p>
      )}

      <SystemWindow title="Backup">
        <p className="text-sm text-muted">
          All progress lives only on this phone. Deleting the app or clearing Safari data erases it unless you have a backup.
        </p>
        <p className="mt-2 text-sm">Last backup: {lastBackupAt ? new Date(lastBackupAt).toLocaleDateString() : 'Never'}</p>
        <Button className="mt-3 w-full" disabled={busy} onClick={() => void exportBackup()}>
          Export backup
        </Button>
        <label className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center rounded border border-glow-soft px-4 text-base text-muted">
          Import backup
          <input type="file" accept=".json,application/json" aria-label="Import backup file" className="sr-only" onChange={(e) => void chooseFile(e)} />
        </label>
        {importError && (
          <p role="alert" className="mt-2 text-danger">
            {importError}
          </p>
        )}
        {pending && (
          <div className="mt-3 rounded border border-gold/60 p-3">
            <p className="text-sm text-gold">This will replace everything on this phone with:</p>
            <p className="mt-1">
              {pending.summary.playerName} · Level {pending.summary.level} · Rank {pending.summary.rank}
            </p>
            <p className="text-sm text-muted">
              {pending.summary.daysOfHistory} days of history · {pending.summary.setsLogged} sets logged
              {pending.summary.exportedAt ? ` · saved ${new Date(pending.summary.exportedAt).toLocaleDateString()}` : ''}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => void confirmImport()}>
                Replace my data
              </Button>
            </div>
          </div>
        )}
      </SystemWindow>

      <SystemWindow title="Storage protection">
        <p className="text-sm">{persistResult ? PERSIST_TEXT[persistResult] : 'Not requested yet.'}</p>
        {persistResult !== 'granted' && (
          <Button variant="ghost" className="mt-3 w-full" onClick={() => void protect()}>
            Ask to protect my data
          </Button>
        )}
      </SystemWindow>

      <SystemWindow title="Sound">
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          aria-label="Sound"
          onClick={() => void setMeta(db, 'soundOn', !soundOn)}
          className="flex min-h-11 w-full items-center justify-between rounded border border-glow-soft px-3 text-base"
        >
          <span>Sound effects</span>
          <span className={soundOn ? 'text-glow' : 'text-muted'}>{soundOn ? 'On' : 'Off'}</span>
        </button>
        <p className="mt-2 text-sm text-muted">iPhone's silent switch also mutes app sounds.</p>
      </SystemWindow>

      <SystemWindow title="Your answers">
        {editing && profile ? (
          <ProfileForm
            initial={toInput(profile)}
            submitLabel="Save answers"
            onSubmit={(v) => void saveProfile(v)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setEditing(true)}>
            Edit my answers
          </Button>
        )}
        <p className="mt-2 text-sm text-muted">Your level, stats and history are kept.</p>
      </SystemWindow>

      {!isStandalone() && (
        <SystemWindow title="Install">
          <Button variant="ghost" className="w-full" onClick={onShowInstallGuide}>
            How to install on iPhone
          </Button>
        </SystemWindow>
      )}

      <MedicalNotice />

      <SystemWindow title="Updates">
        <p className="text-sm">You’re on version {__APP_VERSION__}.</p>
        <Button variant="ghost" className="mt-3 w-full" disabled={checking} onClick={() => void checkUpdates()}>
          {checking ? 'Checking…' : 'Check for updates'}
        </Button>
        {updateMessage && (
          <p role="status" className="mt-2 text-sm text-glow">
            {updateMessage}
          </p>
        )}
      </SystemWindow>

      <WhatsNew />

      <SystemWindow title="Known limits">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>No Apple Health or step counting. Enter steps and workouts yourself.</li>
          <li>No home screen widgets.</li>
          <li>No reminders yet. iPhone web apps need a server for notifications; this is planned for phase 2.</li>
          <li>Data stays on this phone only. Export a backup regularly.</li>
        </ul>
      </SystemWindow>

      <p className="pb-4 text-center text-xs text-muted">Ashborn v{__APP_VERSION__} · No accounts, no tracking. Your data never leaves this device.</p>
    </Screen>
  );
}
