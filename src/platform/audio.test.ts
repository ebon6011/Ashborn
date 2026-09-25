// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAudioUnlock, playSound, resetAudioForTests, setSoundEnabled, unlockAudio } from './audio';

class FakeContext {
  static instances: FakeContext[] = [];
  state = 'suspended';
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  createBuffer = vi.fn(() => ({}));
  createBufferSource = vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() }));
  createOscillator = vi.fn(() => ({ type: '', frequency: { value: 0 }, connect: vi.fn((node: unknown) => node), start: vi.fn(), stop: vi.fn() }));
  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn((node: unknown) => node),
  }));
  constructor() {
    FakeContext.instances.push(this);
  }
}

afterEach(() => {
  resetAudioForTests();
  setSoundEnabled(true);
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
});
