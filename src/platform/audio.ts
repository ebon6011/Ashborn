export type SoundName = 'chime' | 'complete' | 'levelUp' | 'tap';

let context: AudioContext | null = null;
let enabled = true;

/** [frequency Hz, start offset s, duration s] */
const NOTES: Record<SoundName, Array<[number, number, number]>> = {
  tap: [[880, 0, 0.05]],
  chime: [[1318.5, 0, 0.35], [1975.5, 0.06, 0.4]],
  complete: [[659.3, 0, 0.12], [987.8, 0.1, 0.25]],
  levelUp: [[523.3, 0, 0.18], [659.3, 0.15, 0.18], [784, 0.3, 0.18], [1046.5, 0.45, 0.6]],
};

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function resetAudioForTests(): void {
  context = null;
}

function createContext(): AudioContext | null {
  const w = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** Must run inside a tap handler: iPhone Safari only starts audio from a user gesture. */
export function unlockAudio(): void {
  try {
    context ??= createContext();
    if (!context) return;
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
    unlockAudio();
    cleanup();
  };
  const cleanup = () => {
    target.removeEventListener('touchend', handler, true);
    target.removeEventListener('click', handler, true);
  };
  target.addEventListener('touchend', handler, true);
  target.addEventListener('click', handler, true);
  return cleanup;
}

export function playSound(name: SoundName): void {
  if (!enabled || !context || context.state !== 'running') return;
  try {
    const t0 = context.currentTime;
    for (const [frequency, start, duration] of NOTES[name]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + duration);
      osc.connect(gain).connect(context.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + duration + 0.05);
    }
  } catch {
    // Never let sound break the app.
  }
}
