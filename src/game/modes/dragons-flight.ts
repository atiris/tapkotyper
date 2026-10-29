import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, fontFamily, type G, wordBox } from '../../gfx/draw';
import { tn } from '../../i18n/i18n';
import { Mode, TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { drawRow } from './copy-row';
import { BUSHES, DRAGONS, FLOCK_MAX, FLOCK_START, Firepit, GROUND, PIT_PICTURES, bushFallback, drawDragon, flockFor, rimmed } from './dragons';

/** The fire pit stands on the right in the flight levels; the dragons sit round it at these offsets. */
const PIT_AT = 0.8;
const SPOTS = [-105, 105, -170, 170, -235];
const DRAGON_H = 108;
const SIT_H = 94;
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

/** In the flying lessons the pit stands nearer the right edge; the dragons sit left of it, each a little further left and higher. */
const FLIGHT_PIT_AT = 0.9;
/** The pit is smaller in the flying lessons, so the dragons are the scene. */
const FLIGHT_PIT_H = 64;
const SEAT_FIRST = 100;
const SEAT_GAP = 62;
const SEAT_LIFT = [0, 24, 8, 32, 14];
/** Seconds a dragon flies from its start to its seat; with 80 % of the rhythm goal its arc is full. */
const FLIGHT_S = 22;
const LIFT_RATIO = 0.8;
/** How fast the lift follows the rhythm, per second. */
const LIFT_EASE = 0.9;
/** A pause in typing takes the lift away: after this many seconds it starts to go, and in this many more it is gone. */
const IDLE_GRACE = 1.2;
const IDLE_FALL = 2;
/** Past the bushes, a lift below this drops the dragon: it falls and lands hard. */
const HARD_AIM = 0.3;
const FALL_G = 900;
/** A flying dragon leans forward, less while it climbs, more as it glides down, and rocks gently. */
const TILT_UP = 0.2;
const TILT_GLIDE = 0.6;
const ROCK = 0.07;
/** Now and then a seated dragon is glad: a little hop, every few seconds each at its own time. */
const GLAD_EVERY = 5;
const GLAD_HOP = 0.6;
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
  /** wait: on the ground for the first word; fly: on its arc; fall: dropping after the bushes; bush: in the bushes; walk: on the ground; hop: to its place; home: there. */
  state: 'wait' | 'fly' | 'fall' | 'bush' | 'walk' | 'hop' | 'home';
  /** Share of the flight done. */
  p: number;
  lift: number;
  flap: boolean;
  /** Its lean, easing toward climbing or gliding; its fall speed; the squash of a hard landing (1..0). */
  tilt: number;
  vy: number;
  squash: number;
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
  readonly pictures = [...DRAGONS, ...BUSHES, ...PIT_PICTURES];
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
    this.pit = new Firepit(L, L.vw * FLIGHT_PIT_AT, FLIGHT_PIT_H).burn(0.8);
  }

  startLine(): string {
    return pickLine('story.flightStart');
  }

  /** The stars also count the flyers: all of them 3, at least half 2, else 1. */
  starCap(): number {
    if (!this.done || this.flown === this.done) return 3;
    return this.flown * 2 >= this.done ? 2 : 1;
  }

  /** A dragon's seat left of the pit, and how much higher on the ground it sits. */
  private seatX(i: number): number {
    return this.pit.x - SEAT_FIRST - (i % SEAT_LIFT.length) * SEAT_GAP;
  }

  private seatLift(i: number): number {
    return SEAT_LIFT[i % SEAT_LIFT.length];
  }

  /** The ground under a dragon: it rises toward its seat. */
  private groundAt(d: Flyer): number {
    const to = this.seatX(d.seat);
    return this.seatLift(d.seat) * Math.max(0, Math.min(1, (d.x - START_X) / (to - START_X)));
  }

  start(): void {
    const r = this.L.rng, n = r.int(2, 3);
    for (let i = 0; i < n; i++) this.bushes.push({ share: n === 1 ? 0 : i / (n - 1), pic: BUSHES[i], flip: r.chance(0.5), h: FLY_BUSH_H * r.range(0.92, 1.05) });
    this.newDragon();
    this.ask();
  }

  /** The bushes' middle and their spread between the start and the nearest seat. */
  private bushX(share: number): number {
    const end = this.seatX(0), mid = (START_X + end) / 2, spread = (end - START_X) * 0.12;
    return mid - spread + share * spread * 2;
  }

  private ask(): void {
    this.current = this.L.core.add(this.L.word(), {});
  }

  private newDragon(): void {
    const i = this.done;
    this.dragons.push({ pic: DRAGONS[i % DRAGONS.length], x: START_X, alt: 0, state: 'wait', p: 0, lift: 0, flap: false, tilt: 0, vy: 0, squash: 0, t: 0, fromX: START_X, fromAlt: 0, flew: false, seat: i });
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

  /** The lift the rhythm asks for, full from 80 % of the goal; a pause in typing takes it away. */
  private liftAim(): number {
    const idle = Math.max(0, Math.min(1, (this.L.idleFor - IDLE_GRACE) / IDLE_FALL));
    return Math.min(1, this.L.rhythm.ratio(this.L.difficulty) / LIFT_RATIO) * (1 - idle);
  }

  update(dt: number): void {
    const L = this.L;
    this.pit.x = L.vw * FLIGHT_PIT_AT;
    this.pit.update(dt);
    this.bushShake = Math.max(0, this.bushShake - dt);
    for (const d of this.dragons) this.move(d, dt);
    if (this.nextIn >= 0 && (this.nextIn -= dt) < 0) this.newDragon();
    if (this.endT !== null) this.endT += dt;
  }

  private move(d: Flyer, dt: number): void {
    d.t += dt;
    d.squash = Math.max(0, d.squash - dt * 2.5);
    const L = this.L;
    const arrive = this.seatX(d.seat);
    const right = this.bushX(1) + BUSH_HALF;
    if (d.state === 'fly') {
      d.p = Math.min(1, d.p + dt / FLIGHT_S);
      const aim = this.liftAim();
      d.flap = aim > d.lift + 0.01;
      d.lift += (aim - d.lift) * Math.min(1, dt * LIFT_EASE);
      d.tilt += ((d.flap ? TILT_UP : TILT_GLIDE) - d.tilt) * Math.min(1, dt * 3);
      d.x = START_X + (arrive - START_X) * d.p;
      d.alt = this.groundAt(d) + MAX_ALT * d.lift * Math.sin(Math.PI * d.p);
      const left = this.bushX(0) - BUSH_HALF;
      // Over the bushes and the typing stopped: it drops and lands hard (it still flew over them).
      if (d.x > right && aim < HARD_AIM && d.p < 0.95 && d.alt > this.groundAt(d) + 20) {
        d.state = 'fall';
        d.flew = true;
        d.vy = 0;
        d.flap = false;
      } else if (d.x >= left && d.x <= right && d.alt < BUSH_TOP) {
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
    } else if (d.state === 'fall') {
      d.x = Math.min(arrive, d.x + ((arrive - START_X) / FLIGHT_S) * 1.4 * dt);
      d.vy += FALL_G * dt;
      d.alt -= d.vy * dt;
      d.tilt += (0.5 - d.tilt) * Math.min(1, dt * 4);
      const ground = this.groundAt(d);
      if (d.alt <= ground) {
        d.alt = ground;
        d.state = 'walk';
        d.t = 0;
        d.squash = 1;
        L.sfx('thud');
        L.shout(pickLine('story.flightHard'), d.x, GROUND - d.alt - DRAGON_H - 30);
        L.particles.emit(d.x, GROUND - d.alt, 10, 'puff', ['#d8cbb0', '#c9b896', '#efe6d2'], 90, 9, 0.9);
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
      // After a hard landing it shakes it off a moment before it walks.
      if (d.squash > 0) return;
      d.tilt = 0;
      d.x = Math.min(arrive, d.x + WALK * dt);
      d.alt = this.groundAt(d) + (L.reduceMotion ? 0 : Math.abs(Math.sin(d.t * 9)) * 6);
      if (d.x >= arrive) this.hop(d);
    } else if (d.state === 'hop') {
      const k = Math.min(1, d.t / HOP), to = this.seatX(d.seat);
      d.x = d.fromX + (to - d.fromX) * ease.inOutQuad(k);
      d.alt = d.fromAlt + (this.seatLift(d.seat) - d.fromAlt) * k + Math.sin(k * Math.PI) * 30;
      d.tilt *= 1 - k;
      if (k >= 1) this.home(d);
    } else if (d.state === 'home') {
      d.x = this.seatX(d.seat);
      // Now and then it is glad and hops.
      const glad = (this.t + d.seat * 1.9) % GLAD_EVERY;
      d.alt = this.seatLift(d.seat) + (L.reduceMotion || glad > GLAD_HOP ? 0 : Math.sin((glad / GLAD_HOP) * Math.PI) * 16);
    }
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
    d.alt = this.seatLift(d.seat);
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
    this.pit.draw(g);
    const shake = this.bushShake > 0 && !L.reduceMotion ? Math.sin(this.t * 40) * 0.05 : 0;
    // The seated ones further back first; dragons behind the bushes are the ones in them.
    const seated = this.dragons.filter((d) => d.state === 'home').sort((a, b) => this.seatLift(b.seat) - this.seatLift(a.seat));
    for (const d of seated) this.drawFlyer(g, d);
    for (const d of this.dragons) if (d.state === 'bush') this.drawFlyer(g, d);
    this.bushes.forEach((b, i) => drawSprite(g, b.pic, this.bushX(b.share), GROUND + 8, b.h, { ay: 1, flip: b.flip, rot: shake }, bushFallback(i)));
    for (const d of this.dragons) if (d.state !== 'bush' && d.state !== 'home') this.drawFlyer(g, d);
    if (this.current) {
      drawBubble(g, this.current.word, L.vw / 2, VH * 0.15);
      L.label(g, this.current, L.vw / 2, VH * 0.15);
    }
    if (this.endT === null) return;
    const line = tn('story.flightDone', this.flown, { n: this.flown, m: this.done });
    rimmed(g, line, L.vw / 2, VH * 0.24, 40, Math.min(1, this.endT / 0.4));
  }

  private drawFlyer(g: G, d: Flyer): void {
    const motion = !this.L.reduceMotion;
    const flying = d.state === 'fly' || d.state === 'hop' || d.state === 'fall';
    // Wings beat while it climbs; a hard landing squashes it.
    const flap = (flying && d.flap && motion ? Math.sin(this.t * 16) : 0) + (motion ? Math.sin(d.squash * Math.PI) * 3 : 0);
    const wobble = d.state === 'bush' && d.t > DROP && d.t < SHAKE && motion ? Math.sin(this.t * 30) * 0.12 : 0;
    // In the air it leans (nose up climbing, down gliding) and rocks gently.
    const rot = flying ? d.tilt + (motion && d.state === 'fly' ? ROCK * Math.sin(this.t * 2.6 + d.seat) : 0) : wobble;
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
const LINE_SIZE = 34;
const CIRCLE_Y = VH * 0.24;
const CIRCLE_RX = 190;
const CIRCLE_RY = 55;
/** Seconds of one round. */
const ROUND = 9;
const FLY_H = 92;
const SLEEP_H = 76;
const COME = 1.5;
const DOWN = 1.6;
const NEXT_LINE = 0.9;
const SLIP_FADE = 0.6;
/** Lines of the lullaby that put one dragon to sleep. */
const VERSE = 2;
/** The fire pit of the lullaby and the take-off, smaller than in the flames. */
const PIT_SMALL = 70;
/** Where the sleeping dragons lie beside the pit: each a little higher, so further back. */
const SLEEP_SPOTS = [{ dx: -115, up: 0 }, { dx: 110, up: 12 }, { dx: -185, up: 26 }, { dx: 175, up: 38 }, { dx: -40, up: 50 }];

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
 * period. Two lines copied without a slip put one dragon to sleep: it glides down by the fire; a
 * line with a slip is written again.
 */
export class LullabyMode extends Mode {
  readonly pictures = [...DRAGONS, 'obj-dragon-sleeping', ...PIT_PICTURES];
  readonly world = 'dragons';
  private pit: Firepit;
  private dragons: Circler[] = [];
  private planned = FLOCK_START;
  private asleep = 0;
  /** Lines of the verse typed so far. */
  private verse = 0;
  private line = '';
  private current: Target | null = null;
  private slip: number | null = null;
  /** Seconds until the next line; -1 when none is due. */
  private nextIn = -1;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.pit = new Firepit(L, L.vw * PIT_AT, PIT_SMALL).burn(0.7);
  }

  startLine(): string {
    return pickLine('story.lullabyStart');
  }

  start(): void {
    for (let i = 0; i < this.planned; i++) this.addDragon('circle');
    this.ask(this.newLine());
  }

  /** A line of the lullaby: a sentence of four or five short words. */
  private newLine(): string {
    return this.L.word(5, 5, 4);
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

  /** Where a sleeping dragon lies (its feet), kept on the stage. */
  private sleepSpot(i: number): { x: number; y: number; up: number } {
    const s = SLEEP_SPOTS[i % SLEEP_SPOTS.length];
    return { x: Math.min(this.L.vw - 60, this.pit.x + s.dx), y: GROUND + 4 - s.up, up: s.up };
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
    // The first line of a verse makes them a little sleepy; the last one puts one to sleep.
    if (++this.verse < VERSE) {
      const d = this.dragons.find((o) => o.state === 'circle');
      if (d) {
        const c = this.circle(d);
        L.particles.emit(c.x, c.y - FLY_H * 0.6, 6, 'sparkle', ['#fff6a8', '#d8d0ff'], 60, 6);
      }
      this.nextIn = NEXT_LINE * 0.6;
      return;
    }
    this.verse = 0;
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
        const s = this.sleepSpot(d.seat);
        this.L.particles.emit(s.x, s.y - SLEEP_H * 0.6, 6, 'sparkle', ['#fff6a8', '#d8d0ff'], 60, 6);
      }
    }
    if (this.slip !== null && (this.slip += dt) >= SLIP_FADE) {
      this.slip = null;
      this.ask(this.line);
    }
    if (this.nextIn >= 0 && (this.nextIn -= dt) < 0) this.ask(this.newLine());
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
    // The sleepers further back (higher) first, the pit among them, the nearer ones over it.
    const sleepers = this.dragons.filter((d) => d.state === 'sleep').sort((a, b) => this.sleepSpot(b.seat).up - this.sleepSpot(a.seat).up);
    for (const d of sleepers) if (this.sleepSpot(d.seat).up > 10) this.drawSleeper(g, d);
    this.pit.draw(g);
    for (const d of sleepers) if (this.sleepSpot(d.seat).up <= 10) this.drawSleeper(g, d);
    for (const d of this.dragons) if (d.state !== 'sleep') this.drawCircler(g, d);
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
    // The lines of the verse: a small dot for each, filled once typed.
    for (let i = 0; i < VERSE; i++) {
      g.save();
      g.fillStyle = i < this.verse ? '#9b86c9' : 'rgba(155,134,201,0.3)';
      g.beginPath();
      g.arc(p.cx + (i - (VERSE - 1) / 2) * 18, p.y + h / 2 - 12, 5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    if (this.current) L.label(g, this.current, p.cx, p.y - 4, size);
    if (this.slip !== null) {
      g.save();
      g.globalAlpha = 1 - this.slip / SLIP_FADE;
      g.font = `600 ${size}px ${fontFamily()}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = SLIP_INK;
      g.fillText(this.line, p.cx, p.y - 4);
      g.restore();
    }
  }

  private drawSleeper(g: G, d: Circler): void {
    const s = this.sleepSpot(d.seat);
    drawSprite(g, 'obj-dragon-sleeping', s.x, s.y, SLEEP_H, { ay: 1, flip: s.x > this.pit.x }, (g2, _w, h) => drawDragon(g2, d.pic, 0, h / 2, h));
    // A small "z z" floats up.
    const k = (this.t * 0.4 + d.seat * 0.37) % 1;
    g.save();
    g.globalAlpha = Math.sin(k * Math.PI) * 0.9;
    g.font = `700 ${18 + k * 8}px ${fontFamily()}`;
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.fillText('z z', s.x + 20 + k * 14, s.y - SLEEP_H - 6 - k * 40);
    g.restore();
  }

  private drawCircler(g: G, d: Circler): void {
    const L = this.L;
    const flap = L.reduceMotion ? 0 : Math.sin(this.t * 10 + d.phase) * 0.6;
    const c = this.circle(d);
    if (d.state === 'circle') return drawDragon(g, d.pic, c.x, c.y, FLY_H, flap, c.face);
    if (d.state === 'come') {
      const k = ease.outQuad(Math.min(1, d.t / COME));
      return drawDragon(g, d.pic, L.vw + 80 + (c.x - L.vw - 80) * k, c.y - (1 - k) * 60, FLY_H, flap, -1);
    }
    // Gliding down to its place by the fire.
    const k = ease.inOutQuad(Math.min(1, d.t / DOWN)), to = this.sleepSpot(d.seat);
    drawDragon(g, d.pic, d.fromX + (to.x - d.fromX) * k, d.fromY + (to.y - d.fromY) * k, FLY_H - (FLY_H - SLEEP_H) * k, 0, to.x < d.fromX ? -1 : 1, 1, 0.1);
  }

  progress(): number {
    return Math.min(1, (this.asleep + this.verse / VERSE) / this.planned);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** After this many returns a dragon's tries get one set less and more time per word; after this many its sets have two words and a slip or a late word only restarts that word. */
const SAFE_AFTER = 3;
const SOFT_AFTER = 6;
const SAFE_TIME = 1.25;
/** A word's time in the take-off: the child's own pace (the stream's time), tighter. */
const WORD_PACE = 0.6;

/** A take-off try: its sets, words per set, the factor of each word's time, and whether a miss only restarts the word. */
export function takeoffPlan(first: boolean, returns: number): { sets: number; words: [number, number]; time: number; soft: boolean } {
  const safe = returns >= SAFE_AFTER, soft = returns >= SOFT_AFTER;
  return { sets: (first ? 3 : 4) - (safe ? 1 : 0), words: soft ? [2, 2] : [2, 3], time: safe ? SAFE_TIME : 1, soft };
}

/** The take-off: the height it lifts off to (about the middle of the stage) and the highest one, the row's height, and seconds of a return and the flight away. */
const TAKE_LOW = 260;
const TAKE_TOP = 330;
const ROW_Y = VH * 0.16;
const BACK = 1.4;
const GONE = 2.2;
/** How fast a flying dragon follows the typing: slow with a calm rhythm, quick with a good one (per second). */
const FOLLOW = [0.8, 3];
/** How far a dragon sinks while the typing pauses, per second, and at most. */
const SINK = 10;
const SINK_MAX = 30;
/** A flying dragon turns so its back is about level (it faces left); it sways gently round that and pulses a little wider and back. */
const FLY_ROT = -1.05;
const SWAY = 0.06;
const PULSE = 0.05;
/** The end: the fire goes out, the egg shows, the cheer, the level ends. */
const FIRE_OUT = 2;
const EGG_IN = 1.5;
const CHEER_AT = FIRE_OUT + EGG_IN;
const TAKEOFF_END = CHEER_AT + 2;
const EGG_H = 86;
const ROW_INK = '#3d3355';
/** The word's time: a round clock right of the row, in the look of the HUD's round buttons; it blinks in its last quarter. */
const CLOCK_R = 22;
const CLOCK_BLINK = 0.25;

interface Sitter {
  pic: string;
  seat: number;
  /** sit: by the pit; ready: by the pit, its first set waits (no clock); fly: on its way; back: gliding back to the pit; gone: flying off to the left. */
  state: 'sit' | 'ready' | 'fly' | 'back' | 'gone';
  t: number;
  x: number;
  alt: number;
  rot: number;
  fromX: number;
  fromAlt: number;
  sink: number;
  returns: number;
}

/** The word's time left as a round clock: a green ring that empties (blinking at the end) round a green disc with an hourglass. */
function drawClock(g: G, x: number, y: number, share: number, t: number, motion: boolean): void {
  const k = Math.max(0, Math.min(1, share));
  const blink = k < CLOCK_BLINK && motion ? 0.45 + 0.55 * Math.abs(Math.cos(t * 7)) : 1;
  g.save();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(x, y, CLOCK_R + 2, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(47,138,76,0.18)';
  g.beginPath();
  g.arc(x, y, CLOCK_R - 1, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = blink;
  g.strokeStyle = '#4fb57a';
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y, CLOCK_R - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
  g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = '#2f8a4c';
  g.beginPath();
  g.arc(x, y, CLOCK_R - 5.5, 0, Math.PI * 2);
  g.fill();
  // The hourglass.
  const s = CLOCK_R * 0.42;
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x - s * 0.7, y - s);
  g.lineTo(x + s * 0.7, y - s);
  g.lineTo(x - s * 0.7, y + s);
  g.lineTo(x + s * 0.7, y + s);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(x - s * 0.45 * k, y - s * (0.2 + 0.6 * k));
  g.lineTo(x + s * 0.45 * k, y - s * (0.2 + 0.6 * k));
  g.lineTo(x, y);
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * Valley 5, the take-off (super-obstacle): in the morning the dragons sit by the pit and one by one
 * fly to the left, to the crystal meadow. A flight is a few sets of short words: the dragon flies on
 * smoothly as the words are typed, quicker with a good rhythm; a set typed without a slip and every
 * word in its time takes it a step higher and further. A late word or a slip counts as a mistake and
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
    this.pit = new Firepit(L, L.vw * PIT_AT, PIT_SMALL).burn(0.6);
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
    this.dragons.push({ pic: DRAGONS[i % DRAGONS.length], seat: i, state: 'sit', t: 0, x, alt: 0, rot: 0, fromX: x, fromAlt: 0, sink: 0, returns: 0 });
  }

  private after(seconds: number, fn: () => void): void {
    this.later = { in: seconds, fn };
  }

  private get flyer(): Sitter | undefined {
    return this.dragons[this.done];
  }

  /** The next dragon tries (again): new sets; it sits until its first set is typed (no clock), then lifts off. */
  private flight(): void {
    const L = this.L, d = this.flyer!;
    const plan = takeoffPlan(this.done === 0, d.returns);
    this.soft = plan.soft;
    this.timeK = plan.time;
    this.sets = Array.from({ length: plan.sets }, () => Array.from({ length: L.rng.int(plan.words[0], plan.words[1]) }, () => L.word(4, 1)));
    this.set = 0;
    d.state = 'ready';
    d.t = 0;
    d.sink = 0;
    this.showSet();
  }

  private showSet(): void {
    this.at = 0;
    this.slips = this.sets[this.set].map(() => -1);
    this.ask();
  }

  private ask(): void {
    const word = this.sets[this.set][this.at];
    this.current = this.L.core.add(word, {});
    this.timeFull = this.timeLeft = this.L.travelTime(word) * WORD_PACE * this.timeK;
  }

  /** How far along its way the dragon should be: the sets done after the take-off set and the letters typed of this one. */
  private way(): number {
    const n = this.sets[this.set]?.length ?? 1;
    const typed = this.current ? this.current.typed / this.current.word.length : 0;
    return Math.max(0, Math.min(1, (this.set - 1 + (this.at + typed) / n) / Math.max(1, this.sets.length - 1)));
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    const L = this.L;
    L.core.prune();
    this.current = null;
    L.sfx('pop');
    if (++this.at < this.sets[this.set].length) return this.ask();
    // A clean set; the first one lifts the dragon off.
    const d = this.flyer!;
    this.set++;
    if (d.state === 'ready') {
      d.state = 'fly';
      d.t = 0;
    }
    L.sfx('whoosh');
    L.particles.emit(d.x, GROUND - d.alt - DRAGON_H * 0.5, 8, 'sparkle', ['#fff6a8', '#ffd25a'], 110, 6);
    if (this.set < this.sets.length) this.showSet();
    else this.away(d);
  }

  onWrong(tg: Target | null): void {
    if (this.current && tg === this.current) this.miss(true);
  }

  /** A slip or a late word (a late one counts as a mistake too): the dragon glides back to the pit and tries again, or (soft) the word starts again. */
  private miss(slip: boolean): void {
    const L = this.L, word = this.current!.word;
    if (!slip) L.errors++;
    L.core.release(this.current!, false);
    L.core.prune();
    this.current = null;
    // Still by the pit, or soft after many returns: only the word starts again.
    if (this.soft || this.flyer!.state === 'ready') {
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
    const L = this.L, home = spot(this.pit.x, d.seat, L.vw);
    if (d.state === 'sit' || d.state === 'ready') {
      d.x = home;
      d.alt = 0;
      d.rot = 0;
    } else if (d.state === 'fly') {
      // It follows the typing smoothly, quicker with a better rhythm, and sinks a little while the typing pauses.
      const k = this.way(), left = TAPKO_X + 220;
      d.sink = Math.max(0, Math.min(SINK_MAX, d.sink + (L.idleFor > 0.8 ? SINK : -SINK * 3) * dt));
      const tx = home - (home - left) * k, talt = TAKE_LOW + (TAKE_TOP - TAKE_LOW) * k - d.sink;
      const rate = FOLLOW[0] + (FOLLOW[1] - FOLLOW[0]) * Math.max(0, Math.min(1, L.rhythm.ratio(L.difficulty)));
      const f = Math.min(1, dt * rate);
      d.x += (tx - d.x) * f;
      d.alt += (talt - d.alt) * f;
      d.rot += (FLY_ROT - d.rot) * Math.min(1, dt * 3);
    } else if (d.state === 'back') {
      const k = Math.min(1, d.t / BACK), e = ease.inOutQuad(k);
      d.x = d.fromX + (home - d.fromX) * e;
      d.alt = d.fromAlt * (1 - e) + Math.sin(k * Math.PI) * 30;
      d.rot *= 1 - Math.min(1, dt * 4);
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
    this.pit.draw(g);
    const motion = !L.reduceMotion;
    this.dragons.forEach((d, i) => {
      if (i < this.done) return;
      const air = d.state === 'fly' || d.state === 'gone' || (d.state === 'back' && d.alt > 0);
      const seated = d.state === 'sit' || d.state === 'ready';
      // In the air it sways round its lean and pulses a little wider (no bobbing up and down); on the ground a slow small bob.
      const sway = air && motion ? SWAY * Math.sin(this.t * 2.2) : 0;
      const pulse = air && motion ? PULSE * Math.sin(this.t * 4.5) : 0;
      const bob = seated && motion ? Math.abs(Math.sin(this.t * 1.6 + i)) * 2 : 0;
      // A dragon that came later fades in.
      const alpha = seated && i >= FLOCK_START ? Math.min(1, d.t / 0.6) : 1;
      drawDragon(g, d.pic, d.x, GROUND - d.alt - bob, seated ? SIT_H : DRAGON_H, 0, air ? -1 : 1, alpha, d.rot + sway, pulse);
    });
    const d = this.flyer;
    if (this.endT !== null || !d || (d.state !== 'ready' && d.state !== 'fly' && d.state !== 'back') || !this.sets.length) return;
    const row = this.sets[this.set] ?? [];
    const w = drawRow(g, L, row.map((word, i) => ({ word, slip: this.slips[i] ?? -1 })), this.at, this.current, L.vw / 2, ROW_Y, L.vw - 2 * (TAPKO_X + 110), ROW_INK);
    if (this.current && d.state === 'fly' && !L.noPressure) drawClock(g, L.vw / 2 + w / 2 + CLOCK_R + 26, ROW_Y, this.timeLeft / this.timeFull, this.t, motion);
  }

  /** The egg the dragons left behind the burnt-out pit, with a soft glow. */
  private drawEgg(g: G): void {
    if (this.endT === null || this.endT < FIRE_OUT) return;
    const a = Math.min(1, (this.endT - FIRE_OUT) / EGG_IN);
    const x = this.pit.x + 14, y = GROUND - PIT_SMALL * 0.35, r = EGG_H * 1.1;
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
