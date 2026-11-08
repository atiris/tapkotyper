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
  // The first world finished; its Rytmus starts at the world's target tempo.
  p.progress.worldsDone = [0];
  p.progress.rhythm = { 0: { tempo: 40, at: '2999-01-01', rhythm: null, top: 0 } };
  return { app: { profile: p, words: { sk: [], en: [] } }, pickLine: () => '', profileLayout: (x: typeof p) => LAYOUTS[x.layout] };
});
vi.mock('../../audio/audio', () => ({ audio: { beatOut: () => null } }));
vi.mock('../../ui/dom', async (real) => ({ ...(await real<object>()), h: () => ({ setAttribute: () => {}, className: '', innerHTML: '' }) }));
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

/** The runtime's way with a key: the mode may let it wait or call it wrong, else the core judges it. */
function press(L: LevelRuntime, mode: InstanceType<typeof RhythmMode>, ch: string): 'wait' | 'ok' | 'wrong' {
  const at = performance.now();
  const check = mode.checkKey(ch, at);
  if (check === 'wait') return 'wait';
  if (check === 'wrong') {
    mode.onKey(ch, false, 300, at);
    mode.onWrong(L.core.locked);
    return 'wrong';
  }
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
  it('opens with its world; the first world plays two lanes of its newest letters, left to right', () => {
    expect(rhythmLetters(app.profile!, 0).sort()).toEqual(['d', 'f', 'j', 'k']);
    expect(rhythmOpen(app.profile!, 0)).toBe(true);
    expect(rhythmOpen(app.profile!, 1)).toBe(false);
    const lanes = new RhythmMode(fakeRuntime()).lanes;
    expect(lanes).toHaveLength(2);
    expect(lanes[0].finger).toBeLessThan(lanes[1].finger);
  });

  it('a missed letter stops everything: the keys wait, the next letter glides into the band and waits for its key', () => {
    const L = fakeRuntime();
    const mode = new RhythmMode(L);
    mode.start();
    const songT = () => (mode as unknown as { songT: number }).songT;
    const second = mode.song.drops[1];
    while (mode.due < 1) mode.update(0.02);
    // Standing still: no song time passes and a key waits, uncounted.
    const stopped = songT();
    mode.update(0.3);
    expect(songT()).toBe(stopped);
    expect(press(L, mode, second.letter)).toBe('wait');
    // The next letter comes to its beat, the middle of the band, and the song waits there.
    for (let i = 0; i < 200; i++) mode.update(0.02);
    expect(songT()).toBeCloseTo(second.land);
    expect(mode.due).toBe(1);
    expect(press(L, mode, second.letter)).toBe('ok');
    // The song runs on; the letter drops into the basket.
    mode.update(0.2);
    expect(songT()).toBeGreaterThan(second.land);
    expect(mode.caught).toBe(1);
    expect(mode.due).toBe(2);
    expect(mode.accuracy).toBe(1);
  });

  it('back from a pause the due letter glides into the band and waits for its key, nothing missed', () => {
    const L = fakeRuntime();
    const mode = new RhythmMode(L);
    mode.start();
    const songT = () => (mode as unknown as { songT: number }).songT;
    const first = mode.song.drops[0];
    while (songT() < first.release) mode.update(0.02);
    mode.onResume();
    // The keys wait while it glides; then the song stands at its beat, long after its window would have passed.
    expect(press(L, mode, first.letter)).toBe('wait');
    for (let i = 0; i < 500; i++) mode.update(0.02);
    expect(songT()).toBeCloseTo(first.land);
    expect(mode.due).toBe(0);
    expect(press(L, mode, first.letter)).toBe('ok');
    mode.update(0.2);
    expect(mode.caught).toBe(1);
    expect(mode.due).toBe(1);
    expect(mode.accuracy).toBe(1);
  });

  it('without typing the song stands at the second letter: one miss, no errors', () => {
    const L = fakeRuntime();
    const mode = play(L);
    expect(mode.finished).toBe(false);
    expect(mode.due).toBe(1);
    expect(mode.caught).toBe(0);
    expect(mode.accuracy).toBe(1);
    expect(L.core.active).toHaveLength(1);
  });

  it('a child on the beat catches every letter, scores high and the tempo steps up', () => {
    const L = fakeRuntime();
    // Each letter once, on the first frame at or after its beat: a second press would be an error.
    const pressed = new Set<number>();
    const mode = play(L, (m) => {
      const tg = L.core.focus();
      const songT = (m as unknown as { songT: number }).songT;
      const d = m.song.drops.find((x) => x.letter === tg?.word && x.land <= songT + 0.001 && x.land > songT - 0.03 && !pressed.has(x.index));
      if (!tg || !d) return;
      pressed.add(d.index);
      press(L, m, tg.word);
    });
    expect(mode.accuracy).toBe(1);
    expect(mode.caught).toBe(mode.due);
    expect(mode.score).toBeGreaterThanOrEqual(90);
    expect(mode.song.phrases.length).toBeGreaterThan(2);
    // The tempo climbs gently once the first phrase went well; whole phrases were held above the base too.
    expect(mode.song.phrases[2].tempo).toBeGreaterThan(mode.song.phrases[0].tempo);
    expect(mode.held).toBeGreaterThan(mode.song.phrases[0].tempo);
    expect(mode.reached).toBe(true);
    // Never a step down: the round keeps its length, 80 % of the story's level; the next round starts a step higher.
    expect(mode.song.roundS).toBe(96);
    expect(mode.nextTempo).toBe(42);
  });

  it('the right key before the band and any other key are errors; the letter can still be caught in the band', () => {
    const L = fakeRuntime();
    const mode = new RhythmMode(L);
    mode.start();
    const songT = () => (mode as unknown as { songT: number }).songT;
    const first = mode.song.drops[0];
    while (songT() < first.release + 0.05) mode.update(0.02);
    expect(press(L, mode, first.letter)).toBe('wrong');
    expect(press(L, mode, first.letter === 'k' ? 'd' : 'k')).toBe('wrong');
    while (songT() < first.land) mode.update(0.02);
    expect(press(L, mode, first.letter)).toBe('ok');
    expect(mode.due).toBe(1);
    expect(mode.accuracy).toBeCloseTo(1 / 3);
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
