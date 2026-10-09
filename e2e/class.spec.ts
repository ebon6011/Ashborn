import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block', acceptDownloads: true });

test('a level-10 player completes the Trial, becomes Ironclad, and sees it on Status', async ({ page }) => {
  // Use the download path for backups (no share sheet in automation).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await onboard(page);

  // Level the player to 10 through Export → edit → Import (the app's own restore flow).
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  backup.data.player[0].level = 10;
  await page
    .getByLabel('Import backup file')
    .setInputFiles({ name: 'ashborn.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: 'Replace my data' }).click();
  // Restoring runs the daily reset, which creates the Trial for a level-10 player.
  await expect(page.getByText('Backup restored.')).toBeVisible();

  await page.getByRole('button', { name: 'Quests', exact: true }).click();
  const trial = page.getByRole('region', { name: 'Class Change · Trial' });
  await expect(trial).toBeVisible();
  for (const label of ['Push-ups', 'Sit-ups', 'Squats', 'Walk']) {
    await trial.getByRole('button', { name: `Complete Trial: ${label}`, exact: true }).click();
  }

  const choose = page.getByRole('dialog', { name: 'Choose your class' });
  await expect(choose).toBeVisible({ timeout: 10_000 });
  await choose.getByRole('radio', { name: /Ironclad/ }).click();
  await choose.getByRole('button', { name: 'Become Ironclad' }).click();
  await expect(choose).toBeHidden();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByText('Ironclad', { exact: true })).toBeVisible();
});
