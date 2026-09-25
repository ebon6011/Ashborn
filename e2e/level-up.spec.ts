import { expect, test } from '@playwright/test';
import { completeDailyQuest, onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

test('levelling up shows the level-up screen and grants stat points', async ({ page }) => {
  await onboard(page);
  await completeDailyQuest(page); // 65 XP of 80

  await page.getByLabel('Quest name').fill('Drink water');
  await page.getByLabel('Reward (XP)').fill('20');
  await page.getByRole('button', { name: 'Add quest' }).click();
  await page.getByRole('button', { name: 'Complete Drink water' }).click(); // 85 XP → level 2

  const dialog = page.getByRole('dialog', { name: /Level up/ });
  await expect(dialog).toBeVisible({ timeout: 10_000 }); // waits behind the 3.5 s title toast
  await expect(dialog.getByText('Lv. 2')).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  await expect(page.getByTestId('level')).toHaveText('2');
  await expect(page.getByText('3 points to assign')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add point to Strength' }).click();
  await page.getByRole('button', { name: 'Confirm stats' }).click();
  await expect(page.getByTestId('stat-strength')).toHaveText('13');
  await expect(page.getByText(/points to assign/)).toBeHidden();
});
