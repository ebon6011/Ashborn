// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InstallGuide } from './InstallGuide';

describe('InstallGuide', () => {
  it('explains Share → Add to Home Screen and can be dismissed', () => {
    const onClose = vi.fn();
    render(<InstallGuide onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Install Ashborn' });
    expect(dialog.textContent).toContain('Share');
    expect(dialog.textContent).toContain('Add to Home Screen');
    fireEvent.click(screen.getByRole('button', { name: 'Continue in Safari' }));
    expect(onClose).toHaveBeenCalled();
  });
});
