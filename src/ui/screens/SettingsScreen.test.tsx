// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { buildBackup } from '../../domain/backup';
import * as download from '../../platform/download';
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

  it('tells the player where to find a downloaded backup file', async () => {
    const spy = vi.spyOn(download, 'saveBackupFile').mockResolvedValue('downloaded');
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Export backup' }));
    expect(await screen.findByText('Backup file created. Check your Downloads or Files app.')).toBeTruthy();
    await waitFor(async () => expect(await getMeta(db, 'lastBackupAt')).toBeTruthy());
    spy.mockRestore();
  });

  it('gives the "Edit my answers" form a Cancel button', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit my answers' }));
    expect(await screen.findByLabelText('Player name')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('button', { name: 'Edit my answers' })).toBeTruthy();
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

  it("shows what's new and the app version", async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'What’s new' })).toBeTruthy();
    expect(screen.getByText(`Version ${__APP_VERSION__}`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`Ashborn v${__APP_VERSION__.replace(/\./g, '\\.')}`))).toBeTruthy();
  });

  it('checks for updates and says so plainly', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check for updates' }));
    expect(await screen.findByText('Updates aren’t available here.')).toBeTruthy();
  });
});
