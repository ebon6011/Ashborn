import { describe, expect, it } from 'vitest';
import { generatePenalty } from './penalty';

describe('generatePenalty', () => {
  it('is one small, tier-scaled task worth 20 XP', () => {
    expect(generatePenalty('never')).toMatchObject({ id: 'penalty', label: 'Walk', target: 10, unit: 'min', xp: 20, done: false, progress: 0 });
    expect(generatePenalty('beginner')).toMatchObject({ label: 'Squats', target: 15, unit: 'reps' });
    expect(generatePenalty('advanced').target).toBeLessThanOrEqual(25);
  });
});
