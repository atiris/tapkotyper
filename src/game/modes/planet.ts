import { app, pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, type G } from '../../gfx/draw';
import { drawTapko, type Mood } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { type Drift, Mode, TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

/** Tapko as the hero walking and hopping through the planet (and Bolt's robot city and home, Melody's garden and lake). */
export abstract class HeroMode extends Mode {
  readonly world: string = 'planet';
  protected heroX = 220;
  protected heroY = VH * 0.78;
  /** Height of his picture; the planet's levels draw him as big as the meadow's Tapko. */
  protected readonly heroSize: number = 170;
  protected jump = 0;
  protected mood: Mood = 'idle';
  /** Tapko's soft shadow on the ground. */
  protected readonly shadow: boolean = true;
  private moodT = 0;
  protected done = 0;

  constructor(L: LevelRuntime) {
    super(L);
  }

  /** Hops the hero to (x, y) while scrolling the world by `scrollBy`. */
  protected hop(toY: number, scrollBy: number, then?: () => void): void {
    const fromY = this.heroY, fromScroll = this.scroll;
    this.L.tweens.add(0.55, (k) => {
      this.jump = k;
      this.heroY = fromY + (toY - fromY) * k;
      this.scroll = fromScroll + scrollBy * ease.inOutQuad(k);
    }, ease.linear, () => {
      this.jump = 0;
      then?.();
    });
  }

  protected happy(): void {
    this.mood = 'happy';
    this.moodT = 1.2;
  }

  protected surprised(seconds: number): void {
    this.mood = 'surprised';
    this.moodT = seconds;
  }

  update(dt: number): void {
    if (this.moodT > 0 && (this.moodT -= dt) <= 0) this.mood = 'idle';
  }

  onWrong(_tg?: Target | null): void {
    this.mood = 'thinking';
    this.moodT = 1;
  }

  /** The story friend walks (or floats) right behind the hero. */
  friendSpot(): { x: number; y: number } {
    return { x: this.heroX - 105, y: this.heroY };
  }

  heroSpot(): { x: number; y: number } {
    return { x: this.heroX, y: this.heroY - 210 };
  }

  protected drawHero(g: G): void {
    // The level is done: Tapko hops happily in place.
    if (this.L.endTime != null) return drawTapko(g, app.profile!.companion, 'happy', this.heroX, this.heroY, this.heroSize, { t: this.t, jump: this.L.endHop, shadow: this.shadow });
    drawTapko(g, app.profile!.companion, this.mood, this.heroX, this.heroY, this.heroSize, { t: this.t, jump: this.jump, shadow: this.shadow });
  }
}

/** Where the meadow's DOM Tapko has his feet; the planet's Tapko on the canvas stands there too. */
export const FEET = VH - TAPKO_H * 0.1;
/** His feet on a stepping stone in the swamp, a bit higher, so the stone fits under them. */
const SWAMP_FEET = VH * 0.9;
/** The word to type is above his head. */
export const wordAbove = (feet: number): number => feet - TAPKO_H * 0.8 - 60;

/** A stepping stone: its picture's height, and how far above its middle his feet stand. */
const STONE_H = 74;
const STONE_TOP = 0.2;
/** The grassy far bank: its height, where its grass line is (a share of the height, flat from 40 % of its width on), where he lands and where the cradle stands (from its middle, in heights). */
const BANK_H = 200;
const BANK_TOP = 0.25;
const BANK_LAND = -0.085;
const BANK_CRADLE = 1.08;
/** Seconds of a jump between stones and of the view gliding after him. */
const JUMP = 0.55;
const GLIDE = 0.8;

/** A stepping stone while its picture is missing: a mossy grey oval in a ring of water. */
function stoneFallback(g: G, w: number, h: number): void {
  g.fillStyle = 'rgba(40,70,50,0.6)';
  g.beginPath();
  g.ellipse(0, h * 0.25, w * 0.5, h * 0.22, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#8f857a';
  g.beginPath();
  g.ellipse(0, 0, w * 0.4, h * 0.34, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#7da85a';
  g.beginPath();
  g.ellipse(-w * 0.08, -h * 0.16, w * 0.18, h * 0.1, 0, 0, Math.PI * 2);
  g.fill();
}

/** The far bank while its picture is missing: a green hump with a darker side. */
function bankFallback(g: G, w: number, h: number): void {
  g.fillStyle = '#5f9c48';
  g.beginPath();
  g.ellipse(w * 0.1, h * 0.2, w * 0.5, h * 0.42, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = '#7dbf5a';
  g.fillRect(-w * 0.35, -h * 0.25, w * 0.85, h * 0.12);
}

/** A ring on the water where the next stone comes. */
function drawRing(g: G, x: number, y: number, t: number): void {
  g.save();
  const pulse = 0.5 + Math.sin(t * 4) * 0.2;
  g.fillStyle = `rgba(255,255,255,${0.25 * pulse + 0.1})`;
  g.strokeStyle = '#ffffff';
  g.setLineDash([12, 8]);
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(x, y + 8, 72, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}

const SWAMP_PICTURES = ['obj-swamp-stone', 'obj-planet-bank'];

/** A stone in the scene: the screen shows it at x - scroll. */
interface Stone {
  x: number;
  y: number;
  /** Seconds since it came. */
  age: number;
  state: 'ok' | 'cracked';
  /** Seconds since it cracked. */
  crackT: number;
}

/** His jump from one place in the scene to another (a stone, the bank). */
interface Jump {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  k: number;
  then: () => void;
}

/**
 * The planet's swamp, shared by the first level and the super level: Tapko on stepping stones,
 * as tall as on the meadow, the word above his head and a ring where the next stone comes.
 */
abstract class SwampHero extends HeroMode {
  readonly ground = '-swamp';
  protected readonly heroSize = TAPKO_H;
  protected stones: Stone[] = [];
  /** The stone he stands on, or null on the bank. */
  protected stand: Stone | null = null;
  protected onBank = false;
  protected jumpTo: Jump | null = null;
  /** The view glides after him: from, to and its share done. */
  private glideFrom = 0;
  private glideTo = 0;
  private glideK = 1;
  private afterGlide: (() => void) | null = null;
  protected bank: { x: number; age: number } | null = null;

  protected stone(x: number, y = SWAMP_FEET + STONE_H * STONE_TOP): Stone {
    const s: Stone = { x, y, age: 0, state: 'ok', crackT: 0 };
    this.stones.push(s);
    return s;
  }

  /** His feet on a stone, in the scene. */
  protected top(s: Stone): { x: number; y: number } {
    return { x: s.x, y: s.y - STONE_H * STONE_TOP };
  }

  protected bankTop(): { x: number; y: number } {
    // The picture's grass line is at the place it is drawn; his feet sink a little into the grass.
    return { x: this.bank!.x + BANK_H * BANK_LAND, y: SWAMP_FEET + 24 };
  }

  /** Jumps him to a place in the scene; `then` runs when he lands. */
  protected leap(to: { x: number; y: number }, then: () => void): void {
    const from = this.feetInScene();
    this.jumpTo = { fx: from.x, fy: from.y, tx: to.x, ty: to.y, k: 0, then };
    this.L.sfx('whoosh');
  }

  /** The view glides so that the scene's x is at `screenX`. */
  protected glide(x: number, screenX: number, then?: () => void): void {
    this.glideFrom = this.scroll;
    this.glideTo = x - screenX;
    this.glideK = 0;
    this.afterGlide = then ?? null;
  }

  protected get moving(): boolean {
    return !!this.jumpTo || this.glideK < 1;
  }

  /** His feet in the scene now. */
  protected feetInScene(): { x: number; y: number } {
    const j = this.jumpTo;
    if (j) {
      const k = ease.inOutQuad(j.k);
      return { x: j.fx + (j.tx - j.fx) * k, y: j.fy + (j.ty - j.fy) * k };
    }
    if (this.onBank && this.bank) return this.bankTop();
    return this.stand ? this.top(this.stand) : { x: 200, y: SWAMP_FEET };
  }

  update(dt: number): void {
    super.update(dt);
    for (const s of this.stones) {
      s.age += dt;
      if (s.state === 'cracked') s.crackT += dt;
    }
    if (this.bank) this.bank.age += dt;
    const j = this.jumpTo;
    if (j) {
      j.k = this.L.reduceMotion ? 1 : Math.min(1, j.k + dt / JUMP);
      if (j.k >= 1) {
        this.jumpTo = null;
        this.L.sfx('pop');
        j.then();
      }
    }
    if (this.glideK < 1) {
      this.glideK = this.L.reduceMotion ? 1 : Math.min(1, this.glideK + dt / GLIDE);
      this.scroll = this.glideFrom + (this.glideTo - this.glideFrom) * ease.inOutQuad(this.glideK);
      if (this.glideK >= 1 && this.afterGlide) {
        const then = this.afterGlide;
        this.afterGlide = null;
        then();
      }
    }
    const f = this.feetInScene();
    this.heroX = f.x - this.scroll;
    this.heroY = f.y;
    this.jump = this.jumpTo ? this.jumpTo.k : 0;
  }

  heroSpot(): { x: number; y: number } {
    return { x: this.heroX, y: this.heroY - TAPKO_H * 0.85 - 20 };
  }

  protected drawStones(g: G): void {
    for (const s of this.stones) {
      const k = this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, s.age / 0.35));
      const cracked = s.state === 'cracked';
      const sh = cracked ? Math.sin(s.crackT * 60) * 3 : 0;
      drawSprite(g, cracked ? 'obj-swamp-stone-cracked' : 'obj-swamp-stone', s.x - this.scroll + sh, s.y, STONE_H * k, {}, stoneFallback);
    }
  }

  protected drawBank(g: G): void {
    if (!this.bank) return;
    const k = this.L.reduceMotion ? 1 : ease.outCubic(Math.min(1, this.bank.age / 0.6));
    drawSprite(g, 'obj-planet-bank', this.bank.x - this.scroll, SWAMP_FEET + 10 + (1 - k) * 40, BANK_H, { ay: BANK_TOP, ax: 0.5, alpha: k }, bankFallback);
  }

  protected drawNextRing(g: G, x: number): void {
    drawRing(g, x - this.scroll, SWAMP_FEET + STONE_H * STONE_TOP, this.t);
  }
}

/** Gap between stones of the first level. */
const SWAMP_GAP = 240;
const SWAMP_HOME = 210;

/**
 * Planet 1, the swamp after the landing (waiting words): one word at a time above Tapko; typed,
 * a stone comes where the ring was and he jumps onto it, the view glides after him. After the last
 * stone the grassy bank shows, he jumps onto it and sees the meadow.
 */
export class SwampMode extends SwampHero {
  readonly pictures = SWAMP_PICTURES;
  readonly drift: Drift = { layer: 'mid', speed: 6 };
  private current: Target | null = null;
  private nextX = 0;
  private endT: number | null = null;

  startLine(): string {
    return pickLine('story.swampStart');
  }

  start(): void {
    this.stand = this.stone(SWAMP_HOME);
    this.stand.age = 1;
    this.next();
  }

  private next(): void {
    const from = this.stand!;
    if (this.done >= this.L.count) {
      this.bank = { x: from.x + SWAMP_GAP + BANK_H * 0.6, age: 0 };
      this.L.tweens.add(0.7, () => {}, ease.linear, () => this.leap(this.bankTop(), () => this.ashore()));
      return;
    }
    this.nextX = from.x + SWAMP_GAP;
    this.current = this.L.core.add(this.L.word(6, 2), {});
  }

  private ashore(): void {
    this.onBank = true;
    this.happy();
    this.L.say(pickLine('story.swampDone'), 3);
    this.L.particles.emit(this.heroX, this.heroY - 20, 14, 'leaf', ['#9ccf7a', '#ffe27a', '#f5a3d3'], 140, 8);
    this.glide(this.bankTop().x, this.L.vw * 0.4, () => (this.endT = 0));
  }

  update(dt: number): void {
    super.update(dt);
    if (this.endT !== null) this.endT += dt;
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.current = null;
    this.done++;
    this.happy();
    this.L.core.prune();
    const s = this.stone(this.nextX, SWAMP_FEET + STONE_H * STONE_TOP + (this.done % 2 ? 6 : -6));
    this.L.particles.emit(s.x - this.scroll, s.y, 10, 'dot', ['#cfe8c0', '#ffffff'], 110, 6);
    this.leap(this.top(s), () => {
      this.stand = s;
      this.glide(s.x, SWAMP_HOME, () => this.next());
    });
  }

  render(g: G): void {
    this.drawStones(g);
    this.drawBank(g);
    if (this.current) {
      this.drawNextRing(g, this.nextX);
      this.L.label(g, this.current, this.heroX, wordAbove(SWAMP_FEET));
    }
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > 1.6;
  }
}

/** The super level: jumps from a firm stone before the view moves on, the boulder's words, and the boulder's size. */
const SET = 4;
const BOULDER = 5;
const BOULDER_H = 300;
/** Seconds of a cracked stone before he jumps back, and of a crumbled stone sinking away. */
const CRACK_WAIT = 0.45;
const CRUMBLE = 0.9;
/** Seconds of the end: the boulder bursts, the stones come one by one, the cradle rises, the crystals fly onto it. */
const BURST = 0.8;
const STONE_EVERY = 0.35;
const RISE = 1;
const PLACE = 1.2;
const CRADLE_H = 190;
const LIFE_H = 120;

/** The Cradle of Life while its picture is missing. */
function cradleFallback(g: G, w: number, h: number): void {
  g.fillStyle = '#b8b0a4';
  g.fillRect(-w * 0.45, h * 0.3, w * 0.9, h * 0.18);
  g.fillRect(-w * 0.3, -h * 0.3, w * 0.6, h * 0.62);
  g.fillStyle = '#9c9488';
  g.beginPath();
  g.ellipse(0, -h * 0.3, w * 0.34, h * 0.08, 0, 0, Math.PI * 2);
  g.fill();
}

/** The three crystals of life while their pictures are missing: three dull or glowing points on a stone. */
export function lifeCrystalFallback(lit: boolean) {
  return (g: G, w: number, h: number) => {
    g.fillStyle = '#8e8a86';
    g.beginPath();
    g.ellipse(0, h * 0.4, w * 0.36, h * 0.1, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = lit ? '#ffe9a8' : '#9c94a8';
    for (const [x, top, lean] of [[-0.22, -0.2, -0.2], [0, -0.48, 0], [0.22, -0.2, 0.2]]) {
      g.beginPath();
      g.moveTo((x - 0.08) * w, h * 0.38);
      g.lineTo((x + lean * 0.3 - 0.02) * w, top * h);
      g.lineTo((x + lean * 0.3 + 0.02) * w, (top - 0.06) * h);
      g.lineTo((x + 0.08) * w, h * 0.38);
      g.closePath();
      g.fill();
    }
  };
}

/** A crumbled stone sinking away. */
interface Crumb {
  x: number;
  y: number;
  t: number;
}

/**
 * Planet 5, the great swamp: from a firm stone Tapko jumps three stones on and the fourth jump
 * reaches the next firm one, where the view moves on. A slip on stone +1 to +3 cracks it: he jumps
 * back stone by stone, each stone behind him crumbles and the next one cracks, and on the firm stone
 * a new word comes. At the end a boulder blocks the way; precise words crack it, it bursts, stones
 * come by themselves, he crosses to the bank and puts the crystals of life on the Cradle of Life.
 */
export class GreatSwampMode extends SwampHero {
  readonly pictures = [...SWAMP_PICTURES, 'obj-swamp-stone-cracked', 'obj-swamp-stone-broken', 'obj-boulder-1', 'obj-boulder-2', 'obj-cradle', 'obj-life-crystal-lit'];
  private gap = 200;
  private home = 130;
  /** The firm stone of this set, and how many jumps are behind him for good. */
  private base: Stone | null = null;
  private secured = 0;
  private current: Target | null = null;
  private crumbs: Crumb[] = [];
  /** Seconds until the next jump back; null when he is not going back. */
  private back: number | null = null;
  private slipSaid = false;
  private boulder: { x: number; crack: number; shake: number; burst: number | null; tg: Target | null } | null = null;
  /** Seconds of the crossing after the boulder: stones come, he crosses; null before it. */
  private cross: number | null = null;
  private crossStones = 0;
  private cradle: { x: number; rise: number } | null = null;
  /** 0..1 of the crystals flying onto the cradle, then seconds after; null before. */
  private place: number | null = null;

  startLine(): string {
    return pickLine('story.greatSwampStart');
  }

  start(): void {
    this.gap = Math.min(220, this.L.vw * 0.19);
    this.home = this.L.vw * 0.12;
    this.stand = this.base = this.stone(this.home);
    this.stand.age = 1;
    this.ask();
  }

  /** Jumps of all the sets before the boulder. */
  private get jumpsGoal(): number {
    return Math.max(SET, this.L.count - BOULDER);
  }

  /** Jumps since the firm stone. */
  private get ahead(): number {
    return this.stones.length - 1 - this.stones.indexOf(this.base!);
  }

  private ask(): void {
    this.current = this.L.core.add(this.L.word(4, 1), {});
  }

  onDone(tg: Target): void {
    const b = this.boulder;
    if (b && tg === b.tg) return this.hitBoulder(tg);
    if (tg !== this.current) return;
    this.current = null;
    this.happy();
    this.L.core.prune();
    const s = this.stone(this.stand!.x + this.gap, this.stand!.y + (this.stones.length % 2 ? 5 : -5));
    this.L.particles.emit(s.x - this.scroll, s.y, 10, 'dot', ['#cfe8c0', '#ffffff'], 110, 6);
    this.leap(this.top(s), () => this.land(s));
  }

  private land(s: Stone): void {
    this.stand = s;
    if (this.ahead < SET) return this.ask();
    // The fourth jump: this stone is the new firm one and the view moves on.
    this.secured += SET;
    const old = this.base!;
    this.base = s;
    this.glide(s.x, this.home, () => {
      this.stones = this.stones.filter((o) => o.x >= old.x + this.gap * 2 || o === s);
      if (this.secured >= this.jumpsGoal) this.startBoulder();
      else this.ask();
    });
  }

  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    if (!this.current || tg !== this.current || this.ahead < 1) return;
    // A slip away from the firm stone: this stone cracks and he goes back.
    this.L.core.release(this.current, false);
    this.L.core.prune();
    this.current = null;
    this.stand!.state = 'cracked';
    this.L.sfx('crack');
    this.back = CRACK_WAIT;
    if (!this.slipSaid) {
      this.slipSaid = true;
      this.L.say(t('story.greatSwampSlip'), 3);
    }
  }

  /** One jump back: the stone he leaves crumbles, the one he lands on cracks (unless it is the firm one). */
  private stepBack(): void {
    const from = this.stones[this.stones.length - 1];
    const to = this.stones[this.stones.length - 2];
    this.leap(this.top(to), () => {
      this.stones.pop();
      this.crumbs.push({ x: from.x, y: from.y, t: 0 });
      this.L.sfx('thud');
      this.L.particles.emit(from.x - this.scroll, from.y, 12, 'dot', ['#8f857a', '#b5ada2', '#6f8a5a'], 120, 6);
      this.stand = to;
      if (to === this.base) {
        this.back = null;
        this.ask();
        return;
      }
      to.state = 'cracked';
      to.crackT = 0;
      this.L.sfx('crack');
      this.back = CRACK_WAIT;
    });
  }

  private startBoulder(): void {
    const x = this.stand!.x + this.gap * 2.4;
    this.boulder = { x, crack: 0, shake: 0, burst: null, tg: null };
    this.L.say(pickLine('story.boulderStart'), 3);
    this.nextChunk();
  }

  private nextChunk(): void {
    this.boulder!.tg = this.L.core.add(this.L.word(6, 1), {});
  }

  /** A typed word cracks the boulder: a whole step without a slip, half with one. */
  private hitBoulder(tg: Target): void {
    const b = this.boulder!;
    b.crack += tg.errors === 0 ? 1 : 0.5;
    b.shake = 1;
    b.tg = null;
    this.happy();
    this.L.sfx('pop');
    this.L.particles.emit(b.x - this.scroll, VH * 0.6, 16, 'dot', ['#c9c2b8', '#e9e4dc', '#a39586'], 200, 7);
    this.L.core.prune();
    if (b.crack < BOULDER) return this.nextChunk();
    b.burst = 0;
    this.L.sfx('crack');
    this.L.say(pickLine('story.boulderOpen'), 3);
    this.L.particles.emit(b.x - this.scroll, VH * 0.6, 40, 'puff', ['#d8d2c8', '#bdb4a6', '#efe9df'], 260, 16, 1.2);
  }

  update(dt: number): void {
    super.update(dt);
    for (const c of this.crumbs) c.t += dt;
    this.crumbs = this.crumbs.filter((c) => c.t < CRUMBLE);
    if (this.back !== null && !this.jumpTo && (this.back -= dt) <= 0) {
      this.back = 0;
      this.stepBack();
      if (this.jumpTo) this.back = Infinity;
    }
    const b = this.boulder;
    if (b) {
      b.shake = Math.max(0, b.shake - dt * 3);
      if (b.burst !== null && (b.burst += dt) >= BURST && this.cross === null) this.cross = 0;
    }
    if (this.cross !== null) this.crossing(dt);
    if (this.cradle) this.cradle.rise = Math.min(1, this.cradle.rise + dt / RISE);
    if (this.place !== null) {
      const before = this.place;
      this.place += dt / PLACE;
      if (before < 1 && this.place >= 1) this.lit();
    }
  }

  /** After the boulder: the stones come one by one up to the last but one, the bank last, then he jumps across. */
  private crossing(dt: number): void {
    const before = this.cross!;
    this.cross! += dt;
    const from = this.base!.x;
    const n = Math.floor(this.cross! / STONE_EVERY);
    if (n > Math.floor(before / STONE_EVERY) && this.crossStones < 2) {
      this.crossStones++;
      this.stone(from + this.gap * this.crossStones);
      this.L.sfx('pop');
    } else if (n > Math.floor(before / STONE_EVERY) && this.crossStones === 2 && !this.bank) {
      this.bank = { x: from + this.gap * 3 + BANK_H * 0.6, age: 0 };
      this.L.tweens.add(0.5, () => {}, ease.linear, () => this.hopAcross(1));
    }
  }

  private hopAcross(i: number): void {
    if (i <= 2) {
      const s = this.stones.find((o) => Math.abs(o.x - (this.base!.x + this.gap * i)) < 1)!;
      return this.leap(this.top(s), () => {
        this.stand = s;
        this.hopAcross(i + 1);
      });
    }
    this.leap(this.bankTop(), () => {
      this.onBank = true;
      this.stand = null;
      this.cradle = { x: this.bank!.x + BANK_H * BANK_CRADLE, rise: 0 };
      this.glide((this.bankTop().x + this.cradle.x) / 2, this.L.vw / 2, () => (this.place = 0));
    });
  }

  /** The crystals of life are on the cradle: they glow, the planet comes to life, Tapko cheers. */
  private lit(): void {
    const c = this.cradle!;
    const x = c.x - this.scroll, y = this.cradleTop();
    this.happy();
    this.L.particles.emit(x, y - LIFE_H * 0.5, 40, 'sparkle', ['#fff6a8', '#ffd1f5', '#a8f0ff'], 280, 10, 1.4);
    this.L.particles.emit(x, VH * 0.85, 24, 'leaf', ['#9ccf7a', '#ffe27a', '#f5a3d3', '#e5402e'], 220, 9, 1.4);
    this.L.say(pickLine('story.cradleDone'), 3);
    this.L.hooray({ x, y: y - LIFE_H - 40 });
  }

  private cradleTop(): number {
    const k = ease.outCubic(this.cradle!.rise);
    return SWAMP_FEET + 6 - CRADLE_H * 0.86 + (1 - k) * CRADLE_H;
  }

  render(g: G): void {
    for (const c of this.crumbs) {
      const k = c.t / CRUMBLE;
      drawSprite(g, 'obj-swamp-stone-broken', c.x - this.scroll, c.y + k * 26, STONE_H, { alpha: 1 - k }, stoneFallback);
    }
    this.drawStones(g);
    this.drawBank(g);
    const b = this.boulder;
    if (b && (b.burst ?? 0) < BURST) {
      const fade = b.burst === null ? 1 : 1 - b.burst / BURST;
      const sh = Math.sin(this.t * 50) * 6 * b.shake;
      const x = b.x - this.scroll + sh;
      drawSprite(g, b.crack >= BOULDER / 2 ? 'obj-boulder-2' : 'obj-boulder-1', x, SWAMP_FEET + 30, BOULDER_H * (b.burst === null ? 1 : 1 + b.burst * 0.3), { ay: 0.92, alpha: fade }, blob('#a39586', true, 'rgba(0,0,0,0.12)'));
      if (b.tg) this.L.label(g, b.tg, x, SWAMP_FEET + 30 - BOULDER_H - 30, 46);
    }
    if (this.cradle) {
      const c = this.cradle;
      g.save();
      g.beginPath();
      g.rect(0, 0, this.L.vw, SWAMP_FEET + 10);
      g.clip();
      drawSprite(g, 'obj-cradle', c.x - this.scroll, this.cradleTop(), CRADLE_H, { ay: 0.14 }, cradleFallback);
      g.restore();
    }
    if (this.current) {
      this.drawNextRing(g, this.stand!.x + this.gap);
      this.L.label(g, this.current, this.heroX, wordAbove(SWAMP_FEET));
    }
    this.drawHero(g);
    if (this.place !== null && this.cradle) this.drawLife(g);
  }

  /** The crystals of life rise from his paws and fly onto the cradle, where they glow. */
  private drawLife(g: G): void {
    const k = ease.inOutQuad(Math.min(1, this.place!));
    const fx = this.heroX, fy = this.heroY - TAPKO_H * 0.45;
    const tx = this.cradle!.x - this.scroll, ty = this.cradleTop() + 8;
    const x = fx + (tx - fx) * k, y = fy + (ty - fy) * k - Math.sin(k * Math.PI) * 90;
    const h = LIFE_H * (0.5 + 0.5 * k);
    if (this.place! >= 1) {
      g.save();
      const glow = g.createRadialGradient(x, y - h * 0.5, 4, x, y - h * 0.5, h * 1.3);
      glow.addColorStop(0, 'rgba(255,240,170,0.8)');
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = glow;
      g.fillRect(x - h * 1.3, y - h * 1.8, h * 2.6, h * 2.6);
      g.restore();
    }
    drawSprite(g, 'obj-life-crystal-lit', x, y, h, { ay: 0.95 }, lifeCrystalFallback(true));
  }

  progress(): number {
    const cracked = this.boulder ? Math.min(BOULDER, this.boulder.crack) : 0;
    return Math.min(1, (this.secured + Math.max(0, this.ahead) + cracked) / this.L.count);
  }

  get finished(): boolean {
    return (this.place ?? 0) > 1.8;
  }
}
