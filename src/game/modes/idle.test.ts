import { describe, expect, it, vi } from 'vitest';
import { TypingCore } from '../typing';
import { MIN_ACTIVE_S, grownCount, levelOver } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { Mode } from '../mode';

vi.mock('../../app/app', async () => {
  const { newProfile } = await import('../../storage/store');
  return { app: { profile: newProfile('Test', 'sk') }, pickLine: () => '' };
});

const { HedgehogMode, MeadowMode } = await import('./meadow');
const { PoppyMode, InvitationMode } = await import('./meadow-calm');
const { AsteroidMode, SpaceMode } = await import('./space');
const { CommandMode, HopMode } = await import('./space-calm');
const { GreatSwampMode, SwampMode } = await import('./planet');
const { CrystalsMode, SpellMode } = await import('./planet-crystals');
const { CrossroadsMode } = await import('./planet-roads');
const { CopyLoopMode, copyTarget } = await import('./copy-loop');
const { FlamesMode, ThicketMode, flockAfter } = await import('./dragons');
const { FlightMode, LullabyMode, TakeoffMode, takeoffPlan } = await import('./dragons-flight');

/** A level runtime with just enough to run a mode: words are fixed, every other call does nothing. */
function fakeRuntime(count = 4): LevelRuntime {
  const base: Record<string, unknown> = {
    core: new TypingCore(),
    def: { count, variant: 'mix', index: 0, kind: 'x', world: 3 },
    count,
    vw: 1280,
    stage: { scale: 1 },
    maxActive: 3,
    spawnGap: 0.5,
    noPressure: false,
    difficulty: 5,
    idleFor: 99,
    rhythm: { ema: 0.5, ratio: () => 0.3, ready: () => {} },
    robot: null,
    toolAlpha: 1,
    rng: { pick: <T>(a: T[]) => a[0], range: (a: number) => a, chance: () => false, int: (a: number) => a, next: () => 0.5, shuffle: <T>(a: T[]) => [...a] },
    word: () => 'ab',
    words: { knows: () => true },
    weakWord: () => 'ab',
    playedS: 0,
    minLeft: 0,
    staying: false,
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
  ['swamp', SwampMode], ['crystals', CrystalsMode], ['crossroads', CrossroadsMode], ['spells', SpellMode], ['greatswamp', GreatSwampMode], ['copyloop', CopyLoopMode],
  ['flames', FlamesMode], ['thicket', ThicketMode], ['flight', FlightMode], ['lullaby', LullabyMode], ['takeoff', TakeoffMode],
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

  it('the chosen sign spins and goes last; he walks there only after it', async () => {
    const { Tweens } = await import('../../engine/tween');
    const L = fakeRuntime(16);
    Object.assign(L, { tweens: new Tweens(), reduceMotion: false });
    const mode = new CrossroadsMode(L);
    mode.start();
    const tick = (s: number) => { for (let i = 0; i < s / 0.05; i++) { L.tweens.update(0.05); mode.update(0.05); } };
    for (let i = 0; i < 3; i++) {
      typeWord(L, mode);
      tick(1);
    }
    const sign = (mode as any).signs[0];
    const from = (mode as any).heroX;
    typeWord(L, mode);
    tick(1.2);
    expect((mode as any).signs).toContain(sign);
    expect(sign.spin).toBeGreaterThan(1);
    expect((mode as any).heroX).toBe(from);
    tick(3);
    expect((mode as any).signs).not.toContain(sign);
    expect((mode as any).heroX).toBeCloseTo((mode as any).slotX(sign.slot));
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
  it('the third slip breaks the spell and a new one starts', () => {
    const L = fakeRuntime(18);
    const mode = new SpellMode(L);
    mode.start();
    typeWord(L, mode);
    expect(mode.progress()).toBeGreaterThan(0);
    for (let i = 0; i < 2; i++) {
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

describe('cyclic copy', () => {
  it('words at levels 1-2, phrases at 3-4, a sentence at the super level once space and period are known', () => {
    expect([0, 1, 2, 3, 4].map((i) => copyTarget(i, true))).toEqual([
      { words: 1, min: 2 }, { words: 1, min: 2 }, { words: 3, min: 2 }, { words: 3, min: 2 }, { words: 5, min: 3 },
    ]);
    expect(copyTarget(4, false)).toEqual({ words: 3, min: 2 });
  });

  it('targets come without end until the time is played; a slip only counts; the target typed then is the last', () => {
    const L = fakeRuntime(4);
    Object.assign(L, { minLeft: 60 });
    const mode = new CopyLoopMode(L);
    mode.start();
    for (let i = 0; i < 6; i++) typeWord(L, mode);
    expect(L.core.focus()).not.toBeNull();
    const f = L.core.focus()!;
    expect(L.core.type('x').kind).toBe('wrong');
    mode.onWrong(f);
    expect(L.core.focus()).toBe(f);
    Object.assign(L, { minLeft: 0 });
    typeWord(L, mode);
    expect(L.core.focus()).toBeNull();
    expect(mode.progress()).toBe(1);
    expect(mode.finished).toBe(false);
    run(L, mode, 4);
    expect(mode.finished).toBe(true);
  });
});

describe('the catcher', () => {
  it('rests where it is put and reaches for a height, faster while it follows', async () => {
    const { Catcher } = await import('./meadow');
    const L = fakeRuntime();
    const slow = new Catcher(L, 100, 400), fast = new Catcher(L, 100, 400);
    expect(slow.catchPoint()[0]).toBeGreaterThan(100);
    slow.aimY = fast.aimY = 200;
    fast.follow = true;
    slow.update(0.05, 0);
    fast.update(0.05, 0);
    expect(fast.y).toBeLessThan(slow.y);
    expect(slow.y).toBeLessThan(400);
  });
});

describe('the valley', () => {
  it('a typed flame is caught in the torch and feeds the pit; a missed one goes out', () => {
    const L = fakeRuntime(2);
    const mode = new FlamesMode(L);
    mode.start();
    run(L, mode, 1);
    typeWord(L, mode);
    expect(mode.progress()).toBe(0.5);
    run(L, mode, 3);
    expect((mode as any).caught).toBe(1);
    expect((mode as any).pit.litTo).toBeCloseTo(1 / 3);
    run(L, mode, 10);
    expect(L.core.missed).toBeGreaterThan(0);
  });

  it('a slip on a bush grows two more ahead, at most three times; the same spell comes again', () => {
    const L = fakeRuntime(4);
    const mode = new ThicketMode(L);
    mode.start();
    for (let i = 0; i < 4; i++) {
      const f = L.core.focus()!;
      L.core.type('x');
      mode.onWrong(f);
      run(L, mode, 1);
      expect(L.core.focus()?.word).toBe(f.word);
    }
    expect(L.count).toBe(10);
    expect((mode as any).bushes).toHaveLength(10);
    typeWord(L, mode);
    expect(mode.progress()).toBeCloseTo(1 / 10);
  });

  it('a flight level starts with three dragons, gets one more while the minimum is not played, at most five', () => {
    expect(flockAfter(3, 2, 30)).toBe(3);
    expect(flockAfter(3, 3, 30)).toBe(4);
    expect(flockAfter(3, 3, 0)).toBe(3);
    expect(flockAfter(5, 5, 30)).toBe(5);
  });

  it('two lines put a dragon to sleep; the fifth asleep ends the lullaby even below the minimum', () => {
    const L = fakeRuntime(3);
    let ended = 0;
    Object.assign(L, { minLeft: 60, endMinimum: () => ended++ });
    const mode = new LullabyMode(L);
    mode.start();
    typeWord(L, mode);
    expect(mode.progress()).toBeCloseTo(1 / 6);
    expect((mode as any).asleep).toBe(0);
    run(L, mode, 2);
    for (let i = 1; i < 10; i++) {
      typeWord(L, mode);
      run(L, mode, 2);
    }
    expect(mode.progress()).toBe(1);
    expect(ended).toBe(1);
    expect(L.core.focus()).toBeNull();
    run(L, mode, 4);
    expect(mode.finished).toBe(true);
  });

  it('a lullaby line with a slip is written again', () => {
    const L = fakeRuntime(3);
    const mode = new LullabyMode(L);
    mode.start();
    const f = L.core.focus()!;
    L.core.type('x');
    mode.onWrong(f);
    run(L, mode, 1);
    expect(L.core.focus()?.word).toBe(f.word);
    expect(mode.progress()).toBe(0);
  });

  it('a dragon too low over the bushes lands in them and walks to the fire', () => {
    const L = fakeRuntime(3);
    const mode = new FlightMode(L);
    mode.start();
    typeWord(L, mode);
    for (let i = 0; i < 600 && (mode as any).dragons[0].state === 'fly'; i++) run(L, mode, 0.05);
    expect((mode as any).dragons[0].state).toBe('bush');
    run(L, mode, 30);
    expect((mode as any).dragons[0].state).toBe('home');
    expect((mode as any).flown).toBe(0);
    expect(mode.progress()).toBeCloseTo(1 / 3);
  });

  it('the take-off gets easier after the third and the sixth return of a dragon', () => {
    expect(takeoffPlan(true, 0)).toEqual({ sets: 3, words: [2, 3], time: 1, soft: false });
    expect(takeoffPlan(false, 0).sets).toBe(4);
    expect(takeoffPlan(false, 3)).toEqual({ sets: 3, words: [2, 3], time: 1.25, soft: false });
    expect(takeoffPlan(true, 6)).toEqual({ sets: 2, words: [2, 2], time: 1.25, soft: true });
  });

  it('a slip sends the dragon back; after six returns a slip only restarts the word', () => {
    const L = fakeRuntime(3);
    const mode = new TakeoffMode(L);
    mode.start();
    run(L, mode, 1);
    for (let i = 0; i < 6; i++) {
      liftOff(L, mode);
      const f = L.core.focus()!;
      L.core.type('x');
      mode.onWrong(f);
      expect(L.core.focus()).toBeNull();
      run(L, mode, 3);
    }
    expect((mode as any).dragons[0].returns).toBe(6);
    liftOff(L, mode);
    const f = L.core.focus()!;
    L.core.type('x');
    mode.onWrong(f);
    expect(L.core.focus()?.word).toBe(f.word);
  });
});

describe('staying a while in the valley', () => {
  it('another dragon always comes, so the lullaby has no end', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { staying: true });
    const mode = new LullabyMode(L);
    mode.start();
    for (let i = 0; i < 7; i++) {
      typeWord(L, mode);
      run(L, mode, 2);
    }
    expect(L.core.focus()).not.toBeNull();
    expect(mode.finished).toBe(false);
  });
});

describe('the torch', () => {
  it('tips over in an arc and hands a caught flame to the fire right of it, then stands up again', () => {
    const L = fakeRuntime(2);
    Object.assign(L, { reduceMotion: false });
    const mode = new FlamesMode(L);
    mode.start();
    run(L, mode, 1);
    typeWord(L, mode);
    const torch = (mode as any).torch, pit = (mode as any).pit;
    let reach = Infinity;
    for (let i = 0; i < 80; i++) {
      run(L, mode, 0.05);
      const [x, y] = torch.catchPoint();
      reach = Math.min(reach, Math.hypot(x - pit.x, y - (pit.top - 50)));
    }
    expect(reach).toBeLessThan(40);
    expect(torch.x).toBeLessThan(pit.x - 60);
    run(L, mode, 2);
    expect(Math.abs(torch.tilt)).toBeLessThan(0.05);
  });
});

describe('flying lessons', () => {
  it('a dragon that flew over the bushes and lost its rhythm falls and lands hard; it still counts as flown', () => {
    const L = fakeRuntime(3);
    let shouts = 0;
    Object.assign(L, { idleFor: 0, rhythm: { ema: 2, ratio: () => 1, ready: () => {} }, shout: () => shouts++ });
    const mode = new FlightMode(L);
    mode.start();
    typeWord(L, mode);
    const d = (mode as any).dragons[0];
    const right = (mode as any).bushX(1) + 70;
    for (let i = 0; i < 600 && d.x <= right + 10; i++) run(L, mode, 0.05);
    expect(d.state).toBe('fly');
    Object.assign(L, { idleFor: 99 });
    run(L, mode, 0.1);
    expect(d.state).toBe('fall');
    run(L, mode, 20);
    expect(d.state).toBe('home');
    expect((mode as any).flown).toBe(1);
    expect(shouts).toBe(1);
  });

  it('a pause in typing takes the lift away, and the stars count the flyers', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { idleFor: 0, rhythm: { ema: 2, ratio: () => 1, ready: () => {} } });
    const mode = new FlightMode(L);
    expect((mode as any).liftAim()).toBe(1);
    Object.assign(L, { idleFor: 2.2 });
    expect((mode as any).liftAim()).toBeCloseTo(0.5);
    Object.assign(mode as any, { done: 3, flown: 3 });
    expect(mode.starCap()).toBe(3);
    Object.assign(mode as any, { flown: 2 });
    expect(mode.starCap()).toBe(2);
    Object.assign(mode as any, { flown: 1 });
    expect(mode.starCap()).toBe(1);
  });
});

/** Types words until the take-off's dragon has lifted off. */
function liftOff(L: LevelRuntime, mode: Mode): void {
  for (let i = 0; i < 5 && (mode as any).flyer.state === 'ready'; i++) typeWord(L, mode);
}

describe('the take-off', () => {
  it('the dragon sits and no clock runs until its first set is typed; a slip then only starts the word again', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { errors: 0 });
    const mode = new TakeoffMode(L);
    mode.start();
    run(L, mode, 10);
    const d = (mode as any).dragons[0];
    expect(d.state).toBe('ready');
    expect(d.rot).toBe(0);
    expect((L as any).errors).toBe(0);
    const f = L.core.focus()!;
    L.core.type('x');
    mode.onWrong(f);
    expect(L.core.focus()?.word).toBe(f.word);
    expect(d.state).toBe('ready');
    liftOff(L, mode);
    expect(d.state).toBe('fly');
  });

  it('a word not typed in time counts as a mistake and sends the dragon back', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { errors: 0 });
    const mode = new TakeoffMode(L);
    mode.start();
    run(L, mode, 1);
    liftOff(L, mode);
    expect(L.core.focus()).not.toBeNull();
    run(L, mode, 2);
    expect((L as any).errors).toBe(1);
    expect((mode as any).dragons[0].state).toBe('back');
  });

  it('the dragon flies on smoothly as the letters are typed', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { idleFor: 0, rhythm: { ema: 2, ratio: () => 1, ready: () => {} } });
    const mode = new TakeoffMode(L);
    mode.start();
    run(L, mode, 1);
    liftOff(L, mode);
    run(L, mode, 0.5);
    const d = (mode as any).dragons[0], x0 = d.x;
    L.core.type(L.core.focus()!.word[0]);
    run(L, mode, 0.2);
    expect(d.x).toBeLessThan(x0);
    expect(d.rot).toBeLessThan(-0.3);
  });
});

describe('the overgrown path', () => {
  it('one big bush asks for two words', () => {
    const L = fakeRuntime(12);
    const words: number[] = [];
    Object.assign(L, { word: (_m?: number, w = 1) => { words.push(w); return w > 1 ? 'ab cd' : 'ab'; } });
    const mode = new ThicketMode(L);
    mode.start();
    const big = (mode as any).bushes.findIndex((b: any) => b.big);
    expect(big).toBe(7);
    for (let i = 0; i < big; i++) {
      typeWord(L, mode);
      run(L, mode, 2);
    }
    expect(L.core.focus()?.word).toBe('ab cd');
  });
});
