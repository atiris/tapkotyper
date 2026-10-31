import { describe, expect, it } from 'vitest';
import { Rhythm, gaugeTop, rhythmTarget } from './rhythm';

/** Types `keys` one every `gapMs`, starting `gapMs` after `start`; returns the time of the last press. */
function type(r: Rhythm, keys: string, gapMs: number, start = 0): number {
  let at = start;
  for (const k of keys) r.press(k, (at += gapMs));
  return at;
}

describe('rhythm', () => {
  it('a run of one key leaves the rhythm where the first press put it', () => {
    const r = new Rhythm(60, 3);
    r.ready(1000);
    expect(r.press('f', 1500).counted).toBe(true);
    const after = r.ema;
    for (const at of [1600, 1700, 1800]) expect(r.press('f', at)).toMatchObject({ repeat: true, counted: false });
    expect(r.ema).toBe(after);
  });

  it('alternating keys count every move between them', () => {
    const r = new Rhythm(60, 3);
    const counted = [...'jfjf'].map((k, i) => r.press(k, 1000 + i * 500).counted);
    // No start is known, so the first press has nothing to measure from.
    expect(counted).toEqual([false, true, true, true]);
  });

  it('the move after a run of one key is measured from the last press of the run', () => {
    const r = new Rhythm(60, 3);
    r.ready(0);
    type(r, 'ffff', 300);
    const before = r.ema;
    r.press('j', 1200 + 500);
    expect(r.ema).toBeCloseTo(before * 0.85 + 2 * 0.15);
  });

  it('a wrong press neither counts nor breaks the measure from the last correct press', () => {
    const r = new Rhythm(60, 3);
    r.ready(0);
    r.press('f', 500);
    const wrong = r.press(null, 900);
    expect(wrong).toEqual({ rt: 400, repeat: false, counted: false });
    const right = r.press('j', 1500);
    expect(right.rt).toBe(600);
    expect(right.counted).toBe(true);
  });

  it('opens at the last session rhythm, at most at 80 % of the gauge', () => {
    expect(new Rhythm(60, 3).ema).toBe(1);
    expect(new Rhythm(600, 3).ema).toBeCloseTo(0.8 * rhythmTarget(3));
    expect(new Rhythm(0, 3).ema).toBe(1);
  });

  it('sinks fast after 2.5 s without a counted press, down to the floor', () => {
    const r = new Rhythm(600, 10);
    r.ready(0);
    const start = r.ema;
    r.idle(1, 2000);
    expect(r.ema).toBe(start);
    r.idle(1, 3000);
    expect(r.ema).toBeCloseTo(start - 0.25);
    for (let s = 4; s < 40; s++) r.idle(1, s * 1000);
    expect(r.ema).toBe(0.4);
  });

  it('a steady 1.2 characters per second at difficulty 3 fills about 60 % of the gauge, not the top', () => {
    const r = new Rhythm(600, 3);
    r.ready(0);
    type(r, 'asdfjkl;'.repeat(10), 1000 / 1.2);
    expect(r.ratio(3)).toBeGreaterThan(0.55);
    expect(r.ratio(3)).toBeLessThan(0.65);
  });

  it('held repeats cannot lift the gauge', () => {
    const r = new Rhythm(60, 3);
    r.ready(0);
    type(r, 'f'.repeat(50), 120);
    expect(r.ratio(3)).toBeLessThan(0.6);
  });
});

describe('the gauge', () => {
  it('is full a fifth above the usual pace, or at the difficulty rhythm before any typing', () => {
    expect(gaugeTop(200, 3)).toBeCloseTo((200 / 60) * 1.2);
    expect(gaugeTop(0, 3)).toBe(rhythmTarget(3));
  });
});
