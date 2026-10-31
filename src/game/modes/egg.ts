import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { blob, drawSprite, type G, wordBox } from '../../gfx/draw';
import type { TapkoMotion } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './kit/approach';
import { Detour, EggPeek, drawCarrier, lengthen, secondsPerWord } from './kit/egg';
import { HeroMode, PATH_FEET, wordAbove } from './kit/hero';

/** He walks in the middle of the mountain path; where he stands, and where the things coming at him reach him. */
const FEET = PATH_FEET;
const HERO_X = 200;
const REACH = 60;
const END_TIME = 3;
/** His wobble (stuck in the mud, hit by a boulder): seconds, swings of his top left and right, and their size (a share of a whole turn). */
const WOBBLE_S = 0.9;
const WOBBLE_SWINGS = 3;
const WOBBLE = 0.03;
/** Seconds the bands glide when he walks on or is pushed back. */
const GLIDE = 0.6;

/** The leaves a gust whirls round (the meadow's), and a leaf while its picture is missing. */
const LEAVES = ['obj-leaf-oak', 'obj-leaf-maple', 'obj-leaf-birch', 'obj-leaf-chestnut'];
const leafFallback = blob('#9ccf7a', false);

/**
 * A level of the mountain that comes at Tapko as a stream (the wind, the boulders): he stands on
 * the path with the egg on his back and walks on or is pushed back by gliding the bands.
 */
abstract class SlopeStream extends ApproachMode {
  readonly world = 'egg';
  protected egg: EggPeek;
  /** The dragon story's hero's journey goes back down: the egg has hatched and the little dragon walks behind him. */
  protected readonly journey: boolean;
  protected detour: Detour;
  /** His own bob or hop (0..1) and his lean (a share of a turn). */
  protected jump = 0;
  protected lean = 0;
  protected endT: number | null = null;
  private longerSaid = false;

  constructor(L: LevelRuntime, maxWords: number) {
    super(L);
    this.egg = new EggPeek(L);
    this.journey = L.def.variant === 'journey';
    this.detour = new Detour(maxWords, secondsPerWord(L));
    this.playerX = HERO_X + REACH;
  }

  /** He walks only as the words take him. */
  protected scrollSpeed(): number {
    return 0;
  }

  /** The bands glide by `by` (back: never before the start); he bobs as he walks. */
  protected glide(by: number): void {
    const from = this.scroll, to = Math.max(0, from + by);
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : GLIDE, (k) => {
      this.scroll = from + (to - from) * k;
      if (by > 0) this.jump = Math.abs(Math.sin(k * Math.PI * 2)) * 0.15;
    }, ease.inOutQuad, () => { this.jump = 0; });
  }

  /** The way gets longer by `words`; the first time the narrator says why. */
  protected longer(words: number, line: string): void {
    if (!lengthen(this.L, this.detour, words) || this.longerSaid) return;
    this.longerSaid = true;
    this.L.say(t(line), 4);
  }

  /** A short shout above his head. */
  protected exclaim(key: string): void {
    const at = this.heroSpot();
    this.L.shout(pickLine(key), at.x, at.y);
  }

  heroSpot(): { x: number; y: number } {
    return { x: HERO_X, y: FEET - TAPKO_H * 1.25 - 40 };
  }

  /** The little dragon of the hero's journey walks right behind him. */
  friendSpot(): { x: number; y: number } {
    return { x: HERO_X - 105, y: FEET };
  }

  /** The line at the end of the stream. */
  protected abstract doneLine(): string;

  update(dt: number): void {
    super.update(dt);
    this.egg.update(dt);
    if (this.endT === null && super.finished) {
      this.endT = 0;
      this.L.say(pickLine(this.doneLine()), END_TIME);
    } else if (this.endT !== null) this.endT += dt;
  }

  protected drawHero(g: G): void {
    drawCarrier(g, this.L, this.journey ? null : this.egg, this.L.tapkoMood, HERO_X, FEET, { t: this.t, jump: this.jump, spin: this.lean });
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** A gust's swirl radius, how much a slip makes it grow and speeds it up, and the speed of its rush after a second slip. */
const GUST_R = 70;
const STRONG = 1.3;
const STRONG_SPEED = 1.35;
const RUSH_SPEED = 1500;
/** How far a typed gust lets him walk on, an untyped one pushes him back, and a rush pushes him back. */
const WALK_ON = 80;
const PUSH_BACK = 60;
const RUSH_BACK = 120;
/** A rush adds two planned words (and their time), at most ten in a level. */
export const RUSH_WORDS = 2;
export const WIND_MAX_WORDS = 10;
/**
 * A gust starts at any height above his head (its word stays below the bar) and keeps it for this
 * share of its way, then sinks to his body (his middle, a little up or down), so it blows into him.
 */
const GUST_TOP = 150;
const GUST_SINK_FROM = 0.5;
const GUST_AIM: [number, number] = [-0.65, -0.35];
/** He leans into the wind while a gust is in flight: a share of a whole turn. */
const LEAN = 0.022;
/** An untyped gust that reaches him makes him say something about every other time. */
const GUST_SAY = 0.5;

/**
 * Egg 1, wind on the slope (a word stream): each word comes from the right in a gust, a swirl of
 * air with a leaf or two. Typed, the gust breaks up and he walks on up the path; untyped, it pushes
 * him back a little. A slip makes its gust stronger and its word starts again; a second slip in
 * the same gust sends it into him at once, pushes him back further and makes the way longer.
 */
export class WindMode extends SlopeStream {
  readonly pictures = [...LEAVES, 'obj-egg-plain'];

  constructor(L: LevelRuntime) {
    super(L, WIND_MAX_WORDS);
  }

  startLine(): string {
    return pickLine('story.windStart');
  }

  protected doneLine(): string {
    return 'story.windDone';
  }

  /** One gust at a time, two from the second half of the level. */
  protected maxOnScreen(): number {
    return this.L.share() >= 0.5 ? 2 : 1;
  }

  makeMover(word: string): Mover {
    const L = this.L, x = L.vw + GUST_R * 1.5, to = FEET + L.rng.range(...GUST_AIM) * TAPKO_H, by = L.rng.range(GUST_TOP, to);
    const leaves = Array.from({ length: L.rng.int(1, 2) }, (_, i) => ({ pic: L.rng.pick(LEAVES), phase: i * Math.PI + L.rng.range(0, 1) }));
    return { x, y: by, by, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite: '', size: GUST_R * 2, strong: false, grow: 1, rush: false, leaves, phase: L.rng.range(0, 6), x0: x, to };
  }

  update(dt: number): void {
    super.update(dt);
    let inFlight = false;
    for (const tg of this.L.core.targets) {
      const m = tg.data as Mover;
      if (m.state !== 'come') continue;
      inFlight = true;
      m.grow += ((m.strong ? STRONG : 1) - m.grow) * Math.min(1, dt * 5);
      // A gust's word shows once the gust is wholly in sight; a rushing one has none.
      tg.selectable = !m.rush && m.x + GUST_R * m.grow <= this.L.vw;
    }
    this.lean += ((inFlight && this.endT === null ? LEAN : 0) - this.lean) * Math.min(1, dt * 3);
  }

  protected moveComing(m: Mover, dt: number, tg: Target): void {
    if (m.rush) m.x -= RUSH_SPEED * dt;
    else super.moveComing(m, dt, tg);
    const way = (m.x0 - m.x) / (m.x0 - HERO_X - REACH), sink = ease.inOutQuad(Math.min(1, Math.max(0, (way - GUST_SINK_FROM) / (1 - GUST_SINK_FROM))));
    m.y = m.by + (m.to - m.by) * sink + Math.sin(m.age * 2.1 + m.phase) * 10;
  }

  /** A typed gust breaks up in a puff and he walks on up the path. */
  protected onLeave(m: Mover): void {
    m.vx = -30;
    m.vy = -20;
    this.L.particles.emit(m.x, m.y, 8, 'puff', ['rgba(255,255,255,0.35)', 'rgba(232,244,255,0.3)'], 140, 18);
    this.glide(WALK_ON);
  }

  /** An untyped gust reaches him and pushes him and the egg a few steps back; a rush further, and the way gets longer. */
  protected onPass(m: Mover): void {
    m.vx = -60;
    m.vy = -30;
    this.L.particles.emit(HERO_X + 40, m.y, 8, 'puff', ['rgba(255,255,255,0.35)', 'rgba(232,244,255,0.3)'], 150, 16);
    this.egg.poke();
    this.L.setMood('thinking', 1);
    this.glide(-(m.rush ? RUSH_BACK : PUSH_BACK));
    if (m.rush) this.longer(RUSH_WORDS, 'story.windLonger');
    if (m.rush || this.L.rng.chance(GUST_SAY)) this.exclaim('story.windGust');
  }

  protected moveGone(m: Mover, dt: number): void {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.grow += dt * 0.8;
    m.fade = Math.min(1, m.fade + dt * 1.2);
  }

  /** A slip in a started gust makes it stronger and its word starts again; a second sends it into him at once. */
  onWrong(tg: Target | null): void {
    if (!tg || this.L.core.locked !== tg) return;
    const m = tg.data as Mover;
    if (m.state !== 'come' || m.rush) return;
    this.L.core.restart();
    this.L.sfx('whoosh');
    if (!m.strong) {
      m.strong = true;
      m.vx *= STRONG_SPEED;
      return;
    }
    m.rush = true;
    tg.selectable = false;
  }

  /**
   * A swirl of air: soft blue-grey strokes under white ones, so it reads on a bright sky too. Breaking
   * up, it melts into the air: the grey edge goes first, the strokes thin out, shorten and drift apart.
   */
  drawMover(g: G, m: Mover): void {
    const f = m.fade, thin = 1 - 0.7 * f, open = 1 + 0.6 * f;
    const r = GUST_R * m.grow, spin = m.age * (m.strong ? 5 : 3.5) + m.phase, w = (m.strong ? 1.6 : 1) * thin;
    const strokes: ((g: G) => void)[] = [];
    for (let i = 0; i < 4; i++) {
      const rr = r * (0.35 + 0.2 * i) * open, a = spin * (1 - i * 0.12) + i * 1.7;
      strokes.push((gg) => gg.arc(m.x, m.y, rr, a, a + (1.5 + i * 0.25) * thin));
    }
    // Wisps trail behind it.
    for (const dy of [-0.35, 0.1, 0.45]) {
      const y = m.y + dy * r, wave = Math.sin(m.age * 6 + dy * 5) * 6;
      strokes.push((gg) => {
        gg.moveTo(m.x + r * 0.7, y);
        gg.quadraticCurveTo(m.x + r * 1.3, y + wave, m.x + r * (1.8 + (m.strong ? 0.4 : 0)), y);
      });
    }
    g.save();
    g.lineCap = 'round';
    const a0 = g.globalAlpha;
    for (const [ink, width, alpha] of [['#5f7f9c', 8, 0.35 * (1 - f) ** 2], ['#ffffff', 4.5, 0.95 * (1 - f)]] as const) {
      g.strokeStyle = ink;
      g.lineWidth = width * w;
      g.globalAlpha = a0 * alpha;
      for (const s of strokes) {
        g.beginPath();
        s(g);
        g.stroke();
      }
    }
    g.restore();
    for (const lf of m.leaves as { pic: string; phase: number }[]) {
      const a = spin * 1.2 + lf.phase;
      drawSprite(g, lf.pic, m.x + Math.cos(a) * r * 0.62, m.y + Math.sin(a) * r * 0.45, 40 * m.grow, { rot: a * 1.5 }, leafFallback);
    }
  }

  render(g: G): void {
    this.drawHero(g);
    super.render(g);
  }
}

/** The boulders' looks, and their size by the word's length (the shortest word, the smallest boulder). */
const BOULDERS = ['obj-boulder-1', 'obj-boulder-2', 'obj-boulder-3'];
const BOULDER_SIZE = [58, 60, 62, 64];
/** From this share of the level every third throw is a pair, the second 1-1.5 s after the first. */
const PAIR_FROM = 1 / 3;
const PAIR_EVERY = 3;
const PAIR_GAP: [number, number] = [1, 1.5];
/** A missed boulder makes the way longer by this share of the level's planned words (and its minimum time), at most ten times. */
export const STUMBLE_SHARE = 0.07;
export const STUMBLE_MAX = 10;
/** On the journey a slip in a stone's word adds one more stone and its time, once a stone, at most this many times. */
export const SLIP_STONES = 7;
/**
 * A typed boulder slides off the path and falls down (its pull, px/s², and how much of its speed it
 * keeps); a missed one bounces off him (a little back and up) and falls down off the path too.
 */
const FALL = 900;
const SLIDE_KEEP = 0.45;
const BOUNCE: [vx: number, vy: number] = [90, -260];
/** A boulder that hits him makes him wobble (see WOBBLE) with a small hop at its start. */
const WOBBLE_HOP = 0.25;
const WOBBLE_HOP_K = 0.3;

/** A round grey-brown boulder while its picture is missing. */
function boulderFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#9b8f84';
  g.strokeStyle = '#5f544b';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(0, 0, w * 0.48, h * 0.48, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#b5aa9e';
  g.beginPath();
  g.ellipse(-w * 0.15, -h * 0.18, w * 0.16, h * 0.1, -0.4, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(70,60,50,0.5)';
  g.beginPath();
  g.moveTo(w * 0.05, h * 0.1);
  g.lineTo(w * 0.25, h * 0.28);
  g.stroke();
  g.restore();
}

/**
 * Egg 4, boulders before the summit (a word stream): small round boulders roll down the path at him,
 * the word above each; from a third of the level about every third throw is a pair. Typed, it slides
 * off the path and falls down before it reaches him; missed, it bounces off him and falls down off
 * the path, he wobbles with a small hop, and the way gets a little longer. On the dragon story's
 * hero's journey they roll after him on the way down, the egg hatched, and the way grows by the
 * part's own share; a slip in a stone's word also brings one more stone (`SLIP_STONES`).
 */
export class BouldersMode extends SlopeStream {
  readonly pictures = [...BOULDERS, 'obj-egg-plain'];
  /** Throws so far, and the second boulder of a pair is due. */
  private throws = 0;
  private pairSecond = false;
  /** 0..1 through his wobble after a hit, -1 when he stands. */
  private wobble = -1;
  /** The journey's stones added by slips, and the stones whose word already added one. */
  private slipStones: Detour;
  private slipped = new Set<Target>();

  constructor(L: LevelRuntime) {
    super(L, STUMBLE_SHARE * STUMBLE_MAX * L.def.count);
    this.slipStones = new Detour(SLIP_STONES, secondsPerWord(L));
  }

  /** On the journey a slip in a stone's word brings one more stone and a planned word's time, once a stone. */
  onWrong(tg: Target | null): void {
    if (!this.journey || !tg || this.slipped.has(tg)) return;
    this.slipped.add(tg);
    lengthen(this.L, this.slipStones, 1);
  }

  startLine(): string {
    return pickLine('story.bouldersStart');
  }

  protected doneLine(): string {
    return this.journey ? 'story.bouldersDownDone' : 'story.bouldersDone';
  }

  /** A pair's second boulder may come while the first rolls; else one at a time. */
  protected maxOnScreen(): number {
    return this.pairSecond ? 2 : 1;
  }

  protected spawnGap(): number {
    return this.pairSecond ? this.L.rng.range(...PAIR_GAP) : this.L.spawnGap;
  }

  protected nextWord(): string {
    if (this.pairSecond) this.pairSecond = false;
    else if (++this.throws % PAIR_EVERY === 0 && this.L.share() >= PAIR_FROM) this.pairSecond = true;
    return super.nextWord();
  }

  makeMover(word: string): Mover {
    const L = this.L, n = word.length, size = BOULDER_SIZE[n <= 3 ? 0 : n <= 5 ? 1 : n <= 7 ? 2 : 3];
    const x = L.vw + size;
    return {
      x, y: FEET - size / 2 + 4, vx: this.speedFor(word, x), vy: 0, rot: L.rng.range(0, Math.PI * 2), vr: 0, age: 0, state: 'come', fade: 0,
      sprite: L.rng.pick(BOULDERS), size, flip: L.rng.chance(0.5),
    };
  }

  update(dt: number): void {
    super.update(dt);
    // A boulder's word shows once it is wholly in sight.
    for (const tg of this.L.core.active) {
      const m = tg.data as Mover;
      if (m.state === 'come' && tg.selectable) tg.selectable = m.x + m.size / 2 <= this.L.vw;
    }
    if (this.wobble >= 0) {
      const k = (this.wobble += dt / WOBBLE_S);
      // His top swings left and right, fading out, after a small hop.
      this.lean = k >= 1 ? 0 : WOBBLE * Math.sin(k * Math.PI * 2 * WOBBLE_SWINGS) * (1 - k);
      this.jump = k < WOBBLE_HOP_K ? Math.sin((k / WOBBLE_HOP_K) * Math.PI) * WOBBLE_HOP : 0;
      if (k >= 1) this.wobble = -1;
    }
  }

  /** Rolling on: it turns as it rolls. */
  protected moveComing(m: Mover, dt: number, tg: Target): void {
    const x = m.x;
    super.moveComing(m, dt, tg);
    m.rot += (m.x - x) / (m.size / 2);
  }

  /** A typed boulder slides off the path: it keeps some of its speed and falls down. */
  protected onLeave(m: Mover): void {
    m.vx *= SLIDE_KEEP;
    m.vy = 0;
  }

  /** A missed one bounces off him and falls down off the path: he wobbles, and the way gets longer. */
  protected onPass(m: Mover): void {
    [m.vx, m.vy] = BOUNCE;
    if (!this.L.reduceMotion) this.wobble = 0;
    this.L.sfx('pop');
    this.egg.poke();
    this.exclaim('story.boulderOops');
    this.L.setMood('thinking', 1.4);
    this.L.friendWorried();
    this.longer(STUMBLE_SHARE * this.L.def.count, this.journey ? 'story.bouldersDownLonger' : 'story.bouldersLonger');
  }

  protected moveGone(m: Mover, dt: number): void {
    const x = m.x;
    m.vy += FALL * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.rot += (m.x - x) / (m.size / 2);
    if (m.y - m.size > VH) m.fade = 1;
  }

  drawMover(g: G, m: Mover): void {
    drawSprite(g, m.sprite, m.x, m.y, m.size, { rot: m.rot, flip: m.flip }, boulderFallback);
  }

  render(g: G): void {
    this.drawHero(g);
    for (const tg of this.L.core.targets) {
      const m = tg.data as Mover;
      this.drawMover(g, m);
      if (m.state === 'come') this.L.label(g, tg, m.x, m.y - m.size / 2 - 34);
    }
  }
}

/** The path's places right of him (shares of the stage), and the seconds a round's words grow. */
const SLOTS = [0.42, 0.62, 0.82];
const GROW = 0.35;
/** The puddles: their pictures, their width and most height on the path (flattened, they lie on it). */
const MUDS = ['obj-mud-1', 'obj-mud-2'];
const MUD_W = 170;
const MUD_H = 50;
/**
 * A puddle crawls along the path from the right edge toward him, in this many seconds per stage
 * width; it fades away where it lies on the path (in this many seconds) before it reaches him, or as
 * soon as he steps to a word it is not under; the next one comes from the right after a short wait.
 */
const MUD_CRAWL_S = 8;
const MUD_FADE_S = 0.7;
const MUD_WAIT_S = 0.6;
/** It fades this far right of him (beyond his reach), and a word is over it while the puddle's middle is this close. */
const MUD_STOP = 170;
const MUD_UNDER = MUD_W * 0.45;
/** A mud step makes this many very hard words; he wobbles at each of the first ones and hops out after the last. */
export const HARD_ROUNDS = 3;
/** A very hard word: the longest of a few drawn from the hardest keys the child knows; a short one gets a second word. */
const HARD_DRAWS = 4;
const HARD_LONG = 9;
/** Seconds of his walk to a place, per stage width, and of his hop out of the mud. */
const WALK_S = 0.9;
const HOP_OUT_S = 0.6;
/** The words over the places float this high above the path, at the labels' usual size. */
const WORD_UP = 150;
const WORD_SIZE = 40;
/** The dripping mud stuck behind a muddy word's lower right corner: its height per word height, and the share of it that peeks out. */
const MUD_DRIP = 'obj-mud-drip';
const DRIP_H = 1.4;
const DRIP_OUT = 0.3;

/** A sticky puddle while its picture is missing: a flat glossy brown oval with a few bubbles. */
function mudFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#5a3d27';
  g.beginPath();
  g.ellipse(0, 0, w * 0.48, h * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath();
  g.ellipse(-w * 0.12, -h * 0.12, w * 0.18, h * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(160,120,90,0.8)';
  g.lineWidth = 2;
  for (const [dx, dy, r] of [[0.15, 0.05, 0.06], [0.28, -0.1, 0.04], [-0.25, 0.12, 0.05]]) {
    g.beginPath();
    g.arc(dx * w, dy * h, r * w * 0.5, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

/** Dripping mud while its picture is missing: a brown blob with three drips running down. */
function dripFallback(g: G, w: number, h: number): void {
  g.save();
  g.fillStyle = '#5a3d27';
  g.beginPath();
  g.ellipse(0, -h * 0.2, w * 0.45, h * 0.28, 0, 0, Math.PI * 2);
  g.fill();
  for (const [dx, len] of [[-0.25, 0.35], [0.05, 0.5], [0.3, 0.28]]) {
    g.beginPath();
    g.roundRect((dx - 0.07) * w, -h * 0.2, w * 0.14, h * (0.2 + len), w * 0.07);
    g.fill();
  }
  g.restore();
}

/** A place of a round on the path, in the scene (the screen shows it at x - scroll). */
interface Place {
  x: number;
  tg: Target | null;
  age: number;
}

/** A puddle on the path, in the scene: crawling toward him, fading away on the path (0..1), or holding him. */
interface Puddle {
  x: number;
  pic: string;
  flip: boolean;
  fade: number | null;
}

/**
 * Egg 2, sticky puddles (waiting words, a calm step): each round shows 2 or 3 words over places on
 * the path ahead, and a puddle crawls along the path from the right toward him, under the words; it
 * fades away on the path before it reaches him or once he steps to a word it is not under, and the next
 * one comes. The word with the puddle under it has dripping mud stuck on it. Typed then, he walks
 * into the mud and is stuck for three very hard words, wobbling at each of the first two, and hops
 * out to the clean path after the third.
 */
export class MudMode extends HeroMode {
  readonly world = 'egg';
  readonly pictures = [...MUDS, MUD_DRIP, 'obj-egg-plain'];
  private egg: EggPeek;
  private places: Place[] = [];
  /** The crawling puddle (or the one holding him), the seconds until the next one comes, and puddles left behind. */
  private mud: Puddle | null = null;
  private mudWait = 0;
  private passed: Puddle[] = [];
  /** The very hard word while he is stuck, and the rounds of it left. */
  private hard: Target | null = null;
  private hardLeft = 0;
  /** 0..1 through his wobble in the mud, -1 at rest. */
  private wobble = -1;
  private busy = false;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.egg = new EggPeek(L);
  }

  startLine(): string {
    return pickLine('story.mudStart');
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    this.round();
  }

  protected heroExtras(): Partial<TapkoMotion> {
    const k = this.wobble;
    return { ...this.egg.motion(), ...(k >= 0 ? { spin: WOBBLE * Math.sin(k * Math.PI * 2 * WOBBLE_SWINGS) * Math.sin(k * Math.PI) } : {}) };
  }

  /** The next round: words over 2-3 places; one very hard word while he is stuck. */
  private round(): void {
    const L = this.L;
    if (this.done >= L.count) return this.end();
    if (this.hardLeft > 0) {
      this.hard = L.core.add(this.hardWord(), {});
      return;
    }
    const n = L.rng.chance(0.5) ? 2 : 3;
    const slots = L.rng.shuffle([0, 1, 2]).slice(0, n).sort((a, b) => a - b);
    this.places = slots.map((i) => ({ x: this.scroll + L.vw * SLOTS[i], age: 0, tg: L.core.add(L.word(6, 1), {}, false) }));
  }

  /** The longest of a few words of the hardest keys the child knows; a short one gets a second word. */
  private hardWord(): string {
    let best = '';
    for (let i = 0; i < HARD_DRAWS; i++) {
      const w = this.L.weakWord();
      if (w.length > best.length) best = w;
    }
    return best.length >= HARD_LONG || this.L.def.noSpace ? best : `${best} ${this.L.weakWord()}`;
  }

  /** The place the crawling puddle is under now, if any. */
  private muddy(): Place | undefined {
    const mud = this.mud;
    if (!mud || mud.fade !== null) return undefined;
    return this.places.find((p) => p.tg && Math.abs(p.x - mud.x) < MUD_UNDER);
  }

  onDone(tg: Target): void {
    if (tg === this.hard) {
      this.hard = null;
      this.done++;
      this.hardLeft--;
      if (this.hardLeft === 0) return this.hopOut();
      // He tries to pull his paws out, but the mud holds.
      if (!this.L.reduceMotion) this.wobble = 0;
      this.egg.poke();
      return this.round();
    }
    const place = this.places.find((p) => p.tg === tg);
    if (!place) return;
    const stuck = this.muddy() === place;
    this.done++;
    this.happy();
    for (const p of this.places) if (p !== place && p.tg) this.L.core.release(p.tg, false);
    for (const p of this.places) p.tg = null;
    this.L.core.prune();
    this.places = [];
    if (!stuck) {
      if (this.mud) this.mud.fade ??= 0;
      return this.walkTo(place.x - this.scroll, () => this.walkOn(() => this.round()));
    }
    // The puddle stops under the word's place and he walks into it.
    this.mud!.x = place.x;
    this.walkTo(place.x - this.scroll, () => {
      this.egg.poke();
      this.L.setMood('thinking', 1.4);
      this.L.shout(pickLine('story.mudStep'), this.heroSpot().x, this.heroSpot().y);
      this.L.say(t('story.mudSlow'), 5);
      this.L.sfx('pop');
      this.hardLeft = HARD_ROUNDS;
      this.round();
    });
  }

  /** After the last hard word he hops out of the puddle onto the clean path just past it, and walks on. */
  private hopOut(): void {
    const mud = this.mud!;
    this.passed.push(mud);
    this.mud = null;
    this.mudWait = MUD_WAIT_S;
    this.L.shout(pickLine('story.mudFree'), this.heroSpot().x, this.heroSpot().y);
    this.busy = true;
    const from = this.heroX, to = mud.x - this.scroll + MUD_W * 0.65;
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : HOP_OUT_S, (k) => {
      this.heroX = from + (to - from) * k;
      this.jump = Math.sin(k * Math.PI) * 0.45;
    }, ease.inOutQuad, () => {
      this.jump = 0;
      this.walkOn(() => this.round());
    });
  }

  private walkTo(x: number, then: () => void): void {
    this.busy = true;
    const from = this.heroX;
    const time = this.L.reduceMotion ? 0.01 : 0.3 + (WALK_S * Math.abs(x - from)) / this.L.vw;
    this.L.tweens.add(time, (k) => {
      this.heroX = from + (x - from) * k;
      this.jump = Math.abs(Math.sin(k * Math.PI * 3)) * 0.2;
    }, ease.inOutQuad, () => {
      this.jump = 0;
      this.busy = false;
      then();
    });
  }

  /** The view glides after him so he is back at his place on the left. */
  private walkOn(then: () => void): void {
    this.busy = true;
    const fromX = this.heroX, fromScroll = this.scroll, by = fromX - HERO_X;
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : 0.8, (k) => {
      this.heroX = fromX - by * k;
      this.scroll = fromScroll + by * k;
    }, ease.inOutQuad, () => {
      this.busy = false;
      this.passed = this.passed.filter((p) => p.x - this.scroll > -200);
      then();
    });
  }

  /** The puddles are behind him: he wipes his paws with a little hop where he stands. */
  private end(): void {
    this.endT = 0;
    if (this.mud) this.mud.fade ??= 0;
    this.happy();
    this.L.say(pickLine('story.mudDone'), END_TIME);
    this.L.tweens.add(0.5, (k) => { this.jump = Math.sin(k * Math.PI) * 0.3; }, ease.linear, () => { this.jump = 0; });
  }

  /** The child picks the place: the paws never choose for him (they may type his very hard words). */
  pawMay(tg: Target): boolean {
    return tg === this.hard;
  }

  update(dt: number): void {
    super.update(dt);
    this.egg.update(dt);
    for (const p of this.places) {
      p.age += dt;
      if (p.tg) p.tg.selectable = p.age >= GROW;
    }
    if (this.wobble >= 0 && (this.wobble += dt / WOBBLE_S) >= 1) this.wobble = -1;
    this.updateMud(dt);
    if (this.endT !== null) this.endT += dt;
  }

  /** The puddle crawls toward him while the words wait (not while he walks or is stuck in it), fades away, and the next one comes. */
  private updateMud(dt: number): void {
    const L = this.L, mud = this.mud;
    if (mud) {
      if (mud.fade !== null) {
        if ((mud.fade += dt / MUD_FADE_S) < 1) return;
        this.mud = null;
        this.mudWait = MUD_WAIT_S;
      } else if (!this.busy && this.hardLeft === 0) {
        mud.x -= (L.vw / MUD_CRAWL_S) * dt;
        if (mud.x - this.scroll <= HERO_X + MUD_STOP) mud.fade = 0;
      }
      return;
    }
    if (this.busy || this.endT !== null || !this.places.length || (this.mudWait -= dt) > 0) return;
    this.mud = { x: this.scroll + L.vw + MUD_W / 2, pic: L.rng.pick(MUDS), flip: L.rng.chance(0.5), fade: null };
  }

  private drawPuddle(g: G, p: Puddle): void {
    const img = sprite(p.pic), h = MUD_W / (img ? img.naturalWidth / img.naturalHeight : MUD_W / MUD_H), k = p.fade ?? 0;
    g.save();
    g.globalAlpha *= 1 - k;
    drawSprite(g, p.pic, p.x - this.scroll, FEET + 4, h, { flip: p.flip, sy: Math.min(1, MUD_H / h) }, mudFallback);
    g.restore();
  }

  /** Dripping mud stuck behind the muddy word's lower right corner (drawn before the word, so the word stays on top). */
  private drawDrip(g: G, p: Place): void {
    const { w, h } = wordBox(g, p.tg!.word, WORD_SIZE, this.L.style !== 'copy'), dh = h * DRIP_H;
    drawSprite(g, MUD_DRIP, p.x - this.scroll + w / 2 - dh * (0.5 - DRIP_OUT), FEET - WORD_UP + h / 2 + dh * (0.5 - DRIP_OUT), dh, {}, dripFallback);
  }

  render(g: G): void {
    for (const p of this.passed) this.drawPuddle(g, p);
    if (this.mud) this.drawPuddle(g, this.mud);
    this.drawHero(g);
    if (this.busy) return;
    const muddy = this.muddy();
    if (muddy?.tg?.selectable) this.drawDrip(g, muddy);
    for (const p of this.places) if (p.tg) this.L.label(g, p.tg, p.x - this.scroll, FEET - WORD_UP, WORD_SIZE);
    if (this.hard) this.L.label(g, this.hard, this.heroX, wordAbove(FEET));
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
