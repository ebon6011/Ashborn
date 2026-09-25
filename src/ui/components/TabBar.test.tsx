// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('shows five labelled tabs and marks the current one', () => {
    render(<TabBar tab="status" onChange={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Status' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Quests' }).getAttribute('aria-current')).toBeNull();
  });

  it('switches tabs', () => {
    const onChange = vi.fn();
    render(<TabBar tab="status" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Training' }));
    expect(onChange).toHaveBeenCalledWith('training');
  });
});
