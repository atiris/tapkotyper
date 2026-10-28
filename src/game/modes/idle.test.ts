import { describe, expect, it, vi } from 'vitest';
import { TypingCore } from '../typing';
import { MIN_ACTIVE_S, grownCount, levelOver } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { Mode } from '../mode';

vi.mock('../../app/app', async () => {
  const { newProfile } = await import('../../storage/store');
  return { app: { profile: newProfile('Test', 'sk') }, pickLine: () => '' };
});

const { ShieldMode, WaveMode } = await import('./dragons');
const { MoleMode, SlopeMode } = await import('./egg');
const { BirdsMode } = await import('./forestpath');
const { JunkMode, KnotMode } = await import('./junkyard');
const { HedgehogMode, MeadowMode } = await import('./meadow');
const { PoppyMode, InvitationMode } = await import('./meadow-calm');
const { FirefliesMode, LastSongMode } = await import('./moonball');
const { NotesMode, TreeSongMode } = await import('./musictree');
const { RainMode, StormMode } = await import('./raintown');
const { RoomsMode, WelcomeMode } = await import('./robohome');
const { AsteroidMode, SpaceMode } = await import('./space');
const { CommandMode, HopMode } = await import('./space-calm');
const { BatteryMode, BeltMode } = await import('./workshop');
const { GreatSwampMode, SwampMode } = await import('./planet');
const { CrystalsMode, SpellMode } = await import('./planet-crystals');
const { CrossroadsMode } = await import('./planet-roads');
const { DoorsMode, GateMode } = await import('./robocity');
const { BudsMode, FlowerMode } = await import('./garden');
const { LiliesMode, ReflectionMode } = await import('./lilylake');
const { OwlMode } = await import('./forestpath');

/** A level runtime with just enough to run a mode: words are fixed, every other call does nothing. */
function fakeRuntime(count = 4): LevelRuntime {
  const base: Record<string, unknown> = {
    core: new TypingCore(),
    def: { count, variant: 'mix', index: 0, kind: 'x', world: 1 },
    count,
    vw: 1280,
    stage: { scale: 1 },
    maxActive: 3,
    spawnGap: 0.5,
    noPressure: false,
    difficulty: 5,
    idleFor: 99,
    rhythm: { ema: 0.5, ratio: () => 0.3 },
    robot: null,
    toolAlpha: 1,
    rng: { pick: <T>(a: T[]) => a[0], range: (a: number) => a, chance: () => false, int: (a: number) => a, next: () => 0.5, shuffle: <T>(a: T[]) => [...a] },
    word: () => 'ab',
    weakWord: () => 'ab',
    playedS: 0,
    minLeft: 0,
    letter: () => 'a',
    travelTime: () => 3,
    friendSpot: () => ({ x: 120, y: 600 }),
    particles: { emit: () => {} },
    // A tween ends at once.
    tweens: { add: (_s: number, step?: (k: number) => void, _ease?: unknown, done?: () => void) => { step?.(1); done?.(); } },
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k as string] : () => {}) }) as unknown as LevelRuntime;
}

const MODES: [string, new (L: LevelRuntime) => Mode][] = [
  ['meadow', MeadowMode], ['poppies', PoppyMode], ['invitation', InvitationMode], ['hedgehog', HedgehogMode], ['space', SpaceMode], ['hop', HopMode], ['command', CommandMode], ['asteroid', AsteroidMode],
  ['swamp', SwampMode], ['crystals', CrystalsMode], ['crossroads', CrossroadsMode], ['spells', SpellMode], ['greatswamp', GreatSwampMode], ['shield', ShieldMode], ['wave', WaveMode],
  ['slope', SlopeMode], ['mole', MoleMode], ['junk', JunkMode], ['knot', KnotMode], ['belt', BeltMode],
  ['battery', BatteryMode], ['rain', RainMode], ['storm', StormMode], ['doors', DoorsMode], ['gate', GateMode],
  ['rooms', RoomsMode], ['welcome', WelcomeMode], ['buds', BudsMode], ['flower', FlowerMode], ['birds', BirdsMode],
  ['owl', OwlMode], ['lilies', LiliesMode], ['reflection', ReflectionMode], ['notes', NotesMode],
  ['treesong', TreeSongMode], ['fireflies', FirefliesMode], ['lastsong', LastSongMode],
];

describe('no typing, no progress', () => {
  it.each(MODES)('%s: two minutes of waiting leaves the level unfinished', (_name, Ctor) => {
    const L = fakeRuntime();
    const mode = new Ctor(L);
    mode.start();
    for (let i = 0; i < 2400; i++) {
      L.core.update(0.05);
      mode.update(0.05);
      mode.t += 0.05;
    }
    expect(mode.progress()).toBe(0);
    expect(mode.finished).toBe(false);
  });
});

describe('a level shorter than its minimum', () => {
  it.each(MODES)('%s: a steady typist plays at least two minutes, then the level ends', (_name, Ctor) => {
    const L = fakeRuntime();
    const mode = new Ctor(L);
    mode.start();
    let time = 0, next = 0;
    while (time < 600 && !levelOver(mode.finished, time, MIN_ACTIVE_S)) {
      L.count = grownCount(L.count, mode.progress() * L.count, time, 4, MIN_ACTIVE_S);
      L.core.update(0.05);
      mode.update(0.05);
      mode.t += 0.05;
      time += 0.05;
      const f = L.core.focus();
      if (f?.selectable && time >= next) {
        next = time + 0.5;
        const res = L.core.type(f.word[f.typed]);
        if (res.kind === 'done') mode.onDone(res.target);
        else if (res.kind === 'ok') mode.onCorrect(res.target);
      }
    }
    expect(time).toBeGreaterThanOrEqual(MIN_ACTIVE_S);
    expect(time).toBeLessThan(MIN_ACTIVE_S + 60);
  });
});

describe('invitation', () => {
  it('a slip adds two words until the story ceiling of (1 + story order) x 3', async () => {
    const { slipWords } = await import('./copy-row');
    expect(slipWords(1, 0)).toBe(2);
    expect(slipWords(1, 4)).toBe(2);
    expect(slipWords(1, 6)).toBe(0);
    expect(slipWords(2, 8)).toBe(1);
    expect(slipWords(3, 12)).toBe(0);
  });

  it('a slip fades the word, the next one is typed and the level grows by two', () => {
    const L = fakeRuntime(6);
    const mode = new InvitationMode(L);
    mode.start();
    const first = L.core.focus()!;
    const res = L.core.type('x');
    expect(res.kind).toBe('wrong');
    mode.onWrong(first);
    expect(first.gone).toBe(true);
    expect(L.count).toBe(8);
    expect(L.core.focus()).not.toBe(first);
  });
});

describe('rain walk', () => {
  it('Bolt walks from the street start to the sun as the rain thins', async () => {
    const { rainWalkX } = await import('./raintown');
    expect(rainWalkX(1000, 0)).toBeLessThan(rainWalkX(1000, 0.5));
    expect(rainWalkX(1000, 0.5)).toBeLessThan(rainWalkX(1000, 1));
    expect(rainWalkX(1000, 2)).toBe(rainWalkX(1000, 1));
  });
});

describe('strong meteors', () => {
  it('a strong meteor needs its word twice and counts once', () => {
    const L = fakeRuntime(6);
    Object.assign(L, { def: { ...L.def, variant: 'strong' }, rng: { ...L.rng, chance: () => true } });
    const mode = new SpaceMode(L);
    mode.start();
    for (let i = 0; i < 200 && !L.core.targets.some((tg) => tg.data.lives === 2); i++) mode.update(0.05);
    const strong = L.core.targets.find((tg) => tg.data.lives === 2)!;
    expect(strong).toBeDefined();
    strong.done = true;
    mode.onDone(strong);
    const again = L.core.targets.find((tg) => !tg.done && tg.word === strong.word && tg.data.lives === 1)!;
    expect(again.data.state).toBe('come');
    expect(mode.progress()).toBe(0);
    again.done = true;
    mode.onDone(again);
    expect(mode.progress()).toBeCloseTo(1 / 6);
  });
});

/** Types the focused target's word to the end and tells the mode. */
function typeWord(L: LevelRuntime, mode: Mode): void {
  const f = L.core.focus()!;
  for (const ch of f.word.slice(f.typed)) {
    const res = L.core.type(ch);
    if (res.kind === 'done') mode.onDone(res.target);
  }
}

function run(L: LevelRuntime, mode: Mode, seconds: number): void {
  for (let i = 0; i < seconds / 0.05; i++) {
    L.core.update(0.05);
    mode.update(0.05);
    mode.t += 0.05;
  }
}

describe('the great swamp', () => {
  it('a slip away from the firm stone cracks the stones back to it, where a new word comes', () => {
    const L = fakeRuntime(21);
    const mode = new GreatSwampMode(L);
    mode.start();
    typeWord(L, mode);
    run(L, mode, 1);
    typeWord(L, mode);
    run(L, mode, 1);
    expect((mode as any).stones).toHaveLength(3);
    const f = L.core.focus()!;
    expect(L.core.type('x').kind).toBe('wrong');
    mode.onWrong(f);
    expect(L.core.focus()).toBeNull();
    run(L, mode, 4);
    expect((mode as any).stones).toHaveLength(1);
    expect(L.core.focus()).not.toBeNull();
    expect(mode.progress()).toBe(0);
  });

  it('a slip on the firm stone is only a slip', () => {
    const L = fakeRuntime(21);
    const mode = new GreatSwampMode(L);
    mode.start();
    const f = L.core.focus()!;
    L.core.type('x');
    mode.onWrong(f);
    expect(L.core.focus()).toBe(f);
  });
});

describe('crossroads', () => {
  it('after a leg signs grow; a slip inside a sign word makes it vanish, the last one starts again', () => {
    const L = fakeRuntime(16);
    const mode = new CrossroadsMode(L);
    mode.start();
    for (let i = 0; i < 3; i++) typeWord(L, mode);
    run(L, mode, 1);
    const signs = () => (mode as any).signs.filter((s: any) => s.gone === null);
    expect(signs()).toHaveLength(3);
    for (let left = 3; left > 1; left--) {
      const res = L.core.type('a');
      expect(res.kind).toBe('ok');
      L.core.type('x');
      mode.onWrong(L.core.locked);
      expect(signs()).toHaveLength(left - 1);
    }
    const last = signs()[0].tg;
    L.core.type('a');
    L.core.type('x');
    mode.onWrong(last);
    expect(signs()).toHaveLength(1);
    expect(last.typed).toBe(0);
    const slot = signs()[0].slot;
    typeWord(L, mode);
    run(L, mode, 2);
    expect((mode as any).slot).toBe(slot);
    expect((mode as any).heroX).toBeCloseTo((mode as any).slotX(slot));
  });

  it('a path changes the rest of the level', async () => {
    const { roadAfter, scaleAfter } = await import('./planet-roads');
    expect(roadAfter('short').len).toBe('short');
    expect(roadAfter('wide')).toMatchObject({ diff: 'easy', leg: 6 });
    expect(scaleAfter('teleport').words).toBeLessThan(scaleAfter('detour').words);
    expect(roadAfter('unknown', { len: 'long', time: 'slow', diff: 'hard' })).toMatchObject({ len: 'long', diff: 'hard' });
    expect(scaleAfter('unknown', { len: 'long', time: 'quick', diff: 'hard' }).time).toBeLessThan(1);
  });
});

describe('spells', () => {
  it('the fourth slip breaks the spell and it starts again from its first word', () => {
    const L = fakeRuntime(18);
    const mode = new SpellMode(L);
    mode.start();
    typeWord(L, mode);
    expect(mode.progress()).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) {
      const f = L.core.focus()!;
      L.core.type('x');
      mode.onWrong(f);
      expect(L.core.focus()).toBe(f);
    }
    const f = L.core.focus()!;
    L.core.type('x');
    mode.onWrong(f);
    expect(L.core.focus()).toBeNull();
    run(L, mode, 2);
    expect(mode.progress()).toBe(0);
    expect(L.core.focus()).not.toBeNull();
  });
});
