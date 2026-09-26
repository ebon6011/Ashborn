import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyUpdate, checkForUpdates, isUpdateReady, markUpdateReady, resetUpdatesForTests, setApplyUpdate, setRegistration } from './updates';

type FakeReg = { update: () => Promise<void>; waiting: object | null; installing: object | null };
const fake = (over: Partial<FakeReg> = {}): FakeReg => ({ update: vi.fn(async () => {}), waiting: null, installing: null, ...over });

afterEach(() => {
  resetUpdatesForTests();
  vi.unstubAllGlobals();
});

describe('checkForUpdates', () => {
  it('is unsupported without a service worker', async () => {
    expect(await checkForUpdates()).toBe('unsupported');
  });

  it('reports none when nothing new was found', async () => {
    const reg = fake();
    setRegistration(reg);
    expect(await checkForUpdates()).toBe('none');
    expect(reg.update).toHaveBeenCalledOnce();
  });

  it('reports available when a new version is waiting or installing', async () => {
    const reg = fake();
    reg.update = vi.fn(async () => {
      reg.waiting = {};
    });
    setRegistration(reg);
    expect(await checkForUpdates()).toBe('available');
    setRegistration(fake({ installing: {} }));
    expect(await checkForUpdates()).toBe('available');
  });

  it('reports available once the banner is already up', async () => {
    setRegistration(fake());
    markUpdateReady();
    expect(isUpdateReady()).toBe(true);
    expect(await checkForUpdates()).toBe('available');
  });

  it('reports offline when the phone is offline or the check fails', async () => {
    setRegistration(fake());
    vi.stubGlobal('navigator', { onLine: false });
    expect(await checkForUpdates()).toBe('offline');
    vi.unstubAllGlobals();
    setRegistration(
      fake({
        update: vi.fn(async () => {
          throw new Error('network');
        }),
      }),
    );
    expect(await checkForUpdates()).toBe('offline');
  });
});

describe('applyUpdate', () => {
  it('runs the activation the service worker registration provided', async () => {
    const apply = vi.fn(async () => {});
    setApplyUpdate(apply);
    await applyUpdate();
    expect(apply).toHaveBeenCalledOnce();
  });
});
