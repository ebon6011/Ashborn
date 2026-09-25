import { describe, expect, it } from 'vitest';
import { detectStandalone } from './standalone';

describe('detectStandalone', () => {
  it('is true for iPhone home screen apps', () => {
    expect(detectStandalone({ standalone: true }, undefined)).toBe(true);
  });
  it('is true when the display-mode media query matches', () => {
    expect(detectStandalone({}, () => ({ matches: true }))).toBe(true);
  });
  it('is false in a normal Safari tab', () => {
    expect(detectStandalone({ standalone: false }, () => ({ matches: false }))).toBe(false);
  });
  it('is false when matchMedia is missing or throws', () => {
    expect(detectStandalone(undefined, undefined)).toBe(false);
    expect(detectStandalone({}, () => { throw new Error('unsupported'); })).toBe(false);
  });
});
