// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockReducedMotion } from '../../test/uiFixtures';
import { Typewriter } from './Typewriter';

const visible = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]')?.textContent;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Typewriter', () => {
  it('shows the whole message at once with reduced motion', () => {
    mockReducedMotion(true);
    const { container } = render(<Typewriter text="Player registered." sound={false} />);
    expect(visible(container)).toBe('Player registered.');
  });

  it('types the message out over time, then calls onDone once', () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { container } = render(<Typewriter text="Hi!" speedMs={10} sound={false} onDone={onDone} />);
    expect(visible(container)).not.toContain('Hi!');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(visible(container)).toBe('Hi!');
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('always gives screen readers the full text', () => {
    mockReducedMotion(false);
    const { container } = render(<Typewriter text="Daily quest ready." sound={false} />);
    expect(container.querySelector('.sr-only')?.textContent).toBe('Daily quest ready.');
  });
});
