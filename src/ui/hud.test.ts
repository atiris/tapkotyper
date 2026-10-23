import { describe, expect, it, vi } from 'vitest';

vi.mock('../app/app', () => ({ app: {} }));

const { accuracyFill } = await import('./hud');

describe('accuracy ring', () => {
  it('spreads 80 to 100 % over most of the ring', () => {
    expect(accuracyFill(1)).toBe(1);
    expect(accuracyFill(0)).toBe(0);
    expect(accuracyFill(1) - accuracyFill(0.8)).toBeGreaterThan(0.6);
    // A step of 5 % near the top is still clearly visible.
    expect(accuracyFill(0.95) - accuracyFill(0.9)).toBeGreaterThan(0.1);
    expect(accuracyFill(1.2)).toBe(1);
  });
});
