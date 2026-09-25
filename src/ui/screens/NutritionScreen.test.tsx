// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { seedApp } from '../../test/uiFixtures';
import { NutritionScreen } from './NutritionScreen';

beforeEach(() => seedApp('2026-09-21'));

describe('NutritionScreen', () => {
  it("shows today's targets from the profile", async () => {
    render(<NutritionScreen />);
    expect(await screen.findByText('0 / 2448 kcal')).toBeTruthy();
    expect(screen.getByText('0 / 128 g')).toBeTruthy();
    expect(screen.getByText('0 / 2500 ml')).toBeTruthy();
  });

  it('explains the safety floor when it applies', async () => {
    await db.profile.update(1, { goal: 'lose_fat', daysPerWeek: 1 });
    render(<NutritionScreen />);
    expect(await screen.findByText(/safe minimum for you/)).toBeTruthy();
  });

  it('explains that an under-18 fat-loss goal is held at maintenance', async () => {
    await db.profile.update(1, { age: 15, goal: 'lose_fat' });
    render(<NutritionScreen />);
    expect(await screen.findByText('Under 18: no calorie deficit. Your target is kept at maintenance.')).toBeTruthy();
  });

  it('quick-adds water', async () => {
    render(<NutritionScreen />);
    fireEvent.click(await screen.findByRole('button', { name: '+250 ml water' }));
    expect(await screen.findByText('Logged.')).toBeTruthy();
    expect((await db.foodLog.toArray())[0]?.waterMl).toBe(250);
  });

  it('refuses an empty entry', async () => {
    render(<NutritionScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter calories, protein or water.')).toBeTruthy();
  });
});
