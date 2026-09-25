// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberField } from './NumberField';

describe('NumberField', () => {
  it('reports parsed numbers, including comma decimals', () => {
    const onChange = vi.fn();
    render(<NumberField label="Weight" unit="kg" decimal value={null} onChange={onChange} rule={{ min: 30, max: 300 }} />);
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '72,5' } });
    expect(onChange).toHaveBeenLastCalledWith(72.5);
  });

  it('reports null and shows a hint for invalid input', () => {
    const onChange = vi.fn();
    render(<NumberField label="Age" value={null} onChange={onChange} rule={{ min: 13, max: 100, integer: true }} />);
    const input = screen.getByLabelText('Age');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Enter a number from 13 to 100.')).toBeTruthy();
  });

  it('uses a 16px font so iPhone Safari does not zoom', () => {
    render(<NumberField label="Age" value={30} onChange={() => {}} rule={{ min: 13, max: 100 }} />);
    expect(screen.getByLabelText('Age').className).toContain('text-base');
  });
});
