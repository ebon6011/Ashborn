import { expect, type Page } from '@playwright/test';

export async function onboard(page: Page, name = 'Kai'): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: 'Continue in Safari' }).click();
  await page.getByLabel('Player name').fill(name);
  await page.getByLabel('Age').fill('30');
  await page.getByRole('button', { name: 'Male', exact: true }).click();
  await page.getByLabel('Height (cm)').fill('180');
  await page.getByLabel('Weight (kg)').fill('80');
  await page.getByRole('button', { name: /^Get fit/ }).click();
  await page.getByRole('button', { name: /^Beginner/ }).click();
  await page.getByLabel('Days per week').fill('3');
  await page.getByLabel('Minutes per session').fill('30');
  await page.getByRole('button', { name: /^No equipment/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'I understand' }).click();
  await expect(page.getByRole('heading', { name: 'Player Registered' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

export async function completeDailyQuest(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Quests', exact: true }).click();
  for (const label of ['Push-ups', 'Sit-ups', 'Squats', 'Walk']) {
    await page.getByRole('button', { name: `Complete ${label}`, exact: true }).click();
  }
  await expect(page.getByText(/Quest complete/)).toBeVisible();
}
