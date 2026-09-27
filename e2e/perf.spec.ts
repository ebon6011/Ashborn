import { expect, test } from '@playwright/test';

// Cold-load speed on the iPhone WebKit profile: time from navigation start until the first
// screen's heading is on screen. Software-rendered WebKit on a PC is slower than a real iPhone,
// so treat the number as a relative measure (before vs after a change), not an absolute one.
const RUNS = 5;
const BUDGET_MS = 1500;

test.use({ serviceWorkers: 'block' });

test('the first screen appears quickly', async ({ browser }) => {
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext({ ...test.info().project.use });
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Awakening' })).toBeVisible();
    times.push(await page.evaluate(() => Math.round(performance.now())));
    await context.close();
  }
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  console.log(`first-screen times (ms): ${times.join(', ')} | median ${median}`);
  expect(median).toBeLessThan(BUDGET_MS);
});
