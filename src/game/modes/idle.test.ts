import { describe, expect, it, vi } from 'vitest';
import { TypingCore } from '../typing';
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
const { FirefliesMode, LastSongMode } = await import('./moonball');
const { NotesMode, TreeSongMode } = await import('./musictree');
const { RainMode, StormMode } = await import('./raintown');
const { RoomsMode, WelcomeMode } = await import('./robohome');
const { AsteroidMode, SpaceMode } = await import('./space');
const { BatteryMode, BeltMode } = await import('./workshop');
const { BoulderMode, SignsMode, SwampMode } = await import('./planet');
const { DoorsMode, GateMode } = await import('./robocity');
const { BudsMode, FlowerMode } = await import('./garden');
const { LiliesMode, ReflectionMode } = await import('./lilylake');
const { OwlMode } = await import('./forestpath');

/** A level runtime with just enough to run a mode: words are fixed, every other call does nothing. */
function fakeRuntime(count = 4): LevelRuntime {
  const base: Record<string, unknown> = {
    core: new TypingCore(),
    def: { count, variant: 'mix', index: 0, kind: 'x', world: 1 },
    vw: 1280,
    maxActive: 3,
    spawnGap: 0.5,
    noPressure: false,
    difficulty: 5,
    ema: 0.5,
    robot: null,
    toolAlpha: 1,
    rng: { pick: <T>(a: T[]) => a[0], range: (a: number) => a, chance: () => false, int: (a: number) => a, next: () => 0.5 },
    word: () => 'ab',
    travelTime: () => 3,
    friendSpot: () => ({ x: 120, y: 600 }),
    particles: { emit: () => {} },
    tweens: { add: () => {} },
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k as string] : () => {}) }) as unknown as LevelRuntime;
}

const MODES: [string, new (L: LevelRuntime) => Mode][] = [
  ['meadow', MeadowMode], ['hedgehog', HedgehogMode], ['space', SpaceMode], ['asteroid', AsteroidMode],
  ['swamp', SwampMode], ['signs', SignsMode], ['boulder', BoulderMode], ['shield', ShieldMode], ['wave', WaveMode],
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

describe('rain walk', () => {
  it('Bolt walks from the street start to the sun as the rain thins', async () => {
    const { rainWalkX } = await import('./raintown');
    expect(rainWalkX(1000, 0)).toBeLessThan(rainWalkX(1000, 0.5));
    expect(rainWalkX(1000, 0.5)).toBeLessThan(rainWalkX(1000, 1));
    expect(rainWalkX(1000, 2)).toBe(rainWalkX(1000, 1));
  });
});
