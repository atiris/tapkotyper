import { describe, expect, it } from 'vitest';
import type { Finger } from '../keyboard/layouts';
import { Evenness } from './evenness';

/** f, j alternate hands; d is the left hand like f; r is f's finger. */
const FINGERS: Record<string, Finger> = { f: 3, d: 2, r: 3, j: 6, k: 7, o: 8 };
const make = () => new Evenness((k) => FINGERS[k] ?? null);

/** A seeded random in [0, 1). */
function rng(seed = 7): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Strokes of alternating keys at the given intervals (ms). */
function run(intervals: number[], keys = ['f', 'j']): Evenness {
  const e = make();
  let t = 1000;
  e.stroke(keys[0], t, t);
  intervals.forEach((d, i) => {
    t += d;
    e.stroke(keys[(i + 1) % keys.length], t, t);
  });
  return e;
}

const steady = (ms: number, n: number, spread = 0.1, r = rng()) => Array.from({ length: n }, () => ms * (1 + spread * (2 * r() - 1)));

describe('Evenness', () => {
  it('scores steady slow and steady fast typing high and alike', () => {
    const slow = run(steady(1000, 60)).session(1)!;
    const fast = run(steady(250, 60)).session(1)!;
    expect(slow).toBeGreaterThanOrEqual(90);
    expect(Math.abs(slow - fast)).toBeLessThanOrEqual(5);
  });

  it('scores bursts low although they are faster', () => {
    const bursty = run(Array.from({ length: 60 }, (_, i) => (i % 4 === 3 ? 700 : 150))).session(1)!;
    expect(bursty).toBeLessThanOrEqual(30);
    expect(bursty).toBeLessThan(run(steady(1000, 60)).session(1)!);
  });

  it('lets a slow drift cost nothing', () => {
    const r = rng(3);
    const drift = Array.from({ length: 60 }, (_, i) => (900 + (500 * i) / 59) * (1 + 0.05 * (2 * r() - 1)));
    expect(run(drift).session(1)).toBeGreaterThanOrEqual(85);
  });

  it('forms no pair across a chain break', () => {
    const plain = run(steady(1000, 40, 0.1, rng(5)));
    const e = make();
    const ds = steady(1000, 40, 0.1, rng(5));
    let t = 1000;
    e.stroke('f', t, t);
    ds.forEach((d, i) => {
      t += d;
      if (i === 20) {
        // A new target after a 4 s pause.
        e.break();
        t += 4000;
      }
      e.stroke(i % 2 ? 'f' : 'j', t, t);
    });
    expect(Math.abs(e.session(1)! - plain.session(1)!)).toBeLessThanOrEqual(3);
  });

  it('marks one long hunt boundedly and forgets it within the window', () => {
    const base = steady(1000, 80, 0.1, rng(9));
    const before = run(base.slice(0, 40)).live(1)!;
    const hunt = [...base.slice(0, 40), 3000, ...base.slice(40)];
    expect(before - run(hunt.slice(0, 43)).live(1)!).toBeLessThanOrEqual(20);
    expect(Math.abs(run(hunt).live(1)! - run(base).live(1)!)).toBeLessThanOrEqual(5);
  });

  it('measures a combo from its first press to the letter before it, and on from the letter', () => {
    const ds = steady(1000, 40, 0.1, rng(11));
    const plain = run(ds, ['f', 'o']);
    const combo = make();
    let t = 1000;
    combo.stroke('f', t, t);
    ds.forEach((d, i) => {
      t += d;
      // Every 'o' is typed as a dead key and 'o' 150 ms later (or Shift and a capital).
      if (i % 2 === 0) {
        combo.stroke('o', t, t + 150);
        t += 150;
      } else combo.stroke('f', t, t);
    });
    expect(combo.session(1)).toBe(plain.session(1));
  });

  it('counts nothing for the same key again', () => {
    const e = make();
    for (let i = 0; i < 40; i++) e.stroke('f', i * 300, i * 300);
    expect(e.live(1)).toBeNull();
    expect(e.session(1)).toBeNull();
  });

  it('restarts the chain after an error', () => {
    const e = make();
    let t = 0;
    for (let i = 0; i < 12; i++) {
      t += 500;
      if (i % 3 === 0) e.break();
      e.stroke(i % 2 ? 'f' : 'j', t, t);
    }
    // Chains of three strokes give one pair each: four pairs, too few for the ring.
    expect(e.live(1)).toBeNull();
  });

  it('needs ten pairs for the ring and twenty for a session', () => {
    expect(run(steady(500, 10)).live(1)).toBeNull();
    expect(run(steady(500, 11)).live(1)).not.toBeNull();
    expect(run(steady(500, 20)).session(1)).toBeNull();
    expect(run(steady(500, 21)).session(1)).not.toBeNull();
  });

  it('never shows rhythm better than accuracy allows', () => {
    const e = run(steady(1000, 60));
    expect(e.session(0.85)).toBeLessThanOrEqual(50);
    expect(e.session(0.96)).toBe(e.session(1));
  });

  it('does not count the natural difference between key pair classes', () => {
    // f j alternate (400 ms), f r is the same finger (600 ms).
    const e = make();
    const r = rng(13);
    let t = 0;
    const seq = ['f', 'j', 'f', 'r'];
    e.stroke('r', t, t);
    for (let i = 0; i < 160; i++) {
      const key = seq[i % 4];
      const prevKey = seq[(i + 3) % 4];
      const alt = (key === 'j') !== (prevKey === 'j');
      t += (alt ? 400 : 600) * (1 + 0.05 * (2 * r() - 1));
      e.stroke(key, t, t);
    }
    expect(e.live(1)).toBeGreaterThanOrEqual(90);
  });

  it('does not sink while nobody types', () => {
    const e = run(steady(1000, 40));
    const before = e.live(1);
    expect(e.live(1)).toBe(before);
  });
});
