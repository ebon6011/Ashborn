export type SoundName = 'chime' | 'complete' | 'questComplete' | 'levelUp' | 'rankUp' | 'achievement' | 'penalty' | 'tap';

type Wave = OscillatorType | 'noise';

/** One voice of a sound: waveform, pitch in Hz (optional glide), timing in seconds and loudness (0–1). */
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

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;
let volume = DEFAULT_VOLUME;
let tapSounds = false;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

/** Master volume, 0–1. 0 plays nothing at all. */
export function setSoundVolume(value: number): void {
  volume = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
  if (master) master.gain.value = volume;
}

export function setTapSoundsEnabled(on: boolean): void {
  tapSounds = on;
}

export function resetAudioForTests(): void {
  context = null;
  master = null;
  noise = null;
}

function createContext(): AudioContext | null {
  const w = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** Must run inside a tap handler: iPhone Safari only starts audio from a user gesture. */
export function unlockAudio(): void {
  try {
    if (!context) {
      context = createContext();
      if (!context) return;
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 22050);
    source.connect(context.destination);
    source.start(0);
  } catch {
    // Audio unavailable: stay silent.
  }
}

export function installAudioUnlock(target: Document = document): () => void {
  const handler = () => {
    if (context && context.state !== 'running') {
      void context.resume().catch(() => {});
    } else if (!context) {
      unlockAudio();
    }
  };
  target.addEventListener('touchend', handler, true);
  target.addEventListener('click', handler, true);
  return () => {
    target.removeEventListener('touchend', handler, true);
    target.removeEventListener('click', handler, true);
  };
}

/** Optional soft click on every button tap (off by default; Settings → Tap sounds). */
export function installTapSounds(target: Document = document): () => void {
  const handler = (event: Event) => {
    if (tapSounds && (event.target as Element | null)?.closest?.('button')) playSound('tap');
  };
  target.addEventListener('click', handler);
  return () => target.removeEventListener('click', handler);
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const rate = ctx.sampleRate || 22050;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(rate * 0.5)), rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function playSound(name: SoundName): void {
  if (!enabled || volume <= 0 || !context || !master) return;
  if (context.state === 'suspended' || context.state === 'interrupted') {
    void context.resume().catch(() => {});
  }
  try {
    for (const layer of SOUNDS[name]) {
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
    }
  } catch {
    // Never let sound break the app.
  }
}
