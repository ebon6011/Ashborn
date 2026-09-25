import { expect, test } from '@playwright/test';

test('ships an installable manifest, iPhone icon and safe-area viewport', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest).toMatchObject({
    name: 'Ashborn', short_name: 'Ashborn', display: 'standalone', start_url: '/ashborn/',
    theme_color: '#05070d', background_color: '#05070d',
  });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

  const size = await page.evaluate(async () => {
    const img = new Image();
    img.src = document.querySelector('link[rel="apple-touch-icon"]')!.getAttribute('href')!;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(size).toEqual([180, 180]);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('viewport-fit=cover');
});

test('the service worker precaches the app shell', async ({ request }) => {
  const sw = await (await request.get('sw.js')).text();
  expect(sw).toContain('index.html');
  expect(sw).toMatch(/assets\/index-[\w-]+\.js/);
});

test('reloads offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  const controller = await page.evaluate(() => navigator.serviceWorker.controller);
  console.log('DEBUG controller after first reload:', controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Awakening' })).toBeVisible();
});
