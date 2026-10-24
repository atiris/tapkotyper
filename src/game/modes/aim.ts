import { app } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import type { ParticleShape } from '../../engine/particles';
import { hasImage } from '../../gfx/assets';
import { drawSprite, type G, roundRect } from '../../gfx/draw';
import { t, tList } from '../../i18n/i18n';
import { SHIFT_L, SHIFT_R, SPACE, isKeyReady, keysAccuracy, notReadyKeys, recentAccuracy } from '../../learning/lessons';
import { hitsPic } from '../../ui/hud';
import { keyLabel } from '../../ui/keyboard-guide';
import { WORLDS } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { BURST_COLORS, Bags, type Burst, type Effect, type Eyes, STAY_WORLD_EVERY, THINGS, type Thing, type Tier, WORLD_THINGS, storyPool, tierOf, tierPoints, worldDue, worldThing } from './aim-things';
import { HeroMode } from './planet';

/** Seconds of play before the run ends with the throw in the air (staying a while has no end). */
export const AIM_SECONDS = 120;
/** Wrong keys in one flight before the projectile falls. */
export const FALL_ERRORS = 3;
/** How much lower the path runs after each wrong key. */
const SINK = 24;
/** How far the projectile drifts up off its path for each word not typed in time, and at most while the second half of a leg passes with its word untyped. */
const DRIFT = 40;
const LIVE_DRIFT = 30;
/** Target radius at no accuracy and at full accuracy. */
const BIG = 120;
const SMALL = 48;
/** Rings on the way; the target carries a word too. */
export const RINGS = 4;
/** Share of the path flown per second once the word of the next stop is typed, and while falling. */
const RUSH = 0.9;
const FALL_DRIFT = 0.09;
/** Words picked for one stop; the best fitting one wins. */
const CANDIDATES = 8;
const PAUSE_AFTER = 1.1;

/** The target's radius: big at low accuracy on the weak keys, smaller as it improves. */
export function targetRadius(accuracy: number): number {
  const a = Math.max(0, Math.min(1, accuracy));
  return BIG + (SMALL - BIG) * a;
}

/** Characters of a word that train these keys (a capital trains the Shifts, a space the space bar). */
export function weakCount(word: string, keys: string[]): number {
  const set = new Set(keys);
  return [...word].filter((c) => set.has(c.toLowerCase()) || (c === ' ' && set.has(SPACE)) || (c !== c.toLowerCase() && (set.has(SHIFT_L) || set.has(SHIFT_R)))).length;
}

/** Word lengths of one throw, ring by ring and the target last: from the shortest allowed to the longest, or one letter longer in the second half when both are the same. */
export function throwLengths([lo, hi]: [number, number], n = RINGS + 1): number[] {
  return Array.from({ length: n }, (_, i) => (hi > lo ? Math.round(lo + ((hi - lo) * i) / (n - 1)) : lo + (i >= n / 2 ? 1 : 0)));
}

/**
 * The word for a stop: never of the weak keys alone while another one is there, then the
 * closest to the length asked (its longest word), then the richest in the weak keys (the first one on a tie).
 */
export function pickWord(words: string[], keys: string[], len: number): string {
  const mixed = words.filter((w) => weakCount(w, keys) < [...w].length);
  const pool = mixed.length ? mixed : words;
  const off = (w: string) => Math.abs(Math.max(...w.split(' ').map((part) => part.length)) - len);
  const near = Math.min(...pool.map(off));
  return pool.filter((w) => off(w) === near).reduce((best, w) => (weakCount(w, keys) > weakCount(best, keys) ? w : best));
}

/** A ring on the way, or the target as the last stop. */
interface Stop {
  x: number;
  y: number;
  /** Where along the path it stands. */
  s: number;
  len: number;
  tg: Target | null;
  /** Its word is typed: the projectile hurries there. */
  typed: boolean;
  /** Seconds since the projectile passed it (0 = not yet). */
  passed: number;
  missed: boolean;
}

/** How an egg ends: it splats on the target, hatches there, or hatches in flight at ring 2. */
type EggEnd = 'splat' | 'hatch' | 'flight';

interface Flight {
  th: Thing;
  /** The picture of this throw (a thing may have several). */
  pic: string;
  /** The short word that throws it while Tapko still holds it. */
  launch: Target | null;
  stops: Stop[];
  /** 0 (Tapko's paw) .. 1 (the target), along the path. */
  s: number;
  /** Share of the path per second toward the next stop. */
  speed: number;
  /** The stop it flies to. */
  next: number;
  /** Wrong keys, and the words of rings not typed in time: both rate the hit lower. */
  errors: number;
  slips: number;
  sink: number;
  /** Where the leg to the next stop began; the drift of the words missed so far, and the drift shown now (negative = up). */
  from: number;
  drift: number;
  lift: number;
  /** 'ready' in Tapko's paw, 'fly' along the path, 'fall' after three wrong keys, 'hit' at the target, 'miss' past it (its word came too late). */
  phase: 'ready' | 'fly' | 'fall' | 'hit' | 'miss';
  /** Thrown within the base time (or while staying): its hit counts. */
  counts: boolean;
  /** Falling: the drop below the path and its speed, and whether it is on the ground; seconds since the hit or the landing. */
  drop: number;
  vy: number;
  landed: boolean;
  after: number;
  spin: number;
  egg: EggEnd | null;
  /** Seconds since the egg hatched in flight (0 = not hatched). */
  hatched: number;
  /** When the target says something before the hit: a second after the throw call, or at ring 1 or 2. */
  expect: 'call' | 'ring1' | 'ring2' | null;
  /** A streak line the target says once its hit line is gone. */
  then: string | null;
  /** Seconds since the throw. */
  flown: number;
  /** The last places of a thing with a paper trail. */
  trail: { x: number; y: number }[];
  smoke: number;
}

/** What stays at the target after a hit and plays its effect: a splat, a buzzing fly, a chick on the rim. */
interface Mark {
  th: Thing;
  pic: string;
  effect: Effect;
  dx: number;
  dy: number;
  age: number;
  /** A chick that just hatched on the target shows the cracked egg first. */
  cracked?: boolean;
  leave?: 'fly' | 'run';
  /** The boomerang is back in Tapko's paw. */
  back?: boolean;
}

/** The target's eyes while they peek out: up for the whole flight, then until `end` seconds after they came. */
interface EyesUp {
  mood: Eyes;
  age: number;
  end: number | null;
}

/** Chance of a line before the hit for things without lines of their own; share of bullseyes, and of near misses, with the thing's own line. */
const EXPECT_CHANCE = 0.25;
const OWN_HIT = 0.8;
const OWN_NEAR = 0.3;
/** A word pops out of the target at a hit once in this many throws, this far beyond its edge. */
const POP_EVERY: [number, number] = [2, 4];
const POP_OUT = 60;
/** Chances of the eyes: with a line before the hit, at a hit that wobbles the target, at a bullseye. */
const EYES_EXPECT = 0.6;
const EYES_DIZZY = 0.3;
const EYES_SQUEEZE = 0.15;
/** Seconds the eyes stay after the flight ended (or after a hit brought them up), and to rise or sink. */
const EYES_AFTER = 1.8;
const EYES_RISE = 0.3;
/** Seconds a line stays: per character, at least and at most (Tapko's calls are shorter); the next throw waits for the target's line this long at most. */
const LINE_PER_CHAR = 0.085;
const LINE_MIN = 2.2;
const LINE_MAX = 4.2;
const CALL_MAX = 3;
const LINE_HOLD = 2.4;
/** The common size of a thing in flight. */
const THING_SIZE = 46;
/** Seconds the cracked egg shows before the chick. */
const CRACK_TIME = 0.3;
const BOOMERANG_BACK = 0.9;
/** A throw's length until one is measured: it says whether the next one is the last. */
const THROW_GUESS = 14;
const CHICK = 'obj-aim-chick';
const CRACKED = 'obj-aim-egg-cracked';
const FRIED = 'obj-aim-fried-egg';
const BULB_LIT = 'obj-aim-bulb-lit';

const BURST_SHAPE: Record<Burst, ParticleShape> = {
  sparkle: 'sparkle', ketchup: 'dot', smoke: 'puff', stink: 'puff', dust: 'puff', sparks: 'sparkle', feathers: 'leaf',
  splash: 'dot', splinters: 'leaf', steam: 'puff', rain: 'dot', magic: 'sparkle',
};

/** The e2e and dev builds may pick the things (`?aimThing=<id>,<id>`, or `all` for every one in turn). */
function forcedThing(): string | null {
  if (!(import.meta.env.DEV || import.meta.env.MODE === 'e2e') || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get('aimThing');
}

/**
 * The target range of a world: a short word makes Tapko throw a funny thing at a target
 * through 4 rings; each ring and the target carry a word rich in the weak keys, longer toward
 * the target. The thing keeps flying; a ring passed before its word is typed rates the hit
 * lower, the target's word typed too late misses it. A wrong key makes it sink, three make it fall softly; the target shrinks as the
 * weak keys get more accurate. Tapko names what he throws, the target talks back. Hits within
 * the base time are counted. No stars.
 */
export class AimMode extends HeroMode {
  readonly world: string;
  readonly phraseWords: number;
  /** The keys trained, the ones still holding the next letters back, and their accuracy at the start. */
  readonly keys: string[];
  private held: string[];
  private readonly before: Map<string, number>;
  private flight: Flight | null = null;
  private time = 0;
  private radius: number;
  private shrink = 0;
  private marks: Mark[] = [];
  /** Hits on the target and in its middle, from throws within the base time (all of them while staying). */
  hits = 0;
  centers = 0;
  private hitsEl = hitsPic();
  private readonly bags: Bags;
  private throws = 0;
  /** The throw from which the next hit pops a word. */
  private popAt: number;
  /** The world's thing comes with the last throw of the base time (1) or the one before (2); while staying, with throw `worldAt`. */
  private readonly worldSlot: number;
  private worldAt: number;
  private worldThrown = false;
  /** World things hit in the middle during this run: they join the collection only when the run ends, not when it is left early. */
  private finds: string[] = [];
  /** Bullseyes in a row. */
  private streak = 0;
  private eyes: EyesUp | null = null;
  /** The throw the eyes last came up in. */
  private eyesThrow = -2;
  /** The target wobbles, stars circle over it, it flashes a color: seconds left of each. */
  private wobble = 0;
  private stars = 0;
  private flash: { color: string; t: number } | null = null;
  /** When the current throw began and how long the throws took on average. */
  private throwAt = 0;
  private throwTime = THROW_GUESS;
  private lastSaid = false;
  private readonly forced = forcedThing();

  constructor(L: LevelRuntime) {
    super(L);
    const p = app.profile!;
    this.world = WORLDS[L.def.world];
    this.keys = L.def.focus ?? [];
    this.held = notReadyKeys(p).filter((k) => this.keys.includes(k));
    this.before = new Map(this.keys.map((k) => [k, recentAccuracy(p.stats.keys[k])]));
    this.phraseWords = this.keys.includes(SPACE) ? 2 : 1;
    this.radius = targetRadius(this.accuracy);
    this.hitsEl.set(0, 0);
    this.bags = new Bags(L.rng);
    this.worldSlot = L.rng.chance(0.5) ? 1 : 2;
    this.worldAt = L.rng.int(...STAY_WORLD_EVERY);
    this.popAt = L.rng.int(...POP_EVERY);
  }

  /** The rules; with something in the collection, also how to swap the thing in the paw for one of it. */
  startLine(): string {
    const rules = t('aim.start', { keys: this.keys.map(keyLabel).join(' ') });
    return this.rare().length ? `${rules} ${t('aim.swapHint')}` : rules;
  }

  /** The rules stay up until the first throw. */
  startSeconds(): number {
    return 60;
  }

  rings(): HTMLElement[] {
    return [this.hitsEl.el];
  }

  /** Accuracy before and now of each trained key. */
  report(): { key: string; before: number; after: number }[] {
    const p = app.profile!;
    return this.keys.map((key) => ({ key, before: this.before.get(key) ?? 0, after: recentAccuracy(p.stats.keys[key]) }));
  }

  /** The keys still to train: the trained ones minus those that became ready during the run. */
  private get listed(): string[] {
    return this.keys.filter((k) => !this.graduated.includes(k));
  }

  /** The keys the words and the target size follow: the listed ones, all of them once none is left. */
  private get aimed(): string[] {
    return this.listed.length ? this.listed : this.keys;
  }

  private graduated: string[] = [];

  private get accuracy(): number {
    return keysAccuracy(app.profile!, this.aimed);
  }

  private get target(): { x: number; y: number } {
    return { x: this.L.vw * 0.86, y: VH * 0.46 };
  }

  private get hand(): { x: number; y: number } {
    return { x: this.heroX + 60, y: this.heroY - 120 };
  }

  /** The path from Tapko's paw to the target: a gentle arc. */
  private point(s: number): { x: number; y: number } {
    const a = this.hand, b = this.target;
    return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s - Math.sin(s * Math.PI) * VH * 0.12 };
  }

  start(): void {
    this.heroX = Math.max(110, this.L.vw * 0.12);
    this.heroY = VH * 0.82;
    this.throw();
  }

  /** The next line of a text list, never the same twice in a row; `{n}` gets the points. */
  private line(key: string, n?: number): string {
    const text = this.bags.next(key, tList(key));
    return n == null ? text : text.replace('{n}', String(n));
  }

  /** The target's line in a bubble left of it, below the flight path. */
  private targetSays(text: string): void {
    if (!text) return;
    const { x, y } = this.target, r = this.radius;
    this.L.speak('target', text, x - r - 24, VH * 0.71, x - r * 0.6, y + r * 0.6, Math.min(LINE_MAX, Math.max(LINE_MIN, text.length * LINE_PER_CHAR)), true);
  }

  /** Tapko's line in a small bubble above him. */
  private tapkoSays(text: string): void {
    if (!text) return;
    this.L.speak('tapko', text, this.heroX + 30, this.heroY - 225, this.heroX + 10, this.heroY - 172, Math.min(CALL_MAX, Math.max(LINE_MIN, text.length * LINE_PER_CHAR)));
  }

  /**
   * The next thing: the world's own one near the end of the base time (the last throw or the one
   * before), every few throws while staying; else the story pool in shuffled rounds.
   */
  private pickThing(): Thing {
    if (this.forced) {
      const ids = this.forced.split(',');
      const list = this.forced === 'all' ? THINGS.filter((th) => th.drawn || th.pics.some(hasImage)) : THINGS.filter((th) => ids.includes(th.id));
      if (list.length) return list[this.throws % list.length];
    }
    const own = worldThing(this.L.def.world);
    if (own && this.L.staying && this.throws + 1 >= this.worldAt) {
      this.worldAt = this.throws + 1 + this.L.rng.int(...STAY_WORLD_EVERY);
      return own;
    }
    if (own && !this.L.staying && !this.worldThrown && worldDue(AIM_SECONDS - this.time, this.throwTime, this.worldSlot)) {
      this.worldThrown = true;
      return own;
    }
    return this.bags.draw('things', storyPool(this.L.def.world));
  }

  /** The collected world things that can be thrown. */
  private rare(): Thing[] {
    const found = app.profile!.progress.rangeFinds;
    return WORLD_THINGS.filter((th) => found.includes(th.id) && th.pics.some(hasImage));
  }

  /** The thing of a throw: one of its pictures, and how an egg ends. */
  private dress(f: Flight, th: Thing): void {
    const pics = th.pics.filter(hasImage);
    const roll = this.L.rng.next();
    f.th = th;
    f.pic = this.L.rng.pick(pics.length ? pics : th.pics);
    f.egg = th.effect === 'egg' ? (roll < 0.5 ? 'splat' : roll < 0.75 ? 'hatch' : 'flight') : null;
  }

  /**
   * Enter swaps the thing in the paw for a random one of the collection while it waits for its
   * throw; the world's thing still to be found stays. False (the paws may take Enter) when there is
   * nothing to swap.
   */
  onEnter(): boolean {
    const f = this.flight;
    if (f?.phase !== 'ready') return false;
    const rare = this.rare().filter((th) => th !== f.th);
    if (!rare.length) return false;
    if (f.th.world != null && !app.profile!.progress.rangeFinds.includes(f.th.id)) return true;
    this.dress(f, this.L.rng.pick(rare));
    // The rules make room for Tapko's line.
    if (this.firstThrow) this.L.hideBubble();
    this.L.sfx('pop');
    this.tapkoSays(t('aim.swap', { name: t(`aim.things.${f.th.id}.name`) }));
    return true;
  }

  private throw(): void {
    const stops: Stop[] = throwLengths(app.profile!.settings.wordLen).map((len, i) => {
      const s = i < RINGS ? (i + 1) / (RINGS + 1) : 1;
      return { ...this.point(s), s, len, tg: null, typed: false, passed: 0, missed: false };
    });
    const th = this.pickThing();
    this.throws++;
    const f: Flight = {
      th, pic: '', launch: null, stops, s: 0, speed: 0, next: 0, errors: 0, slips: 0, sink: 0, from: 0, drift: 0, lift: 0,
      phase: 'ready', counts: false, drop: 0, vy: 0, landed: false, after: 0, spin: 0,
      egg: null, hatched: 0, expect: null, then: null, flown: 0, trail: [], smoke: 0,
    };
    this.dress(f, th);
    this.flight = f;
    this.throwAt = this.time;
    const len = stops[0].len;
    f.launch = this.L.core.add(pickWord(Array.from({ length: CANDIDATES }, () => this.L.word(len)), this.aimed, len), {});
    // The last throw of the base time: the next one would begin after it.
    if (!this.L.staying && !this.lastSaid && this.time < AIM_SECONDS && AIM_SECONDS - this.time < this.throwTime) {
      this.lastSaid = true;
      this.targetSays(this.line('aim.lines.last'));
    }
  }

  /** The launch word is typed: Tapko throws and names the thing, the first ring gets its word; the rules leave with the first throw. */
  private launch(f: Flight): void {
    f.phase = 'fly';
    f.launch = null;
    f.counts = this.L.staying || this.time < AIM_SECONDS;
    if (this.firstThrow) this.L.hideBubble();
    this.firstThrow = false;
    this.happy();
    if (!this.L.reduceMotion) this.L.tweens.add(0.4, (k) => (this.jump = k * 0.6), ease.linear, () => (this.jump = 0));
    this.L.sfx('whoosh');
    this.tapkoSays(this.line(`aim.things.${f.th.id}.launch`));
    if (this.L.rng.chance(f.th.expect ?? EXPECT_CHANCE)) f.expect = this.L.rng.pick(['call', 'ring1', 'ring2'] as const);
    this.arm(f);
  }

  private firstThrow = true;

  /** The next stop gets its word, and the projectile the speed to reach it in the word's travel time. */
  private arm(f: Flight): void {
    const stop = f.stops[f.next];
    const words = Array.from({ length: CANDIDATES }, () => this.L.word(stop.len));
    stop.tg = this.L.core.add(pickWord(words, this.aimed, stop.len), {});
    f.from = f.s;
    f.speed = (stop.s - f.s) / this.L.travelTime(stop.tg.word);
  }

  /** The drift it heads for: the missed words, plus a little more as the second half of the leg passes with its word still untyped (until then it heads for the next stop). */
  private liftGoal(f: Flight): number {
    const stop = f.stops[f.next];
    if (f.phase !== 'fly' || stop.typed || !stop.tg) return f.drift;
    const leg = Math.min(1, (f.s - f.from) / Math.max(0.001, stop.s - f.from));
    const left = 1 - stop.tg.typed / stop.tg.word.length;
    return f.drift - LIVE_DRIFT * Math.max(0, leg * 2 - 1) * left;
  }

  /** The projectile reached its next stop: through the ring (or past it, too late: the hit gets lower), or at the target (missed when its word came too late). */
  private reach(f: Flight): void {
    const stop = f.stops[f.next];
    if (!stop.typed) {
      stop.missed = true;
      f.slips++;
      f.drift -= DRIFT;
      if (stop.tg) this.L.core.release(stop.tg);
      stop.tg = null;
    }
    if (f.next === f.stops.length - 1) return stop.missed ? this.miss(f) : this.hit(f);
    stop.passed = 0.0001;
    if (stop.typed) this.L.particles.emit(stop.x, stop.y, 10, 'sparkle', ['#bfe8ff', '#ffffff', '#ffd1f5'], 140, 7);
    if ((f.next === 0 && f.expect === 'ring1') || (f.next === 1 && f.expect === 'ring2')) this.expectLine(f);
    if (f.next === 1 && f.egg === 'flight') this.hatchInFlight(f);
    f.next++;
    this.arm(f);
  }

  /** The target reacts to what flies at it: its own lines, else worry, wonder or a cheer; now and then the eyes peek out. */
  private expectLine(f: Flight): void {
    f.expect = null;
    let mood: Eyes;
    if (f.th.expect != null) {
      this.targetSays(this.line(`aim.things.${f.th.id}.expect`));
      mood = f.th.eyes ?? 'worry';
    } else {
      const kind = this.L.rng.pick(['Worry', 'Wonder', 'Cheer'] as const);
      this.targetSays(this.line(`aim.lines.expect${kind}`));
      mood = kind === 'Worry' ? 'worry' : kind === 'Wonder' ? 'wide' : 'happy';
    }
    if (this.L.rng.chance(EYES_EXPECT)) this.eyesUp(mood);
  }

  /** The eyes pop up: at most once a throw, never two throws in a row; in flight they stay until it ends. */
  private eyesUp(mood: Eyes): void {
    if (this.eyesThrow >= this.throws - 1) return;
    this.eyesThrow = this.throws;
    this.eyes = { mood, age: 0, end: this.flight?.phase === 'fly' ? null : EYES_AFTER };
  }

  /** The flight ended: eyes that are up react to it and go a while later. */
  private eyesReact(mood: Eyes): void {
    if (!this.eyes) return;
    this.eyes.mood = mood;
    this.eyes.end = this.eyes.age + EYES_AFTER;
  }

  /** The egg cracks at ring 2 and the chick flies on. */
  private hatchInFlight(f: Flight): void {
    f.hatched = 0.0001;
    this.L.sfx('crack');
    const p = this.point(f.s);
    this.L.particles.emit(p.x, p.y + f.sink + f.lift, 8, 'dot', ['#fff3dc', '#ebd9b8'], 90, 6);
    this.tapkoSays(this.line('aim.things.egg.hatchedCall'));
  }

  update(dt: number): void {
    super.update(dt);
    this.time += dt;
    this.scroll += dt * 4;
    this.radius += (targetRadius(this.accuracy) - this.radius) * Math.min(1, dt * 3);
    this.hitsEl.set(this.hits, this.progress());
    this.shrink = Math.max(0, this.shrink - dt);
    this.wobble = Math.max(0, this.wobble - dt);
    this.stars = Math.max(0, this.stars - dt);
    if (this.flash && (this.flash.t -= dt) <= 0) this.flash = null;
    if (this.eyes && (this.eyes.age += dt) >= (this.eyes.end ?? Infinity)) this.eyes = null;
    for (const m of this.marks) {
      m.age += dt;
      if (m.effect === 'boomerang' && !m.back && m.age >= BOOMERANG_BACK) {
        m.back = true;
        this.happy();
        this.tapkoSays(this.line('aim.things.boomerang.caught'));
      }
    }
    this.marks = this.marks.filter((m) => m.age < markLife(m));
    const f = this.flight;
    if (!f || f.phase === 'ready') return;
    if (!f.landed && !f.th.spin) f.spin += dt * 3;
    if (f.hatched) f.hatched += dt;
    f.lift += (this.liftGoal(f) - f.lift) * Math.min(1, dt * 4);
    for (const r of f.stops) if (r.passed) r.passed += dt;
    if (f.phase === 'fly') {
      f.flown += dt;
      if (f.expect === 'call' && f.flown >= 1) this.expectLine(f);
      const stop = f.stops[f.next];
      f.s = Math.min(stop.s, f.s + (stop.typed ? Math.max(RUSH, f.speed) : f.speed) * dt);
      this.trail(f, dt);
      if (f.s >= stop.s) this.reach(f);
    } else if (f.phase === 'fall') {
      if (!f.landed) {
        f.s = Math.min(1, f.s + FALL_DRIFT * dt);
        const ground = VH * 0.9 - this.point(f.s).y - f.sink - f.lift;
        f.vy += 900 * dt;
        f.drop = Math.min(ground, f.drop + f.vy * dt);
        if (f.drop >= ground) this.land(f);
      } else if ((f.after += dt) >= PAUSE_AFTER && !this.L.speaking('target', LINE_HOLD)) this.done1();
    } else if (f.then) {
      f.after += dt;
      if (!this.L.speaking('target')) this.targetSays(f.then), (f.then = null);
    } else if ((f.after += dt) >= PAUSE_AFTER && !this.L.speaking('target', LINE_HOLD)) this.done1();
    this.L.core.prune();
  }

  /** A paper ribbon or a smoke trail behind the thing. */
  private trail(f: Flight, dt: number): void {
    if (!f.th.trail) return;
    const p = this.point(f.s), at = { x: p.x, y: p.y + f.sink + f.lift };
    if (f.th.trail === 'paper') {
      f.trail.push(at);
      if (f.trail.length > 16) f.trail.shift();
    } else if ((f.smoke += dt) >= 0.06) {
      f.smoke = 0;
      this.L.particles.emit(at.x - 20, at.y + 6, 1, 'puff', BURST_COLORS.smoke, 20, 12, 0.7);
    }
  }

  /** The throw is over (hit or fallen) and the target's line has been up a while; the next one comes until the time is up, or always while staying. */
  private done1(): void {
    this.flight = null;
    this.throwTime = (this.throwTime + (this.time - this.throwAt)) / 2;
    if (this.L.staying || this.time < AIM_SECONDS) this.throw();
  }

  /** A word came too late, so it drifted off: the projectile whizzes past behind the board; no harm, just no hit. */
  private miss(f: Flight): void {
    f.phase = 'miss';
    this.streak = 0;
    this.L.sfx('whoosh');
    this.targetSays(this.line('aim.lines.miss'));
    this.eyesReact('happy');
  }

  /** At the target (its word came in time): the middle without wrong keys or late words, else lower on the rings; the target says how good it was. */
  private hit(f: Flight): void {
    f.phase = 'hit';
    const tg = this.target, th = f.th;
    const tier = tierOf(f.errors + f.slips), center = tier === 'center';
    if (f.counts) {
      this.hits++;
      if (center) this.centers++;
    }
    const side = this.L.rng.chance(0.5) ? 1 : -1;
    const dx = center ? 0 : side * this.L.rng.range(0.5, 0.75) * this.radius;
    const dy = center ? 0 : Math.max(-1, Math.min(1, (f.sink + f.lift) / (SINK * FALL_ERRORS))) * this.radius * 0.6;
    // An egg: hatched on the way, hatching on the target (only in the middle), or a splat.
    let effect = th.effect, pic = f.pic, own = `aim.things.${th.id}.hit`, sound: string | null = `aim.things.${th.id}.sound`, sfx = th.sfx;
    const mark: Mark = { th, pic, effect, dx, dy, age: 0 };
    if (th.effect === 'egg') {
      if (f.hatched) Object.assign(mark, { effect: 'top', pic: CHICK, leave: 'run' }), own = 'aim.things.egg.hatchFlight', sound = null, sfx = 'squeak';
      else if (center && f.egg === 'hatch') Object.assign(mark, { effect: 'top', pic: CHICK, leave: 'run', cracked: true }), own = 'aim.things.egg.hatch', sound = 'aim.things.egg.hatchSound', sfx = 'crack';
      else Object.assign(mark, { effect: 'splat', pic: FRIED });
      effect = mark.effect;
      pic = mark.pic;
    }
    if (effect === 'top' && !mark.leave) mark.leave = th.leave;
    this.marks.push(mark);
    this.L.sfx(sfx);
    const burst = th.burst ?? 'sparkle';
    this.L.particles.emit(tg.x + dx, tg.y + dy, center ? 28 : 14, BURST_SHAPE[burst], BURST_COLORS[burst], 180, 8);
    if (effect === 'burst') this.L.particles.emit(tg.x + dx, tg.y + dy, 12, 'puff', ['#ffffff', '#f2f2f2'], 120, 16);
    this.pop(sound);
    if (th.wobble) this.wobble = 1;
    if (th.stars) this.stars = 1.5;
    if (th.flash) this.flash = { color: th.flash, t: 0.8 };
    if (this.eyes) this.eyesReact(th.wobble ? 'dizzy' : center ? 'squeeze' : 'wide');
    else if (th.wobble && this.L.rng.chance(EYES_DIZZY)) this.eyesUp('dizzy');
    else if (center && this.L.rng.chance(EYES_SQUEEZE)) this.eyesUp('squeeze');
    this.targetSays(this.hitLine(f, tier, own));
    if (center && f.counts && th.world != null) this.find(th);
    this.happy();
    this.L.setMood('happy', 1.2);
  }

  /**
   * The target's line for a hit: mostly the thing's own line in the middle, now and then one a near miss, else a common
   * one with the points; a third and a fifth bullseye in a row add a streak line after it.
   */
  private hitLine(f: Flight, tier: Tier, own: string): string {
    if (tier !== 'center') this.streak = 0;
    else if (++this.streak === 3 || this.streak === 5) f.then = this.line(`aim.lines.streak${this.streak}`);
    const ownChance = tier === 'center' ? OWN_HIT : tier === 'one' ? OWN_NEAR : 0;
    if (tList(own).length && this.L.rng.chance(ownChance)) return this.line(own);
    return tier === 'center' ? this.line('aim.lines.center') : this.line(`aim.lines.${tier}`, tierPoints(tier, this.L.rng));
  }

  /** A world thing hit in the middle for the first time: it joins the collection when the run ends. */
  private find(th: Thing): void {
    if (app.profile!.progress.rangeFinds.includes(th.id) || this.finds.includes(th.id)) return;
    this.finds.push(th.id);
    this.L.sfx('reward');
    this.tapkoSays(t('aim.collection.new'));
  }

  /**
   * Once in a few throws a word pops out of the hit target (the thing's own sound or a general one), in a
   * random direction over its top-left side: from toward the top-right corner round to toward the bottom-left one.
   */
  private pop(sound: string | null): void {
    if (this.throws < this.popAt) return;
    this.popAt = this.throws + this.L.rng.int(...POP_EVERY);
    const { x, y } = this.target, d = this.radius + POP_OUT;
    // Screen angles (y down): the top-right corner lies above (negative), the bottom-left one past the left (below pi).
    const a = this.L.rng.range(Math.atan2(VH - y, -x) - 2 * Math.PI, Math.atan2(-y, this.L.vw - x));
    const words = [...(sound ? tList(sound) : []), ...tList('aim.lines.pop')];
    this.L.shout(this.bags.draw(`pop ${sound}`, words), x + Math.cos(a) * d, y + Math.sin(a) * d);
  }

  /** The run ended (not left early): what was found joins the collection; the runtime saves the profile. */
  onFinish(): void {
    app.profile!.progress.rangeFinds.push(...this.finds);
    this.finds = [];
  }

  private land(f: Flight): void {
    f.landed = true;
    this.streak = 0;
    this.L.sfx('plop');
    const p = this.point(f.s);
    this.L.particles.emit(p.x, VH * 0.9, 8, 'puff', ['#ffffff', '#e8e2d6'], 80, 10, 0.6);
    this.targetSays(this.line('aim.lines.fall'));
    this.eyesReact('happy');
  }

  onDone(tg: Target): void {
    const f = this.flight;
    if (f?.phase === 'ready' && f.launch === tg) this.launch(f);
    if (!f || f.phase !== 'fly') return;
    const stop = f.stops[f.next];
    if (stop.tg !== tg) return;
    stop.typed = true;
    stop.tg = null;
    this.checkReady();
  }

  onCorrect(): void {
    this.checkReady();
  }

  onWrong(): void {
    super.onWrong();
    const f = this.flight;
    if (f?.phase === 'fly') {
      f.errors++;
      f.sink += SINK;
      if (f.errors >= FALL_ERRORS) {
        f.phase = 'fall';
        const stop = f.stops[f.next];
        if (stop.tg) this.L.core.release(stop.tg, false);
        stop.tg = null;
      }
    }
  }

  /** A weak key that became ready leaves the list: the target shrinks (it steps back), says so, and Tapko cheers. */
  private checkReady(): void {
    const p = app.profile!;
    const ready = this.held.filter((k) => isKeyReady(p, k));
    if (ready.length) {
      this.held = this.held.filter((k) => !ready.includes(k));
      this.graduated.push(...ready);
      this.shrink = 0.6;
      this.L.hooray();
      this.L.say(t('aim.ready', { keys: ready.map(keyLabel).join(', ') }), 3);
      this.targetSays(this.line('aim.lines.shrink'));
    }
  }

  render(g: G): void {
    const f = this.flight;
    if (f?.phase === 'miss') {
      const k = Math.min(1, f.after / PAUSE_AFTER), tg = this.target;
      this.drawThing(g, f.th, this.flightPic(f), tg.x + k * this.L.vw * 0.3, tg.y + f.lift + k * 40, THING_SIZE * (f.th.scale ?? 1), f.th.spin ? 0 : f.spin, 1 - k);
    }
    this.drawTarget(g);
    if (f) {
      f.stops.slice(0, RINGS).forEach((r, i) => this.drawRing(g, r, i === f.next && f.phase === 'fly'));
      const last = f.stops[RINGS];
      if (last.tg) this.L.label(g, last.tg, last.x, last.y - this.radius - 34, 38);
      if (f.launch) this.L.label(g, f.launch, this.hand.x, this.hand.y - 70, 38);
      if (f.phase !== 'hit' && f.phase !== 'miss') this.drawProjectile(g, f);
    }
    this.drawHero(g);
    // The boomerang flies back over everything into Tapko's paw.
    for (const m of this.marks) if (m.effect === 'boomerang') this.drawBoomerang(g, m);
  }

  private drawTarget(g: G): void {
    const { x, y } = this.target;
    // A little squash while it shrinks after a weak key got ready.
    const k = this.shrink > 0 && !this.L.reduceMotion ? 1 + Math.sin((0.6 - this.shrink) / 0.6 * Math.PI) * 0.12 : 1;
    const r = this.radius * k;
    this.drawStand(g, x, y, r);
    this.drawEyes(g, x, y, r);
    const rot = this.wobble && !this.L.reduceMotion ? Math.sin(this.wobble * 22) * 0.12 * this.wobble : 0;
    drawSprite(g, 'obj-aim-target', x, y, r * 2, { rot }, (c, w) => {
      const rr = w / 2;
      ['#e5534b', '#fffdf6', '#e5534b', '#fffdf6', '#f5c542'].forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(0, 0, rr * (1 - i * 0.2), 0, Math.PI * 2);
        c.fill();
      });
      c.strokeStyle = 'rgba(90,61,43,0.6)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, rr, 0, Math.PI * 2);
      c.stroke();
    });
    if (this.flash) {
      g.save();
      g.globalAlpha = 0.5 * (this.flash.t / 0.8);
      g.fillStyle = this.flash.color;
      g.beginPath();
      g.arc(x, y, r * 0.96, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    for (const m of this.marks) this.drawMark(g, m, x, y, r);
    if (this.stars) this.drawStars(g, x, y - r - 16, r);
  }

  /** Three little stars circle over a dizzy target. */
  private drawStars(g: G, x: number, y: number, r: number): void {
    g.save();
    g.globalAlpha = Math.min(1, this.stars / 0.3);
    g.fillStyle = '#ffd25a';
    g.strokeStyle = '#5a3d2b';
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = (this.L.reduceMotion ? 0 : this.t * 4) + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * r * 0.5, sy = y + Math.sin(a) * 8;
      g.beginPath();
      for (let j = 0; j < 10; j++) {
        const rr = j % 2 ? 4 : 10, b = (j / 10) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(sx + Math.cos(b) * rr, sy + Math.sin(b) * rr);
      }
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.restore();
  }

  /**
   * Two cartoon eyes peek out over the board's top rim (drawn behind it), follow the thing in
   * flight and blink once; worried, wide, happy, dizzy, or squeezed shut and then smiling.
   */
  private drawEyes(g: G, x: number, y: number, r: number): void {
    const e = this.eyes;
    if (!e) return;
    const rise = this.L.reduceMotion ? 1 : e.age < EYES_RISE ? ease.outBack(e.age / EYES_RISE) : Math.min(1, ((e.end ?? Infinity) - e.age) / EYES_RISE);
    const er = Math.max(14, r * 0.24);
    const ey = y - r * 0.8 + er * 0.9 - rise * er * 1.6;
    const f = this.flight;
    const p = f && (f.phase === 'fly' || f.phase === 'fall') ? this.point(f.s) : null;
    const thing = p && f ? { x: p.x, y: p.y + f.sink + f.lift + f.drop } : null;
    // A blink now and then; worried or glad eyes go wide as the thing comes close; squeezed ones smile after a moment.
    const blink = e.age % 2.6 > 1 && e.age % 2.6 < 1.12;
    const close = f?.phase === 'fly' && f.s > 0.82 && (e.mood === 'worry' || e.mood === 'happy');
    const mood = e.mood === 'squeeze' && e.end != null && e.age > e.end - EYES_AFTER + 0.6 ? 'happy' : close ? 'wide' : e.mood;
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = '#5a3d2b';
    for (const s of [-1, 1]) {
      const ex = x + s * er * 1.2;
      g.lineWidth = Math.max(2.5, er * 0.22);
      if (mood === 'happy') {
        g.beginPath();
        g.arc(ex, ey + er * 0.3, er * 0.7, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
        continue;
      }
      if (mood === 'squeeze') {
        g.beginPath();
        g.moveTo(ex - s * er * 0.6, ey - er * 0.5);
        g.lineTo(ex + s * er * 0.4, ey);
        g.lineTo(ex - s * er * 0.6, ey + er * 0.5);
        g.stroke();
        continue;
      }
      const wide = mood === 'wide' ? 1.15 : 1;
      g.fillStyle = '#ffffff';
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(ex, ey, er * 0.85 * wide, er * wide, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (blink && mood !== 'dizzy') {
        g.beginPath();
        g.moveTo(ex - er * 0.8, ey);
        g.lineTo(ex + er * 0.8, ey);
        g.stroke();
      } else if (mood === 'dizzy') {
        g.lineWidth = 2;
        g.beginPath();
        const turn = this.L.reduceMotion ? 0 : this.t * 8 * s;
        for (let i = 0; i < 24; i++) {
          const a = turn + i * 0.5, rr = (i / 24) * er * 0.7;
          g.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
        }
        g.stroke();
      } else {
        // The pupils look at the thing in flight, else ahead to the left.
        const dx = thing ? thing.x - ex : -1, dy = thing ? thing.y - ey : 0, d = Math.hypot(dx, dy) || 1;
        const pr = er * (mood === 'wide' ? 0.3 : 0.42), reach = er * 0.35;
        g.fillStyle = '#3b2a1e';
        g.beginPath();
        g.arc(ex + (dx / d) * reach, ey + (dy / d) * reach, pr, 0, Math.PI * 2);
        g.fill();
      }
      if (mood === 'worry') {
        // Brows raised toward the middle.
        g.lineWidth = Math.max(2.5, er * 0.2);
        g.beginPath();
        g.moveTo(ex + s * er * 0.8, ey - er * 1.2);
        g.lineTo(ex - s * er * 0.5, ey - er * 1.55);
        g.stroke();
      }
    }
    g.restore();
  }

  /** A wooden easel under the board: two splayed legs, a back leg and a crossbar, with a soft shadow. */
  private drawStand(g: G, x: number, y: number, r: number): void {
    const ground = VH * 0.9, spread = Math.max(36, r * 0.75), bar = y + (ground - y) * 0.6;
    const along = (k: number) => spread * ((bar - y) / (ground - y)) * k;
    const back: [number, number, number, number] = [x, y, x + spread * 0.3, ground - 6];
    const parts: [number, number, number, number][] = [[x - 4, y, x - spread, ground], [x + 4, y, x + spread, ground], [x - along(1), bar, x + along(1), bar]];
    g.save();
    g.fillStyle = 'rgba(60, 40, 20, 0.15)';
    g.beginPath();
    g.ellipse(x, ground + 2, spread * 1.25, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.lineCap = 'round';
    const pass = (list: [number, number, number, number][], width: number, color: string) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      for (const [x1, y1, x2, y2] of list) {
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
    };
    pass([back], 13, '#5a3d2b');
    pass([back], 8, '#8a5e36');
    pass(parts, 15, '#5a3d2b');
    pass(parts, 10, '#b07a45');
    // A lighter grain line along each front leg.
    g.globalAlpha = 0.45;
    pass(parts.slice(0, 2).map(([x1, y1, x2, y2]) => [x1 - 2, y1 + 8, x2 - 2, y2 - 6]), 2.5, '#d9a36a');
    g.restore();
  }

  /** What a hit left at the target, playing its effect. */
  private drawMark(g: G, m: Mark, x: number, y: number, r: number): void {
    const mx = x + m.dx, my = y + m.dy, size = 40 * (m.th.scale ?? 1), still = this.L.reduceMotion;
    const left = markLife(m) - m.age, fade = Math.min(1, left / 0.4);
    const hold = m.th.hold ?? 1;
    switch (m.effect) {
      case 'splat': {
        const a = Math.min(1, left / 1.5);
        if (m.pic === FRIED) return this.drawThing(g, m.th, FRIED, mx, my, 56 * Math.min(1, 0.4 + m.age * 6), 0, a);
        g.save();
        g.globalAlpha = a;
        g.fillStyle = '#d9412f';
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const b = (i / 10) * Math.PI * 2, rr = (i % 2 ? 16 : 28) * Math.min(1, m.age * 8);
          g.lineTo(mx + Math.cos(b) * rr, my + Math.sin(b) * rr);
        }
        g.fill();
        g.restore();
        return;
      }
      case 'stick': {
        const j = still ? 0 : m.th.jitter === 'buzz' ? Math.sin(this.t * 40) * 1.5 : 0;
        const rot = still ? 0 : m.th.jitter === 'shake' ? Math.sin(this.t * 50) * 0.22 : 0;
        const up = still ? 0 : m.th.jitter === 'chatter' ? Math.abs(Math.sin(this.t * 30)) * -4 : 0;
        return this.drawThing(g, m.th, m.pic, mx + j, my + up, m.th.jitter === 'buzz' ? 36 : size, rot, fade);
      }
      case 'top': {
        // It sits on the rim, then leaves: fades, flies off, or hops down and runs out of the scene.
        const sit = { x: x + m.dx * 0.5, y: y - r - size * 0.35 };
        const out = Math.max(0, m.age - hold);
        const pic = m.cracked && m.age < CRACK_TIME ? CRACKED : m.pic;
        if (!out) return this.drawThing(g, m.th, pic, sit.x, sit.y - (still ? 0 : Math.abs(Math.sin(m.age * 6)) * (m.pic === CHICK ? 6 : 0)), size, 0, 1);
        if (m.leave === 'fly') return this.drawThing(g, m.th, pic, sit.x + out * 260, sit.y - out * 240, size, 0, fade);
        if (m.leave === 'run') {
          const k = Math.min(1, out / 0.5), ground = VH * 0.9 - size * 0.4;
          const hopY = sit.y + (ground - sit.y) * k - (still ? 0 : Math.abs(Math.sin(out * 14)) * 10);
          return this.drawThing(g, m.th, pic, sit.x + out * 320, hopY, size, 0, 1);
        }
        return this.drawThing(g, m.th, pic, sit.x, sit.y, size, 0, fade);
      }
      case 'away':
        return this.drawThing(g, m.th, m.pic, mx + m.age * 180, my - m.age * 200 + (still ? 0 : Math.sin(m.age * 12) * 10), size, 0, fade);
      case 'hop': {
        // Down to the grass and off to the right in hops.
        const ground = VH * 0.9 - size * 0.4, k = Math.min(1, m.age / 0.5);
        const yy = my + (ground - my) * k - (still ? 0 : Math.abs(Math.sin(m.age * 9)) * 40 * Math.min(1, m.age));
        return this.drawThing(g, m.th, m.pic, mx + 20 + m.age * 260, yy, size, 0, fade);
      }
      case 'slide': {
        // It slides down the board and melts into a puddle on the grass.
        const k = Math.min(1, m.age / 1), ground = VH * 0.9;
        if (k < 1) return this.drawThing(g, m.th, m.pic, mx, my + (y + r - my) * k, size * (1 - k * 0.5), 0, 1);
        g.save();
        g.globalAlpha = Math.min(1, left / 1) * 0.8;
        g.fillStyle = '#9fd8f2';
        g.beginPath();
        g.ellipse(x, ground - 2, 34, 7, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        return;
      }
      case 'burst':
        return this.drawThing(g, m.th, m.pic, mx, my, size * (1 + m.age * 2), 0, 1 - m.age / markLife(m));
      case 'dangle': {
        // It hangs on a thread below the hit and swings.
        const swing = still ? 0 : Math.sin(m.age * 5) * 0.35, len = 46;
        const sx = mx + Math.sin(swing) * len, sy = my + Math.cos(swing) * len;
        g.save();
        g.globalAlpha = fade;
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(mx, my);
        g.lineTo(sx, sy - 10);
        g.stroke();
        g.restore();
        return this.drawThing(g, m.th, m.pic, sx, sy, size, 0, fade);
      }
      case 'light': {
        if (m.age < hold) {
          g.save();
          const glow = g.createRadialGradient(mx, my, 4, mx, my, 70);
          glow.addColorStop(0, 'rgba(255,240,150,0.85)');
          glow.addColorStop(1, 'rgba(255,240,150,0)');
          g.fillStyle = glow;
          g.beginPath();
          g.arc(mx, my, 70, 0, Math.PI * 2);
          g.fill();
          g.restore();
          return this.drawThing(g, m.th, hasImage(BULB_LIT) ? BULB_LIT : m.pic, mx, my, size, 0, 1);
        }
        const k = Math.min(1, (m.age - hold) / 1.2);
        return this.drawThing(g, m.th, m.pic, mx + k * 30, my + k * k * 140, size, k * 4, 1 - k);
      }
      case 'bounces': {
        // Small bounces on the way down (a ping-pong ball), or high ones (a spring).
        const n = m.th.hold ?? 3, k = Math.min(1, m.age / markLife(m));
        const hop = Math.abs(Math.sin(k * n * Math.PI)) * (m.th.high ? 120 : 50) * (m.th.high ? 1 : 1 - k);
        const ground = VH * 0.9 - size * 0.4;
        const base = m.th.high ? my : my + (ground - my) * k;
        return this.drawThing(g, m.th, m.pic, mx + k * 160, base - hop, size, still ? 0 : k * 6, Math.min(1, (1 - k) / 0.2));
      }
      case 'boomerang':
        return;
      default: {
        // Everything else bounces off and drops.
        const k = Math.min(1, m.age / 1.2);
        this.drawThing(g, m.th, m.pic, mx + k * 30, my + k * k * 140, size, k * 4, 1 - k);
      }
    }
  }

  /** The boomerang flies back along the arc into Tapko's paw. */
  private drawBoomerang(g: G, m: Mark): void {
    if (m.back) return;
    const k = ease.inOutQuad(Math.min(1, m.age / BOOMERANG_BACK));
    const p = this.point(1 - k);
    this.drawThing(g, m.th, m.pic, p.x, p.y + 30 * Math.sin(k * Math.PI), THING_SIZE, this.L.reduceMotion ? 0 : m.age * 14, 1);
  }

  private drawRing(g: G, r: Stop, current: boolean): void {
    const rx = 34, ry = 70;
    if (r.passed) {
      // A passed ring pops like a soap bubble; one passed too late fades grey.
      const k = Math.min(1, r.passed / 0.4);
      if (k >= 1) return;
      g.save();
      g.globalAlpha = 1 - k;
      g.strokeStyle = r.missed ? '#b9b4ab' : '#bfe8ff';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(r.x, r.y, rx * (1 + k), ry * (1 + k), 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      return;
    }
    const wobble = this.L.reduceMotion ? 0 : Math.sin(this.t * 2 + r.x) * 3;
    drawSprite(g, 'obj-aim-ring', r.x, r.y + wobble, ry * 2, {}, (c) => {
      const grad = c.createLinearGradient(0, -ry, 0, ry);
      grad.addColorStop(0, '#ffd1f5');
      grad.addColorStop(0.5, '#bfe8ff');
      grad.addColorStop(1, '#c9f2d4');
      c.strokeStyle = grad;
      c.lineWidth = current ? 9 : 6;
      c.globalAlpha = current ? 1 : 0.7;
      c.beginPath();
      c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, 0, rx - 6, ry - 6, 0, -2.4, -1.6);
      c.stroke();
    });
    if (r.tg) this.L.label(g, r.tg, r.x, r.y - ry - 34, 38);
  }

  /** The egg after it hatched in flight: cracked for a moment, then the chick. */
  private flightPic(f: Flight): string {
    return !f.hatched ? f.pic : f.hatched < CRACK_TIME ? CRACKED : CHICK;
  }

  private drawProjectile(g: G, f: Flight): void {
    const p = this.point(f.s);
    const y = p.y + f.sink + f.lift + f.drop;
    if (f.trail.length > 1 && f.phase === 'fly') this.drawPaper(g, f.trail, p.x, y);
    // An arrow or a rocket points along the path, winged things stay upright, the rest tumbles slowly. A fallen one lies on the grass and fades before the next throw.
    const next = this.point(Math.min(1, f.s + 0.01));
    const rot = f.th.spin === 'point' ? Math.atan2(next.y - p.y, next.x - p.x) : f.th.spin || this.L.reduceMotion || f.hatched ? 0 : f.spin;
    const flap = f.hatched && !this.L.reduceMotion ? Math.sin(this.t * 18) * 4 : 0;
    this.drawThing(g, f.th, this.flightPic(f), p.x, y + flap, THING_SIZE * (f.th.scale ?? 1), rot, f.landed ? 1 - f.after / PAUSE_AFTER : 1);
  }

  /** A short paper ribbon trailing behind the roll. */
  private drawPaper(g: G, trail: { x: number; y: number }[], x: number, y: number): void {
    const dy = y - trail[trail.length - 1].y;
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [w, c] of [[9, 'rgba(90,61,43,0.45)'], [6, '#ffffff']] as const) {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      trail.forEach((q, i) => g.lineTo(q.x - 12, q.y + dy + 8 + (this.L.reduceMotion ? 0 : Math.sin(this.t * 10 + i) * 4)));
      g.lineTo(x - 12, y + 8);
      g.stroke();
    }
    g.restore();
  }

  /** A thing; the first seven are drawn in code until their picture is there. */
  private drawThing(g: G, th: Thing, pic: string, x: number, y: number, size: number, rot: number, alpha: number): void {
    if (alpha <= 0) return;
    drawSprite(g, pic, x, y, size, { rot, alpha }, th.drawn ? (c, w, hh) => drawProjectileFallback(c, th.id, w, hh, this.t) : undefined);
  }

  progress(): number {
    return Math.min(1, this.time / AIM_SECONDS);
  }

  get finished(): boolean {
    return !this.L.staying && this.time >= AIM_SECONDS && (!this.flight || this.flight.phase === 'ready');
  }
}

/** Seconds a mark stays at the target. */
function markLife(m: Mark): number {
  const hold = m.th.hold ?? 1;
  switch (m.effect) {
    case 'splat': return 6;
    case 'stick': case 'dangle': return hold;
    case 'top': return hold + (m.leave === 'run' ? 1.6 : 1.2);
    case 'away': case 'hop': case 'bounces': return 1.6;
    case 'boomerang': return BOOMERANG_BACK;
    case 'slide': return 3;
    case 'burst': return 0.4;
    case 'light': return hold + 1.2;
    default: return 1.2;
  }
}

/** The first seven things drawn in code. */
function drawProjectileFallback(c: G, kind: string, w: number, hh: number, time: number): void {
  const r = Math.min(w, hh) / 2;
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(90,61,43,0.7)';
  c.lineWidth = 2.5;
  switch (kind) {
    case 'pebble':
      c.fillStyle = '#a8a39a';
      c.beginPath();
      c.ellipse(0, 0, r * 0.9, r * 0.65, 0.3, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      break;
    case 'screw':
      c.fillStyle = '#c9d1d9';
      roundRect(c, -r * 0.18, -r * 0.6, r * 0.36, r * 1.4, 4);
      c.fill();
      c.stroke();
      roundRect(c, -r * 0.45, -r * 0.85, r * 0.9, r * 0.3, 5);
      c.fill();
      c.stroke();
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(-r * 0.18, -r * 0.3 + i * r * 0.25);
        c.lineTo(r * 0.18, -r * 0.2 + i * r * 0.25);
        c.stroke();
      }
      break;
    case 'fly': {
      const flap = Math.sin(time * 50) * 0.3;
      c.fillStyle = 'rgba(220,240,255,0.8)';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.ellipse(s * r * 0.3, -r * 0.45, r * 0.3, r * 0.5, s * (0.6 + flap), 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      c.fillStyle = '#4a4f57';
      c.beginPath();
      c.ellipse(0, 0, r * 0.55, r * 0.42, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#e5534b';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(r * 0.35, s * r * 0.18, r * 0.16, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'tomato':
      c.fillStyle = '#e5534b';
      c.beginPath();
      c.arc(0, r * 0.05, r * 0.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#5aa04a';
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        c.lineTo(Math.cos(a) * r * 0.35, -r * 0.7 + Math.sin(a) * r * 0.15);
        c.lineTo(Math.cos(a + 0.6) * r * 0.12, -r * 0.7 + Math.sin(a + 0.6) * r * 0.05);
      }
      c.fill();
      break;
    case 'arrow':
      c.strokeStyle = '#8a5a2b';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-r, 0);
      c.lineTo(r * 0.7, 0);
      c.stroke();
      c.fillStyle = '#9aa7b4';
      c.beginPath();
      c.moveTo(r, 0);
      c.lineTo(r * 0.55, -r * 0.25);
      c.lineTo(r * 0.55, r * 0.25);
      c.closePath();
      c.fill();
      c.fillStyle = '#e5534b';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(-r * 0.6, 0);
        c.lineTo(-r, s * r * 0.3);
        c.lineTo(-r * 0.85, 0);
        c.fill();
      }
      break;
    case 'duck':
      c.fillStyle = '#f5d142';
      c.beginPath();
      c.ellipse(0, r * 0.2, r * 0.75, r * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(r * 0.35, -r * 0.35, r * 0.38, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#f28c28';
      c.beginPath();
      c.ellipse(r * 0.8, -r * 0.3, r * 0.22, r * 0.1, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#2d2d2d';
      c.beginPath();
      c.arc(r * 0.45, -r * 0.45, r * 0.07, 0, Math.PI * 2);
      c.fill();
      break;
    case 'sock':
      c.fillStyle = '#8fc5ef';
      c.beginPath();
      c.moveTo(-r * 0.3, -r * 0.9);
      c.lineTo(r * 0.2, -r * 0.9);
      c.lineTo(r * 0.2, r * 0.2);
      c.quadraticCurveTo(r * 0.9, r * 0.25, r * 0.85, r * 0.7);
      c.lineTo(-r * 0.2, r * 0.75);
      c.quadraticCurveTo(-r * 0.4, r * 0.5, -r * 0.3, r * 0.1);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#ffffff';
      c.fillRect(-r * 0.3, -r * 0.9, r * 0.5, r * 0.25);
      break;
  }
}
