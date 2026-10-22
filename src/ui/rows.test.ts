import { describe, expect, it } from 'vitest';
import { rowSplit } from './rows';

describe('rowSplit', () => {
  it('keeps up to five cards in one row', () => {
    expect(rowSplit(0)).toEqual([]);
    expect(rowSplit(1)).toEqual([1]);
    expect(rowSplit(5)).toEqual([5]);
  });
  it('balances the rows and never leaves a single card last', () => {
    expect(rowSplit(6)).toEqual([3, 3]);
    expect(rowSplit(7)).toEqual([4, 3]);
    expect(rowSplit(8)).toEqual([4, 4]);
    expect(rowSplit(9)).toEqual([5, 4]);
    expect(rowSplit(11)).toEqual([4, 4, 3]);
    for (let n = 6; n < 60; n++) {
      const rows = rowSplit(n);
      expect(rows.reduce((a, b) => a + b, 0)).toBe(n);
      expect(Math.max(...rows)).toBeLessThanOrEqual(5);
      expect(rows.at(-1)).toBeGreaterThan(1);
    }
  });
});
