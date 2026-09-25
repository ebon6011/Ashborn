// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { buildBackup } from '../../domain/backup';
import { sampleBackupData } from '../../test/fixtures';
import { seedApp } from '../../test/uiFixtures';
import { SettingsScreen } from './SettingsScreen';

beforeEach(() => seedApp('2026-09-21'));

const pick = (input: HTMLElement, text: string) =>
  fireEvent.change(input, { target: { files: [new File([text], 'backup.json', { type: 'application/json' })] } });

describe('SettingsScreen', () => {
  it('invalid file leaves data untouched', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    pick(await screen.findByLabelText('Import backup file'), '{oops');
    expect((await screen.findByRole('alert')).textContent).toContain('This file is not valid JSON.');
    expect((await db.profile.get(1))?.name).toBe('Kai');
  });

  it('restores a valid backup only after confirmation', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    const data = sampleBackupData();
    data.profile[0] = { ...data.profile[0]!, name: 'Rin' };
    pick(await screen.findByLabelText('Import backup file'), JSON.stringify(buildBackup(data, new Date())));
    expect(await screen.findByText(/Rin · Level 7 · Rank E/)).toBeTruthy();
    expect((await db.profile.get(1))?.name).toBe('Kai');
    fireEvent.click(screen.getByRole('button', { name: 'Replace my data' }));
    await waitFor(async () => expect((await db.profile.get(1))?.name).toBe('Rin'));
    expect(await screen.findByText('Backup restored.')).toBeTruthy();
  });

  it('toggles sound', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    const toggle = await screen.findByRole('switch', { name: 'Sound' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(async () => expect(await getMeta(db, 'soundOn')).toBe(false));
  });

  it('lists the known limits', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    expect(await screen.findByText(/No Apple Health/)).toBeTruthy();
    expect(screen.getByText(/No reminders yet/)).toBeTruthy();
  });
});
