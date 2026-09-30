// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getBoss } from '../../config/bosses';
import { BossArt } from './BossArt';

describe('BossArt', () => {
  it('shows the drawn image for an active boss, hidden from screen readers', () => {
    const { container } = render(<BossArt def={getBoss('vaelcrest')!} className="h-10" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(getBoss('vaelcrest')!.art);
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
    expect(img.getAttribute('draggable')).toBe('false');
    expect(img.className).toContain('h-10');
    expect(img.className).toContain('object-cover');
  });

  it('falls back to the old silhouette for a retired boss', () => {
    const { container } = render(<BossArt def={getBoss('mawgrath')!} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
