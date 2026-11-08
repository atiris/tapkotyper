import { describe, expect, it } from 'vitest';
import { PACE_MAX, PACE_MIN, PressureValve, perChar, readTime, sayTime } from './pace';

describe('word pace', () => {
  it('uses the last session speed until five targets are finished', () => {
    expect(perChar([], 1)).toBeCloseTo(1 / 0.85);
    expect(perChar([0.1, 0.1, 0.1, 0.1], 5)).toBe(PACE_MIN);
  });

  it('averages the last five targets', () => {
    expect(perChar([9, 1, 1, 1, 1, 2], 5)).toBeCloseTo(1.2);
  });

  it('stays inside its limits', () => {
    expect(perChar([0.2, 0.2, 0.2, 0.2, 0.2], 1)).toBe(PACE_MIN);
    expect(perChar([5, 5, 5, 5, 5], 1)).toBe(PACE_MAX);
  });
});

describe('pressure valve', () => {
  it('slows down after two misses in a row, up to twice the time', () => {
    const v = new PressureValve();
    v.miss();
    expect(v.factor).toBe(1);
    v.miss();
    expect(v.factor).toBe(1.25);
    for (let i = 0; i < 10; i++) v.miss();
    expect(v.factor).toBe(2);
  });

  it('a typed target breaks the run of misses', () => {
    const v = new PressureValve();
    v.miss();
    v.hit();
    v.miss();
    expect(v.factor).toBe(1);
  });

  it('every three typed targets in a row take one step back to normal', () => {
    const v = new PressureValve();
    v.miss();
    v.miss();
    v.miss();
    v.miss();
    expect(v.factor).toBeCloseTo(1.5625);
    v.hit();
    v.hit();
    expect(v.factor).toBeCloseTo(1.5625);
    v.hit();
    expect(v.factor).toBeCloseTo(1.25);
    for (let i = 0; i < 9; i++) v.hit();
    expect(v.factor).toBe(1);
  });
});

describe('reading time', () => {
  it('gives a shout 0.15 seconds per character, 1.5 at least', () => {
    expect(readTime('Hurá!')).toBe(1.5);
    expect(readTime('Kytica ako pre kráľovnú!')).toBeCloseTo(3.6);
  });

  it('keeps a narrator line at least 3.5 seconds', () => {
    expect(sayTime('Hi')).toBe(3.5);
    expect(sayTime('x'.repeat(100))).toBeCloseTo(15);
  });
});
