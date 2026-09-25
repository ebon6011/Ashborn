// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sampleProfileInput } from '../../test/fixtures';
import { ProfileForm } from './ProfileForm';

function fill() {
  fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Kai' } });
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Male' }));
  fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '180' } });
  fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '80' } });
  fireEvent.click(screen.getByRole('button', { name: /^Get fit/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Beginner/ }));
  fireEvent.change(screen.getByLabelText('Days per week'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Minutes per session'), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: /^No equipment/ }));
}

describe('ProfileForm', () => {
  it('lists what is missing and does not submit', () => {
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Continue" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Enter your name.');
    expect(alert.textContent).toContain('Choose your equipment.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the answers as a typed profile', () => {
    const onSubmit = vi.fn();
    render(<ProfileForm submitLabel="Continue" onSubmit={onSubmit} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith(sampleProfileInput);
  });

  it('pre-fills when editing', () => {
    render(<ProfileForm initial={sampleProfileInput} submitLabel="Save answers" onSubmit={() => {}} />);
    expect((screen.getByLabelText('Player name') as HTMLInputElement).value).toBe('Kai');
    expect(screen.getByRole('button', { name: 'Male' }).getAttribute('aria-pressed')).toBe('true');
  });
});
