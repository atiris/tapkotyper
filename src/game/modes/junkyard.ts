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
import { BIN, JUNK_FEET, JUNK_HERO_X, MAGNET, binFallback, drawCraneMagnet, gearFallback, pileStage, tireFallback } from './kit/junk';

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
/** The crate: its middle, height, and the share of its width where a gear rolling behind it is gone. */
const CRATE = 'obj-gear-box';
const CRATE_X = HERO_X + 240;
const CRATE_H = 140;
const CRATE_IN = 0.15;
/** The magnet hangs over the path in front of the crate, on the crane's cable from the top. */
const MAGNET_X = CRATE_X + 170;
const MAGNET_Y = FEET - 270;
const MAGNET_H = 110;
const SHAKE_S = 0.45;
/** The gears roll on two lines: the lower one in front of the crate (and of him), the upper one behind it, into the crate. */
const LOWER = FEET + 30;
const UPPER = FEET - 14;
/** Seconds of a typed gear's hop to the upper line, its height, and its roll into the crate. */
const HOP_S = 0.45;
const HOP_UP = 70;
const ROLL_IN = 260;
/** A missed gear adds this many gears (and their time), at most ten in a level. */
export const MISS_GEARS = 2;
export const GEARS_MAX_WORDS = 10;

/** One kind of gear for the word: its size by the word's length. */
export function gearSize(word: string): number {
  return GEAR_SIZE[Math.max(0, Math.min(GEAR_SIZE.length - 1, word.length - 3))];
}

/**
 * Junkyard 1, sorting the gears (a word stream): gears of four kinds roll along the path toward a
 * wooden crate under a magnet on the crane's cable. Typed, the magnet shakes and the gear hops up to
 * the line behind the crate and rolls into it; missed, it rolls on in front of the crate, past him
 * and away, and two more gears come (`Detour`, as the wind's push).
 */
export class GearsMode extends ApproachMode {
  readonly world = 'junkyard';
  readonly scene = true;
  readonly tapkoFeet = FEET;
  readonly pictures = [...GEARS, CRATE, MAGNET];
  private detour: Detour;
  private longerSaid = false;
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
    return { x, y: LOWER - size / 2, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite: GEARS[kind], size, kind, hop: 0, y0: 0 };
  }

  /** A typed gear: the magnet shakes, the gear hops up to the line behind the crate. */
  protected onLeave(m: Mover): void {
    m.hop = 0;
    m.y0 = m.y;
    this.shake = SHAKE_S;
    this.L.sfx('pop');
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
    // Typed: the hop up to the upper line, then the roll into the crate (behind it), gone at its middle.
    if (m.hop < 1) {
      m.hop = Math.min(1, m.hop + dt / HOP_S);
      const to = UPPER - m.size / 2;
      m.y = m.y0 + (to - m.y0) * ease.inOutQuad(m.hop) - Math.sin(m.hop * Math.PI) * HOP_UP;
      return;
    }
    m.x -= ROLL_IN * dt;
    m.rot = m.x / (m.size / 2);
    if (m.x < CRATE_X + CRATE_H * CRATE_IN) m.fade = 1;
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
    this.L.particles.emit(CRATE_X, FEET - CRATE_H, 10, 'sparkle', ['#ffe08a', '#ffffff'], 160, 6);
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
    const draw = (tg: Target) => {
      const m = tg.data as Mover;
      g.save();
      g.globalAlpha = 1 - m.fade;
      this.drawMover(g, m);
      g.restore();
    };
    // Behind the crate: the gears rolling into it.
    for (const tg of list) if ((tg.data as Mover).state === 'leave') draw(tg);
    const wob = this.shake > 0 ? Math.sin(this.shake * 40) * 0.025 * (this.shake / SHAKE_S) : 0;
    drawSprite(g, CRATE, CRATE_X, FEET + 6, CRATE_H, { ay: 1, rot: this.endT !== null ? wob : 0 }, crateFallback);
    this.drawMagnet(g);
    for (const tg of list) if ((tg.data as Mover).state !== 'leave') draw(tg);
    for (const tg of list) {
      const m = tg.data as Mover;
      if (m.state === 'come') this.L.label(g, tg, m.x, m.y - m.size * 0.62 - 26);
    }
  }

  /** The magnet on the crane's cable; it shakes when it lifts a gear. */
  private drawMagnet(g: G): void {
    const dx = this.shake > 0 ? Math.sin(this.shake * 50) * 5 : 0;
    drawCraneMagnet(g, MAGNET_X + dx, MAGNET_Y, MAGNET_H, MAGNET_X);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** The tire pile: its pictures by stage (big, half, small), their height, and the bin right of it. */
const PILES = ['obj-tire-pile-1', 'obj-tire-pile-2', 'obj-tire-pile-3'];
const PILE_H = [150, 110, 70];
/** The pile stands this far right of him at most (on a wide stage the scene stays together), the bin this far right of the pile. */
const PILE_FROM_HERO = 820;
const BIN_FROM_PILE = 220;
const BIN_H = 130;
const TIRE = 'obj-tire';
const TIRE_H = 72;
/** The pile fades away at its end in this many seconds. */
const PILE_FADE_S = 0.8;
/** Seconds of a tire's roll down from the pile to its place, and its roll to the bin per stage width. */
const ROLL_DOWN_S = 0.8;
const TO_BIN_S = 1.4;
/** The share of the way to the bin where the tire hops over its rim. */
const BIN_HOP = 0.6;
/** The words over the tires float this high above the path, at the labels' usual size. */
const WORD_UP = 120;
const WORD_SIZE = 40;
/** The tires' places at the pile's foot: this far apart at most and at least. */
const SLOT_GAP: [number, number] = [160, 210];
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

/** A tire at the pile's foot, in the scene (the screen shows it at x - scroll): rolling down, waiting with its word, or rolling to the bin. */
interface Tire {
  x: number;
  y: number;
  rot: number;
  tg: Target | null;
  state: 'down' | 'wait' | 'bin';
  k: number;
  fromX: number;
  fromY: number;
  toX: number;
  slot: number;
}

/**
 * Junkyard 2, the pile of tires (waiting words, a calm step): a big pile of old tires blocks the path
 * right of him, a bin stands right of it. Two or three tires lie at its foot with a word each; a typed
 * one rolls off into the bin and a new one rolls down from the pile to the free place. Nothing comes
 * at the child, nothing is missed. The pile shrinks with the level's share; at its end it fades away
 * and he walks on.
 */
export class TiresMode extends HeroMode {
  readonly world = 'junkyard';
  readonly tapkoFeet = FEET;
  readonly pictures = [...PILES, BIN, TIRE];
  private tires: Tire[] = [];
  private slots: number[] = [];
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

  /** The pile's middle, the bin's and the tires' places, by the stage's width. */
  private get pileX(): number {
    return Math.min(this.L.vw - 330, HERO_X + PILE_FROM_HERO);
  }

  private get binX(): number {
    return this.pileX + BIN_FROM_PILE;
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    const right = this.pileX - 20, left = HERO_X + 190;
    const gap = Math.max(SLOT_GAP[0], Math.min(SLOT_GAP[1], (right - left) / 2));
    this.slots = [right - gap * 2, right - gap, right];
    const first = this.L.rng.chance(0.5) ? 2 : 3;
    for (const slot of this.L.rng.shuffle([0, 1, 2]).slice(0, first)) this.rollDown(slot, true);
  }

  /** A new tire rolls down from the pile's top to the free place `slot` (at the start it is there already). */
  private rollDown(slot: number, there = false): void {
    if (this.spawned >= this.L.count || this.endT !== null) return;
    this.spawned++;
    const toX = this.scroll + this.slots[slot], y = FEET + 6 - TIRE_H / 2;
    const fromX = this.scroll + this.pileX, fromY = FEET - PILE_H[this.stage] * 0.8;
    const tg = this.L.core.add(this.L.word(6, 1), {}, there);
    this.tires.push({ x: there ? toX : fromX, y: there ? y : fromY, rot: 0, tg, state: there ? 'wait' : 'down', k: there ? 1 : 0, fromX, fromY, toX, slot });
  }

  onDone(tg: Target): void {
    const tire = this.tires.find((r) => r.tg === tg);
    if (!tire) return;
    this.done++;
    this.happy();
    tire.tg = null;
    tire.state = 'bin';
    tire.k = 0;
    tire.fromX = tire.x;
    tire.fromY = tire.y;
    tire.toX = this.scroll + this.binX;
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
    this.tires = this.tires.filter((r) => !(r.state === 'bin' && r.k >= 1));
  }

  private moveTire(r: Tire, dt: number): void {
    const restY = FEET + 6 - TIRE_H / 2;
    if (r.state === 'down') {
      r.k = Math.min(1, r.k + dt / (this.L.reduceMotion ? 0.01 : ROLL_DOWN_S));
      const k = ease.outCubic(r.k);
      r.x = r.fromX + (r.toX - r.fromX) * k;
      r.y = r.fromY + (restY - r.fromY) * ease.inOutQuad(r.k);
      r.rot = (r.x - r.fromX) / (TIRE_H / 2);
      if (r.k >= 1) {
        r.state = 'wait';
        if (r.tg) r.tg.selectable = true;
      }
    } else if (r.state === 'bin') {
      const time = this.L.reduceMotion ? 0.01 : (TO_BIN_S * Math.abs(r.toX - r.fromX)) / this.L.vw + 0.4;
      r.k = Math.min(1, r.k + dt / time);
      // It rolls along the path, then hops over the bin's rim and drops in behind its front.
      const u = Math.max(0, (r.k - BIN_HOP) / (1 - BIN_HOP));
      r.x = r.fromX + (r.toX - r.fromX) * ease.inOutQuad(r.k);
      r.y = restY + (FEET - BIN_H * 0.4 - restY) * u - Math.sin(u * Math.PI) * BIN_H * 0.9;
      r.rot = (r.x - r.fromX) / (TIRE_H / 2);
    }
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
    // The tires going into the bin are behind its front.
    for (const r of this.tires) if (r.state === 'bin') drawSprite(g, TIRE, r.x - s, r.y, TIRE_H, { rot: r.rot }, tireFallback);
    drawSprite(g, BIN, this.binX - s, FEET + 10, BIN_H, { ay: 1 }, binFallback);
    for (const r of this.tires) if (r.state !== 'bin') drawSprite(g, TIRE, r.x - s, r.y, TIRE_H, { rot: r.rot }, tireFallback);
    this.drawHero(g);
    for (const r of this.tires) if (r.tg?.selectable) this.L.label(g, r.tg, r.x - s, FEET - WORD_UP, WORD_SIZE);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
