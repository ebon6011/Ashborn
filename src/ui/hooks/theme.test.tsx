// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, getTheme } from '../../config/items';
import { applyTheme } from './theme';

describe('applyTheme', () => {
  it('sets only the two accent variables', () => {
    const root = document.createElement('div');
    applyTheme(getTheme('theme-ember'), root);
    expect(root.style.getPropertyValue('--color-glow')).toBe('#ff8a3d');
    expect(root.style.getPropertyValue('--color-glow-soft')).toBe('#764223');
    applyTheme(DEFAULT_THEME, root);
    expect(root.style.getPropertyValue('--color-glow')).toBe('#3ab8ff');
    expect(root.style.getPropertyValue('--color-gold')).toBe('');
    expect(root.style.getPropertyValue('--color-danger')).toBe('');
  });
});
