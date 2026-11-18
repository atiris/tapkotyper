import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameWatch, JANK_MS, SLOW_MS, graphics, markSlowDevice, median, useGraphics } from './graphics';

/** Frames `ms` apart for `seconds`, from `start`; returns what the watch said last and the time after. */
function run(w: FrameWatch, ms: number, seconds: number, start = 1000): { slow: boolean; at: number } {
  let slow = false, at = start;
  for (; at < start + seconds * 1000; at += ms) slow = w.frame(at) || slow;
  return { slow, at };
}

/** Smooth frames for `seconds` from `start`, every `every`-th one taking `long` ms; returns as `run`. */
function runUneven(w: FrameWatch, every: number, long: number, seconds: number, start = 1000): { slow: boolean; at: number } {
  let slow = false, at = start;
  for (let i = 1; at < start + seconds * 1000; at += i++ % every ? 16.7 : long) slow = w.frame(at) || slow;
  return { slow, at };
}

describe('the frame watch', () => {
  it('finds a smooth computer fast enough', () => {
    const w = new FrameWatch();
    expect(run(w, 16.7, 12).slow).toBe(false);
    expect(w.done).toBe(true);
  });

  it('finds a computer slow when its frames are slow all the time', () => {
    expect(run(new FrameWatch(), SLOW_MS + 10, 12).slow).toBe(true);
  });

  it('does not count the slow start or a pause', () => {
    const w = new FrameWatch();
    // The first seconds load pictures.
    const { at } = run(w, 200, 3);
    w.pause();
    // A long pause card, then smooth play.
    expect(run(w, 16.7, 12, at + 60_000).slow).toBe(false);
  });

  it('does not step down for one long hiccup or a short burst of slow frames', () => {
    const w = new FrameWatch();
    let { at } = run(w, 16.7, 5);
    // A frozen tab or a long clean-up of memory: one gap of two seconds.
    w.frame(at += 2000);
    // A picture decoding: a second of slow frames.
    ({ at } = run(w, 60, 1, at));
    expect(run(w, 16.7, 8, at).slow).toBe(false);
    expect(w.done).toBe(true);
  });

  it('finds a computer slow when its middle frame is fine but it stutters all the time', () => {
    // A slow computer in the full drawing: one frame in twenty misses two refreshes.
    expect(runUneven(new FrameWatch(), 20, 50, 12).slow).toBe(true);
    expect(runUneven(new FrameWatch(), 20, JANK_MS + 1, 12).slow).toBe(true);
  });

  it('does not step down for frames that miss one refresh, or for a rare stutter', () => {
    // A strong computer with a big screen: one frame in fifteen takes two refreshes.
    expect(runUneven(new FrameWatch(), 15, 33.4, 12).slow).toBe(false);
    // One long frame a second.
    expect(runUneven(new FrameWatch(), 60, 80, 12).slow).toBe(false);
  });

  it('does not step down for stutter that ends', () => {
    const w = new FrameWatch();
    // Four seconds of stutter after the start (pictures decoding, a busy tab), then smooth play.
    const { at } = runUneven(w, 10, 60, 7);
    expect(run(w, 16.7, 8, at).slow).toBe(false);
    expect(w.done).toBe(true);
  });

  it('does not take the simple drawing to its lower resolution for stutter', () => {
    graphics.simple = true;
    try {
      expect(runUneven(new FrameWatch(), 20, 50, 12).slow).toBe(false);
      expect(run(new FrameWatch(), SLOW_MS + 10, 12).slow).toBe(true);
    } finally {
      graphics.simple = false;
    }
  });

  it('decides only once', () => {
    const w = new FrameWatch();
    expect(run(w, 50, 12).slow).toBe(true);
    expect(run(w, 50, 12, 100_000).slow).toBe(false);
  });
});

describe('median', () => {
  it('is the middle frame time', () => {
    expect(median([10, 100, 20])).toBe(20);
    expect(median([...Array(51).fill(10), ...Array(49).fill(100)])).toBe(10);
  });
});

describe('the automatic steps', () => {
  const stored = new Map<string, string>();
  beforeEach(() => {
    stored.clear();
    vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => stored.set(k, v) });
    vi.stubGlobal('document', { body: { classList: { toggle: () => true, add: () => {} } } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('go to the simple drawing, then to its lower resolution, and the device keeps them', () => {
    useGraphics('auto');
    expect(graphics).toEqual({ simple: false, lowRes: false });
    markSlowDevice();
    expect(graphics).toEqual({ simple: true, lowRes: false });
    markSlowDevice();
    expect(graphics).toEqual({ simple: true, lowRes: true });
    useGraphics('full');
    expect(graphics).toEqual({ simple: false, lowRes: false });
    useGraphics('auto');
    expect(graphics).toEqual({ simple: true, lowRes: true });
  });

  it('leave a chosen simple drawing at its own resolution', () => {
    stored.set('tapkotyper:slow-device', JSON.stringify({ step: 2, at: Date.now() }));
    useGraphics('simple');
    expect(graphics).toEqual({ simple: true, lowRes: false });
  });

  it('measure again after a week', () => {
    stored.set('tapkotyper:slow-device', JSON.stringify({ step: 2, at: Date.now() - 8 * 864e5 }));
    useGraphics('auto');
    expect(graphics).toEqual({ simple: false, lowRes: false });
  });
});
