import { describe, expect, it, vi } from 'vitest';
import { TypingCore } from '../typing';
import type { LevelRuntime } from '../runtime';
import { Rng } from '../../engine/rng';

vi.mock('../../app/app', async () => {
  const { newProfile } = await import('../../storage/store');
  const { LAYOUTS } = await import('../../keyboard/layouts');
  const p = newProfile('Test', 'sk');
  p.progress.unlockedKeys = ['f', 'j', ' ', 'd', 'k'];
  // Four ready letters: their last presses all right.
  for (const k of ['f', 'j', 'd', 'k']) p.stats.keys[k] = { presses: 40, errors: 0, recent: Array(40).fill(300), days: [] } as never;
  return { app: { profile: p }, pickLine: () => '', profileLayout: (x: typeof p) => LAYOUTS[x.layout] };
});
vi.mock('../../audio/audio', () => ({ audio: { beatOut: () => null } }));
vi.mock('../../ui/dom', () => ({ h: () => ({ setAttribute: () => {}, className: '', innerHTML: '' }) }));
vi.mock('../../ui/tooltip', () => ({ tip: () => {} }));

const { RhythmMode } = await import('./rhythm');
const { rhythmLetters, rhythmOpen } = await import('../levels');
const { app } = await import('../../app/app');

/** A level runtime with what Rytmus asks of it; every other call does nothing. */
function fakeRuntime(noPressure = false): LevelRuntime {
  const base: Record<string, unknown> = {
    core: new TypingCore(), def: { world: 0, kind: 'rhythm', index: -1 }, vw: 1366, stage: { scale: 1 }, noPressure, reduceMotion: false,
    rng: new Rng(3), particles: { emit: () => {} },
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k as string] : () => {}) }) as unknown as LevelRuntime;
}

/** The runtime's way with a key: the mode may let it wait, else the core judges it. */
function press(L: LevelRuntime, mode: InstanceType<typeof RhythmMode>, ch: string): 'wait' | 'ok' | 'wrong' {
  const at = performance.now();
  if (mode.waitKey(ch, at)) return 'wait';
  const res = L.core.type(ch);
  if (res.kind === 'done') {
    mode.onKey(ch, true, 300, at);
    mode.onDone(res.target);
    return 'ok';
  }
  mode.onKey(ch, false, 300, at);
  mode.onWrong(res.kind === 'wrong' ? res.target : null);
  return 'wrong';
}

/** Plays the round in steps of `dt`; `child` may press keys each step. Returns the mode at its end. */
function play(L: LevelRuntime, child?: (mode: InstanceType<typeof RhythmMode>) => void) {
  const mode = new RhythmMode(L);
  mode.start();
  for (let i = 0; i < 20_000 && !mode.finished; i++) {
    L.core.update(0.02);
    mode.update(0.02);
    mode.t += 0.02;
    child?.(mode);
  }
  return mode;
}

describe('rhythm', () => {
  it('opens in the first world with four ready letters, the lanes d f j k', () => {
    expect(rhythmLetters(app.profile!, 0).sort()).toEqual(['d', 'f', 'j', 'k']);
    expect(rhythmOpen(app.profile!, 0)).toBe(true);
    expect(rhythmOpen(app.profile!, 1)).toBe(false);
    expect(new RhythmMode(fakeRuntime()).lanes.map((l) => l.letters[0])).toEqual(['d', 'f', 'j', 'k']);
  });

  it('without typing the song plays to its end: every letter splats, no errors, no rhythm', () => {
    const L = fakeRuntime();
    const mode = play(L);
    expect(mode.finished).toBe(true);
    expect(mode.progress()).toBe(1);
    expect(mode.caught).toBe(0);
    expect(mode.due).toBe(mode.song.drops.length);
    expect(mode.accuracy).toBe(1);
    expect(mode.score).toBe(0);
    expect(L.core.active).toHaveLength(0);
  });

  it('a child on the beat catches every letter, scores high and the tempo steps up', () => {
    const L = fakeRuntime();
    const mode = play(L, (m) => {
      const tg = L.core.focus();
      const d = m.song.drops.find((x) => x.letter === tg?.word && x.land <= (m as unknown as { songT: number }).songT + 0.001 && x.land > (m as unknown as { songT: number }).songT - 0.03);
      if (tg && d) press(L, m, tg.word);
    });
    expect(mode.caught).toBe(mode.due);
    expect(mode.score).toBeGreaterThanOrEqual(90);
    expect(mode.song.phrases.length).toBeGreaterThan(3);
    expect(mode.held).toBeGreaterThan(mode.song.phrases[0].tempo);
    expect(mode.reached).toBe(true);
    expect(mode.fill).toBe(4);
  });

  it('the right key too early waits, any other key is an error, the letter can still be caught', () => {
    const L = fakeRuntime();
    const mode = new RhythmMode(L);
    mode.start();
    const songT = () => (mode as unknown as { songT: number }).songT;
    const first = mode.song.drops[0];
    while (songT() < first.release + 0.05) mode.update(0.02);
    expect(press(L, mode, first.letter)).toBe('wait');
    expect(press(L, mode, first.letter === 'k' ? 'd' : 'k')).toBe('wrong');
    while (songT() < first.land) mode.update(0.02);
    expect(press(L, mode, first.letter)).toBe('ok');
    expect(mode.caught + mode.due).toBeGreaterThan(0);
    expect(mode.accuracy).toBe(0.5);
  });

  it('without time pressure the song waits for the due letter', () => {
    const L = fakeRuntime(true);
    const mode = new RhythmMode(L);
    mode.start();
    for (let i = 0; i < 1000; i++) mode.update(0.02);
    expect((mode as unknown as { songT: number }).songT).toBeCloseTo(mode.song.drops[0].land);
    expect(mode.due).toBe(0);
    expect(press(L, mode, mode.song.drops[0].letter)).toBe('ok');
    expect(mode.score).toBeNull();
  });
});
