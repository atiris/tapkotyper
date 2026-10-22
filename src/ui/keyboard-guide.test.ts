import { describe, expect, it } from 'vitest';
import { FINGER_COLORS, contrast, textColorsOn } from './keyboard-guide';

describe('finger chip colors', () => {
  it('reach AA text contrast on every finger color', () => {
    for (const color of Object.values(FINGER_COLORS)) {
      const [bg, ink] = textColorsOn(color);
      expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps a finger color that already reads well', () => {
    expect(textColorsOn('#f0c419')[0]).toBe('#f0c419');
  });
});

describe('next-key highlight', () => {
  it('has AA label contrast on every finger color', () => {
    for (const color of Object.values(FINGER_COLORS)) {
      const [bg, ink] = textColorsOn(color);
      expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
