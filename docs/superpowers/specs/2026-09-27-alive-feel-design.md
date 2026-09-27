# Ashborn — "Feels Alive" Design (v1.3.0)

Date: 2026-09-27
Status: design approved in chat; awaiting written-spec review

## Intent
Richer sounds and bigger celebration moments, without making the app slower or heavier.

## Owner decisions
- Sounds are generated in code (Web Audio synthesis): 0 KB of audio files, fully original, no licences.
- Tap sounds exist but are OFF by default, with their own switch.
- Level-up "counter": the level number rolls up and "+N stat points" counts up; an "Assign points" button goes to the Status screen.

## 1. Sound engine (`src/platform/audio.ts`)
- Each sound is a small recipe of layers (waveform, start/end pitch, start, duration, loudness); a noise layer is allowed. All layers route through one master gain node.
- Sounds: `questComplete` (bright two-note chime + sparkle), `levelUp` (four-note rising fanfare), `rankUp` (low swell bursting into a high chord), `achievement` (soft shimmering bell), `penalty` (low short warning), `tap` (tiny soft click), plus existing `chime` (system text) and `complete` (single item).
- Master volume 0–1 scales every sound; 0 plays nothing. Existing rules stay: nothing before the first tap, silent on any failure, no Vibration API.
- Tap sounds: when enabled, any button tap plays `tap` (one capturing listener).

## 2. Settings → Sound
- Existing on/off switch; new Volume slider (0–100 %, step 5, default 80 %); new "Tap sounds" switch (default off).
- Stored as meta keys `soundVolume` (number 0–1) and `tapSounds` (boolean). Key–value only: no Dexie schema change, no migration; missing keys use the defaults.

## 3. Level up / rank up screen (`LevelUpOverlay`)
- Full-screen glow pulse (blue; gold for rank up) and a one-shot particle burst (24 CSS particles, transform/opacity only).
- Level number counts from the old to the new level, then "+N stat points" counts up from 0 (about 0.8 s each).
- Rank up: the old rank badge flips to the new one; `rankUp` sound instead of `levelUp`.
- Buttons: "Assign points" (dismisses and opens Status) and "Continue". Tapping the backdrop still skips. About 2 s total.

## 4. "Quest Cleared" stamp (Daily Quest card)
- When the last daily item is completed, a rotated "QUEST CLEARED" stamp slams onto the card (≈350 ms) with the `questComplete` sound; the last item's own `complete` sound is skipped so they don't overlap.
- Revisiting a finished day shows the stamp still, without animation or sound.

## 5. Other sound hooks
- Title-unlocked toast plays `achievement`.
- Penalty quest: `penalty` plays once per day (per app session) when the Quests screen shows an unfinished penalty quest.

## 6. Motion and performance
- Reduced motion: no glow pulse, no particles, counters and stamp show their final state instantly.
- All non-level-up animations stay under 400 ms. Only transform/opacity are animated; particles exist only while the level-up screen is open.
- No new packages. Measure before/after with `npm run size` and the e2e load test.
- Baseline (v1.2.0): code 431.4 KB (gzip 134.0 KB), everything in dist 604.4 KB; first screen median 369 ms (5 cold loads, iPhone WebKit profile, software-rendered).

## 7. Release
- v1.3.0, changelog: "Ashborn sounds and feels more alive: new sound effects, a volume control, a bigger level-up moment and a Quest Cleared stamp."
- `docs/credits.md`: all sounds and art are original to Ashborn, generated in code; no third-party assets.

## Testing
- Audio: every sound builds its layers; volume scales the master gain; volume 0 is silent; tap sounds only when enabled.
- Settings: volume and tap switch are saved.
- Level-up overlay: counters end on the right numbers (instant with reduced motion), rank-up variant, correct sound, Assign points navigates.
- Daily quest: stamp animates and plays `questComplete` once on completion; a finished day shows a still stamp and plays nothing.
- Penalty sound plays once per day.
- Full `npm run check`, `npm run e2e` (incl. load-speed test under 1.5 s), sizes reported.
