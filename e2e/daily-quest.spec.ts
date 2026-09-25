import { expect, test } from '@playwright/test';
import { completeDailyQuest, onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

test('completing the daily quest awards XP and starts a streak', async ({ page }) => {
  await onboard(page);
  await completeDailyQuest(page);
  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByText('65 / 80 XP')).toBeVisible();
  await expect(page.getByText(/Streak: 1 days/)).toBeVisible();
});
