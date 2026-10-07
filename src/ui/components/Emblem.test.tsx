// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FRAMES } from '../../config/items';
import { Emblem } from './Emblem';
import { FRAME_PATHS } from './frames';

describe('Emblem', () => {
  it('shows the uppercase initial inside the equipped frame, default when none or unknown', () => {
    const { getByTestId, rerender } = render(<Emblem name="kai" frameId="frame-flame-halo" />);
    expect(getByTestId('emblem').textContent).toBe('K');
    expect(getByTestId('emblem').getAttribute('data-frame')).toBe('frame-flame-halo');
    rerender(<Emblem name="kai" frameId={null} />);
    expect(getByTestId('emblem').getAttribute('data-frame')).toBe('frame-hex');
    rerender(<Emblem name="kai" frameId="frame-nope" />);
    expect(getByTestId('emblem').getAttribute('data-frame')).toBe('frame-hex');
    expect(getByTestId('emblem').getAttribute('aria-hidden')).toBe('true');
  });

  it('has a drawing for every frame', () => {
    for (const f of FRAMES) expect(FRAME_PATHS[f.id]).toBeTruthy();
    expect(FRAME_PATHS['frame-hex']).toBeTruthy();
  });
});
