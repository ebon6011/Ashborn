import { describe, expect, it } from 'vitest';
import { rankForLevel, rankIndex } from './rank';

describe('rankForLevel', () => {
  it.each([
    [1, 'E'], [9, 'E'], [10, 'D'], [19, 'D'], [20, 'C'], [34, 'C'],
    [35, 'B'], [49, 'B'], [50, 'A'], [69, 'A'], [70, 'S'], [250, 'S'],
  ])('level %i is rank %s', (level, rank) => {
    expect(rankForLevel(level)).toBe(rank);
  });

  it('orders ranks from E to S', () => {
    expect(rankIndex('E')).toBe(0);
    expect(rankIndex('S')).toBe(5);
  });
});
