// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import backdropSvg from '../../assets/backdrop.svg?raw';
import { Backdrop } from './Backdrop';

describe('Backdrop', () => {
  it('is decorative: hidden from screen readers and never blocks taps', () => {
    const { container } = render(<Backdrop />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.className).toContain('pointer-events-none');
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('-z-10');
  });

  it('shows the scene as a static image with drifting particles on top', () => {
    const { container } = render(<Backdrop />);
    const root = container.firstElementChild as HTMLElement;
    // jsdom drops invalid CSS, so this also guards against an unparsable url() value.
    // Two layers: the inlined hex tile (a data: URI) and the scene file.
    expect(root.style.backgroundImage.match(/url\(/g)).toHaveLength(2);
    expect(root.style.backgroundImage).toContain('data:image/svg+xml');
    expect(root.style.backgroundImage).toContain('backdrop');
    expect(container.querySelectorAll('.mana-particle').length).toBeGreaterThanOrEqual(12);
  });

  it('the scene draws the gate and a line of shadow soldiers', () => {
    const svg = backdropSvg;
    expect(svg).toContain('data-part="gate"');
    expect(svg.match(/data-part="shadow"/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
