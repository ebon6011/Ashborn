# "Feels Alive" (v1.3.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native, in-session), with superpowers:test-driven-development and superpowers:verification-before-completion. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Original code-generated sound effects with volume + tap-sound settings, a bigger level/rank-up moment, and a "Quest Cleared" stamp — no slower, no new packages.

**Architecture:** `src/platform/audio.ts` becomes a tiny recipe-based synthesiser (layers of oscillators/noise → one master gain). Settings stores `soundVolume`/`tapSounds` meta keys that `App` pushes into the audio module. `LevelUpOverlay` gains CSS glow/particles and a `useCountUp` hook. `DailyQuestCard` renders a stamp that animates only when the day turns `done` during this mount.

**Tech Stack:** existing only (React 19, Tailwind 4 CSS, Web Audio, Vitest + Testing Library, Playwright WebKit).

**Spec:** `docs/superpowers/specs/2026-09-27-alive-feel-design.md`

## Global Constraints
- CLAUDE.md Update Rules apply (TDD, never lose data, v1.3.0 + changelog, original only, no new packages, iPhone-first, commit per task).
- Audio files: 0 KB (all synthesis). Nothing plays before the first tap; any audio failure is silent; no Vibration API.
- Animate only `transform`/`opacity`. Non-level-up animations < 400 ms. Reduced motion: no glow/particles; counters and stamp final instantly.
- Meta keys only (no Dexie schema change): `soundVolume` (0–1, default 0.8), `tapSounds` (default false).
- 16px inputs, ≥44px targets, screen-reader labels.

## Review Focus
1. Volume 0 or sound off → no audio nodes are created at all (Task 1 test).
2. Finishing the last daily item → exactly one `questComplete`, no extra `complete` on top (Task 4 test).
3. Opening Quests repeatedly with a penalty waiting → `penalty` plays once per day (Task 4 test).
4. Level-up screen double input (tap Continue + backdrop) → dismissed once (Task 3 test).
5. Reduced motion → counters show final numbers immediately; particles hidden (Task 3 test + CSS).

---

### Task 1: Sound engine — recipes, master volume, tap sounds

**Files:** Modify `src/platform/audio.ts`, `src/platform/audio.test.ts`.

**Produces:** `type SoundName = 'chime' | 'complete' | 'questComplete' | 'levelUp' | 'rankUp' | 'achievement' | 'penalty' | 'tap'`; `SOUNDS: Record<SoundName, Layer[]>`; `DEFAULT_VOLUME = 0.8`; `setSoundVolume(v: number)`; `setTapSoundsEnabled(on: boolean)`; `installTapSounds(target?: Document): () => void`; existing `playSound`, `setSoundEnabled`, `unlockAudio`, `installAudioUnlock`, `resetAudioForTests` keep their signatures.

- [ ] **Step 1: Failing tests.** In `audio.test.ts` extend `FakeContext` so oscillators/gains expose `frequency`/`gain` objects with `value`, `setValueAtTime`, `exponentialRampToValueAtTime` (all `vi.fn`), `createBuffer` returns `{ getChannelData: () => new Float32Array(8) }`, and `createBufferSource` returns `{ buffer: null, connect: vi.fn((n) => n), start: vi.fn(), stop: vi.fn() }`. Reset with `setSoundVolume(DEFAULT_VOLUME)` and `setTapSoundsEnabled(false)` in `afterEach`. Add:
```ts
  it('builds every sound from its recipe', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    for (const name of Object.keys(SOUNDS) as SoundName[]) {
      const before = ctx.createOscillator.mock.calls.length + ctx.createBufferSource.mock.calls.length;
      playSound(name);
      const after = ctx.createOscillator.mock.calls.length + ctx.createBufferSource.mock.calls.length;
      expect(after - before).toBe(SOUNDS[name].length);
    }
  });

  it('scales everything by the master volume, and volume 0 plays nothing', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    setSoundVolume(0.5);
    expect(ctx.createGain.mock.results[0]!.value.gain.value).toBe(0.5);
    setSoundVolume(0);
    const before = ctx.createOscillator.mock.calls.length;
    playSound('levelUp');
    expect(ctx.createOscillator.mock.calls.length).toBe(before);
  });

  it('plays tap sounds on button taps only when enabled', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    const cleanup = installTapSounds(document);
    const button = document.createElement('button');
    document.body.append(button);
    const count = () => ctx.createOscillator.mock.calls.length;
    const start = count();
    button.click();
    expect(count()).toBe(start);
    setTapSoundsEnabled(true);
    button.click();
    expect(count()).toBe(start + SOUNDS.tap.length);
    document.body.click();
    expect(count()).toBe(start + SOUNDS.tap.length);
    cleanup();
    button.remove();
  });
```
(import `DEFAULT_VOLUME, SOUNDS, installTapSounds, setSoundVolume, setTapSoundsEnabled, type SoundName`). The first `createGain` call is the master gain (created in `unlockAudio`).
- [ ] **Step 2:** `npx vitest run src/platform/audio.test.ts` → FAIL (missing exports).
- [ ] **Step 3: Implement** — replace `NOTES`/`playSound` in `audio.ts` with:
```ts
export type SoundName = 'chime' | 'complete' | 'questComplete' | 'levelUp' | 'rankUp' | 'achievement' | 'penalty' | 'tap';

type Wave = OscillatorType | 'noise';
/** One voice of a sound: waveform, pitch (Hz, optional glide), timing (s) and loudness (0–1). */
interface Layer {
  wave: Wave;
  freq: number;
  freqEnd?: number;
  start: number;
  dur: number;
  gain: number;
}

/** Every sound Ashborn makes, generated live — no audio files. Original to Ashborn. */
export const SOUNDS: Record<SoundName, Layer[]> = {
  tap: [{ wave: 'triangle', freq: 1400, freqEnd: 900, start: 0, dur: 0.035, gain: 0.08 }],
  chime: [
    { wave: 'sine', freq: 1318.5, start: 0, dur: 0.35, gain: 0.16 },
    { wave: 'sine', freq: 1975.5, start: 0.06, dur: 0.4, gain: 0.12 },
  ],
  complete: [
    { wave: 'triangle', freq: 659.3, start: 0, dur: 0.12, gain: 0.16 },
    { wave: 'triangle', freq: 987.8, start: 0.09, dur: 0.22, gain: 0.16 },
  ],
  questComplete: [
    { wave: 'triangle', freq: 784, start: 0, dur: 0.18, gain: 0.18 },
    { wave: 'triangle', freq: 1174.7, start: 0.12, dur: 0.45, gain: 0.18 },
    { wave: 'sine', freq: 2349.3, freqEnd: 3136, start: 0.14, dur: 0.35, gain: 0.06 },
    { wave: 'noise', freq: 0, start: 0.12, dur: 0.12, gain: 0.03 },
  ],
  levelUp: [
    { wave: 'triangle', freq: 523.3, start: 0, dur: 0.16, gain: 0.16 },
    { wave: 'triangle', freq: 659.3, start: 0.12, dur: 0.16, gain: 0.16 },
    { wave: 'triangle', freq: 784, start: 0.24, dur: 0.16, gain: 0.16 },
    { wave: 'triangle', freq: 1046.5, start: 0.36, dur: 0.7, gain: 0.18 },
    { wave: 'sine', freq: 2093, start: 0.36, dur: 0.6, gain: 0.05 },
  ],
  rankUp: [
    { wave: 'sine', freq: 55, freqEnd: 110, start: 0, dur: 0.6, gain: 0.14 },
    { wave: 'sawtooth', freq: 110, freqEnd: 220, start: 0, dur: 0.6, gain: 0.05 },
    { wave: 'noise', freq: 0, start: 0.5, dur: 0.25, gain: 0.05 },
    { wave: 'triangle', freq: 523.3, start: 0.55, dur: 0.9, gain: 0.1 },
    { wave: 'triangle', freq: 659.3, start: 0.55, dur: 0.9, gain: 0.1 },
    { wave: 'triangle', freq: 784, start: 0.55, dur: 0.9, gain: 0.1 },
    { wave: 'sine', freq: 1046.5, start: 0.55, dur: 1.1, gain: 0.1 },
  ],
  achievement: [
    { wave: 'sine', freq: 1568, start: 0, dur: 0.9, gain: 0.12 },
    { wave: 'sine', freq: 2349.3, start: 0.08, dur: 0.7, gain: 0.06 },
    { wave: 'sine', freq: 3136, start: 0, dur: 0.6, gain: 0.04 },
  ],
  penalty: [
    { wave: 'sine', freq: 98, start: 0, dur: 0.35, gain: 0.14 },
    { wave: 'square', freq: 196, freqEnd: 174.6, start: 0, dur: 0.22, gain: 0.04 },
    { wave: 'square', freq: 185, freqEnd: 164.8, start: 0.26, dur: 0.2, gain: 0.035 },
  ],
};

export const DEFAULT_VOLUME = 0.8;
let volume = DEFAULT_VOLUME;
let tapSounds = false;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
```
`setSoundVolume(v)` clamps to 0–1, stores it, and sets `master.gain.value` when `master` exists. `setTapSoundsEnabled(on)` stores it. In `unlockAudio`, after creating the context, create `master = context.createGain(); master.gain.value = volume; master.connect(context.destination);`. `resetAudioForTests` also clears `master` and `noise`. `playSound(name)`: return early if `!enabled || volume <= 0 || !context || !master`; resume if suspended/interrupted (existing); then for each layer inside the existing `try`:
```ts
      const t = context.currentTime + layer.start;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(layer.gain, t + Math.min(0.02, layer.dur / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + layer.dur);
      gain.connect(master);
      if (layer.wave === 'noise') {
        noise ??= makeNoise(context);
        const src = context.createBufferSource();
        src.buffer = noise;
        src.connect(gain);
        src.start(t);
        src.stop(t + layer.dur + 0.05);
      } else {
        const osc = context.createOscillator();
        osc.type = layer.wave;
        osc.frequency.setValueAtTime(layer.freq, t);
        if (layer.freqEnd) osc.frequency.exponentialRampToValueAtTime(layer.freqEnd, t + layer.dur);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + layer.dur + 0.05);
      }
```
with `function makeNoise(ctx: AudioContext): AudioBuffer { const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5) || 1, ctx.sampleRate || 22050); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; return buffer; }` (FakeContext: add `sampleRate = 22050`).
`installTapSounds(target = document)`: add a `click` listener (bubbling) that calls `playSound('tap')` when `tapSounds` is on and `(event.target as Element | null)?.closest?.('button')` is truthy; return a cleanup.
- [ ] **Step 4:** → PASS; `npm run typecheck; npm run lint` clean; `npm test` green.
- [ ] **Step 5:** commit `feat(audio): original synthesised sound set with master volume and optional tap sounds`.

---

### Task 2: Settings — volume and tap sounds

**Files:** Modify `src/db/meta.ts`, `src/ui/screens/SettingsScreen.tsx`, `src/ui/screens/SettingsScreen.test.tsx`, `src/App.tsx`.

- [ ] **Step 1: Failing test** (SettingsScreen.test.tsx):
```tsx
  it('saves volume and tap sounds', async () => {
    render(<SettingsScreen onShowInstallGuide={() => {}} />);
    const slider = await screen.findByRole('slider', { name: 'Volume' });
    expect((slider as HTMLInputElement).value).toBe('80');
    fireEvent.change(slider, { target: { value: '50' } });
    await waitFor(async () => expect(await getMeta(db, 'soundVolume')).toBe(0.5));
    const tap = screen.getByRole('switch', { name: 'Tap sounds' });
    expect(tap.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(tap);
    await waitFor(async () => expect(await getMeta(db, 'tapSounds')).toBe(true));
  });
```
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: Implement.** `MetaMap`: add `soundVolume: number; tapSounds: boolean;`. In SettingsScreen read `const volume = useMeta('soundVolume') ?? DEFAULT_VOLUME; const tapSounds = useMeta('tapSounds') ?? false;` and inside the Sound window, after the existing switch:
```tsx
        <label className="mt-3 block">
          <span className="mb-1 flex justify-between text-sm text-muted">
            <span>Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            aria-label="Volume"
            value={Math.round(volume * 100)}
            disabled={!soundOn}
            onChange={(e) => void setMeta(db, 'soundVolume', Number(e.target.value) / 100)}
            className="h-11 w-full accent-[#3ab8ff]"
          />
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={tapSounds}
          aria-label="Tap sounds"
          disabled={!soundOn}
          onClick={() => void setMeta(db, 'tapSounds', !tapSounds)}
          className="mt-2 flex min-h-11 w-full items-center justify-between rounded border border-glow-soft px-3 text-base disabled:opacity-40"
        >
          <span>Tap sounds</span>
          <span className={tapSounds ? 'text-glow' : 'text-muted'}>{tapSounds ? 'On' : 'Off'}</span>
        </button>
```
In `App.tsx` add live queries `soundVolume` (default `DEFAULT_VOLUME`) and `tapSounds` (default `false`), effects calling `setSoundVolume` / `setTapSoundsEnabled`, and `useEffect(() => installTapSounds(), [])`.
- [ ] **Step 4:** → PASS; `npm test` green.
- [ ] **Step 5:** commit `feat(settings): add sound volume and tap sounds`.

---

### Task 3: Bigger level-up / rank-up moment

**Files:** Create `src/ui/hooks/useCountUp.ts`, `src/ui/hooks/useCountUp.test.tsx`, `src/ui/overlays/LevelUpOverlay.test.tsx`. Modify `src/ui/overlays/LevelUpOverlay.tsx`, `src/ui/overlays/EventHost.tsx`, `src/ui/overlays/EventHost.test.tsx`, `src/App.tsx`, `src/index.css`.

**Produces:** `useCountUp(from: number, to: number, durationMs: number, delayMs?: number): number`; `LevelUpOverlay` props `{ event, onClose, onAssign }`; `EventHost` prop `onAssignPoints?: () => void`.

- [ ] **Step 1: Failing tests.** `useCountUp.test.tsx` (jsdom):
```tsx
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockReducedMotion } from '../../test/uiFixtures';
import { useCountUp } from './useCountUp';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useCountUp', () => {
  it('jumps straight to the final number with reduced motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useCountUp(4, 5, 700));
    expect(result.current).toBe(5);
  });

  it('counts from the start to the end over the duration', () => {
    mockReducedMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result } = renderHook(() => useCountUp(0, 8, 700));
    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(8);
  });
});
```
`LevelUpOverlay.test.tsx` (jsdom), with `vi.mock('../../platform/audio', async (orig) => ({ ...(await orig<typeof import('../../platform/audio')>()), playSound: vi.fn() }))` and `mockReducedMotion(true)` in `beforeEach`:
```tsx
const levelUp = { fromLevel: 4, toLevel: 5, fromRank: 'E', toRank: 'E', statPointsGained: 3 } as const;
const rankUp = { fromLevel: 9, toLevel: 10, fromRank: 'E', toRank: 'D', statPointsGained: 8 } as const;

it('shows the new level and points', () => {
  render(<LevelUpOverlay event={levelUp} onClose={() => {}} onAssign={() => {}} />);
  expect(screen.getByTestId('levelup-level').textContent).toBe('5');
  expect(screen.getByTestId('levelup-points').textContent).toBe('3');
  expect(playSound).toHaveBeenCalledWith('levelUp');
});
it('celebrates a rank up in gold with its own sound', () => {
  render(<LevelUpOverlay event={rankUp} onClose={() => {}} onAssign={() => {}} />);
  const dialog = screen.getByRole('dialog', { name: 'Level up: level 10' });
  expect(dialog.getAttribute('data-variant')).toBe('rank');
  expect(dialog.textContent).toContain('Rank up: E → D');
  expect(playSound).toHaveBeenCalledWith('rankUp');
});
it('Assign points opens the stats; Continue and the backdrop close it once', () => {
  const onClose = vi.fn();
  const onAssign = vi.fn();
  const { unmount } = render(<LevelUpOverlay event={levelUp} onClose={onClose} onAssign={onAssign} />);
  fireEvent.click(screen.getByRole('button', { name: 'Assign points' }));
  fireEvent.click(screen.getByRole('dialog'));
  expect(onAssign).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
  unmount();
  render(<LevelUpOverlay event={levelUp} onClose={onClose} onAssign={onAssign} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('dialog'));
  expect(onClose).toHaveBeenCalledOnce();
});
```
(`vi.mocked(playSound).mockClear()` in `beforeEach`). In `EventHost.test.tsx` add `mockReducedMotion(true)` in `beforeEach` (counters would otherwise still be animating) and a test that "Assign points" removes the event and calls `onAssignPoints`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: Implement** `useCountUp.ts`:
```ts
import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** Counts from `from` to `to` over `durationMs` (after `delayMs`). Reduced motion: the final number at once. */
export function useCountUp(from: number, to: number, durationMs: number, delayMs = 0): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (reduced || from === to) return;
    let frame = 0;
    let startAt: number | null = null;
    const tick = (now: number) => {
      startAt ??= now + delayMs;
      const t = Math.min(1, Math.max(0, (now - startAt) / durationMs));
      setValue(Math.round(from + (to - from) * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs, delayMs, reduced]);
  return reduced || from === to ? to : value;
}
```
`LevelUpOverlay.tsx`: props `{ event, onClose, onAssign }`; `const rankUp = event.toRank !== event.fromRank; const level = useCountUp(event.fromLevel, event.toLevel, 700); const points = useCountUp(0, event.statPointsGained, 700, 700);`; sound effect `playSound(rankUp ? 'rankUp' : 'levelUp')`; one `finish(then)` guard (ref) shared by backdrop, Continue (→ `onClose`) and Assign points (→ `onAssign`), buttons `stopPropagation`. Markup: dialog gets `data-variant={rankUp ? 'rank' : 'level'}`; before the card, `<div aria-hidden className={`levelup-glow ${rankUp ? 'levelup-glow-gold' : ''}`} />` and `<div aria-hidden className="levelup-burst">` with 24 `<span className="burst-particle" style={{ '--dx', '--dy' }}>` from a module-level `BURST` list (`angle = i × 15°`, radius alternating 120/170 px); card shows `{rankUp ? 'Rank up' : 'Level up'}`, `Lv. <span data-testid="levelup-level">{level}</span>`, for rank up two `RankBadge`s wrapped in `.rank-flip-out` / `.rank-flip-in` with `<p className="sr-only">Rank up: {from} → {to}</p>`, `+<span data-testid="levelup-points">{points}</span> stat points to assign`, and a 2-column row: ghost "Assign points", primary "Continue".
`EventHost`: accept `onAssignPoints?: () => void`; pass `onAssign={() => { void dismissEvent(db); onAssignPoints?.(); }}`. `App.tsx`: `<EventHost onAssignPoints={() => setTab('status')} />`.
`index.css` (before the reduced-motion block):
```css
/* Level-up / rank-up celebration */
@keyframes glow-pulse {
  0% { opacity: 0; transform: scale(0.6); }
  30% { opacity: 1; }
  100% { opacity: 0.55; transform: scale(1.15); }
}
.levelup-glow {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  background: radial-gradient(circle at 50% 50%, rgb(58 184 255 / 0.45), transparent 60%);
  animation: glow-pulse 1.4s ease-out both;
}
.levelup-glow-gold { background: radial-gradient(circle at 50% 50%, rgb(255 209 102 / 0.45), transparent 60%); }
@keyframes burst {
  from { transform: translate(0, 0) scale(1); opacity: 1; }
  to { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
}
.levelup-burst { position: absolute; left: 50%; top: 50%; pointer-events: none; }
.burst-particle {
  position: absolute;
  width: 6px;
  height: 6px;
  margin: -3px;
  border-radius: 9999px;
  background: #3ab8ff;
  box-shadow: 0 0 8px 2px rgb(58 184 255 / 0.8);
  animation: burst 900ms ease-out both;
}
[data-variant="rank"] .burst-particle { background: #ffd166; box-shadow: 0 0 8px 2px rgb(255 209 102 / 0.8); }
@keyframes rank-out { to { transform: rotateY(90deg); opacity: 0; } }
@keyframes rank-in { from { transform: rotateY(-90deg); opacity: 0; } to { transform: none; opacity: 1; } }
.rank-flip-out { animation: rank-out 300ms ease-in 300ms both; }
.rank-flip-in { animation: rank-in 300ms ease-out 600ms both; }
```
and inside the reduced-motion block: `.levelup-glow, .levelup-burst { display: none; }`.
- [ ] **Step 4:** → PASS; `npm test` green (update any test that asserted the old overlay text).
- [ ] **Step 5:** commit `feat(ui): bigger level-up and rank-up moment with counters and Assign points`.

---

### Task 4: Quest Cleared stamp and remaining sound hooks

**Files:** Modify `src/ui/screens/QuestsScreen.tsx`, `src/ui/screens/QuestsScreen.test.tsx`, `src/ui/overlays/AchievementToast.tsx`, `src/index.css`.

- [ ] **Step 1: Failing tests** in `QuestsScreen.test.tsx` (mock `playSound` as in Task 3; `resetPenaltySoundForTests()` in `beforeEach`):
```tsx
  it('stamps QUEST CLEARED with one questComplete sound when the last item is done', async () => {
    render(<QuestsScreen />);
    for (const label of ['Push-ups', 'Sit-ups', 'Squats', 'Walk']) {
      fireEvent.click(await screen.findByRole('button', { name: `Complete ${label}` }));
      await waitFor(async () => expect((await db.days.get('2026-09-21'))!.items.find((i) => i.label === label)!.progress).toBeGreaterThan(0));
    }
    const stamp = await screen.findByText('QUEST CLEARED');
    expect(stamp.className).toContain('quest-stamp-animate');
    const calls = vi.mocked(playSound).mock.calls.map(([n]) => n);
    expect(calls.filter((n) => n === 'questComplete')).toHaveLength(1);
    expect(calls.filter((n) => n === 'complete')).toHaveLength(3);
  });

  it('shows a still stamp and no sound for a day already cleared', async () => {
    await completeDaily(db, '2026-09-21');
    render(<QuestsScreen />);
    const stamp = await screen.findByText('QUEST CLEARED');
    expect(stamp.className).not.toContain('quest-stamp-animate');
    expect(playSound).not.toHaveBeenCalledWith('questComplete');
  });

  it('plays the penalty warning once per day', async () => {
    await startDay(db, at('2026-09-22'), neverUrgent);
    const { unmount } = render(<QuestsScreen />);
    await screen.findByText('Penalty Quest');
    unmount();
    render(<QuestsScreen />);
    await screen.findByText('Penalty Quest');
    expect(vi.mocked(playSound).mock.calls.filter(([n]) => n === 'penalty')).toHaveLength(1);
  });
```
(`completeDaily`, `neverUrgent` from `test/dbFixtures`; `at` from `test/fixtures`; `startDay` from `db/repo/days`; this test must read `lastOpenDate` = 2026-09-22 so the screen shows that day.)
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3: Implement.**
  - `DailyQuestCard`: `const [statusAtMount] = useState(day.status); const justCleared = day.status === 'done' && statusAtMount !== 'done';` `useEffect(() => { if (justCleared) playSound('questComplete'); }, [justCleared]);` Render, when `day.status === 'done'`: `<div aria-hidden="true" className={`quest-stamp pointer-events-none absolute right-3 top-10 rounded border-4 border-gold px-3 py-1 text-xl font-black tracking-widest text-gold ${justCleared ? 'quest-stamp-animate' : ''}`}>QUEST CLEARED</div>`.
  - Pass `completesQuest={day.items.every((i) => i.id === item.id || i.progress >= i.target)}` to `QuestItemRow`; in `save`, play `'complete'` only when `value >= item.target && !completesQuest` (the partial-save `'tap'` is removed — tap sounds now come from the global setting).
  - `PenaltyCard`: module-level `let penaltySoundDate: string | null = null;` + `export function resetPenaltySoundForTests() { penaltySoundDate = null; }`; `useEffect(() => { if (!quest.done && penaltySoundDate !== date) { penaltySoundDate = date; playSound('penalty'); } }, [date, quest.done]);`
  - `AchievementToast`: `playSound('achievement')`.
  - `index.css`:
```css
/* Quest Cleared stamp (≈350 ms) */
@keyframes stamp-in {
  0% { opacity: 0; transform: rotate(-12deg) scale(1.8); }
  70% { opacity: 1; transform: rotate(-12deg) scale(0.95); }
  100% { opacity: 1; transform: rotate(-12deg) scale(1); }
}
.quest-stamp { transform: rotate(-12deg); }
.quest-stamp-animate { animation: stamp-in 350ms cubic-bezier(0.2, 0.8, 0.3, 1.2) both; }
```
- [ ] **Step 4:** → PASS; `npm test` green.
- [ ] **Step 5:** commit `feat(quests): Quest Cleared stamp, penalty warning and achievement sounds`.

---

### Task 5: Credits, release 1.3.0, measure, verify

**Files:** Create `docs/credits.md`. Modify `src/data/changelog.ts`, `package.json` (via `npm version 1.3.0 --no-git-tag-version`), `README.md` (Done list gets one line about sounds/animations).

- [ ] **Step 1:** Changelog entry at top: `{ version: '1.3.0', date: '2026-09-27', notes: ['Ashborn sounds and feels more alive: new sound effects, a volume control and optional tap sounds in Settings.', 'Levelling up is a bigger moment, and clearing your daily quest earns a Quest Cleared stamp.'] }`. Bump version. `npx vitest run src/data` → PASS (version test).
- [ ] **Step 2:** `docs/credits.md`: all sound effects are synthesised live in code (`src/platform/audio.ts`), written for Ashborn — no recordings or third-party sound files; icons/backdrop are original SVGs made for Ashborn; fonts are the device's system fonts; libraries are listed in package.json under their own open-source licences.
- [ ] **Step 3: Verify.** `npm run check` green; `npm run e2e` green (incl. load-speed test); `npm run size` and compare with the spec baseline (code 431.4 KB / gzip 134.0 KB; dist 604.4 KB; first screen median 369 ms). Browser pane (mobile): trigger a level-up and a rank-up (set player XP via the app), watch glow/particles/counters; complete the daily quest → stamp; Settings shows Volume + Tap sounds.
- [ ] **Step 4:** commit `chore(release): v1.3.0 — credits, changelog, README`; then ask the owner before pushing.
