# Credits

Everything you see and hear in Ashborn was made for Ashborn.

## Sounds
All sound effects (quest complete, level up, rank up, achievement, penalty quest, taps and system chimes) are **synthesised live in code** by the phone's own audio engine — see `SOUNDS` in `src/platform/audio.ts`. There are no recordings and no third-party sound files, so there is nothing to license. Total audio download: **0 KB**.

## Art
- App icon (`public/icon.svg` and the PNGs generated from it): original, drawn for Ashborn.
- Background scene (`src/assets/backdrop.svg`, `src/assets/hex-tile.svg`): original, drawn for Ashborn.
- Boss art (`src/assets/bosses/*.svg`) and the eight Bosses' names, stories and titles (`src/config/bosses.ts`): original, drawn for Ashborn. The retired v1.4.0 Bosses' silhouettes (`src/ui/components/BossSilhouette.tsx`) are original too.
- Inventory items (`src/config/items.ts`, `src/ui/components/frames.ts`): the window themes, emblem frames and item titles are original, made for Ashborn.
- Classes (`src/config/classes.ts`, `src/ui/components/classIcons.ts`): the four class names and icons are original, made for Ashborn.
- All animations are original CSS.

## Fonts
Ashborn uses the device's own system font; no font files are shipped.

## Software
The app is built with open-source libraries listed in `package.json` (React, Dexie, Vite, Tailwind CSS, vite-plugin-pwa and others), each under its own open-source licence.
