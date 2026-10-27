import { describe, expect, it } from 'vitest';
import { driftOffset } from './mode';

describe('background drift', () => {
  it('moves the band with time and holds it still with reduced motion or without a drift', () => {
    const drift = { layer: 'near', speed: 6 } as const;
    expect(driftOffset(drift, 0, true)).toBe(0);
    expect(driftOffset(drift, 10, true)).toBe(60);
    expect(driftOffset(drift, 20, true)).toBeGreaterThan(driftOffset(drift, 10, true));
    expect(driftOffset(drift, 10, false)).toBe(0);
    expect(driftOffset(null, 10, true)).toBe(0);
  });
});
