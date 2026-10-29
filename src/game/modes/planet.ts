import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { blob, drawSprite, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { TAPKO_H } from '../mode';
import { HeroMode, wordAbove } from './kit/hero';
import { LIFE_CRYSTALS, drawLifeCrystals } from './planet-crystals';
import type { Target } from '../typing';

/** His feet on a stepping stone in the swamp, a bit higher, so the stone fits under them. */
const SWAMP_FEET = VH * 0.85;
/**
 * A stepping stone (a round mossy stone with a face): its picture's height, how far above its middle
 * his feet stand (two thirds up from its bottom, on the moss), and how much higher or lower than the
 * swamp line a stone may lie.
 */
const STONE_H = 92;
const STONE_TOP = 1 / 6;
const STONE_RISE = 26;
const STONE_DROP = 6;
/**
 * The swamp ends in the near band's end piece (`bg-planet-swamp-near-end`, one and a half tiles):
 * the band, then the meadow coming in and running on past the right edge. In tiles from the piece's
 * start: where its grass begins (he lands there from the last stone), where he ends and where the
 * cradle stands; his feet on the grass, and the share of the stage he moves to through the swamp.
 */
const SHORE_LAND = 1.06;
/** Up to here (in tiles) the end piece is the band itself. */
const SHORE_SAME = 0.8;
const SHORE_MEADOW = 1.22;
const SHORE_CRADLE = 1.45;
const SHORE_FEET = SWAMP_FEET - 6;
const SHORE_VIEW = 0.6;
/** He ends on the meadow at least this far from the right edge. */
const SHORE_MARGIN = 160;
/** In the first level the shore comes once this share of the level is done, or when the words are done and fewer seconds than this are left. */
const SHORE_AT = 0.9;
const SHORE_LAST_S = 10;
/** The swamp band's tile width on the stage (1376 x 768 until its picture is there). */
function tileW(): number {
  const img = sprite('bg-planet-swamp-near');
  return img ? (img.naturalWidth * VH) / img.naturalHeight : (1376 * VH) / 768;
}
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

const SWAMP_PICTURES = ['obj-swamp-stone'];

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

/** His jump from one place in the scene to another (a stone, the shore). */
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
  protected stones: Stone[] = [];
  /** The stone he stands on, or null on the shore. */
  protected stand: Stone | null = null;
  /** Where he stands on the shore, once there. */
  protected onShore: { x: number; y: number } | null = null;
  protected jumpTo: Jump | null = null;
  /** The view glides after him: from, to and its share done. */
  private glideFrom = 0;
  private glideTo = 0;
  private glideK = 1;
  private afterGlide: (() => void) | null = null;

  protected stone(x: number, y = SWAMP_FEET + this.L.rng.range(-STONE_RISE, STONE_DROP) + STONE_H * STONE_TOP): Stone {
    const s: Stone = { x, y, age: 0, state: 'ok', crackT: 0 };
    this.stones.push(s);
    return s;
  }

  /** His feet on a stone, in the scene. */
  protected top(s: Stone): { x: number; y: number } {
    return { x: s.x, y: s.y - STONE_H * STONE_TOP };
  }

  /** A place on the shore, in tiles from the end piece's start, his feet on the grass. */
  protected shoreAt(tiles: number): { x: number; y: number } {
    return { x: this.nearEnd! + tileW() * tiles, y: SHORE_FEET };
  }

  /** The swamp ends: the band's end piece comes as near as it can, its first differing part just past the stage's right edge. */
  protected placeShore(): void {
    const t = tileW();
    this.nearEnd = Math.ceil((this.scroll + this.L.vw - SHORE_SAME * t) / t) * t;
  }

  /** From his stone onto the shore's grass, the view moving on if needed, and a little way up onto the meadow. */
  protected stepAshore(then: () => void): void {
    const land = this.shoreAt(SHORE_LAND), meadow = this.shoreAt(SHORE_MEADOW);
    this.leap(land, () => {
      this.stand = null;
      this.onShore = land;
      const up = () => this.leap(meadow, () => {
        this.onShore = meadow;
        then();
      });
      if (meadow.x - this.scroll <= this.L.vw - SHORE_MARGIN) return up();
      this.glide(meadow.x, this.L.vw - SHORE_MARGIN, up);
    });
  }

  /** The shore's grass is one jump (`gap`) or less from the stone at `x`. */
  protected nearShore(x: number, gap: number): boolean {
    return x + gap >= this.shoreAt(SHORE_LAND).x - gap * 0.6;
  }

  /** The shore comes, stones come by themselves `gap` apart after `from`, and he jumps across them ashore. */
  protected toShore(from: number, gap: number, then: () => void): void {
    this.placeShore();
    const hop = (x: number): void => {
      if (this.nearShore(x - gap, gap)) return this.stepAshore(then);
      const s = this.stone(x);
      this.L.sfx('pop');
      this.L.tweens.add(0.35, () => {}, ease.linear, () => this.leap(this.top(s), () => {
        this.stand = s;
        this.glide(s.x, this.L.vw * SHORE_VIEW, () => hop(x + gap));
      }));
    };
    hop(from + gap);
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
    if (this.onShore) return this.onShore;
    return this.stand ? this.top(this.stand) : { x: 200, y: SWAMP_FEET };
  }

  update(dt: number): void {
    super.update(dt);
    for (const s of this.stones) {
      s.age += dt;
      if (s.state === 'cracked') s.crackT += dt;
    }
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

  protected drawStones(g: G): void {
    // A higher stone is further back: it is drawn first.
    for (const s of [...this.stones].sort((a, b) => a.y - b.y)) {
      const k = this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, s.age / 0.35));
      const cracked = s.state === 'cracked';
      const sh = cracked ? Math.sin(s.crackT * 60) * 3 : 0;
      drawSprite(g, cracked ? 'obj-swamp-stone-cracked' : 'obj-swamp-stone', s.x - this.scroll + sh, s.y, STONE_H * k, {}, stoneFallback);
    }
  }

  protected drawNextRing(g: G, x: number): void {
    drawRing(g, x - this.scroll, SWAMP_FEET + 6, this.t);
  }
}

/** Gap between stones of the first level, and where he starts; as the level goes on he moves to `SHORE_VIEW`. */
const SWAMP_GAP = 240;
const SWAMP_HOME = 210;

/**
 * Planet 1, the swamp after the landing (waiting words): one word at a time above Tapko; typed,
 * a stone comes where the ring was and he jumps onto it, the view glides after him. After the last
 * word the swamp ends: stones come until the meadow is in sight, he jumps onto it and sees the meadow.
 */
export class SwampMode extends SwampHero {
  readonly pictures = SWAMP_PICTURES;
  private current: Target | null = null;
  private nextX = 0;
  /** The next word leads onto the shore, not to a stone. */
  private toLand = false;
  /** Where his stone is on the stage after the view glided. */
  private shown = SWAMP_HOME;
  private endT: number | null = null;

  startLine(): string {
    return pickLine('story.swampStart');
  }

  start(): void {
    this.stand = this.stone(SWAMP_HOME);
    this.stand.age = 1;
    this.next();
  }

  /** About the end of the level: the shore comes next. */
  private get shoreDue(): boolean {
    return this.L.share() >= SHORE_AT || (this.progress() >= 1 && this.L.minLeft < SHORE_LAST_S);
  }

  /**
   * The next word. Near the end the shore comes: the words go on stone by stone, the last one
   * leads onto the grass, and the level counts them so it ends there.
   */
  private next(): void {
    const from = this.stand!;
    if (this.nearEnd === null && this.shoreDue) {
      this.placeShore();
      let left = 1;
      for (let x = from.x; !this.nearShore(x, SWAMP_GAP); x += SWAMP_GAP) left++;
      this.L.count = this.done + left;
    }
    this.toLand = this.nearEnd !== null && this.nearShore(from.x, SWAMP_GAP);
    this.nextX = from.x + SWAMP_GAP;
    this.current = this.L.core.add(this.L.word(6, 2), {});
  }

  private ashore(): void {
    this.happy();
    this.L.say(pickLine('story.swampDone'), 3);
    this.L.particles.emit(this.heroX, this.heroY - 20, 14, 'leaf', ['#9ccf7a', '#ffe27a', '#f5a3d3'], 140, 8);
    this.endT = 0;
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
    if (this.toLand) return this.stepAshore(() => this.ashore());
    // Stones a whole stage behind go, so staying a while does not pile them up.
    this.stones = this.stones.filter((o) => o.x > this.scroll - this.L.vw || o === this.stand);
    const s = this.stone(this.nextX);
    this.L.particles.emit(s.x - this.scroll, s.y, 10, 'dot', ['#cfe8c0', '#ffffff'], 110, 6);
    this.leap(this.top(s), () => {
      this.stand = s;
      // He moves toward the right edge as the level goes on, never back.
      this.shown = Math.max(this.shown, SWAMP_HOME + (this.L.vw * SHORE_VIEW - SWAMP_HOME) * Math.min(1, this.done / this.L.count));
      this.glide(s.x, this.shown, () => this.next());
    });
  }

  render(g: G): void {
    this.drawStones(g);
    if (this.current) {
      if (!this.toLand) this.drawNextRing(g, this.nextX);
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
/** Seconds of the end: the boulder bursts, the cradle rises, the crystals fly onto it. */
const BURST = 0.8;
const RISE = 1;
const PLACE = 1.2;
const CRADLE_H = 190;
const LIFE_H = 100;
/** Above the cradle they float this high, bobbing a little. */
const FLOAT = 26;
const BOB = 6;

/** The monolith while its picture is missing. */
function cradleFallback(g: G, w: number, h: number): void {
  g.fillStyle = '#b8b0a4';
  g.fillRect(-w * 0.45, h * 0.3, w * 0.9, h * 0.18);
  g.fillRect(-w * 0.3, -h * 0.3, w * 0.6, h * 0.62);
  g.fillStyle = '#9c9488';
  g.beginPath();
  g.ellipse(0, -h * 0.3, w * 0.34, h * 0.08, 0, 0, Math.PI * 2);
  g.fill();
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
 * come by themselves, he crosses to the shore and puts the crystals of life on the monolith.
 */
export class GreatSwampMode extends SwampHero {
  readonly pictures = [...SWAMP_PICTURES, 'obj-swamp-stone-cracked', 'obj-swamp-stone-broken', 'obj-boulder-1', 'obj-boulder-2', 'obj-cradle', ...LIFE_CRYSTALS];
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
  /** He is on his way to the shore after the boulder. */
  private crossing = false;
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
    const s = this.stone(this.stand!.x + this.gap);
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
      if (b.burst !== null && (b.burst += dt) >= BURST && !this.crossing) this.cross();
    }
    if (this.cradle) this.cradle.rise = Math.min(1, this.cradle.rise + dt / RISE);
    if (this.place !== null) {
      const before = this.place;
      this.place += dt / PLACE;
      if (before < 1 && this.place >= 1) this.lit();
    }
  }

  /** After the boulder stones come over its place to the shore; there the monolith rises beside him. */
  private cross(): void {
    this.crossing = true;
    this.toShore(this.base!.x, this.gap, () => {
      this.cradle = { x: this.shoreAt(SHORE_CRADLE).x, rise: 0 };
      // He and the cradle in the middle; the meadow goes on past the edge.
      this.glide((this.onShore!.x + this.cradle.x) / 2, this.L.vw / 2, () => (this.place = 0));
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
    return SHORE_FEET + 16 - CRADLE_H * 0.86 + (1 - k) * CRADLE_H;
  }

  render(g: G): void {
    for (const c of this.crumbs) {
      const k = c.t / CRUMBLE;
      drawSprite(g, 'obj-swamp-stone-broken', c.x - this.scroll, c.y + k * 26, STONE_H, { alpha: 1 - k }, stoneFallback);
    }
    this.drawStones(g);
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
      g.rect(0, 0, this.L.vw, SHORE_FEET + 20);
      g.clip();
      drawSprite(g, 'obj-cradle', c.x - this.scroll, this.cradleTop(), CRADLE_H, { ay: 0.14 }, cradleFallback);
      g.restore();
      this.drawCradleGlow(g);
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
    const tx = this.cradle!.x - this.scroll, ty = this.cradleTop() - FLOAT * k + Math.sin(this.t * 2) * BOB * k;
    const x = fx + (tx - fx) * k, y = fy + (ty - fy) * k - Math.sin(k * Math.PI) * 90;
    drawLifeCrystals(g, x, y, LIFE_H * (0.5 + 0.5 * k), [1, 1, 1]);
  }

  /** A soft light above the cradle, waiting for the crystals; brighter once they float there. */
  private drawCradleGlow(g: G): void {
    const c = this.cradle!, x = c.x - this.scroll, y = this.cradleTop() - LIFE_H * 0.6;
    const k = ease.outCubic(c.rise) * (this.place !== null && this.place >= 1 ? 1 : 0.55);
    const r = LIFE_H * 1.4;
    g.save();
    const glow = g.createRadialGradient(x, y, 4, x, y, r);
    glow.addColorStop(0, `rgba(255,240,170,${0.75 * k})`);
    glow.addColorStop(1, 'rgba(255,240,170,0)');
    g.fillStyle = glow;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  }


  progress(): number {
    const cracked = this.boulder ? Math.min(BOULDER, this.boulder.crack) : 0;
    return Math.min(1, (this.secured + Math.max(0, this.ahead) + cracked) / this.L.count);
  }

  get finished(): boolean {
    return (this.place ?? 0) > 1.8;
  }
}
