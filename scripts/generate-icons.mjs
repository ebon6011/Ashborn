// Renders public/icon.svg into the PNG icons iPhone and the web manifest need.
// Uses Playwright's WebKit (already a dev dependency), so no extra image packages.
import { readFile } from 'node:fs/promises';
import { webkit } from '@playwright/test';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8');

const targets = [
  { file: 'public/apple-touch-icon.png', size: 180, padding: 0 },
  { file: 'public/pwa-192.png', size: 192, padding: 0 },
  { file: 'public/pwa-512.png', size: 512, padding: 0 },
  // Maskable icons keep the emblem inside the central safe zone.
  { file: 'public/pwa-maskable-512.png', size: 512, padding: 0.12 },
];

const browser = await webkit.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { file, size, padding } of targets) {
  const inner = Math.round(size * (1 - 2 * padding));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;width:${size}px;height:${size}px;background:#05070d;display:grid;place-items:center">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</body></html>',
  );
  await page.screenshot({ path: file });
  console.log(`wrote ${file} (${size}x${size})`);
}
await browser.close();
