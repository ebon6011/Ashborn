import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

test('a new player completes the Awakening and lands on the status window', async ({ page }) => {
  await onboard(page);
  await expect(page.getByRole('heading', { name: 'Status', level: 1 })).toBeVisible();
  await expect(page.getByText('Kai', { exact: true })).toBeVisible();
  await expect(page.getByTestId('level')).toHaveText('1');
  await expect(page.getByRole('img', { name: 'Rank E' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Boss' })).toBeVisible();
  await expect(page.getByText(/^\d+ \/ \d+ HP$/)).toBeVisible();
});

test('shows the install guide in Safari and keeps inputs at 16px', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: 'Install Ashborn' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue in Safari' }).click();
  const fontSize = await page.getByLabel('Player name').evaluate((el) => getComputedStyle(el).fontSize);
  expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);
});
