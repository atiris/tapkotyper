import { describe, expect, it } from 'vitest';
import { FrameWatch, SLOW_P95_MS, p95 } from './graphics';

/** Frames `ms` apart for `seconds`, from `start`; returns what the watch said last and the time after. */
function run(w: FrameWatch, ms: number, seconds: number, start = 1000): { slow: boolean; at: number } {
  let slow = false, at = start;
  for (; at < start + seconds * 1000; at += ms) slow = w.frame(at) || slow;
  return { slow, at };
}

describe('the frame watch', () => {
  it('finds a smooth computer fast enough', () => {
    const w = new FrameWatch();
    expect(run(w, 16.7, 8).slow).toBe(false);
    expect(w.done).toBe(true);
  });

  it('finds a computer slow when its frames are over the limit', () => {
    expect(run(new FrameWatch(), SLOW_P95_MS + 15, 8).slow).toBe(true);
  });

  it('does not count the slow start or a pause', () => {
    const w = new FrameWatch();
    // The first second decodes pictures.
    const { at } = run(w, 200, 1);
    w.pause();
    // A long pause card, then smooth play.
    expect(run(w, 16.7, 8, at + 60_000).slow).toBe(false);
  });

  it('decides only once', () => {
    const w = new FrameWatch();
    expect(run(w, 50, 8).slow).toBe(true);
    expect(run(w, 50, 8, 100_000).slow).toBe(false);
  });
});

describe('p95', () => {
  it('is the frame time the slowest 5 % are over', () => {
    expect(p95([...Array(95).fill(10), ...Array(5).fill(100)])).toBe(100);
    expect(p95([...Array(96).fill(10), ...Array(4).fill(100)])).toBe(10);
  });
});
