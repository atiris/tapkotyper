import { describe, expect, it, vi } from 'vitest';
import { TypingCore } from '../typing';
import { LEVELS, type LevelDef, levelById, type LevelKind, STORIES, copyTarget, grownCount, journeyLevel, levelOver, minActiveS, playedStep, shownProgress, storyOf } from '../levels';
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
const { CopyLoopMode } = await import('./copy-loop');
const { FlamesMode, ThicketMode, flockAfter } = await import('./dragons');
const { FlightMode, LullabyMode, TakeoffMode, shortenLine, takeoffPlan } = await import('./dragons-flight');
const { BouldersMode, MudMode, WindMode } = await import('./egg');
const { SpellRibbonMode } = await import('./egg-spell');
const { LaunchMode } = await import('./launch');

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
    share: () => 0.5,
    minLeft: 0,
    staying: false,
    letter: () => 'a',
    travelTime: () => 3,
    letterTime: 0.4,
    letterPace: 0.4,
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
  ['wind', WindMode], ['mud', MudMode], ['boulders', BouldersMode], ['spell', SpellRibbonMode],
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

/** Words a minute of the story's slow typist (`STORY_WPM` in levels). */
const WPM = [8, 10, 12];

/**
 * The fake runtime of a real level: the clock of active play, the minimum left, the bar and the
 * growing count work as in the game; `stretchMin` and `endMinimum` change the minimum.
 */
function levelRuntime(def: LevelDef): LevelRuntime & { clock: number; min: number } {
  const L = fakeRuntime(def.count) as LevelRuntime & { clock: number; min: number };
  const live = { clock: 0, min: minActiveS(def) };
  // Every word starts with its own letter, as targets on the stage do.
  let n = 0;
  const word = () => 'acegikmoqsuwy'[n++ % 13] + 'bdfh';
  Object.assign(L as object, { def, word, weakWord: word });
  return new Proxy(L, {
    get: (o, k) => {
      if (k === 'clock' || k === 'min') return live[k];
      if (k === 'playedS') return live.clock;
      if (k === 'minLeft') return Math.max(0, live.min - live.clock);
      if (k === 'share') return () => shownProgress(mode!.progress(), live.clock, live.min);
      if (k === 'stretchMin') return (f: number) => { live.min *= f; };
      if (k === 'endMinimum') return () => { live.min = Math.min(live.min, live.clock); };
      if (k === 'extendMin') return (s: number) => { live.min += s; };
      return (o as any)[k];
    },
    set: (o, k, v) => {
      if (k === 'clock' || k === 'min') live[k] = v;
      else (o as any)[k] = v;
      return true;
    },
  });
}
let mode: Mode | null = null;

interface Play {
  /** Seconds the level lasted, and its minimum then. */
  end: number;
  min: number;
  /** The longest stretch without a selectable target between the first and the last one, and where it began. */
  gap: number;
  gapAt: number;
  /** Seconds from the last target to the end (the mode's end scene). */
  tail: number;
  /** Seconds from the minimum to the end. */
  over: number;
  /** Words typed. */
  words: number;
}

/**
 * Plays a level: a letter every `letter` seconds, and a new word only `word` seconds after the
 * one before began; the count grows and the minimum's clock runs as in the runtime (`playedStep`).
 */
function play(def: LevelDef, Ctor: new (L: LevelRuntime) => Mode, letter: number, word: number, tick?: (L: LevelRuntime & { clock: number; min: number }) => boolean | void): Play {
  const L = levelRuntime(def);
  // The runtime fits a target's travel to the child's word pace; a slow child's targets wait near Tapko, so none is missed.
  Object.assign(L as object, { travelTime: () => Math.max(3, word * 1.5), noPressure: word > 0 });
  mode = new Ctor(L);
  mode.start();
  const dt = 0.05;
  let now = 0, keyAt = 0, next = 0, wordAt = 0, started: number | null = null, idleFrom: number | null = null, gap = 0, gapAt = 0, words = 0, minAt: number | null = null;
  while (now < 900 && !levelOver(mode.finished, L.clock, L.min)) {
    L.count = grownCount(L.count, mode.progress() * L.count, L.clock, Math.max(3, L.maxActive + 1), L.min);
    L.clock += playedStep(dt, now - keyAt, L.core.active.some((tg) => tg.selectable));
    now += dt;
    L.core.update(dt);
    mode.t += dt;
    mode.update(dt);
    // The tick may hold the child's typing for a while.
    const hold = tick?.(L) === true;
    if (minAt === null && L.clock >= L.min) minAt = L.clock;
    const f = L.core.focus() ?? L.core.active.find((tg) => tg.selectable && !tg.done) ?? null;
    if (f && started === null) started = L.clock;
    if (started !== null) {
      if (f && idleFrom !== null && L.clock - idleFrom > gap) {
        gap = L.clock - idleFrom;
        gapAt = idleFrom;
      }
      if (f) idleFrom = null;
      else idleFrom ??= L.clock;
    }
    if (hold || !f || now < next || (f.typed === 0 && now < wordAt)) continue;
    next = now + letter;
    keyAt = now;
    if (f.typed === 0) wordAt = now + word;
    const res = L.core.type(f.word[f.typed]);
    if (res.kind === 'done') {
      words++;
      mode.onDone(res.target);
    } else if (res.kind === 'ok') mode.onCorrect(res.target);
  }
  return { end: L.clock, min: L.min, gap, gapAt, tail: L.clock - (idleFrom ?? L.clock), over: L.clock - (minAt ?? L.clock), words };
}

/** The first story level of each kind (the valley's flights only count dragons, they are left out of the words). */
const KIND_LEVELS: [string, LevelDef][] = MODES.map(([kind]) => [kind, LEVELS.find((l) => l.kind === kind as LevelKind)!]);
const ctor = (kind: string) => MODES.find(([k]) => k === kind)![1];

/** Scripted moments with no target, longer than the 8 s a quick child may wait: none so far. */
const SCRIPTED: Partial<Record<string, string>> = {};

describe('every level keeps giving targets until both minimums are met', () => {
  it.each(KIND_LEVELS)('%s: a quick steady typist never waits long, and the level ends just after its minimum', (kind, def) => {
    const p = play(def, ctor(kind), 0.15, 0);
    if (!SCRIPTED[kind]) expect(p.gap, `waited from ${p.gapAt.toFixed(1)} s`).toBeLessThanOrEqual(8);
    expect(p.tail).toBeLessThanOrEqual(10);
    expect(p.end).toBeGreaterThanOrEqual(p.min);
    expect(p.over).toBeLessThan(15);
  });

  it.each(KIND_LEVELS.filter(([k]) => !['flight', 'lullaby', 'takeoff'].includes(k)))('%s: a slow typist at the pace of its story ends near the minimum', (kind, def) => {
    // A slow child's keys come evenly over the word (five letters), not in a burst and a wait.
    const word = 60 / WPM[STORIES.indexOf(storyOf(def.world))];
    const p = play(def, ctor(kind), word / 5, word);
    expect(p.end).toBeGreaterThanOrEqual(p.min);
    expect(p.end, `${p.words} words`).toBeLessThanOrEqual(p.min * 1.25);
  });
});

describe("every part of a hero's journey keeps giving targets until its share of the minimum is met", () => {
  const PARTS: [string, LevelDef][] = STORIES.flatMap((story) => story.worlds.map((_, i) => {
    const l = journeyLevel(story, i);
    return [`${story.id} ${i + 1}: ${l.kind}`, l] as [string, LevelDef];
  }));
  // The dragon story's take-off is the command game on the ground.
  const partCtor = (def: LevelDef) => (def.kind === 'command' && def.variant === 'journey' ? LaunchMode : ctor(def.kind));
  // The little dragon's lift follows the typing: the child types on.
  const typing = (def: LevelDef) => (def.kind === 'flight' ? (L: LevelRuntime) => void Object.assign(L, { idleFor: 0 }) : undefined);
  it.each(PARTS)('%s: a quick steady typist never waits long, and the part ends just after its minimum', (_name, def) => {
    const p = play(def, partCtor(def), 0.15, 0, typing(def));
    expect(p.gap, `waited from ${p.gapAt.toFixed(1)} s`).toBeLessThanOrEqual(8);
    expect(p.end).toBeGreaterThanOrEqual(p.min);
    expect(p.over).toBeLessThan(15);
  });

  it.each(PARTS)('%s: a slow typist at the pace of its story ends near its minimum', (_name, def) => {
    const word = 60 / WPM[STORIES.findIndex((s) => s.id === def.journey!.story)];
    const p = play(def, partCtor(def), word / 5, word, typing(def));
    expect(p.end).toBeGreaterThanOrEqual(p.min);
    // The dragon journey's flights, swamp and take-off have their own least count (two good flights, four sets, seven commands), which may take a slow child longer.
    if (def.variant !== 'journey' || !['flight', 'greatswamp', 'command'].includes(def.kind)) expect(p.end, `${p.words} words`).toBeLessThanOrEqual(p.min * 1.3);
  });
});

describe("the dragon story's hero's journey, part by part", () => {
  const part = (i: number) => journeyLevel(STORIES[0], i);

  it('down the mountain: a slip in a stone\'s word brings one more stone and its time, once a stone, at most seven', () => {
    const def = part(0);
    const L = levelRuntime(def);
    const m = new BouldersMode(L);
    m.start();
    const count = L.count, min = L.min;
    const stones = Array.from({ length: 9 }, (_, i) => L.core.add(`stone${i}`, {}));
    m.onWrong(stones[0]);
    m.onWrong(stones[0]);
    expect(L.count).toBe(count + 1);
    expect(L.min).toBeCloseTo(min + minActiveS(def) / def.count);
    for (const tg of stones) m.onWrong(tg);
    expect(L.count).toBe(count + 7);
    m.onWrong(null);
    expect(L.count).toBe(count + 7);
  });

  it('the crystal meadow: the rocket gets at least seven crystals; a second slip in a crystal\'s word cracks it', () => {
    const def = { ...part(2), count: 3 };
    play(def, CrystalsMode, 0.15, 0);
    expect((mode as any).collected).toBeGreaterThanOrEqual(7);
    const L = fakeRuntime(10);
    Object.assign(L, { def: { ...L.def, variant: 'journey' }, maxActive: 1 });
    const m = new CrystalsMode(L);
    m.start();
    run(L, m, 2);
    const crystal = (m as any).mounds.find((o: any) => o.crystal)?.crystal;
    m.onWrong(crystal.tg);
    expect(crystal.state).toBe('grow');
    m.onWrong(crystal.tg);
    expect(crystal.state).toBe('cracked');
  });

  it('the swamp: four sets of stones before the shore, the little dragon hovering above Tapko', () => {
    let hover = Infinity;
    play(part(3), GreatSwampMode, 0.15, 0, () => {
      const f = (mode as any).friendSpot();
      if (f.lift !== undefined) hover = Math.min(hover, f.lift);
    });
    expect((mode as any).jumps).toBeGreaterThanOrEqual(16);
    expect(hover).toBeGreaterThan(150);
  });

  it('the take-off: the rocket accepts at least seven commands before its countdown', () => {
    play(part(4), LaunchMode, 0.15, 0);
    expect((mode as any).steps).toBeGreaterThanOrEqual(7);
  });
});

describe('invitation', () => {
  it('a slip adds two words until the story ceiling of (1 + story order) x 3', async () => {
    const { slipWords } = await import('./kit/copy-row');
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
  it('two logs float there, at a third and past half, and words push them away; the shore comes only near both minimums', () => {
    const def = levelById('w3-5')!;
    const logsAt: number[] = [];
    let shoreAt = -1, pushes = 0;
    const p = play(def, GreatSwampMode, 0.15, 0, (L) => {
      const m = mode as any;
      if (m.log && logsAt.length === m.logsGone) {
        logsAt.push(L.share());
        pushes += m.log.pushes;
      }
      if (m.shore !== null && shoreAt < 0) shoreAt = L.clock;
    });
    expect(logsAt).toHaveLength(2);
    expect(logsAt[0]).toBeGreaterThanOrEqual(0.3);
    expect(logsAt[1]).toBeGreaterThanOrEqual(0.6);
    expect(pushes).toBeGreaterThanOrEqual(6);
    expect((mode as any).logsGone).toBe(2);
    expect(shoreAt).toBeGreaterThan(p.min - 15);
    expect(mode!.progress()).toBe(1);
  });

  it.each([['w3-1', SwampMode], ['w3-5', GreatSwampMode]] as const)('%s: a quick child meets two logs, a slow one at least one', (id, Ctor) => {
    const def = levelById(id)!;
    const word = 60 / WPM[STORIES.indexOf(storyOf(def.world))];
    for (const [letter, gap, logs] of [[0.15, 0, 2], [word / 5, word, 1]]) {
      play(def, Ctor, letter, gap);
      expect((mode as any).logsGone).toBeGreaterThanOrEqual(logs);
    }
  });

  it('a child who waits a minute at the log still meets the shore only near the minimum', () => {
    const def = levelById('w3-5')!;
    let frames = 0, shoreAt = -1;
    const p = play(def, GreatSwampMode, 0.15, 0, (L) => {
      const m = mode as any;
      if (m.shore !== null && shoreAt < 0) shoreAt = L.clock;
      // At the log's first word the child types nothing for sixty seconds (1200 frames of 0.05 s).
      if (!m.log?.tg || frames >= 1200) return;
      return ++frames < 1200;
    });
    expect(frames).toBe(1200);
    expect(shoreAt).toBeGreaterThan(p.min - 15);
    expect(p.over).toBeLessThan(15);
  });

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
    const { Catcher } = await import('./kit/catcher');
    const L = fakeRuntime();
    const look = { pic: 'obj-gloves', h: 72, lean: 0.55, at: [0.3, 0] as [number, number], fallback: () => {} };
    const slow = new Catcher(L, 100, 400, look), fast = new Catcher(L, 100, 400, look);
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
    // The first catch lights the pit; its fire grows with the level, never back.
    const pit = (mode as any).pit;
    expect(pit.litTo).toBe(1);
    expect(pit.growth).toBe(0.5);
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
    // Out of the bushes it walks on slowly, and the next dragon is already up.
    for (let i = 0; i < 200 && (mode as any).dragons[0].state === 'bush'; i++) run(L, mode, 0.05);
    run(L, mode, 1);
    expect((mode as any).dragons[0].state).toBe('walk');
    expect((mode as any).dragons[1].state).toBe('wait');
    expect(mode.progress()).toBeCloseTo(1 / 3);
    run(L, mode, 30);
    expect((mode as any).dragons[0].state).toBe('home');
    expect((mode as any).flown).toBe(0);
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

  it("on the hero's journey the little dragon flies alone to the pit and back; a failed flight is flown again and counts nothing", () => {
    const L = fakeRuntime(2);
    Object.assign(L, { def: { ...L.def, variant: 'journey' }, idleFor: 0, rhythm: { ema: 2, ratio: () => 1, ready: () => {} } });
    const mode = new FlightMode(L);
    mode.start();
    const d = (mode as any).dragons[0];
    expect((mode as any).dragons).toHaveLength(1);
    expect(mode.friendAway()).toBe(true);
    // A third slip ends the flight in the bushes: it walks back to its start and waits to fly the same way again.
    typeWord(L, mode);
    expect(d.state).toBe('fly');
    for (let i = 0; i < 3; i++) mode.onWrong(L.core.focus());
    run(L, mode, 12);
    expect(d.state).toBe('wait');
    expect(d.back).toBe(false);
    expect(mode.progress()).toBe(0);
    expect(mode.starCap()).toBe(3);
    // A good flight lands by the pit; the next one flies back to Tapko.
    typeWord(L, mode);
    for (let i = 0; i < 600 && (mode as any).flown < 1; i++) {
      if (L.core.focus()) typeWord(L, mode);
      run(L, mode, 0.05);
    }
    expect(mode.progress()).toBe(0.5);
    run(L, mode, 3);
    expect(d.state).toBe('wait');
    expect(d.back).toBe(true);
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

/** A wrong key on the word to type. */
function slip(L: LevelRuntime, mode: Mode): void {
  const f = L.core.focus()!;
  L.core.type('x');
  mode.onWrong(f);
}

describe('slips in a flight', () => {
  it('the second slip makes the dragon cry out and fly on, the third drops it into the bushes', () => {
    const L = fakeRuntime(3);
    const shouts: string[] = [];
    Object.assign(L, { idleFor: 0, rhythm: { ema: 2, ratio: () => 1, ready: () => {} }, shout: (s: string) => shouts.push(s) });
    const mode = new FlightMode(L);
    mode.start();
    expect((mode as any).bushes).toHaveLength(2);
    typeWord(L, mode);
    const d = (mode as any).dragons[0];
    slip(L, mode);
    expect(shouts).toHaveLength(0);
    slip(L, mode);
    expect(shouts).toHaveLength(1);
    expect(d.state).toBe('fly');
    slip(L, mode);
    expect(d.state).toBe('bush');
    run(L, mode, 30);
    expect(d.state).toBe('home');
    expect((mode as any).flown).toBe(0);
  });

  it('the third slip past the bushes ends in a hard landing that still counts as flown; the next dragon starts at 0', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { idleFor: 0, rhythm: { ema: 2, ratio: () => 1, ready: () => {} } });
    const mode = new FlightMode(L);
    mode.start();
    typeWord(L, mode);
    const d = (mode as any).dragons[0];
    const right = (mode as any).bushX(1) + 70;
    for (let i = 0; i < 600 && d.x <= right + 10; i++) run(L, mode, 0.05);
    for (let i = 0; i < 3; i++) slip(L, mode);
    expect(d.state).toBe('fall');
    run(L, mode, 20);
    expect(d.state).toBe('home');
    expect((mode as any).flown).toBe(1);
    expect((mode as any).dragons[1].slips).toBe(0);
  });

  it('a dragon lands upright at its flying size', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { idleFor: 0, rhythm: { ema: 2, ratio: () => 1, ready: () => {} } });
    const mode = new FlightMode(L);
    mode.start();
    typeWord(L, mode);
    const d = (mode as any).dragons[0];
    for (let i = 0; i < 1000 && d.state !== 'home'; i++) {
      if (L.core.focus()) typeWord(L, mode);
      run(L, mode, 0.05);
    }
    expect(d.state).toBe('home');
    expect(d.tilt).toBe(0);
  });
});

describe('the lullaby made easier', () => {
  it('a shortened line loses about its last quarter between words and keeps its period', () => {
    expect(shortenLine('Spi, dráčik môj malý.')).toBe('Spi, dráčik môj.');
    expect(shortenLine('Spi dráčik.')).toBe('Spi.');
    expect(shortenLine('Spi.')).toBe('Spi.');
    expect(shortenLine('one two three four five six seven eight')).toBe('one two three four five six');
  });

  it('every third slip in a line shortens it; the typed first line stays typed', () => {
    const L = fakeRuntime(3);
    Object.assign(L, { word: () => 'aa bb cc dd ee.' });
    const mode = new LullabyMode(L);
    mode.start();
    typeWord(L, mode);
    run(L, mode, 1);
    const lines = (mode as any).lines;
    for (let i = 0; i < 2; i++) {
      slip(L, mode);
      run(L, mode, 1);
    }
    expect(lines[1]).toBe('aa bb cc dd ee.');
    slip(L, mode);
    run(L, mode, 1);
    expect(lines[1]).toBe('aa bb cc dd.');
    expect(L.core.focus()?.word).toBe('aa bb cc dd.');
    for (let i = 0; i < 3; i++) {
      slip(L, mode);
      run(L, mode, 1);
    }
    expect(lines[1]).toBe('aa bb cc.');
    expect(lines[0]).toBe('aa bb cc dd ee.');
    expect((mode as any).verse).toBe(1);
    for (let i = 0; i < 30; i++) {
      slip(L, mode);
      run(L, mode, 1);
    }
    expect(lines[1]).toBe('aa.');
    typeWord(L, mode);
    expect((mode as any).asleep).toBe(1);
  });
});

describe('the dragons on the path', () => {
  it('wait past the room the slips may grow, so a slip never moves them; the minimum makes them hop back', () => {
    const L = fakeRuntime(1);
    Object.assign(L, { vw: 4000, reduceMotion: false });
    const mode = new ThicketMode(L);
    mode.start();
    run(L, mode, 0.05);
    const w = (mode as any).waiting, at = w.x;
    const lastBush = () => (mode as any).bushes.at(-1).x;
    expect(at).toBeGreaterThan(lastBush() + 6 * 300);
    for (let i = 0; i < 4; i++) {
      slip(L, mode);
      run(L, mode, 1);
    }
    expect(w.x).toBe(at);
    expect(lastBush()).toBeLessThan(at);
    // Bushes beyond the slips' room (the level's minimum) push the dragons on, with a hop in sight.
    L.count += 2;
    run(L, mode, 0.25);
    expect(w.x).toBeGreaterThan(at);
    run(L, mode, 1);
    expect(w.x).toBe((mode as any).waitX());
  });
});

describe('the egg mountain', () => {
  it('a rush adds two words and 15 s, at most ten words and 75 s', async () => {
    const { Detour } = await import('./kit/egg');
    const { RUSH_WORDS, WIND_MAX_WORDS } = await import('./egg');
    const d = new Detour(WIND_MAX_WORDS, 7.5);
    const adds = Array.from({ length: 7 }, () => d.add(RUSH_WORDS));
    expect(adds[0]).toEqual({ words: 2, seconds: 15 });
    expect(adds.reduce((a, b) => a + b.words, 0)).toBe(10);
    expect(adds.reduce((a, b) => a + b.seconds, 0)).toBe(75);
    expect(d.full).toBe(true);
  });

  it('a missed boulder adds 7 % of the planned words and minimum, at most 70 %', async () => {
    const { Detour } = await import('./kit/egg');
    const { STUMBLE_MAX, STUMBLE_SHARE } = await import('./egg');
    const words = 16, perWord = 120 / 16;
    const d = new Detour(STUMBLE_SHARE * STUMBLE_MAX * words, perWord);
    const adds = Array.from({ length: 12 }, () => d.add(STUMBLE_SHARE * words));
    expect(adds[0].seconds).toBeCloseTo(8.4);
    expect(adds.reduce((a, b) => a + b.seconds, 0)).toBeCloseTo(84);
    expect(adds.reduce((a, b) => a + b.words, 0)).toBe(11);
    expect(adds.slice(10).every((a) => a.words === 0 && a.seconds === 0)).toBe(true);
  });

  it('the spell and its frame share the right half, the right two thirds on a narrow stage, never over Tapko', async () => {
    const { spellArea } = await import('./egg-spell');
    expect(spellArea(1067)).toEqual({ x: 1067 / 2, w: 1067 / 2 - 30 });
    const narrow = spellArea(959);
    expect(narrow.x).toBeCloseTo(959 / 3);
    expect(narrow.x + narrow.w).toBe(929);
    expect(spellArea(781).x).toBeGreaterThan(781 / 3);
  });

  it('a slip in the spell starts the word again and adds one word after it, at most ten, and every word counts once', async () => {
    const { secondsPerWord } = await import('./kit/egg');
    const L = levelRuntime(levelById('w5-5')!);
    const m = new SpellRibbonMode(L);
    mode = m;
    m.start();
    m.update(2);
    const spell = (m as unknown as { ribbon: { words: { text: string }[]; at: number } }).ribbon;
    for (let i = 0; i < 3; i++) typeWord(L, m);
    expect(m.progress()).toBeCloseTo(3 / L.count);
    const count = L.count, min = L.min, perWord = secondsPerWord(L);
    const word = spell.words[3].text, next = spell.words[4].text;
    const slip = () => {
      L.core.type(L.core.focus()!.word[0]);
      const res = L.core.type('#');
      if (res.kind !== 'wrong') throw new Error('a wrong key');
      m.onWrong(res.target);
    };
    slip();
    // Nothing written is lost: the same word starts again, and a new one waits right after it.
    expect(spell.at).toBe(3);
    expect(L.core.focus()!.word).toBe(`${word} `);
    expect(L.core.focus()!.typed).toBe(0);
    expect(spell.words[4].text).not.toBe(next);
    expect(spell.words[5].text).toBe(next);
    expect(L.count).toBe(count + 1);
    expect(L.min).toBeCloseTo(min + perWord);
    expect(m.progress()).toBeCloseTo(3 / L.count);
    typeWord(L, m);
    expect(m.progress()).toBeCloseTo(4 / L.count);
    for (let i = 0; i < 12; i++) slip();
    expect(L.count).toBe(count + 10);
    expect(L.min).toBeCloseTo(min + 10 * perWord);
  });

  it('only the best path among three signs or more gets a countdown, when it is a quick one, and its time fits the child', async () => {
    const { quickSign, quickTime } = await import('./planet-roads');
    expect(quickSign(['plain', 'teleport', 'detour'])).toBe(1);
    expect(quickSign(['plain', 'short', 'detour'])).toBeNull();
    expect(quickSign(['plain', 'cablecar'])).toBeNull();
    expect(quickSign(['fast', 'cablecar', 'obstacles', 'left'])).toBe(1);
    expect(quickTime(10, 0.5)).toBeCloseTo(9.5);
    expect(quickTime(2, 0.3)).toBe(4);
  });

  it('a half typed best sign vanishes when its countdown runs out, and it is no mistake', () => {
    const L = levelRuntime(levelById('w5-3')!);
    const m = new CrossroadsMode(L);
    mode = m;
    m.start();
    for (let i = 0; i < 3; i++) typeWord(L, m);
    m.update(1);
    const signs = (m as unknown as { signs: { kind: string; tg: { word: string; gone: boolean }; clock: unknown }[] }).signs;
    expect(signs).toHaveLength(3);
    const quick = signs.find((s) => s.clock)!;
    expect(quick.kind).toBe('fast');
    L.core.type(quick.tg.word[0]);
    expect(L.core.locked).toBe(quick.tg);
    for (let i = 0; i < 400; i++) m.update(0.05);
    expect(quick.tg.gone).toBe(true);
    expect(L.core.locked).toBeNull();
    expect(L.core.missed).toBe(0);
    expect(signs.filter((s) => !s.tg.gone)).toHaveLength(2);
  });

  it('two slips in a mountain road word bring an easier word and a call to slow down; one slip does not', () => {
    const L = levelRuntime(levelById('w5-3')!);
    const shouts: string[] = [];
    Object.assign(L, { shout: (text: string) => shouts.push(text) });
    const m = new CrossroadsMode(L);
    mode = m;
    m.start();
    const current = () => (m as unknown as { current: { word: string; gone: boolean; typed: number } }).current;
    const first = current();
    const slip = () => {
      const tg = current();
      if (!tg.typed) L.core.type(tg.word[0]);
      L.core.type('#');
      m.onWrong(L.core.locked);
    };
    slip();
    expect(current()).toBe(first);
    slip();
    expect(first.gone).toBe(true);
    expect(current()).not.toBe(first);
    expect(shouts).toHaveLength(1);
    expect(L.core.missed).toBe(0);
  });

  it('pairs of boulders come for the slow child too', () => {
    const word = 60 / WPM[0];
    let pairs = 0;
    play(levelById('w5-4')!, BouldersMode, word / 5, word, (L) => {
      if (L.core.active.filter((tg) => tg.data.state === 'come').length >= 2) pairs++;
    });
    expect(pairs).toBeGreaterThan(0);
  });

  it('a word finished while the crawling puddle is under it brings three hard rounds, then he walks on', () => {
    type Mud = { hardLeft: number; hard: unknown; places: { tg: { selectable: boolean } | null }[]; muddy(): unknown };
    let hard = 0, waited = 0;
    const res = play(levelById('w5-2')!, MudMode, 0.02, 0, (L) => {
      const m = mode as unknown as Mud;
      if (m.hardLeft > 0) hard++;
      // The child waits with the first word until the puddle crawls under it.
      const first = m.places.find((p) => p.tg?.selectable);
      const wait = !hard && !m.hard && !!first && m.muddy() !== first && L.core.active.every((tg) => tg.typed === 0);
      if (wait) waited++;
      return wait;
    });
    expect(waited).toBeGreaterThan(0);
    expect(hard).toBeGreaterThan(0);
    expect(res.end).toBeGreaterThanOrEqual(res.min);
  });

  it('the mountain crossroads keeps giving targets at both paces', () => {
    const def = levelById('w5-3')!;
    const quick = play(def, CrossroadsMode, 0.15, 0);
    expect(quick.gap).toBeLessThanOrEqual(8);
    expect(quick.end).toBeGreaterThanOrEqual(quick.min);
    const word = 60 / WPM[0];
    const slow = play(def, CrossroadsMode, word / 5, word);
    expect(slow.end).toBeGreaterThanOrEqual(slow.min);
  });
});
