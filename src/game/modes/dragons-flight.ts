import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, fontFamily, type G, wordBox } from '../../gfx/draw';
import { tn } from '../../i18n/i18n';
import { Mode, TAPKO_FEET, TAPKO_H, TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { drawRow } from './kit/copy-row';
import { BUSHES, DRAGONS, FLOCK_MAX, FLOCK_START, Firepit, GROUND, PIT_PICTURES, PIT_RATIO, SLEEPERS, bushFallback, drawDragon, flockFor, rimmed, sleeperOf } from './dragons';

/** The fire pit stands on the right in the flight levels; the dragons sit round it at these offsets. */
const PIT_AT = 0.8;
const SPOTS = [-105, 105, -170, 170, -235];
/** A dragon's height, the same sitting and flying. */
const DRAGON_H = 108;
/** Where a dragon waits for its flight, just right of Tapko. */
const START_X = TAPKO_X + 170;
/** Seconds of the end before the level ends. */
const END_TIME = 3.4;
const SLIP_INK = '#d9482b';

/** Where a dragon sits by the pit, kept on the stage. */
function spot(pitX: number, i: number, vw: number): number {
  return Math.min(vw - 60, pitX + SPOTS[i % SPOTS.length]);
}

/** In the flying lessons the pit stands at the right edge (wholly on the stage); the dragons sit left of where it stood before, each a little further left and higher, out of its fire. */
const FLIGHT_PIT_AT = 0.95;
const SEAT_AT = 0.9;
/** The pit is smaller in the flying lessons, so the dragons are the scene. */
const FLIGHT_PIT_H = 64;
const SEAT_FIRST = 80;
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
/**
 * The flight's top at full lift, and how flat it is: the height follows sin^FLAT of the way, so the
 * dragon climbs fast, flies nearly level through the middle and comes down fast (not a half circle).
 * Then the bushes' height and how high a dragon's feet must be to pass over them.
 */
const MAX_ALT = 270;
const FLAT = 0.4;
const FLY_BUSH_H = 150;
const BUSH_TOP = 140;
const BUSH_HALF = 70;
/** The two bushes, as shares of the bush spread: the left one and the middle one. */
const BUSH_SHARES = [0, 0.5];
const LAST_BUSH = BUSH_SHARES[BUSH_SHARES.length - 1];
/** Seconds in the bushes: dropping in, shaking (the shout), climbing out; then walking speed. */
const DROP = 0.4;
const SHAKE = 1.4;
const CLIMB = 2.2;
const WALK = 120;
const HOP = 0.5;
/** A dragon not yet at the bushes glides this many seconds forward and down onto the nearest one. */
const GLIDE_IN = 1;
/** In the last part of a landing hop it turns upright, into its sitting pose. */
const UPRIGHT = 0.4;
/** Slips during one flight: the second makes the dragon cry out and wobble, the third ends the flight. */
const OOPS_AT = 2;
const DOWN_AT = 3;
const WOBBLE = 0.8;

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
  /** Climbing (its lift still rising) or gliding. */
  climb: boolean;
  /** Its lean, easing toward climbing or gliding; its fall speed; the squash of a hard landing (1..0). */
  tilt: number;
  vy: number;
  squash: number;
  /** Seconds in the state. */
  t: number;
  /** Where it was when the state began (bush, hop), and its lean then. */
  fromX: number;
  fromAlt: number;
  fromTilt: number;
  /** Where it drops into the bushes, and the seconds it takes. */
  toX: number;
  drop: number;
  flew: boolean;
  /** Its place by the pit. */
  seat: number;
  /** Slips during its flight, and seconds of the wobble the second one gave it. */
  slips: number;
  wobble: number;
}

/**
 * Valley 3, flying lessons (a word stream with rhythm): a dragon waits right of Tapko, three bushes
 * stand in the middle, the burning pit on the right. Words come one at a time in a bubble high in
 * the middle; the first typed word starts the flight, a slow arc whose height follows the rhythm.
 * Too low over the bushes it lands in them with a giggle and walks on. A second slip in a flight
 * makes it cry out and wobble, a third ends the flight (into the bushes, or a hard landing past
 * them). Every dragon reaches the fire, and the end counts how many flew.
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
  /** The last flight is over. */
  private over = false;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.pit = new Firepit(L, this.pitX(), FLIGHT_PIT_H).burn(0.8);
  }

  startLine(): string {
    return pickLine('story.flightStart');
  }

  /** The pit near the right edge, its picture wholly on the stage. */
  private pitX(): number {
    return Math.min(this.L.vw * FLIGHT_PIT_AT, this.L.vw - (FLIGHT_PIT_H * PIT_RATIO) / 2 - 8);
  }

  /** The stars also count the flyers: all of them 3, at least half 2, else 1. */
  starCap(): number {
    if (!this.done || this.flown === this.done) return 3;
    return this.flown * 2 >= this.done ? 2 : 1;
  }

  /** A dragon's seat left of the pit, and how much higher on the ground it sits. */
  private seatX(i: number): number {
    return this.L.vw * SEAT_AT - SEAT_FIRST - (i % SEAT_LIFT.length) * SEAT_GAP;
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
    const r = this.L.rng;
    this.bushes = r.shuffle(BUSHES).slice(0, BUSH_SHARES.length).map((pic, i) => ({ share: BUSH_SHARES[i], pic, flip: r.chance(0.5), h: FLY_BUSH_H * r.range(0.92, 1.05) }));
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
    this.dragons.push({
      pic: DRAGONS[i % DRAGONS.length], x: START_X, alt: 0, state: 'wait', p: 0, lift: 0, climb: false, tilt: 0, vy: 0, squash: 0, t: 0,
      fromX: START_X, fromAlt: 0, fromTilt: 0, toX: START_X, drop: DROP, flew: false, seat: i, slips: 0, wobble: 0,
    });
    // The wait between flights is not rhythm.
    this.L.rhythm.ready(performance.now());
  }

  /** The dragon of the current flight: waiting, flying, falling or in the bushes (one that walks on to the pit is done with it). */
  private get flyer(): Flyer | undefined {
    return this.dragons.find((d) => d.state === 'wait' || d.state === 'fly' || d.state === 'fall' || d.state === 'bush');
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
    if (!this.over) this.ask();
  }

  /** A slip during a flight: the second one makes the dragon cry out and wobble, the third ends its flight. */
  onWrong(tg: Target | null): void {
    const d = this.flyer;
    if (!this.current || tg !== this.current || d?.state !== 'fly') return;
    if (++d.slips === OOPS_AT) {
      d.wobble = WOBBLE;
      this.L.shout(pickLine('story.flightOops'), d.x, GROUND - d.alt - DRAGON_H - 30);
    } else if (d.slips >= DOWN_AT) {
      if (d.x > this.bushX(LAST_BUSH) + BUSH_HALF) this.fall(d);
      else this.toBush(d);
    }
  }

  /** It drops after the bushes and lands hard (it flew over them). */
  private fall(d: Flyer): void {
    d.state = 'fall';
    d.flew = true;
    d.vy = 0;
  }

  /** Down into the bushes; one not there yet first glides forward onto the nearest. */
  private toBush(d: Flyer): void {
    d.state = 'bush';
    d.t = 0;
    d.fromX = d.x;
    d.fromAlt = d.alt;
    d.toX = Math.max(d.x, this.bushX(0));
    d.drop = d.toX > d.x + 10 ? GLIDE_IN : DROP;
    this.L.sfx('plop');
  }

  /** The lift the rhythm asks for, full from 80 % of the goal; a pause in typing takes it away. */
  private liftAim(): number {
    const idle = Math.max(0, Math.min(1, (this.L.idleFor - IDLE_GRACE) / IDLE_FALL));
    return Math.min(1, this.L.rhythm.ratio(this.L.difficulty) / LIFT_RATIO) * (1 - idle);
  }

  update(dt: number): void {
    this.pit.x = this.pitX();
    this.pit.update(dt);
    this.bushShake = Math.max(0, this.bushShake - dt);
    for (const d of this.dragons) this.move(d, dt);
    if (this.nextIn >= 0 && (this.nextIn -= dt) < 0) this.newDragon();
    if (this.endT !== null) this.endT += dt;
    else if (this.over && this.dragons.every((d) => d.state === 'home')) this.endT = 0;
  }

  private move(d: Flyer, dt: number): void {
    d.t += dt;
    d.squash = Math.max(0, d.squash - dt * 2.5);
    d.wobble = Math.max(0, d.wobble - dt);
    const L = this.L;
    const arrive = this.seatX(d.seat);
    const right = this.bushX(LAST_BUSH) + BUSH_HALF;
    if (d.state === 'fly') {
      d.p = Math.min(1, d.p + dt / FLIGHT_S);
      const aim = this.liftAim();
      d.climb = aim > d.lift + 0.01;
      d.lift += (aim - d.lift) * Math.min(1, dt * LIFT_EASE);
      d.tilt += ((d.climb ? TILT_UP : TILT_GLIDE) - d.tilt) * Math.min(1, dt * 3);
      d.x = START_X + (arrive - START_X) * d.p;
      d.alt = this.groundAt(d) + MAX_ALT * d.lift * Math.sin(Math.PI * d.p) ** FLAT;
      const left = this.bushX(0) - BUSH_HALF;
      // Over the bushes and the typing stopped: it drops and lands hard (it still flew over them).
      if (d.x > right && aim < HARD_AIM && d.p < 0.95 && d.alt > this.groundAt(d) + 20) this.fall(d);
      else if (d.x >= left && d.x <= right && d.alt < BUSH_TOP) this.toBush(d);
      else if (d.p >= 1) {
        d.flew = true;
        this.hop(d);
        this.flightOver();
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
        this.flightOver();
        L.sfx('thud');
        L.shout(pickLine('story.flightHard'), d.x, GROUND - d.alt - DRAGON_H - 30);
        L.particles.emit(d.x, GROUND - d.alt, 10, 'puff', ['#d8cbb0', '#c9b896', '#efe6d2'], 90, 9, 0.9);
      }
    } else if (d.state === 'bush') {
      const shake = d.drop + SHAKE - DROP, climb = d.drop + CLIMB - DROP;
      if (d.t < d.drop) {
        const k = ease.outQuad(d.t / d.drop);
        d.x = d.fromX + (d.toX - d.fromX) * k;
        d.alt = d.fromAlt + (BUSH_TOP * 0.35 - d.fromAlt) * k;
      } else if (d.t < shake) {
        if (d.t - dt < d.drop) {
          d.x = d.toX;
          this.bushShake = SHAKE - DROP;
          L.shout(pickLine('story.flightBush'), d.x, GROUND - d.alt - DRAGON_H - 30);
          L.particles.emit(d.x, GROUND - BUSH_TOP, 10, 'leaf', ['#4f8a4a', '#9ccf7a'], 140, 7);
        }
      } else if (d.t < climb) {
        const k = ease.inOutQuad((d.t - shake) / (climb - shake));
        const out = this.bushX(LAST_BUSH) + BUSH_HALF + 30;
        d.x = d.toX + (out - d.toX) * k;
        d.alt = BUSH_TOP * 0.35 * (1 - k) + Math.sin(k * Math.PI) * 50;
      } else {
        d.state = 'walk';
        d.alt = 0;
        this.flightOver();
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
      // Just before it touches down it turns upright.
      d.tilt = d.fromTilt * (1 - ease.inOutQuad(Math.max(0, (k - (1 - UPRIGHT)) / UPRIGHT)));
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
    d.fromTilt = d.tilt;
  }

  private home(d: Flyer): void {
    d.state = 'home';
    d.alt = this.seatLift(d.seat);
    this.L.sfx('cheer');
  }

  /** A flight is over (landed by the pit, in the bushes or hard): the next dragon comes while this one goes on to its seat. */
  private flightOver(): void {
    const L = this.L, d = this.dragons[this.done];
    this.done++;
    if (d.flew) this.flown++;
    this.planned = flockFor(L, this.planned, this.done);
    if (this.done < this.planned) {
      this.nextIn = 0.8;
      return;
    }
    if (this.done >= FLOCK_MAX) L.endMinimum();
    // The last flight: no more words; the end comes once every dragon sits by the pit.
    this.over = true;
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
    if (this.current) L.label(g, this.current, L.vw / 2, VH * 0.15);
    if (this.endT === null) return;
    const line = tn('story.flightDone', this.flown, { n: this.flown, m: this.done });
    rimmed(g, line, L.vw / 2, VH * 0.24, 40, Math.min(1, this.endT / 0.4));
  }

  private drawFlyer(g: G, d: Flyer): void {
    const motion = !this.L.reduceMotion;
    const gliding = d.state === 'bush' && d.t < d.drop;
    const flying = d.state === 'fly' || d.state === 'hop' || d.state === 'fall' || gliding;
    // A hard landing squashes it.
    const squash = motion ? Math.sin(d.squash * Math.PI) * 3 : 0;
    const shaken = d.state === 'bush' && d.t > d.drop && d.t < d.drop + SHAKE - DROP && motion ? Math.sin(this.t * 30) * 0.12 : 0;
    // A second slip rocks it quickly a moment.
    const wobble = motion && d.wobble > 0 ? Math.sin(this.t * 30) * 0.18 * (d.wobble / WOBBLE) : 0;
    // In the air it leans (nose up climbing, down gliding) and rocks gently.
    const rot = flying ? d.tilt + wobble + (motion && d.state === 'fly' ? ROCK * Math.sin(this.t * 2.6 + d.seat) : 0) : shaken;
    drawDragon(g, d.pic, d.x, GROUND - d.alt, DRAGON_H, squash, 1, 1, rot);
  }

  progress(): number {
    return Math.min(1, this.done / this.planned);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** The lullaby: the lines' letter size, the circle's middle height and size, and seconds of a few things. */
const LINE_SIZE = 34;
const CIRCLE_Y = VH * 0.24;
const CIRCLE_RX = 190;
const CIRCLE_RY = 55;
/** Seconds of one round. */
const ROUND = 9;
const FLY_H = 92;
/** A sleeper is no bigger than the dragons in flight. */
const SLEEP_H = 65;
/**
 * The circle seen a little from above: a dragon in front (low) is bigger and drawn over the ones
 * behind, by up to this share of its size; each one's circle is a little narrower and higher.
 */
const DEPTH = 0.13;
const RING_NARROW = 0.07;
const RING_UP = 9;
/**
 * A flying dragon leans forward the way it flies as in the take-off, its back about level (it should
 * not look seated). At the circle's sides it turns like a flat card turning round a pole through its
 * body: the lean stays, the card's width follows the turn's angle (cos), over about TURN_S seconds,
 * never thinner than TURN_MIN. Through the turn it stretches up a little and rises (a swoop).
 */
const LEAN = 1.05;
const TURN_MIN = 0.1;
const TURN_S = 0.45;
const TURN_STRETCH = 0.08;
const TURN_RISE = 10;
/** Wing beats: per second, how far the body bobs and how much it breathes with them. */
const BEAT = 0.8;
const BOB = 4;
const BREATH = 0.5;
/** A turning dragon in perspective: how much taller its nearer edge is, and the strips it is drawn in. */
const PERSPECTIVE = 0.3;
const CARD_STRIPS = 16;
const COME = 1.5;
const DOWN = 1.6;
const NEXT_LINE = 0.9;
const SLIP_FADE = 0.6;
/** Lines of the lullaby that put one dragon to sleep. */
const VERSE = 2;
/** Every this many slips in one line shorten it. */
const EASE_SLIPS = 3;
/** The panel: its left edge, the room above Tapko's head and left of the circling dragons. */
const PANEL_LEFT = 32;
const PANEL_ABOVE = 24;
const PANEL_CLEAR = 60;
const LINE_INK = '#3d3355';
/** The fire pit of the lullaby and the take-off, smaller than in the flames. */
const PIT_SMALL = 70;
/** Where the sleeping dragons lie beside the pit: each a little higher, so further back. */
const SLEEP_SPOTS = [{ dx: -115, up: 0 }, { dx: 110, up: 12 }, { dx: -185, up: 26 }, { dx: 175, up: 38 }, { dx: -40, up: 50 }];

/** A lullaby line made easier: about its last quarter goes, cut between words (at least one goes, one stays); its period stays. */
export function shortenLine(line: string): string {
  const end = line.endsWith('.') ? '.' : '', words = line.slice(0, line.length - end.length).split(' ');
  if (words.length < 2) return line;
  const aim = words.join(' ').length * 0.75, off = (k: number) => Math.abs(words.slice(0, k).join(' ').length - aim);
  let keep = 1;
  for (let k = 2; k < words.length; k++) if (off(k) < off(keep)) keep = k;
  return words.slice(0, keep).join(' ') + end;
}

interface Circler {
  pic: string;
  phase: number;
  state: 'come' | 'circle' | 'down' | 'sleep';
  t: number;
  /** Where it started gliding down from, its turn and how near it was then. */
  fromX: number;
  fromY: number;
  fromV: number;
  fromNear: number;
  seat: number;
}

/**
 * Valley 4, the lullaby (copy): in the evening the dragons circle above the burning pit and cannot
 * sleep. A panel top left shows a verse of the lullaby, two short sentences ending with a period,
 * one under the other. Both lines copied put one dragon to sleep: it glides down by the fire. A
 * line with a slip is written again, and every third slip in it makes it shorter.
 */
export class LullabyMode extends Mode {
  readonly pictures = [...DRAGONS, ...SLEEPERS, ...PIT_PICTURES];
  readonly world = 'dragons';
  private pit: Firepit;
  private dragons: Circler[] = [];
  private planned = FLOCK_START;
  private asleep = 0;
  /** The verse's lines and the one to type (`VERSE` once all are typed). */
  private lines: string[] = [];
  private verse = 0;
  /** Slips in the line to type. */
  private lineSlips = 0;
  private current: Target | null = null;
  /** A slipped line fading red, with its seconds. */
  private slip: { line: string; t: number } | null = null;
  /** Seconds until the next line; -1 when none is due. */
  private nextIn = -1;
  private endT: number | null = null;
  /** The picture a turning dragon is drawn into first. */
  private cardPic: HTMLCanvasElement | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.pit = new Firepit(L, L.vw * PIT_AT, PIT_SMALL).burn(0.7);
  }

  startLine(): string {
    return pickLine('story.lullabyStart');
  }

  start(): void {
    for (let i = 0; i < this.planned; i++) this.addDragon('circle');
    this.newVerse();
    this.ask();
  }

  /** A verse: lines of a sentence of four or five short words each. */
  private newVerse(): void {
    this.lines = Array.from({ length: VERSE }, () => this.L.word(5, 5, 4));
    this.verse = 0;
    this.lineSlips = 0;
  }

  /** A dragon that circles (one more comes flying in from the right). */
  private addDragon(state: 'come' | 'circle'): void {
    const i = this.dragons.length;
    this.dragons.push({ pic: DRAGONS[i % DRAGONS.length], phase: (i / FLOCK_MAX) * Math.PI * 2 * 1.3, state, t: 0, fromX: 0, fromY: 0, fromV: 0, fromNear: 0, seat: i });
  }

  private ask(): void {
    this.current = this.L.core.add(this.lines[this.verse], {});
  }

  /** Where a sleeping dragon lies (its feet), kept on the stage. */
  private sleepSpot(i: number): { x: number; y: number; up: number } {
    const s = SLEEP_SPOTS[i % SLEEP_SPOTS.length];
    return { x: Math.min(this.L.vw - 60, this.pit.x + s.dx), y: GROUND + 4 - s.up, up: s.up };
  }

  /** The circle's width: kept on the stage. */
  private circleRx(): number {
    return Math.max(80, Math.min(CIRCLE_RX, this.L.vw - this.pit.x - 70));
  }

  /**
   * Where on its circle above the pit a dragon is (its body's middle), how near (-1 behind .. 1 in
   * front) and its turn `v`: 1 facing right, -1 left. `v` follows its sideways speed, so it turns
   * only near the circle's sides, where it flies toward or away from us.
   */
  private circle(d: Circler): { x: number; y: number; near: number; v: number } {
    const a = d.phase + (this.t * Math.PI * 2) / ROUND, ring = d.seat % 3;
    const near = Math.sin(a), half = Math.sin((TURN_S / ROUND) * Math.PI);
    const x = this.pit.x + Math.cos(a) * this.circleRx() * (1 - ring * RING_NARROW) * (1 + DEPTH * near);
    return { x, y: CIRCLE_Y - ring * RING_UP + Math.sin(a) * CIRCLE_RY, near, v: Math.max(-1, Math.min(1, -near / half)) };
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    const L = this.L;
    this.current = null;
    L.core.prune();
    L.sfx('note');
    this.lineSlips = 0;
    // The first line of a verse makes them a little sleepy; the last one puts one to sleep.
    if (++this.verse < VERSE) {
      this.nextIn = NEXT_LINE * 0.6;
      return;
    }
    const d = this.dragons.find((o) => o.state === 'circle') ?? this.dragons.find((o) => o.state === 'come');
    if (d) {
      const c = this.circle(d);
      d.state = 'down';
      d.t = 0;
      d.fromX = c.x;
      d.fromY = c.y;
      d.fromV = c.v;
      d.fromNear = c.near;
      d.seat = this.asleep;
    }
    this.asleep++;
    // None left circling and the level still needs time: one more comes flying in.
    const before = this.planned;
    this.planned = flockFor(L, this.planned, this.asleep);
    if (this.planned > before) this.addDragon('come');
    if (this.asleep < this.planned) this.nextIn = NEXT_LINE;
    else if (this.asleep >= FLOCK_MAX) L.endMinimum();
  }

  /** A slip: the line fades red and starts again; every third slip in it shortens it first. */
  onWrong(tg: Target | null): void {
    if (!this.current || tg !== this.current) return;
    this.L.core.release(this.current, false);
    this.L.core.prune();
    this.current = null;
    this.slip = { line: this.lines[this.verse], t: 0 };
    if (++this.lineSlips % EASE_SLIPS === 0) this.lines[this.verse] = shortenLine(this.lines[this.verse]);
  }

  update(dt: number): void {
    this.pit.x = this.L.vw * PIT_AT;
    this.pit.update(dt);
    for (const d of this.dragons) {
      d.t += dt;
      if (d.state === 'come' && d.t >= COME) d.state = 'circle';
      if (d.state === 'down' && d.t >= DOWN) d.state = 'sleep';
    }
    if (this.slip && (this.slip.t += dt) >= SLIP_FADE) {
      this.slip = null;
      this.ask();
    }
    if (this.nextIn >= 0 && (this.nextIn -= dt) < 0) {
      if (this.verse >= VERSE) this.newVerse();
      this.ask();
    }
    if (this.endT !== null) this.endT += dt;
    else if (this.asleep >= this.planned && this.dragons.every((d) => d.state === 'sleep')) {
      this.endT = 0;
      this.L.say(pickLine('story.lullabyDone'), END_TIME);
    }
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
    // The flying ones further back first: the nearer ones fly in front of them.
    const flying = this.dragons.filter((d) => d.state !== 'sleep');
    const depth = (d: Circler) => (d.state === 'down' ? 2 : this.circle(d).near);
    for (const d of flying.sort((a, b) => depth(a) - depth(b))) this.drawCircler(g, d);
    if (this.endT === null && this.lines.length) this.drawPanel(g);
  }

  /**
   * The verse's panel top left: above Tapko's head, left of the circling dragons. Its lines one
   * under the other, the one to type a target, a typed one in ink, the one to come faint.
   */
  private drawPanel(g: G): void {
    const L = this.L;
    const maxW = this.pit.x - this.circleRx() - PANEL_CLEAR - PANEL_LEFT, bottom = TAPKO_FEET - TAPKO_H - PANEL_ABOVE;
    const widest = (size: number) => Math.max(1, ...this.lines.map((l) => wordBox(g, l, size).w));
    const size = Math.min(LINE_SIZE, (LINE_SIZE * (maxW - 60)) / widest(LINE_SIZE));
    const w = Math.min(maxW, widest(size) + 80), gap = size * 1.5, h = gap * VERSE + 30;
    const cx = PANEL_LEFT + w / 2, top = bottom - h;
    g.save();
    g.fillStyle = 'rgba(250,246,255,0.92)';
    g.strokeStyle = '#9b86c9';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(PANEL_LEFT, top, w, h, 22);
    g.fill();
    g.stroke();
    g.restore();
    this.lines.forEach((line, i) => {
      const y = top + 15 + gap * (i + 0.5);
      if (i === this.verse && this.current) return L.label(g, this.current, cx, y, size);
      const slipped = i === this.verse && this.slip;
      g.save();
      g.font = `600 ${size}px ${fontFamily()}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = slipped ? SLIP_INK : LINE_INK;
      g.globalAlpha = slipped ? 1 - this.slip!.t / SLIP_FADE : i < this.verse ? 1 : 0.35;
      g.fillText(slipped ? this.slip!.line : line, cx, y);
      g.restore();
    });
  }

  private drawSleeper(g: G, d: Circler): void {
    const s = this.sleepSpot(d.seat);
    drawSprite(g, sleeperOf(d.pic), s.x, s.y, SLEEP_H, { ay: 1, flip: s.x > this.pit.x }, (g2, _w, h) => drawDragon(g2, d.pic, 0, h / 2, h));
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

  /**
   * A dragon in flight: its body's middle at x, y, `v` its turn (1 right, -1 left), `size` its
   * nearness. The lean is drawn first, the turn after it, so a turning dragon narrows like a card
   * round a pole through its body and comes out mirrored, leaning the new way; it beats its wings.
   * `nose` 1 turns its nose toward us, -1 away: the card's nearer side is taller, so every turn reads
   * as the same way round (clockwise from above), whichever side of the circle it is on.
   */
  private fly(g: G, d: Circler, x: number, y: number, v: number, size: number, nose: number): void {
    const motion = !this.L.reduceMotion, beat = Math.sin((this.t * BEAT + d.phase) * Math.PI * 2);
    const w = Math.sin((v * Math.PI) / 2), turning = 1 - Math.abs(w), h = FLY_H * size;
    const lean = LEAN + (motion ? ROCK * Math.sin(this.t * 2.6 + d.phase) : 0);
    // Drawn from its feet: they go where its middle turns round.
    const draw = (to: G) => drawDragon(to, d.pic, (-h / 2) * Math.sin(lean), (h / 2) * Math.cos(lean), h, motion ? beat * BREATH : 0, 1, 1, lean);
    g.save();
    g.translate(x, y - turning * TURN_RISE * size + (motion ? beat * BOB : 0));
    g.scale(w < 0 ? -1 : 1, 1 + turning * TURN_STRETCH);
    const narrow = Math.max(TURN_MIN, Math.abs(w));
    if (narrow > 0.99) {
      g.scale(narrow, 1);
      draw(g);
    } else this.card(g, h, narrow, PERSPECTIVE * Math.sqrt(1 - w * w) * nose, draw);
    g.restore();
  }

  /**
   * A turning card in perspective: `draw` (round 0, 0, about `h` big) goes into a picture of its own,
   * then onto `g` in thin upright strips, `narrow` as wide, each strip taller toward the side `tip`
   * points to (a share of its height at the card's edge).
   */
  private card(g: G, h: number, narrow: number, tip: number, draw: (to: G) => void): void {
    const t = g.getTransform(), res = Math.min(3, Math.hypot(t.a, t.b) || 1), side = Math.ceil(h * 1.7);
    const c = (this.cardPic ??= document.createElement('canvas')), px = Math.ceil(side * res);
    if (c.width < px || c.height < px) c.width = c.height = px;
    const cg = c.getContext('2d')!;
    cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.clearRect(0, 0, px, px);
    cg.setTransform(res, 0, 0, res, px / 2, px / 2);
    draw(cg);
    const strip = side / CARD_STRIPS;
    for (let i = 0; i < CARD_STRIPS; i++) {
      const u = (i + 0.5) / CARD_STRIPS - 0.5, grow = 1 + tip * u * 2;
      g.drawImage(c, i * strip * res, 0, strip * res, px, (i * strip - side / 2) * narrow * grow, (-side / 2) * grow, strip * narrow * grow + 0.6, side * grow);
    }
  }

  private drawCircler(g: G, d: Circler): void {
    const L = this.L, c = this.circle(d), size = (near: number) => 1 + DEPTH * near;
    // Clockwise from above: on the right it turns its nose toward us, on the left away.
    if (d.state === 'circle') return this.fly(g, d, c.x, c.y, c.v, size(c.near), c.x > this.pit.x ? 1 : -1);
    if (d.state === 'come') {
      // In from the right, high, settling into its place on the circle; it turns into the circle's way at the end.
      const k = ease.outQuad(Math.min(1, d.t / COME)), turn = ease.inOutQuad(Math.max(0, Math.min(1, (d.t - COME + TURN_S) / TURN_S)));
      return this.fly(g, d, L.vw + 80 + (c.x - L.vw - 80) * k, c.y - (1 - k) * 60, -1 + (c.v + 1) * turn, size(c.near), -1);
    }
    // Gliding down to its place by the fire at the size it had, its feet landing there; it turns toward it first.
    const k = ease.inOutQuad(Math.min(1, d.t / DOWN)), to = this.sleepSpot(d.seat), way = to.x < d.fromX ? -1 : 1, s = size(d.fromNear);
    const toY = to.y - (FLY_H * s) / 2;
    this.fly(g, d, d.fromX + (to.x - d.fromX) * k, d.fromY + (toY - d.fromY) * k, d.fromV + (way - d.fromV) * ease.inOutQuad(Math.min(1, d.t / TURN_S)), s, way < d.fromV ? 1 : -1);
  }

  progress(): number {
    return Math.min(1, (this.asleep + (this.verse < VERSE ? this.verse / VERSE : 0)) / this.planned);
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
/**
 * A dragon that comes later flies in from behind the right edge in one arc, like the left side of
 * an umbrella: level at first, bending down to its seat, slowing as it lands. Its seconds, and the
 * height it starts at (a share of the stage's height, picked in this range).
 */
const ARRIVE = 2.8;
const ARRIVE_HIGH = [0.5, 0.75];
/** The share of the arrival in which it sits up for landing. */
const ARRIVE_UPRIGHT = 0.35;
/** How fast a flying dragon follows the typing: slow with a calm rhythm, quick with a good one (per second). */
const FOLLOW = [0.8, 3];
/** How far a dragon sinks while the typing pauses, per second, and at most. */
const SINK = 10;
const SINK_MAX = 30;
/** A flying dragon turns so its back is about level (it faces left); it sways gently round that and pulses a very little narrower and back. */
const FLY_ROT = -1.05;
const SWAY = 0.06;
const PULSE = 0.025;
/**
 * The end: Tapko calls after them, a quiet moment, the fire flares up (the egg goes in under the
 * big flames halfway), it is blown out, the egg greets, the cheer, the level ends.
 */
const FLARE_AT = 1.5;
const FLARE = 0.8;
const EGG_AT = FLARE_AT + FLARE / 2;
const BLOW_AT = FLARE_AT + FLARE;
const BLOW = 0.6;
const HELLO_AT = BLOW_AT + BLOW + 0.5;
const CHEER_AT = HELLO_AT + 1.6;
const TAKEOFF_END = CHEER_AT + 2;
const EGG_H = 86;
const ROW_INK = '#3d3355';
/** The word's time: a round clock right of the row, in the look of the HUD's round buttons; it blinks in its last quarter. */
const CLOCK_R = 22;
const CLOCK_BLINK = 0.25;

interface Sitter {
  pic: string;
  seat: number;
  /** come: flying in to the pit; sit: by the pit; ready: by the pit, its first set waits (no clock); fly: on its way; back: gliding back to the pit; gone: flying off to the left. */
  state: 'come' | 'sit' | 'ready' | 'fly' | 'back' | 'gone';
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
 * sends it back to the pit to try again, easier after a few returns. When the last is gone Tapko
 * calls after them, the fire flares up and is blown out, and an egg sits in the pit and greets him.
 */
export class TakeoffMode extends Mode {
  readonly pictures = [...DRAGONS, 'obj-egg-plain', ...PIT_PICTURES];
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

  /** A dragon by the pit, or (`come`) one flying in from the right. */
  private addDragon(come = false): void {
    const L = this.L, i = this.dragons.length, x = come ? L.vw + 90 : spot(this.pit.x, i, L.vw);
    const alt = come ? GROUND - VH * (1 - L.rng.range(ARRIVE_HIGH[0], ARRIVE_HIGH[1])) : 0;
    this.dragons.push({ pic: DRAGONS[i % DRAGONS.length], seat: i, state: come ? 'come' : 'sit', t: 0, x, alt, rot: come ? FLY_ROT : 0, fromX: x, fromAlt: alt, sink: 0, returns: 0 });
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
    if (this.planned > before) this.addDragon(true);
    // The next one may be the one just coming: it lands first.
    if (this.done < this.planned) return this.after(this.flyer!.state === 'come' ? ARRIVE + 0.4 : 1, () => this.flight());
    if (this.done >= FLOCK_MAX) L.endMinimum();
    // Tapko calls after them (over the last one's line), then the egg comes from the fire.
    this.endT = 0;
    L.hideBubble();
    L.say(pickLine('story.takeoffBye'), 2);
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
    const e = this.endT, now = (this.endT += dt);
    const at = (s: number) => e < s && now >= s;
    this.pit.flare = ease.outQuad(Math.max(0, Math.min(1, (now - FLARE_AT) / FLARE)));
    if (at(FLARE_AT)) L.sfx('whoosh');
    if (at(BLOW_AT)) {
      this.pit.blowOut(BLOW);
      L.sfx('pop');
    }
    if (at(HELLO_AT)) L.shout(pickLine('story.eggHello'), this.pit.x, GROUND - PIT_SMALL * 0.35 - EGG_H - 30);
    if (at(CHEER_AT)) {
      L.setMood('happy', 3);
      L.hooray();
    }
  }

  private move(d: Sitter, dt: number): void {
    d.t += dt;
    const L = this.L, home = spot(this.pit.x, d.seat, L.vw);
    if (d.state === 'come') {
      // A quarter of an ellipse round the point under its start: level at first, down onto its seat at the end, slowing.
      const k = Math.min(1, d.t / ARRIVE), a = (Math.PI / 2) * ease.outQuad(k);
      d.x = d.fromX - (d.fromX - home) * Math.sin(a);
      d.alt = d.fromAlt * Math.cos(a);
      // It flies leaning as in its take-off and sits up for landing.
      d.rot = FLY_ROT * (1 - ease.inOutQuad(Math.max(0, (k - (1 - ARRIVE_UPRIGHT)) / ARRIVE_UPRIGHT)));
      if (k >= 1) {
        d.state = 'sit';
        d.alt = 0;
        d.rot = 0;
      }
    } else if (d.state === 'sit' || d.state === 'ready') {
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
    this.pit.draw(g, (g2) => this.drawEgg(g2));
    const motion = !L.reduceMotion;
    this.dragons.forEach((d, i) => {
      if (i < this.done) return;
      const air = d.state === 'fly' || d.state === 'gone' || d.state === 'come' || (d.state === 'back' && d.alt > 0);
      // In the air it sways round its lean and pulses a very little narrower (no bobbing up and down).
      const sway = air && motion ? SWAY * Math.sin(this.t * 2.2) : 0;
      const pulse = air && motion ? -PULSE * (0.5 + 0.5 * Math.sin(this.t * 4.5)) : 0;
      // Only the dragon about to take off bobs a little; the others sit still.
      const bob = d.state === 'ready' && motion ? Math.abs(Math.sin(this.t * 1.6)) * 2 : 0;
      // They all face the way they fly off, to the left.
      drawDragon(g, d.pic, d.x, GROUND - d.alt - bob, DRAGON_H, 0, -1, 1, d.rot + sway, pulse);
    });
    const d = this.flyer;
    if (this.endT !== null || !d || (d.state !== 'ready' && d.state !== 'fly' && d.state !== 'back') || !this.sets.length) return;
    const row = this.sets[this.set] ?? [];
    const w = drawRow(g, L, row.map((word, i) => ({ word, slip: this.slips[i] ?? -1 })), this.at, this.current, L.vw / 2, ROW_Y, L.vw - 2 * (TAPKO_X + 110), ROW_INK);
    if (this.current && d.state === 'fly' && !L.noPressure) drawClock(g, L.vw / 2 + w / 2 + CLOCK_R + 26, ROW_Y, this.timeLeft / this.timeFull, this.t, motion);
  }

  /** The egg in the pit: put in under the flared flames, it sits there with a soft glow once they are blown out. */
  private drawEgg(g: G): void {
    if (this.endT === null || this.endT < EGG_AT) return;
    const a = Math.max(0, Math.min(1, (this.endT - BLOW_AT) / BLOW));
    const x = this.pit.x, y = GROUND - PIT_SMALL * 0.35, r = EGG_H * 1.1;
    g.save();
    const glow = g.createRadialGradient(x, y - EGG_H * 0.5, 4, x, y - EGG_H * 0.5, r);
    glow.addColorStop(0, `rgba(255,246,200,${0.7 * a})`);
    glow.addColorStop(1, 'rgba(255,246,200,0)');
    g.fillStyle = glow;
    g.fillRect(x - r, y - EGG_H * 0.5 - r, r * 2, r * 2);
    g.restore();
    drawSprite(g, 'obj-egg-plain', x, y, EGG_H, { ay: 1 }, (g2, w, h) => {

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
