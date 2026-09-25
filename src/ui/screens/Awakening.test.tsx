// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { emptyApp } from '../../test/uiFixtures';
import { Awakening } from './Awakening';

beforeEach(emptyApp);

describe('Awakening', () => {
  it('walks through questions, health notice and registration', async () => {
    render(<Awakening />);
    fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Kai' } });
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Male' }));
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /^Get fit/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Never trained/ }));
    fireEvent.change(screen.getByLabelText('Days per week'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Minutes per session'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /^No equipment/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText(/not medical advice/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I understand' }));

    expect(screen.getByRole('heading', { name: 'Player Registered' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));

    await waitFor(async () => expect((await db.profile.get(1))?.experience).toBe('never'));
    expect(await getMeta(db, 'medicalAck')).toBe(true);
    expect(await getMeta(db, 'persistResult')).toBe('unsupported');
  });
});
