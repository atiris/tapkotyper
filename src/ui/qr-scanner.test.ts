import { describe, expect, it } from 'vitest';
import { SCAN_DEDUPE_MS, makeScanner } from './qr-scanner';

const frame = {} as CanvasImageSource;

describe('scanner', () => {
  it('reads a code once, again after it was out of sight, and several codes of one frame', async () => {
    let t = 0;
    let seen: string[] = ['a'];
    const got: string[] = [];
    const s = makeScanner(async () => seen, true, (x) => got.push(x), () => t);
    await s.tick(frame, 1, 1);
    t += 200;
    await s.tick(frame, 1, 1);
    expect(got).toEqual(['a']);
    seen = ['a', 'b'];
    t += 200;
    await s.tick(frame, 1, 1);
    expect(got).toEqual(['a', 'b']);
    // Seen all the time: stays quiet. Gone for longer than the window: reported again.
    seen = [];
    t += SCAN_DEDUPE_MS + 100;
    await s.tick(frame, 1, 1);
    seen = ['a'];
    t += 200;
    await s.tick(frame, 1, 1);
    expect(got).toEqual(['a', 'b', 'a']);
  });

  it('looks at most about 8 times a second and never twice at once', async () => {
    let t = 0;
    let calls = 0;
    let release!: () => void;
    const s = makeScanner(() => { calls++; return new Promise<string[]>((r) => { release = () => r([]); }); }, false, () => undefined, () => t);
    const first = s.tick(frame, 1, 1);
    t += 500;
    await s.tick(frame, 1, 1);
    expect(calls).toBe(1);
    release();
    await first;
    // Free again and long after the first look: looks.
    void s.tick(frame, 1, 1);
    expect(calls).toBe(2);
    release();
    await Promise.resolve();
    t += 50;
    void s.tick(frame, 1, 1);
    expect(calls).toBe(2);
    t += 100;
    void s.tick(frame, 1, 1);
    expect(calls).toBe(3);
  });
});
