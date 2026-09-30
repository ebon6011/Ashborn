import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test.use({ serviceWorkers: 'block' });

const DAY = 24 * 60 * 60 * 1000;

test('the Status card shows the boss art; a new week brings the boss alert', async ({ page }) => {
  const start = new Date();
  await page.clock.install({ time: start });
  await onboard(page);

  // No alert on the day you sign up.
  await expect(page.getByRole('dialog', { name: 'A Boss has appeared' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Status', exact: true }).click();
  const art = page.getByTestId('boss-art');
  await expect(art).toBeVisible();
  await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  // Jump a week ahead and reopen the app.
  await page.clock.setFixedTime(new Date(start.getTime() + 7 * DAY));
  await page.reload();
  const alert = page.getByRole('dialog', { name: 'A Boss has appeared' });
  await expect(alert).toBeVisible({ timeout: 10_000 });
  await expect(alert.getByText('⚠ WARNING')).toBeVisible();
  await alert.getByRole('button', { name: 'Accept' }).click();
  await expect(alert).toBeHidden();
});
