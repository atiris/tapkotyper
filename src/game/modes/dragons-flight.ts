import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, fontFamily, type G, wordBox } from '../../gfx/draw';
import { tn } from '../../i18n/i18n';
import { Mode, TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { drawRow } from './copy-row';
import { BUSHES, DRAGONS, FLOCK_MAX, FLOCK_START, Firepit, GROUND, PIT_H, PIT_PICTURES, bushFallback, drawDragon, flockFor, rimmed } from './dragons';

/** The fire pit stands on the right in the flight levels; the dragons sit round it at these offsets. */
const PIT_AT = 0.8;
const SPOTS = [-105, 105, -170, 170, -235];
const DRAGON_H = 96;
const SIT_H = 84;
/** Where a dragon waits for its flight, just right of Tapko. */
const START_X = TAPKO_X + 170;
/** Seconds of the end before the level ends. */
const END_TIME = 3.4;
const SLIP_INK = '#d9482b';

/** Where a dragon sits by the pit, kept on the stage. */
function spot(pitX: number, i: number, vw: number): number {
  return Math.min(vw - 60, pitX + SPOTS[i % SPOTS.length]);
}

/** A word in a soft white bubble, high in the middle. */
function drawBubble(g: G, word: string, x: number, y: number): void {
  const w = wordBox(g, word, 40).w + 56, h = 76;
  g.save();
  g.fillStyle = 'rgba(255,253,246,0.88)';
  g.strokeStyle = 'rgba(160,120,90,0.5)';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.fill();
  g.stroke();
  g.restore();
}

/** Seconds a dragon flies from its start to the pit; with a 60 % rhythm its arc is full. */
const FLIGHT_S = 22;
const LIFT_RATIO = 0.6;
/** How fast the lift follows the rhythm, per second. */
const LIFT_EASE = 0.9;
/** The arc's top at full lift, the bushes' height and how high a dragon's feet must be to pass over them. */
const MAX_ALT = 240;
const FLY_BUSH_H = 150;
const BUSH_TOP = 140;
const BUSH_HALF = 70;
/** Seconds in the bushes: dropping in, shaking (the shout), climbing out; then walking speed. */
const DROP = 0.4;
const SHAKE = 1.4;
const CLIMB = 2.2;
const WALK = 120;
const HOP = 0.5;

interface Flyer {
  pic: string;
  x: number;
  /** Height of its feet above the ground. */
  alt: number;
  /** wait: on the ground for the first word; fly: on its arc; bush: in the bushes; walk: on the ground; hop: to its place; home: there. */
  state: 'wait' | 'fly' | 'bush' | 'walk' | 'hop' | 'home';
  /** Share of the flight done. */
  p: number;
  lift: number;
  flap: boolean;
  /** Seconds in the state. */
  t: number;
  /** Where it was when the state began (bush, hop). */
  fromX: number;
  fromAlt: number;
  flew: boolean;
  /** Its place by the pit. */
  seat: number;
}

/**
 * Valley 3, flying lessons (a word stream with rhythm): a dragon waits right of Tapko, a few bushes
 * stand in the middle, the burning pit on the right. Words come one at a time in a bubble high in
 * the middle; the first typed word starts the flight, a slow arc whose height follows the rhythm.
 * Too low over the bushes it lands in them with a giggle and walks on; every dragon reaches the
 * fire, and the end counts how many flew.
 */
export class FlightMode extends Mode {
  readonly pictures = [...DRAGONS, ...BUSHES.slice(0, 3), ...PIT_PICTURES];
  readonly world = 'dragons';
  readonly phraseWords = 1;
  private pit: Firepit;
  private dragons: Flyer[] = [];
  private planned = FLOCK_START;
  private done = 0;
  private flown = 0;
  private current: Target | null = null;
  /** Seconds until the next dragon comes; -1 when none is due. */
  private nextIn = -1;
  private bushes: { share: number; pic: string; flip: boolean; h: number }[] = [];
  private bushShake = 0;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.pit = new Firepit(L, L.vw * PIT_AT).burn(0.8);
  }

  startLine(): string {
    return pickLine('story.flightStart');
  }

  start(): void {
    const r = this.L.rng, n = r.int(2, 3);
    for (let i = 0; i < n; i++) this.bushes.push({ share: n === 1 ? 0 : i / (n - 1), pic: BUSHES[i], flip: r.chance(0.5), h: FLY_BUSH_H * r.range(0.92, 1.05) });
    this.newDragon();
    this.ask();
  }

  /** The bushes' middle and their spread between the start and the pit. */
  private bushX(share: number): number {
    const mid = (START_X + this.pit.x) / 2, spread = (this.pit.x - START_X) * 0.12;
    return mid - spread + share * spread * 2;
  }

  private ask(): void {
    this.current = this.L.core.add(this.L.word(), {});
  }

  private newDragon(): void {
    const i = this.done;
    this.dragons.push({ pic: DRAGONS[i % DRAGONS.length], x: START_X, alt: 0, state: 'wait', p: 0, lift: 0, flap: false, t: 0, fromX: START_X, fromAlt: 0, flew: false, seat: i });
    // The wait between flights is not rhythm.
    this.L.rhythm.ready(performance.now());
  }

  private get flyer(): Flyer | undefined {
    return this.dragons.find((d) => d.state !== 'home');
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.L.sfx('pop');
    this.L.core.prune();
    this.current = null;
    const d = this.flyer;
    if (d?.state === 'wait') {
      d.state = 'fly';
      d.t = 0;
      d.lift = this.liftAim();
      this.L.sfx('whoosh');
    }
    if (this.endT === null) this.ask();
  }

  /** The lift the rhythm asks for: full from 60 % of the goal. */
  private liftAim(): number {
    return Math.min(1, this.L.rhythm.ratio(this.L.difficulty) / LIFT_RATIO);
  }

  update(dt: number): void {
    const L = this.L;
    this.pit.x = L.vw * PIT_AT;
    this.pit.update(dt);
    this.bushShake = Math.max(0, this.bushShake - dt);
    for (const d of this.dragons) this.move(d, dt);
    if (this.nextIn >= 0 && (this.nextIn -= dt) < 0) this.newDragon();
    if (this.endT !== null) this.endT += dt;
  }

  private move(d: Flyer, dt: number): void {
    d.t += dt;
    const L = this.L;
    const arrive = this.pit.x - 70;
    if (d.state === 'fly') {
      d.p = Math.min(1, d.p + dt / FLIGHT_S);
      const aim = this.liftAim();
      d.flap = aim > d.lift + 0.01;
      d.lift += (aim - d.lift) * Math.min(1, dt * LIFT_EASE);
      d.x = START_X + (arrive - START_X) * d.p;
      d.alt = MAX_ALT * d.lift * Math.sin(Math.PI * d.p);
      const left = this.bushX(0) - BUSH_HALF, right = this.bushX(1) + BUSH_HALF;
      if (d.x >= left && d.x <= right && d.alt < BUSH_TOP) {
        d.state = 'bush';
        d.t = 0;
        d.fromX = d.x;
        d.fromAlt = d.alt;
        d.flap = false;
        L.sfx('plop');
      } else if (d.p >= 1) {
        d.flew = true;
        this.hop(d);
      }
    } else if (d.state === 'bush') {
      if (d.t < DROP) {
        d.alt = d.fromAlt + (BUSH_TOP * 0.35 - d.fromAlt) * ease.outQuad(d.t / DROP);
      } else if (d.t < SHAKE) {
        if (d.t - dt < DROP) {
          this.bushShake = SHAKE - DROP;
          L.shout(pickLine('story.flightBush'), d.x, GROUND - d.alt - DRAGON_H - 30);
          L.particles.emit(d.x, GROUND - BUSH_TOP, 10, 'leaf', ['#4f8a4a', '#9ccf7a'], 140, 7);
        }
      } else if (d.t < CLIMB) {
        const k = ease.inOutQuad((d.t - SHAKE) / (CLIMB - SHAKE));
        const out = this.bushX(1) + BUSH_HALF + 30;
        d.x = d.fromX + (out - d.fromX) * k;
        d.alt = BUSH_TOP * 0.35 * (1 - k) + Math.sin(k * Math.PI) * 50;
      } else {
        d.state = 'walk';
        d.alt = 0;
      }
    } else if (d.state === 'walk') {
      d.x = Math.min(arrive, d.x + WALK * dt);
      d.alt = L.reduceMotion ? 0 : Math.abs(Math.sin(d.t * 9)) * 6;
      if (d.x >= arrive) this.hop(d);
    } else if (d.state === 'hop') {
      const k = Math.min(1, d.t / HOP), to = spot(this.pit.x, d.seat, L.vw);
      d.x = d.fromX + (to - d.fromX) * ease.inOutQuad(k);
      d.alt = d.fromAlt * (1 - k) + Math.sin(k * Math.PI) * 40;
      if (k >= 1) this.home(d);
    } else if (d.state === 'home') d.x = spot(this.pit.x, d.seat, L.vw);
  }

  /** It landed by the pit with a hop (or walked there): a hop to its place. */
  private hop(d: Flyer): void {
    d.state = 'hop';
    d.t = 0;
    d.fromX = d.x;
    d.fromAlt = d.alt;
    d.flap = false;
  }

  private home(d: Flyer): void {
    const L = this.L;
    d.state = 'home';
    d.alt = 0;
    this.done++;
    if (d.flew) {
      this.flown++;
      L.particles.emit(d.x, GROUND - DRAGON_H * 0.6, 14, 'sparkle', ['#fff6a8', '#ffd25a', '#ffffff'], 150, 8);
    }
    L.sfx('cheer');
    this.planned = flockFor(L, this.planned, this.done);
    if (this.done < this.planned) {
      this.nextIn = 0.8;
      return;
    }
    if (this.done >= FLOCK_MAX) L.endMinimum();
    this.endT = 0;
    if (this.current) L.core.release(this.current, false);
    L.core.prune();
    this.current = null;
  }

  render(g: G): void {
    const L = this.L;
    this.pit.draw(g, this.t);
    const shake = this.bushShake > 0 && !L.reduceMotion ? Math.sin(this.t * 40) * 0.05 : 0;
    // Dragons behind the bushes are the ones in them.
    for (const d of this.dragons) if (d.state === 'bush') this.drawFlyer(g, d);
    this.bushes.forEach((b, i) => drawSprite(g, b.pic, this.bushX(b.share), GROUND + 8, b.h, { ay: 1, flip: b.flip, rot: shake }, bushFallback(i)));
    for (const d of this.dragons) if (d.state !== 'bush') this.drawFlyer(g, d);
    if (this.current) {
      drawBubble(g, this.current.word, L.vw / 2, VH * 0.15);
      L.label(g, this.current, L.vw / 2, VH * 0.15);
    }
    if (this.endT === null) return;
    const line = tn('story.flightDone', this.flown, { n: this.flown, m: this.done });
    rimmed(g, line, L.vw / 2, VH * 0.24, 40, Math.min(1, this.endT / 0.4));
  }

  private drawFlyer(g: G, d: Flyer): void {
    const flying = d.state === 'fly' || d.state === 'hop';
    const flap = flying && d.flap && !this.L.reduceMotion ? Math.sin(this.t * 16) : 0;
    const wobble = d.state === 'bush' && d.t > DROP && d.t < SHAKE && !this.L.reduceMotion ? Math.sin(this.t * 30) * 0.12 : 0;
    // A gliding dragon leans down a little.
    const rot = d.state === 'fly' && !d.flap ? 0.12 : wobble;
    drawDragon(g, d.pic, d.x, GROUND - d.alt, d.state === 'home' ? SIT_H : DRAGON_H, flap, 1, 1, rot);
  }

  progress(): number {
    return Math.min(1, this.done / this.planned);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** The lullaby: the line's letter size, the circle's middle height and size, and seconds of a few things. */
const LINE_SIZE = 36;
const CIRCLE_Y = VH * 0.24;
const CIRCLE_RX = 190;
const CIRCLE_RY = 55;
/** Seconds of one round. */
const ROUND = 9;
const FLY_H = 80;
const SLEEP_H = 66;
const COME = 1.5;
const DOWN = 1.6;
const NEXT_LINE = 0.9;
const SLIP_FADE = 0.6;

interface Circler {
  pic: string;
  phase: number;
  state: 'come' | 'circle' | 'down' | 'sleep';
  t: number;
  /** Where it started gliding down from. */
  fromX: number;
  fromY: number;
  seat: number;
}

/**
 * Valley 4, the lullaby (copy): in the evening the dragons circle above the burning pit and cannot
 * sleep. A panel in the middle shows one line of the lullaby, a short sentence ending with a
 * period. Copied without a slip, one dragon glides down and falls asleep by the fire; a line with
 * a slip is written again.
 */
export class LullabyMode extends Mode {
  readonly pictures = [...DRAGONS, 'obj-dragon-sleeping', ...PIT_PICTURES];
  readonly world = 'dragons';
  private pit: Firepit;
  private dragons: Circler[] = [];
  private planned = FLOCK_START;
  private asleep = 0;
  private line = '';
  private current: Target | null = null;
  private slip: number | null = null;
  /** Seconds until the next line; -1 when none is due. */
  private nextIn = -1;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.pit = new Firepit(L, L.vw * PIT_AT).burn(0.7);
  }

  startLine(): string {
    return pickLine('story.lullabyStart');
  }

  start(): void {
    for (let i = 0; i < this.planned; i++) this.addDragon('circle');
    this.ask(this.L.word(5, 4, 3));
  }

  /** A dragon that circles (one more comes flying in from the right). */
  private addDragon(state: 'come' | 'circle'): void {
    const i = this.dragons.length;
    this.dragons.push({ pic: DRAGONS[i % DRAGONS.length], phase: (i / FLOCK_MAX) * Math.PI * 2 * 1.3, state, t: 0, fromX: 0, fromY: 0, seat: i });
  }

  private ask(line: string): void {
    this.line = line;
    this.current = this.L.core.add(line, {});
  }

  /** The circle's place: above the pit, kept on the stage. */
  private circle(d: Circler): { x: number; y: number; face: number } {
    const rx = Math.max(80, Math.min(CIRCLE_RX, this.L.vw - this.pit.x - 70));
    const a = d.phase + (this.t * Math.PI * 2) / ROUND;
    return { x: this.pit.x + Math.cos(a) * rx, y: CIRCLE_Y + Math.sin(a) * CIRCLE_RY + FLY_H / 2, face: -Math.sin(a) >= 0 ? 1 : -1 };
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    const L = this.L;
    this.current = null;
    L.core.prune();
    L.sfx('note');
    const d = this.dragons.find((o) => o.state === 'circle') ?? this.dragons.find((o) => o.state === 'come');
    if (d) {
      const c = this.circle(d);
      d.state = 'down';
      d.t = 0;
      d.fromX = c.x;
      d.fromY = c.y;
      d.seat = this.asleep;
    }
    this.asleep++;
    const before = this.planned;
    this.planned = flockFor(L, this.planned, this.asleep);
    if (this.planned > before) this.addDragon('come');
    if (this.asleep < this.planned) this.nextIn = NEXT_LINE;
    else if (this.asleep >= FLOCK_MAX) L.endMinimum();
  }

  /** A slip: the line fades red and the same line starts again. */
  onWrong(tg: Target | null): void {
    if (!this.current || tg !== this.current) return;
    this.L.core.release(this.current, false);
    this.L.core.prune();
    this.current = null;
    this.slip = 0;
  }

  update(dt: number): void {
    this.pit.x = this.L.vw * PIT_AT;
    this.pit.update(dt);
    for (const d of this.dragons) {
      d.t += dt;
      if (d.state === 'come' && d.t >= COME) d.state = 'circle';
      if (d.state === 'down' && d.t >= DOWN) {
        d.state = 'sleep';
        this.L.particles.emit(spot(this.pit.x, d.seat, this.L.vw), GROUND - SLEEP_H * 0.6, 6, 'sparkle', ['#fff6a8', '#d8d0ff'], 60, 6);
      }
    }
    if (this.slip !== null && (this.slip += dt) >= SLIP_FADE) {
      this.slip = null;
      this.ask(this.line);
    }
    if (this.nextIn >= 0 && (this.nextIn -= dt) < 0) this.ask(this.L.word(5, 4, 3));
    if (this.endT !== null) this.endT += dt;
    else if (this.asleep >= this.planned && this.dragons.every((d) => d.state === 'sleep')) {
      this.endT = 0;
      this.L.say(pickLine('story.lullabyDone'), END_TIME);
    }
  }

  /** The line's panel in the middle, between Tapko and the pit. */
  private panel(): { cx: number; y: number; maxW: number } {
    const x0 = TAPKO_X + 140, x1 = this.L.vw - 90;
    return { cx: (x0 + x1) / 2, y: VH * 0.54, maxW: x1 - x0 };
  }

  render(g: G): void {
    const L = this.L;
    // Evening.
    g.save();
    g.fillStyle = 'rgba(40,40,110,0.28)';
    g.fillRect(0, 0, L.vw, VH);
    g.restore();
    this.pit.draw(g, this.t);
    for (const d of this.dragons) this.drawCircler(g, d);
    if (this.endT !== null) return;
    const p = this.panel();
    const size = Math.min(LINE_SIZE, (LINE_SIZE * (p.maxW - 60)) / Math.max(1, wordBox(g, this.line, LINE_SIZE).w));
    const w = Math.min(p.maxW, wordBox(g, this.line, size).w + 80), h = size * 1.4 + 50;
    g.save();
    g.fillStyle = 'rgba(250,246,255,0.92)';
    g.strokeStyle = '#9b86c9';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(p.cx - w / 2, p.y - h / 2, w, h, 22);
    g.fill();
    g.stroke();
    g.restore();
    if (this.current) L.label(g, this.current, p.cx, p.y, size);
    if (this.slip !== null) {
      g.save();
      g.globalAlpha = 1 - this.slip / SLIP_FADE;
      g.font = `600 ${size}px ${fontFamily()}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = SLIP_INK;
      g.fillText(this.line, p.cx, p.y);
      g.restore();
    }
  }

  private drawCircler(g: G, d: Circler): void {
    const L = this.L;
    const motion = !L.reduceMotion;
    const flap = motion ? Math.sin(this.t * 10 + d.phase) * 0.6 : 0;
    if (d.state === 'sleep') {
      const x = spot(this.pit.x, d.seat, L.vw);
      drawSprite(g, 'obj-dragon-sleeping', x, GROUND + 4, SLEEP_H, { ay: 1, flip: x > this.pit.x }, (g2, _w, h) => drawDragon(g2, d.pic, 0, h / 2, h));
      // A small "z z" floats up.
      const k = (this.t * 0.4 + d.seat * 0.37) % 1;
      g.save();
      g.globalAlpha = Math.sin(k * Math.PI) * 0.9;
      g.font = `700 ${18 + k * 8}px ${fontFamily()}`;
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.fillText('z z', x + 20 + k * 14, GROUND - SLEEP_H - 6 - k * 40);
      g.restore();
      return;
    }
    const c = this.circle(d);
    if (d.state === 'circle') return drawDragon(g, d.pic, c.x, c.y, FLY_H, flap, c.face);
    if (d.state === 'come') {
      const k = ease.outQuad(Math.min(1, d.t / COME));
      return drawDragon(g, d.pic, L.vw + 80 + (c.x - L.vw - 80) * k, c.y - (1 - k) * 60, FLY_H, flap, -1);
    }
    // Gliding down to its place by the fire.
    const k = ease.inOutQuad(Math.min(1, d.t / DOWN)), to = spot(this.pit.x, d.seat, L.vw);
    drawDragon(g, d.pic, d.fromX + (to - d.fromX) * k, d.fromY + (GROUND - d.fromY) * k, FLY_H - (FLY_H - SLEEP_H) * k, 0, to < d.fromX ? -1 : 1, 1, 0.1);
  }

  progress(): number {
    return Math.min(1, this.asleep / this.planned);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** After this many returns a dragon's tries get one set less and more time per word; after this many its sets have two words and a slip or a late word only restarts that word. */
const SAFE_AFTER = 3;
const SOFT_AFTER = 6;
const SAFE_TIME = 1.25;

/** A take-off try: its sets, words per set, the factor of each word's time, and whether a miss only restarts the word. */
export function takeoffPlan(first: boolean, returns: number): { sets: number; words: [number, number]; time: number; soft: boolean } {
  const safe = returns >= SAFE_AFTER, soft = returns >= SOFT_AFTER;
  return { sets: (first ? 3 : 4) - (safe ? 1 : 0), words: soft ? [2, 2] : [2, 3], time: safe ? SAFE_TIME : 1, soft };
}

/** The take-off: a flight's lowest and highest height, the row's height, and seconds of a step, a return and the flight away. */
const TAKE_LOW = 60;
const TAKE_TOP = 300;
const ROW_Y = VH * 0.16;
const STEP = 0.7;
const BACK = 1.4;
const GONE = 2.2;
/** How far a dragon sinks while a word waits, per second, and at most. */
const SINK = 8;
const SINK_MAX = 30;
/** The end: the fire goes out, the egg shows, the cheer, the level ends. */
const FIRE_OUT = 2;
const EGG_IN = 1.5;
const CHEER_AT = FIRE_OUT + EGG_IN;
const TAKEOFF_END = CHEER_AT + 2;
const EGG_H = 92;
const ROW_INK = '#3d3355';

interface Sitter {
  pic: string;
  seat: number;
  /** sit: by the pit; fly: on its way in steps; back: gliding back to the pit; gone: flying off to the left. */
  state: 'sit' | 'fly' | 'back' | 'gone';
  t: number;
  x: number;
  alt: number;
  fromX: number;
  fromAlt: number;
  toX: number;
  toAlt: number;
  sink: number;
  returns: number;
}

/**
 * Valley 5, the take-off (super-obstacle): in the morning the dragons sit by the pit and one by one
 * fly to the left, to the crystal meadow. A flight is a few sets of short words: a set typed without
 * a slip and every word in its time lifts the dragon a step higher and further; a late word or a slip
 * sends it back to the pit to try again, easier after a few returns. When the last is gone the fire
 * goes out and an egg shows behind it.
 */
export class TakeoffMode extends Mode {
  readonly pictures = [...DRAGONS, 'obj-egg', ...PIT_PICTURES];
  readonly world = 'dragons';
  readonly phraseWords = 1;
  private pit: Firepit;
  private dragons: Sitter[] = [];
  private planned = FLOCK_START;
  private done = 0;
  private sets: string[][] = [];
  private set = 0;
  private at = 0;
  /** Seconds since each word of the set slipped (-1: no slip). */
  private slips: number[] = [];
  private current: Target | null = null;
  private timeLeft = 0;
  private timeFull = 0;
  private timeK = 1;
  private soft = false;
  private later: { in: number; fn: () => void } | null = null;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.pit = new Firepit(L, L.vw * PIT_AT).burn(0.6);
  }

  startLine(): string {
    return pickLine('story.takeoffStart');
  }

  start(): void {
    for (let i = 0; i < this.planned; i++) this.addDragon();
    this.after(0.6, () => this.flight());
  }

  private addDragon(): void {
    const i = this.dragons.length, x = spot(this.pit.x, i, this.L.vw);
    this.dragons.push({ pic: DRAGONS[i % DRAGONS.length], seat: i, state: 'sit', t: 0, x, alt: 0, fromX: x, fromAlt: 0, toX: x, toAlt: 0, sink: 0, returns: 0 });
  }

  private after(seconds: number, fn: () => void): void {
    this.later = { in: seconds, fn };
  }

  private get flyer(): Sitter | undefined {
    return this.dragons[this.done];
  }

  /** The next dragon tries (again): new sets, and it lifts off to the first step's height. */
  private flight(): void {
    const L = this.L, d = this.flyer!;
    const plan = takeoffPlan(this.done === 0, d.returns);
    this.soft = plan.soft;
    this.timeK = plan.time;
    this.sets = Array.from({ length: plan.sets }, () => Array.from({ length: L.rng.int(plan.words[0], plan.words[1]) }, () => L.word(4, 1)));
    this.set = 0;
    d.state = 'fly';
    this.stepTo(d, 0);
    this.showSet();
  }

  /** Its way: from its place by the pit, a step left and up for every set done. */
  private stepTo(d: Sitter, k: number): void {
    const home = spot(this.pit.x, d.seat, this.L.vw), left = TAPKO_X + 220, n = this.sets.length;
    d.fromX = d.x;
    d.fromAlt = d.alt;
    d.toX = home - ((home - left) * k) / n;
    d.toAlt = TAKE_LOW + ((TAKE_TOP - TAKE_LOW) * k) / n;
    d.sink = 0;
    d.t = 0;
  }

  private showSet(): void {
    this.at = 0;
    this.slips = this.sets[this.set].map(() => -1);
    this.ask();
  }

  private ask(): void {
    const word = this.sets[this.set][this.at];
    this.current = this.L.core.add(word, {});
    this.timeFull = this.timeLeft = this.L.travelTime(word) * this.timeK;
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    const L = this.L;
    L.core.prune();
    this.current = null;
    L.sfx('pop');
    if (++this.at < this.sets[this.set].length) return this.ask();
    // A clean set: a step higher and further.
    const d = this.flyer!;
    this.stepTo(d, ++this.set);
    L.sfx('whoosh');
    L.particles.emit(d.x, GROUND - d.alt - DRAGON_H * 0.5, 8, 'sparkle', ['#fff6a8', '#ffd25a'], 110, 6);
    if (this.set < this.sets.length) this.after(STEP, () => this.showSet());
    else this.after(STEP, () => this.away(d));
  }

  onWrong(tg: Target | null): void {
    if (this.current && tg === this.current) this.miss(true);
  }

  /** A slip or a late word: the dragon glides back to the pit and tries again, or (soft) the word starts again. */
  private miss(slip: boolean): void {
    const L = this.L, word = this.current!.word;
    L.core.release(this.current!, !slip);
    L.core.prune();
    this.current = null;
    if (this.soft) {
      this.current = L.core.add(word, {});
      this.timeLeft = this.timeFull;
      return;
    }
    this.slips[this.at] = 0;
    const d = this.flyer!;
    d.state = 'back';
    d.fromX = d.x;
    d.fromAlt = d.alt;
    d.t = 0;
    d.returns++;
    L.sfx('whoosh');
    L.say(pickLine('story.takeoffBack'), 2);
    this.after(BACK + 0.6, () => this.flight());
  }

  /** Its last set: it flies off to the left, out of the stage. */
  private away(d: Sitter): void {
    const L = this.L;
    d.state = 'gone';
    d.fromX = d.x;
    d.fromAlt = d.alt;
    d.t = 0;
    L.sfx('cheer');
    L.say(pickLine('story.takeoffGone'), 2.5);
    this.after(GONE, () => this.gone());
  }

  private gone(): void {
    const L = this.L;
    this.done++;
    const before = this.planned;
    this.planned = flockFor(L, this.planned, this.done);
    if (this.planned > before) this.addDragon();
    if (this.done < this.planned) return this.after(1, () => this.flight());
    if (this.done >= FLOCK_MAX) L.endMinimum();
    // The fire goes out, and an egg shows behind it.
    this.endT = 0;
    this.pit.fade = FIRE_OUT;
    this.pit.litTo = 0;
  }

  update(dt: number): void {
    const L = this.L;
    this.pit.x = L.vw * PIT_AT;
    this.pit.update(dt);
    for (let i = 0; i < this.slips.length; i++) if (this.slips[i] >= 0) this.slips[i] += dt;
    for (const d of this.dragons) this.move(d, dt);
    if (this.current && this.flyer?.state === 'fly' && !L.noPressure && (this.timeLeft -= dt) <= 0) this.miss(false);
    if (this.later && (this.later.in -= dt) <= 0) {
      const fn = this.later.fn;
      this.later = null;
      fn();
    }
    if (this.endT === null) return;
    const e = this.endT;
    this.endT += dt;
    if (e < FIRE_OUT && this.endT >= FIRE_OUT) L.particles.emit(this.pit.x, this.pit.top - EGG_H * 0.4, 16, 'sparkle', ['#fff6a8', '#ffe9c8', '#ffffff'], 120, 7, 1.2);
    if (e < CHEER_AT && this.endT >= CHEER_AT) {
      L.setMood('happy', 3);
      L.hooray();
    }
  }

  private move(d: Sitter, dt: number): void {
    d.t += dt;
    const home = spot(this.pit.x, d.seat, this.L.vw);
    if (d.state === 'sit') {
      d.x = home;
      d.alt = 0;
    } else if (d.state === 'fly') {
      const k = ease.inOutQuad(Math.min(1, d.t / STEP));
      // While a word waits it flaps and slowly sinks.
      if (this.current) d.sink = Math.min(SINK_MAX, d.sink + SINK * dt);
      d.x = d.fromX + (d.toX - d.fromX) * k;
      d.alt = Math.max(10, d.fromAlt + (d.toAlt - d.fromAlt) * k - d.sink);
    } else if (d.state === 'back') {
      const k = Math.min(1, d.t / BACK), e = ease.inOutQuad(k);
      d.x = d.fromX + (home - d.fromX) * e;
      d.alt = d.fromAlt * (1 - e) + Math.sin(k * Math.PI) * 30;
      if (k >= 1) {
        d.state = 'sit';
        d.alt = 0;
      }
    } else {
      const k = Math.min(1, d.t / GONE);
      d.x = d.fromX + (-200 - d.fromX) * ease.inQuad(k);
      d.alt = d.fromAlt + 220 * k;
    }
  }

  render(g: G): void {
    const L = this.L;
    // Morning light.
    g.save();
    g.fillStyle = 'rgba(255,214,170,0.16)';
    g.fillRect(0, 0, L.vw, VH);
    g.restore();
    this.drawEgg(g);
    this.pit.draw(g, this.t);
    const motion = !L.reduceMotion;
    this.dragons.forEach((d, i) => {
      if (i < this.done) return;
      const air = d.state === 'fly' || d.state === 'gone' || (d.state === 'back' && d.alt > 0);
      const flap = air && motion ? Math.sin(this.t * 16) : 0;
      const bob = d.state === 'sit' && motion ? Math.abs(Math.sin(this.t * 2 + i)) * 3 : 0;
      // A dragon that came later fades in.
      const alpha = d.state === 'sit' && i >= FLOCK_START ? Math.min(1, d.t / 0.6) : 1;
      drawDragon(g, d.pic, d.x, GROUND - d.alt - bob, d.state === 'sit' ? SIT_H : DRAGON_H, flap, d.state === 'fly' || d.state === 'gone' ? -1 : 1, alpha);
    });
    const d = this.flyer;
    if (this.endT !== null || !d || (d.state !== 'fly' && d.state !== 'back') || !this.sets.length) return;
    const row = this.sets[this.set] ?? [];
    drawRow(g, L, row.map((word, i) => ({ word, slip: this.slips[i] ?? -1 })), this.at, this.current, L.vw / 2, ROW_Y, L.vw - 2 * (TAPKO_X + 60), ROW_INK);
    if (!this.current || L.noPressure) return;
    // The word's time: a thin bar under the row.
    const w = 260, k = Math.max(0, this.timeLeft / this.timeFull);
    g.save();
    g.fillStyle = 'rgba(255,253,246,0.8)';
    g.beginPath();
    g.roundRect(L.vw / 2 - w / 2, ROW_Y + 36, w, 10, 5);
    g.fill();
    g.fillStyle = k > 0.3 ? '#7cbf5a' : '#f2a23a';
    g.beginPath();
    g.roundRect(L.vw / 2 - w / 2, ROW_Y + 36, w * k, 10, 5);
    g.fill();
    g.restore();
  }

  /** The egg the dragons left behind the burnt-out pit, with a soft glow. */
  private drawEgg(g: G): void {
    if (this.endT === null || this.endT < FIRE_OUT) return;
    const a = Math.min(1, (this.endT - FIRE_OUT) / EGG_IN);
    const x = this.pit.x + 14, y = GROUND - PIT_H * 0.35, r = EGG_H * 1.1;
    g.save();
    const glow = g.createRadialGradient(x, y - EGG_H * 0.5, 4, x, y - EGG_H * 0.5, r);
    glow.addColorStop(0, `rgba(255,246,200,${0.7 * a})`);
    glow.addColorStop(1, 'rgba(255,246,200,0)');
    g.fillStyle = glow;
    g.fillRect(x - r, y - EGG_H * 0.5 - r, r * 2, r * 2);
    g.restore();
    drawSprite(g, 'obj-egg', x, y, EGG_H, { ay: 1, alpha: a }, (g2, w, h) => {
      g2.fillStyle = '#f6efe0';
      g2.strokeStyle = 'rgba(120,90,60,0.5)';
      g2.lineWidth = 2;
      g2.beginPath();
      g2.ellipse(0, 0, w * 0.36, h * 0.46, 0, 0, Math.PI * 2);
      g2.fill();
      g2.stroke();
    });
  }

  progress(): number {
    return Math.min(1, this.done / this.planned);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > TAKEOFF_END;
  }
}
