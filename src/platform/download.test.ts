// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBackupFile } from './download';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
});

function stubObjectUrls() {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:backup'), configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
}

describe('saveBackupFile', () => {
  it('uses the share sheet when files can be shared', async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    expect(await saveBackupFile('{}', 'ashborn-backup-2026-09-25.json')).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
  });

  it('reports a cancelled share', async () => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: async () => { throw new DOMException('cancel', 'AbortError'); }, configurable: true });
    expect(await saveBackupFile('{}', 'b.json')).toBe('cancelled');
  });

  it('falls back to a download link otherwise', async () => {
    stubObjectUrls();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await saveBackupFile('{}', 'b.json')).toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
  });
});
