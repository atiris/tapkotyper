import { describe, expect, it } from 'vitest';
import { levelGain, nextLevel } from './levels';

describe('sound levels', () => {
  it('F4 steps through all four and back to normal', () => {
    expect(nextLevel('normal')).toBe('quiet');
    expect(nextLevel('quiet')).toBe('important');
    expect(nextLevel('important')).toBe('off');
    expect(nextLevel('off')).toBe('normal');
  });

  it('important plays like normal only in a level whose sound matters', () => {
    expect(levelGain('important', true)).toBe(levelGain('normal', false));
    expect(levelGain('important', false)).toBe(0);
  });

  it('the other levels ignore whether the sound matters', () => {
    for (const on of [true, false]) {
      expect(levelGain('normal', on)).toBe(1);
      expect(levelGain('quiet', on)).toBe(0.2);
      expect(levelGain('off', on)).toBe(0);
    }
  });
});
