import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block', acceptDownloads: true });

test('an earned theme can be previewed and equipped from the Inventory', async ({ page }) => {
  // Use the download path for backups (no share sheet in automation).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await onboard(page);

  // Default look first.
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await page.getByRole('button', { name: 'Inventory' }).click();
  await expect(page.getByText('1 of 16 found')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();

  // Seed one earned theme through Export → edit → Import (the app's own restore flow).
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  backup.data.inventory = [{ itemId: 'theme-ember', obtainedAt: new Date().toISOString(), source: 'boss' }];
  await page
    .getByLabel('Import backup file')
    .setInputFiles({ name: 'ashborn.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: 'Replace my data' }).click();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await page.getByRole('button', { name: 'Inventory' }).click();
  await expect(page.getByText('2 of 16 found')).toBeVisible();
  const glow = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-glow').trim());
  await page.getByRole('button', { name: /^Ember/ }).click();
  await expect.poll(glow).toBe('#ff8a3d');
  await page.getByRole('button', { name: 'Equip Ember' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.reload();
  await expect.poll(glow).toBe('#ff8a3d');
});
