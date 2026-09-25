// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { TrainingScreen } from './TrainingScreen';

beforeEach(() => seedApp('2026-09-21'));

describe('TrainingScreen', () => {
  it("shows this week's plan with today marked", async () => {
    render(<TrainingScreen />);
    expect(await screen.findByText('Monday · Full body · Today')).toBeTruthy();
    expect(screen.getByText('Wednesday · Full body')).toBeTruthy();
  });

  it('logs a set and shows it in records', async () => {
    render(<TrainingScreen />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^Push-up/ }))[0]!);
    fireEvent.change(await screen.findByLabelText('Reps'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log set' }));
    expect(await screen.findByText('Set logged.')).toBeTruthy();
    expect(await db.workoutSets.count()).toBe(1);
    expect(await screen.findByText('Best 12 reps')).toBeTruthy();
  });

  it('asks for reps before logging', async () => {
    render(<TrainingScreen />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^Push-up/ }))[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Log set' }));
    expect(await screen.findByText('Enter the reps you did.')).toBeTruthy();
    expect(await db.workoutSets.count()).toBe(0);
  });
});
