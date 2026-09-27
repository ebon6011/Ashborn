// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_VOLUME,
  SOUNDS,
  installAudioUnlock,
  installTapSounds,
  playSound,
  resetAudioForTests,
  setSoundEnabled,
  setSoundVolume,
  setTapSoundsEnabled,
  unlockAudio,
  type SoundName,
} from './audio';

const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

class FakeContext {
  static instances: FakeContext[] = [];
  state = 'suspended';
  currentTime = 0;
  sampleRate = 22050;
  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(8) }));
  createBufferSource = vi.fn(() => ({ buffer: null, connect: vi.fn((node: unknown) => node), start: vi.fn(), stop: vi.fn() }));
  createOscillator = vi.fn(() => ({ type: '', frequency: param(), connect: vi.fn((node: unknown) => node), start: vi.fn(), stop: vi.fn() }));
  createGain = vi.fn(() => ({ gain: param(), connect: vi.fn((node: unknown) => node) }));
  constructor() {
    FakeContext.instances.push(this);
  }
}

afterEach(() => {
  resetAudioForTests();
  setSoundEnabled(true);
  setSoundVolume(DEFAULT_VOLUME);
  setTapSoundsEnabled(false);
  FakeContext.instances = [];
  vi.unstubAllGlobals();
});

describe('audio', () => {
  it('stays silent when Web Audio does not exist', () => {
    expect(() => {
      unlockAudio();
      playSound('chime');
    }).not.toThrow();
  });

  it('resumes the context on unlock and then plays tones', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    expect(ctx.resume).toHaveBeenCalled();
    playSound('complete');
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('plays nothing before unlock or when sound is off', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    playSound('chime');
    expect(FakeContext.instances).toHaveLength(0);
    unlockAudio();
    setSoundEnabled(false);
    playSound('chime');
    expect(FakeContext.instances[0]!.createOscillator).not.toHaveBeenCalled();
  });

  it('unlocks on the first tap only', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const cleanup = installAudioUnlock(document);
    document.dispatchEvent(new Event('click'));
    document.dispatchEvent(new Event('click'));
    expect(FakeContext.instances).toHaveLength(1);
    expect(FakeContext.instances[0]!.resume).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('resumes again after the app is backgrounded and a new tap arrives', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const cleanup = installAudioUnlock(document);
    document.dispatchEvent(new Event('click'));
    const ctx = FakeContext.instances[0]!;
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    ctx.state = 'suspended';
    document.dispatchEvent(new Event('click'));
    expect(FakeContext.instances).toHaveLength(1);
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('resumes a suspended context before scheduling a sound', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    ctx.state = 'suspended';
    playSound('tap');
    expect(ctx.resume).toHaveBeenCalledTimes(2);
  });

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

  it('plays tap sounds even on buttons that stop the tap from bubbling', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    setTapSoundsEnabled(true);
    const cleanup = installTapSounds(document);
    const wrapper = document.createElement('div');
    wrapper.addEventListener('click', (e) => e.stopPropagation());
    const button = document.createElement('button');
    wrapper.append(button);
    document.body.append(wrapper);
    const start = ctx.createOscillator.mock.calls.length;
    button.click();
    expect(ctx.createOscillator.mock.calls.length).toBe(start + SOUNDS.tap.length);
    cleanup();
    wrapper.remove();
  });

  it('creates no audio nodes at all when silent (volume 0 or sound off)', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    unlockAudio();
    const ctx = FakeContext.instances[0]!;
    const nodes = () => ctx.createOscillator.mock.calls.length + ctx.createGain.mock.calls.length + ctx.createBufferSource.mock.calls.length;
    const start = nodes();
    setSoundVolume(0);
    playSound('rankUp');
    setSoundVolume(DEFAULT_VOLUME);
    setSoundEnabled(false);
    playSound('rankUp');
    expect(nodes()).toBe(start);
  });
});
