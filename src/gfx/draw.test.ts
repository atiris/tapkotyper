import { describe, expect, it } from 'vitest';
import { bandCopies } from './draw';

describe('bandCopies', () => {
  it('puts copies on whole pixels side by side, from the left edge past the right one', () => {
    const { xs, w } = bandCopies(-300.4, 1366, 656, true);
    expect(xs).toEqual([-300, 356, 1012]);
    expect(w).toBe(656);
  });

  it('covers every pixel between pixels: each copy reaches one pixel under the next', () => {
    for (const x0 of [-0.25, -100.5, -655.75]) {
      const { xs, w } = bandCopies(x0, 1366, 656, false);
      expect(xs[0]).toBe(x0);
      expect(xs.at(-1)! + w).toBeGreaterThan(1366);
      for (let i = 1; i < xs.length; i++) expect(xs[i - 1] + w).toBe(xs[i] + 1);
    }
  });
});
