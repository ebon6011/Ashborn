import { describe, expect, it } from 'vitest';
import { requestPersist } from './storage';

describe('requestPersist', () => {
  it('reports unsupported when the API is missing', async () => {
    expect(await requestPersist({})).toBe('unsupported');
  });
  it('reports granted or denied', async () => {
    expect(await requestPersist({ persist: async () => true })).toBe('granted');
    expect(await requestPersist({ persist: async () => false })).toBe('denied');
  });
  it('treats an error as denied', async () => {
    expect(await requestPersist({ persist: async () => { throw new Error('nope'); } })).toBe('denied');
  });
});
