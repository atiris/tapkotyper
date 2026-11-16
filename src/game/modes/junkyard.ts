import { pickLine } from '../../app/app';
import { ease } from '../../engine/tween';
import { drawSprite, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './kit/approach';
import { Detour, drawCarrier, lengthen, secondsPerWord } from './kit/egg';
import { HeroMode } from './kit/hero';
import { BIN, BIN_MOUTH_DX, BIN_RIM, CHAIN, JUNK_FEET, JUNK_HERO_X, MAGNET, binFallback, binHop, drawChainMagnet, gearFallback, pileStage, tireFallback, vanishLook } from './kit/junk';

const FEET = JUNK_FEET;
const HERO_X = JUNK_HERO_X;
const END_TIME = 3;

/** A wooden crate while its picture is missing: planks with a narrow strip of its left side and a gear sign on its front. */
function crateFallback(g: G, w: number, h: number): void {
  const side = w * 0.12, fw = w - side, x0 = -w / 2;
  g.save();
  g.fillStyle = '#9a6a3c';
  g.beginPath();
  g.moveTo(x0, -h / 2 + side * 0.6);
  g.lineTo(x0 + side, -h / 2);
  g.lineTo(x0 + side, h / 2);
  g.lineTo(x0, h / 2 - side * 0.6);
  g.closePath();
  g.fill();
  g.fillStyle = '#c08a52';
  g.fillRect(x0 + side, -h / 2, fw, h);
  g.strokeStyle = '#6e4724';
  g.lineWidth = 3;
  g.strokeRect(x0 + side, -h / 2, fw, h);
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(x0 + side, -h / 2 + (h * i) / 4);
    g.lineTo(x0 + w, -h / 2 + (h * i) / 4);
    g.stroke();
  }
  g.translate(x0 + side + fw / 2, 0);
  gearFallback('rgba(0,0,0,0)', '#6e4724')(g, h * 0.45, h * 0.45);
  g.restore();
}

/** The four kinds of gears and their colours while a picture is missing. */
const GEARS = ['obj-gear-1', 'obj-gear-2', 'obj-gear-3', 'obj-gear-4'];
const GEAR_INKS: [string, string][] = [['#e8b848', '#b8862e'], ['#a9b7c6', '#6f7f92'], ['#c8743e', '#8e4a24'], ['#3f7fd0', '#2a5a9e']];
/** A gear's size by its word's length: a longer word a little bigger. */
const GEAR_SIZE = [58, 64, 70, 76];
/** The crate: its middle and height. */
const CRATE = 'obj-gear-box';
const CRATE_X = HERO_X + 240;
const CRATE_H = 140;
/** The magnet that comes down on its chain over a typed gear: its height and how far above the gear it stops. */
const MAGNET_H = 90;
const MAGNET_GAP = 14;
const SHAKE_S = 0.45;
/** The gears roll on the line in front of the crate (and of him). */
const LOWER = FEET + 30;
/** Seconds of the magnet's way down, the gear's jump up to it, the carry over the crate, the drop in and its way up. */
const LIFT_S = { down: 0.4, grab: 0.35, carry: 0.8, drop: 0.3, up: 0.5 };
/** The carried gear goes over the crate this high above its top. */
const OVER_CRATE = 50;
/** The crate's count of gears pops up this high above its top. */
const COUNT_UP = 70;
/** A missed gear adds this many gears (and their time), at most ten in a level. */
export const MISS_GEARS = 2;
export const GEARS_MAX_WORDS = 10;

/** One kind of gear for the word: its size by the word's length. */
export function gearSize(word: string): number {
  return GEAR_SIZE[Math.max(0, Math.min(GEAR_SIZE.length - 1, word.length - 3))];
}

/** A typed gear's lift: the magnet's way down to it, the grab, the carry over the crate, the drop in, the magnet's way up. */
type LiftPhase = keyof typeof LIFT_S;
const LIFT_ORDER: LiftPhase[] = ['down', 'grab', 'carry', 'drop', 'up'];

interface Lift {
  phase: LiftPhase;
  k: number;
  /** The magnet's middle now, and where it stopped over the gear. */
  x: number;
  y: number;
  x0: number;
  overY: number;
  /** The gear's rest before the grab. */
  gearY: number;
}

/** The crate's top, where a carried gear goes over and drops in. */
const CRATE_TOP = FEET + 6 - CRATE_H;
/** A dropping gear fades out in front of the crate between these heights, as if it fell in. */
const SINK_FROM = FEET + 6 - CRATE_H * 0.9;
const SINK_TO = FEET + 6 - CRATE_H * 0.7;

/**
 * Junkyard 1, sorting the gears (a word stream): gears of four kinds roll along the path toward a
 * wooden crate. Typed, a magnet comes down on its chain over the gear, lifts it over the
 * crate and drops it in, and the crate shows how many gears it holds; missed, it rolls on in front of
 * the crate, past him and away, and two more gears come (`Detour`, as the wind's push).
 */
export class GearsMode extends ApproachMode {
  readonly world = 'junkyard';
  readonly scene = true;
  readonly tapkoFeet = FEET;
  readonly pictures = [...GEARS, CRATE, MAGNET, CHAIN];
  private detour: Detour;
  private longerSaid = false;
  private inCrate = 0;
  private shake = 0;
  private jump = 0;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.detour = new Detour(GEARS_MAX_WORDS, secondsPerWord(L));
    this.playerX = CRATE_X + 90;
  }

  startLine(): string {
    return pickLine('story.gearsStart');
  }

  heroSpot(): { x: number; y: number } {
    return { x: HERO_X, y: FEET - TAPKO_H * 1.25 - 40 };
  }

  protected scrollSpeed(): number {
    return 0;
  }

  /** One gear at a time, two from the second half of the level. */
  protected maxOnScreen(): number {
    return this.L.share() >= 0.5 ? 2 : 1;
  }

  makeMover(word: string): Mover {
    const L = this.L, size = gearSize(word), x = L.vw + size;
    const kind = L.rng.int(0, GEARS.length - 1);
    return { x, y: LOWER - size / 2, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite: GEARS[kind], size, kind, lift: null };
  }

  /** A typed gear stops; the magnet comes down over it. */
  protected onLeave(m: Mover): void {
    const overY = m.y - m.size / 2 - MAGNET_GAP - MAGNET_H / 2;
    m.lift = { phase: 'down', k: 0, x: m.x, y: -MAGNET_H, x0: m.x, overY, gearY: m.y } satisfies Lift;
  }

  /** A missed gear rolls on in front of the crate and him; two more gears come, the first time the narrator says why. */
  protected onPass(): void {
    this.L.setMood('thinking', 1);
    if (!lengthen(this.L, this.detour, MISS_GEARS) || this.longerSaid) return;
    this.longerSaid = true;
    this.L.say(t('story.gearsLonger'), 4);
  }

  protected moveComing(m: Mover, dt: number, tg: Target): void {
    super.moveComing(m, dt, tg);
    m.rot = m.x / (m.size / 2);
  }

  protected moveGone(m: Mover, dt: number): void {
    if (m.state === 'pass') {
      m.x += m.vx * dt;
      m.rot = m.x / (m.size / 2);
      if (m.x < HERO_X) m.fade = Math.min(1, m.fade + dt * 1.2);
      return;
    }
    const lift = m.lift as Lift;
    lift.k = Math.min(1, lift.k + dt / (this.L.reduceMotion ? 0.01 : LIFT_S[lift.phase]));
    this.moveLift(m, lift);
    if (lift.k < 1) return;
    const next = LIFT_ORDER[LIFT_ORDER.indexOf(lift.phase) + 1];
    if (!next) {
      m.fade = 1;
      return;
    }
    lift.phase = next;
    lift.k = 0;
    if (next === 'grab') this.L.sfx('pop');
    if (next === 'drop') this.L.shout(String(++this.inCrate), CRATE_X, CRATE_TOP - COUNT_UP);
  }

  /** Where the magnet and its gear are in the lift's phase now. */
  private moveLift(m: Mover, lift: Lift): void {
    const k = lift.k, stuck = (y: number) => y + MAGNET_H / 2 + m.size / 2 - 4;
    const carryY = CRATE_TOP - OVER_CRATE - m.size - MAGNET_H / 2;
    switch (lift.phase) {
      case 'down':
        lift.y = -MAGNET_H + (lift.overY + MAGNET_H) * ease.outCubic(k);
        break;
      case 'grab':
        m.y = lift.gearY + (stuck(lift.overY) - lift.gearY) * ease.outBack(k);
        break;
      case 'carry': {
        const e = ease.inOutQuad(k);
        lift.x = lift.x0 + (CRATE_X - lift.x0) * e;
        lift.y = lift.overY + (carryY - lift.overY) * e - Math.sin(k * Math.PI) * 30;
        m.x = lift.x;
        m.y = stuck(lift.y);
        m.rot += 0.02;
        break;
      }
      case 'drop':
        m.y = stuck(carryY) + (SINK_TO - stuck(carryY)) * ease.inQuad(k);
        break;
      case 'up':
        lift.y = carryY + (-MAGNET_H - carryY) * ease.inQuad(k);
        break;
    }
  }

  update(dt: number): void {
    super.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.endT === null && super.finished) this.end();
    else if (this.endT !== null) this.endT += dt;
  }

  /** The last gear is in: the crate shakes with a glint of gears inside, and he hops. */
  private end(): void {
    this.endT = 0;
    this.shake = SHAKE_S * 2;
    this.L.particles.emit(CRATE_X, CRATE_TOP, 10, 'sparkle', ['#ffe08a', '#ffffff'], 160, 6);
    this.L.say(pickLine('story.gearsDone'), END_TIME);
    this.L.tweens.add(0.5, (k) => { this.jump = Math.sin(k * Math.PI) * 0.3; }, ease.linear, () => { this.jump = 0; });
  }

  drawMover(g: G, m: Mover): void {
    const [body, dark] = GEAR_INKS[m.kind as number];
    drawSprite(g, m.sprite, m.x, m.y, m.size, { rot: m.rot }, gearFallback(body, dark));
  }

  render(g: G): void {
    drawCarrier(g, this.L, null, this.L.tapkoMood, HERO_X, FEET, { t: this.t, jump: this.jump });
    const list = this.L.core.targets;
    const lift = (tg: Target) => (tg.data as Mover).lift as Lift | null;
    const draw = (tg: Target) => {
      const m = tg.data as Mover;
      g.save();
      const sink = lift(tg)?.phase === 'drop' ? Math.min(1, Math.max(0, (m.y - SINK_FROM) / (SINK_TO - SINK_FROM))) : 0;
      g.globalAlpha = (1 - m.fade) * (1 - sink);
      this.drawMover(g, m);
      g.restore();
    };
    const wob = this.shake > 0 ? Math.sin(this.shake * 40) * 0.025 * (this.shake / SHAKE_S) : 0;
    drawSprite(g, CRATE, CRATE_X, FEET + 6, CRATE_H, { ay: 1, rot: this.endT !== null ? wob : 0 }, crateFallback);
    for (const tg of list) {
      const l = lift(tg);
      if (l?.phase !== 'up') draw(tg);
    }
    for (const tg of list) {
      const l = lift(tg);
      if (!l) continue;
      drawChainMagnet(g, l.x, l.y, MAGNET_H);
    }
    for (const tg of list) {
      const m = tg.data as Mover;
      if (m.state === 'come') this.L.label(g, tg, m.x, m.y - m.size * 0.62 - 26);
    }
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** The tire pile: its pictures by stage (the biggest first) and their height. */
const PILES = ['obj-tire-pile-1', 'obj-tire-pile-2', 'obj-tire-pile-3'];
const PILE_H = [193, 173, 144];
/**
 * Five places in a row over the whole stage: him, the pile, two tires and the bin, the same gap
 * apart. The pile stands at least this far right of him, the bin this far from the stage's right edge.
 */
const PILE_FROM_HERO = 230;
const BIN_EDGE = 110;
const BIN_H = 130;
/** The bin stands further back (higher) than both lanes, so the tires hop up into its opening in front of it. */
const BIN_BACK = 50;
const BIN_FOOT = FEET + 10 - BIN_BACK;
const RIM_Y = BIN_FOOT - BIN_H * BIN_RIM;
/** Three kinds of old tire, each new one picks one. */
const TIRES = ['obj-tire', 'obj-tire-2', 'obj-tire-3'];
const TIRE_H = 72;
/** The pile fades away at its end in this many seconds. */
const PILE_FADE_S = 0.8;
/**
 * Each place has its own lane: the left one this much further back (higher), so a tire rolls past
 * the other one behind or in front of it and nothing moves aside.
 */
const BACK_LANE = 26;
/** A new tire's roll off the pile: its seconds, the share of them down the pile's side, and its last little bounces. */
const ROLL_DOWN_S = 1.3;
const SLOPE = 0.4;
const BOUNCE = 16;
/** A typed tire rolls to the bin at this speed (stage units a second) and hops in from this far left of its middle. */
const ROLL_SPEED = 320;
const HOP_DX = 120;
/** The words over the tires float this high above the path, at the labels' usual size; on a narrow stage the left one a row higher. */
const WORD_UP = 120;
const WORD_SIZE = 40;
const WORD_ROW = 56;
const WORDS_CLOSE = 180;
/** How far the bands glide at the end, and in how many seconds. */
const WALK_ON = 260;
const WALK_S = 1.4;

/** A pile of tires while its pictures are missing: rows of tires lying on each other, fewer by the stage. */
function pileFallback(stage: number) {
  return (g: G, _w: number, h: number): void => {
    const rows = 3 - stage, d = h / (rows + 1);
    for (let row = 0; row < rows; row++) {
      const n = rows - row + 1, y = h / 2 - d * (row + 0.6);
      for (let i = 0; i < n; i++) {
        g.save();
        g.translate((i - (n - 1) / 2) * d * 1.05, y);
        tireFallback(g, d * 1.2, d * 1.2);
        g.restore();
      }
    }
  };
}

/** A tire in the scene (the screen shows it at x - scroll): rolling off the pile to its place, waiting with its word, or rolling into the bin. */
interface Tire {
  pic: string;
  x: number;
  y: number;
  rot: number;
  tg: Target | null;
  state: 'roll' | 'wait' | 'bin';
  /** Seconds in its state. */
  t: number;
  fromX: number;
  fromY: number;
  /** Where a tire off the pile reaches the ground, and where it ends. */
  footX: number;
  toX: number;
  /** Its place (0 next to the pile, 1 next to the bin) and the height of the place's lane. */
  slot: number;
  laneY: number;
  /** 0-1 of its vanishing at the bin's opening. */
  vanish: number;
}

/**
 * Junkyard 2, the pile of tires (waiting words, a calm step): in a row stand him, a big pile of old
 * tires, two tires with a word each, and a bin. Each place has its own lane, the left one a little
 * further back. A typed tire rolls along its lane into the bin, behind or in front of the other one,
 * which stays where it is, and a new one rolls down the pile's side into the free place. Nothing
 * comes at the child, nothing is missed. The pile shrinks with the level's share; at its end it
 * fades away and he walks on.
 */
export class TiresMode extends HeroMode {
  readonly world = 'junkyard';
  readonly tapkoFeet = FEET;
  readonly pictures = [...PILES, BIN, ...TIRES];
  private tires: Tire[] = [];
  private spawned = 0;
  private stage = 0;
  /** The pile that was before the last change, fading out, and 0..1 of its fade. */
  private oldStage = -1;
  private stageK = 1;
  private endT: number | null = null;
  private pileFade = 0;

  constructor(L: LevelRuntime) {
    super(L);
  }

  startLine(): string {
    return pickLine('story.tiresStart');
  }

  private get binX(): number {
    return this.L.vw - BIN_EDGE;
  }

  private get pileX(): number {
    return HERO_X + Math.max(PILE_FROM_HERO, (this.binX - HERO_X) / 4);
  }

  /** The middle of a tire's place on the screen. */
  private slotX(slot: number): number {
    return this.pileX + ((this.binX - this.pileX) * (slot + 1)) / 3;
  }

  /** A tire's middle on its place's lane. */
  private laneY(slot: number): number {
    return FEET + 6 - TIRE_H / 2 - (slot === 0 ? BACK_LANE : 0);
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    this.rollDown(0, true);
    this.rollDown(1, true);
  }

  /** A new tire rolls down the pile's right side to the free place `slot` (at the start it is there already). */
  private rollDown(slot: number, there = false): void {
    if (this.spawned >= this.L.count || this.endT !== null) return;
    this.spawned++;
    const h = PILE_H[this.stage], toX = this.scroll + this.slotX(slot), laneY = this.laneY(slot);
    const fromX = this.scroll + this.pileX + h * 0.1, fromY = FEET - h * 0.8;
    const footX = Math.min(this.scroll + this.pileX + h * 0.5, toX);
    const tg = this.L.core.add(this.L.word(6, 1), {}, there);
    // It starts turned at random, so it stops in its place turned at random too.
    const rot = this.L.rng.range(0, Math.PI * 2), pic = this.L.rng.pick(TIRES);
    this.tires.push({ pic, x: there ? toX : fromX, y: there ? laneY : fromY, rot, tg, state: there ? 'wait' : 'roll', t: 0, fromX, fromY, footX, toX, slot, laneY, vanish: 0 });
  }

  onDone(tg: Target): void {
    const tire = this.tires.find((r) => r.tg === tg);
    if (!tire) return;
    this.done++;
    this.happy();
    tire.tg = null;
    tire.state = 'bin';
    tire.t = 0;
    tire.fromX = tire.x;
    tire.toX = this.scroll + this.binX + BIN_H * BIN_MOUTH_DX;
    this.L.core.prune();
    if (this.done >= this.L.count) return this.end();
    this.rollDown(tire.slot);
  }

  /** The last tire is in the bin: the pile fades away, the way is free, the bands glide and he walks a few steps on. */
  private end(): void {
    this.endT = 0;
    for (const r of this.tires) if (r.tg) this.L.core.release(r.tg, false);
    this.L.core.prune();
    this.L.say(pickLine('story.tiresDone'), END_TIME + 1);
    this.puff();
    const from = this.scroll;
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : PILE_FADE_S, (k) => { this.pileFade = k; }, ease.linear, () => {
      this.L.tweens.add(this.L.reduceMotion ? 0.01 : WALK_S, (k) => {
        this.scroll = from + WALK_ON * k;
        this.jump = Math.abs(Math.sin(k * Math.PI * 3)) * 0.2;
      }, ease.inOutQuad, () => { this.jump = 0; });
    });
  }

  private puff(): void {
    this.L.particles.emit(this.pileX, FEET - PILE_H[this.stage] * 0.4, 12, 'puff', ['rgba(200,180,150,0.5)', 'rgba(230,220,200,0.45)'], 160, 22);
  }

  update(dt: number): void {
    super.update(dt);
    if (this.endT !== null) this.endT += dt;
    const stage = pileStage(this.L.share());
    if (stage > this.stage && this.endT === null) {
      this.oldStage = this.stage;
      this.stage = stage;
      this.stageK = 0;
      this.puff();
    }
    if (this.stageK < 1) this.stageK = Math.min(1, this.stageK + dt / 0.5);
    for (const r of this.tires) this.moveTire(r, dt);
    this.tires = this.tires.filter((r) => !(r.state === 'bin' && r.t >= this.binTime(r)));
  }

  /** Where a tire into the bin starts its hop over the rim (at once when it waits closer). */
  private hopFrom(r: Tire): number {
    return Math.max(r.fromX, r.toX - HOP_DX);
  }

  /** Seconds of a typed tire's roll along its lane and of its hop into the bin. */
  private rollTime(r: Tire): number {
    return this.L.reduceMotion ? 0 : (this.hopFrom(r) - r.fromX) / ROLL_SPEED;
  }

  private hopTime(r: Tire): number {
    return this.L.reduceMotion ? 0.01 : Math.max(0.3, (r.toX - this.hopFrom(r)) / ROLL_SPEED);
  }

  private binTime(r: Tire): number {
    return this.rollTime(r) + this.hopTime(r);
  }

  private moveTire(r: Tire, dt: number): void {
    const x0 = r.x;
    r.t += dt;
    if (r.state === 'roll') {
      // Faster and faster down the pile's side, then on along its lane with a few small bounces, slowing to its place.
      const k = Math.min(1, r.t / (this.L.reduceMotion ? 0.01 : ROLL_DOWN_S));
      if (k < SLOPE) {
        const u = (k / SLOPE) ** 2;
        r.x = r.fromX + (r.footX - r.fromX) * u;
        r.y = r.fromY + (r.laneY - r.fromY) * u;
      } else {
        const v = (k - SLOPE) / (1 - SLOPE);
        r.x = r.footX + (r.toX - r.footX) * ease.outQuad(v);
        r.y = r.laneY - Math.abs(Math.sin(v * Math.PI * 2)) * BOUNCE * (1 - v);
      }
      if (k >= 1) {
        r.state = 'wait';
        if (r.tg) r.tg.selectable = true;
      }
    } else if (r.state === 'bin') {
      // It gathers speed along its lane, then hops in front of the bin's opening and vanishes there.
      const roll = this.rollTime(r), from = this.hopFrom(r);
      if (r.t < roll) {
        const u = r.t / roll;
        r.x = r.fromX + (from - r.fromX) * u * u * (2 - u);
      } else {
        const w = Math.min(1, (r.t - roll) / this.hopTime(r));
        const into = binHop(r.laneY, RIM_Y, TIRE_H, w);
        r.x = from + (r.toX - from) * w;
        r.y = into.y;
        r.vanish = into.vanish;
      }
    }
    r.rot += (r.x - x0) / (TIRE_H / 2);
  }

  private drawPile(g: G, stage: number, alpha: number): void {
    if (alpha <= 0) return;
    g.save();
    g.globalAlpha *= alpha;
    drawSprite(g, PILES[stage], this.pileX - this.scroll, FEET + 10, PILE_H[stage], { ay: 1 }, pileFallback(stage));
    g.restore();
  }

  render(g: G): void {
    const s = this.scroll;
    // Before the stage changed, the old pile fades into the new one; at the end the last one fades away.
    if (this.oldStage >= 0 && this.stageK < 1) this.drawPile(g, this.oldStage, 1 - this.stageK);
    this.drawPile(g, this.stage, (this.oldStage >= 0 ? this.stageK : 1) * (1 - this.pileFade));
    // The bin stands behind both lanes; the tires by their lanes, the back one first, one at the bin's opening vanishing.
    drawSprite(g, BIN, this.binX - s, BIN_FOOT, BIN_H, { ay: 1 }, binFallback);
    for (const r of [...this.tires].sort((p, q) => p.laneY - q.laneY)) {
      const look = vanishLook(r.vanish);
      g.save();
      g.globalAlpha *= look.alpha;
      drawSprite(g, r.pic, r.x - s, r.y, TIRE_H * look.scale, { rot: r.rot }, tireFallback);
      g.restore();
    }
    this.drawHero(g);
    const close = this.slotX(1) - this.slotX(0) < WORDS_CLOSE;
    for (const r of this.tires) if (r.tg?.selectable) this.L.label(g, r.tg, r.x - s, FEET - WORD_UP - (close && r.slot === 0 ? WORD_ROW : 0), WORD_SIZE);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
