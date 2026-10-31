import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { bandScale, blob, drawSprite, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { TAPKO_H } from '../mode';
import { HeroMode, wordAbove } from './kit/hero';
import { STANDING_ROCKET, drawStandingRocket } from './kit/rocket';
import { LIFE_CRYSTALS, drawLifeCrystals } from './planet-crystals';
import type { Target } from '../typing';

/** His feet on a stepping stone in the swamp, a bit higher, so the stone fits under them. */
const SWAMP_FEET = VH * 0.85;
/**
 * A stepping stone (a round mossy stone, one of `SWAMP_PICTURES`): its picture's height, how far above its middle
 * his feet stand (two thirds up from its bottom, on the moss), and how much higher or lower than the
 * swamp line a stone may lie.
 */
const STONE_H = 92;
const STONE_TOP = 1 / 6;
const STONE_RISE = 26;
const STONE_DROP = 6;
/**
 * The swamp ends at the shore picture (`bg-planet-swamp-shore`, a grassy bank with a steep earthen
 * cliff, drawn in front of the band). In shares of its width from its left edge: where its cliff begins,
 * where he lands on the grass from the last stone and where he ends; his feet on the grass, and the
 * share of the stage he moves to through the swamp.
 */
const SHORE_CLIFF = 0.14;
export const SHORE_LAND = 0.3;
const SHORE_MEADOW = 0.52;
export const SHORE_FEET = VH * 0.84;
/** The last stone lies at least this share of a jump before the cliff. */
const LAND_GAP = 0.25;
const SHORE_VIEW = 0.6;
/** He ends on the meadow at least this far from the right edge. */
const SHORE_MARGIN = 160;
/** In the first level the shore comes once this share of the level is done, or when the words are done and fewer seconds than this are left. */
const SHORE_AT = 0.9;
const SHORE_LAST_S = 10;
/** The shore picture's width on the stage (1376 px until its picture is there). */
export function shoreW(): number {
  return (sprite('bg-planet-swamp-shore')?.naturalWidth ?? 1376) * bandScale('planet', '-swamp');
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

const SWAMP_PICTURES = ['obj-swamp-stone-1', 'obj-swamp-stone-2', 'obj-swamp-stone-3'];

/** A stone in the scene: the screen shows it at x - scroll. */
interface Stone {
  x: number;
  y: number;
  /** Its picture, picked at random from those the stone before does not have. */
  look: string;
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
 * The floating logs: the words that push one away (an eighth of the level's planned words, within
 * these bounds, so a slow child's short level is not all logs), its length on the stage (about two
 * stones), how far above his feet on the swamp line its middle floats (so the whole log is in
 * sight), and its gentle bob (pixels, seconds). Each level has one log once the bar is at each of
 * these shares, when the minimum's time left still holds its words and the words to reach it (never once the shore is there).
 */
const LOG_MIN = 3;
const LOG_MAX = 6;
const LOG_SHARE = 1 / 8;
const LOG_W = 250;
/** The log picture's height to its width (512 x 404). */
const LOG_RATIO = 404 / 512;
const LOG_RISE = 18;
const LOG_BOB = 2.5;
const LOG_BOB_S = 3;
const LOGS_AT = [0.3, 0.6];

/** A log where the next stone would be: where it lay, where it is and glides to, the pushes it takes and has had (a slipped word pushes half) and its word. */
interface Log {
  x0: number;
  x: number;
  to: number;
  pushes: number;
  pushed: number;
  tg: Target | null;
}

/**
 * The planet's swamp, shared by the first level and the super level: Tapko on stepping stones,
 * as tall as on the meadow, the word above his head and a ring where the next stone comes; now and
 * then a floating log lies where the next stone would be, and words push it away first.
 */
abstract class SwampHero extends HeroMode {
  readonly ground = '-swamp';
  protected stones: Stone[] = [];
  protected log: Log | null = null;
  /** Logs pushed away, and their pushes. */
  protected logsGone = 0;
  protected logPushes = 0;
  /** Words typed, for the child's pace. */
  protected typed = 0;
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
    // Each stone looks different from the one before it.
    const last = this.stones.at(-1)?.look;
    const s: Stone = { x, y, look: this.L.rng.pick(SWAMP_PICTURES.filter((p) => p !== last)), age: 0, state: 'ok', crackT: 0 };
    this.stones.push(s);
    return s;
  }

  /** His feet on a stone, in the scene. */
  protected top(s: Stone): { x: number; y: number } {
    return { x: s.x, y: s.y - STONE_H * STONE_TOP };
  }

  /** A place on the shore, as a share of its picture's width from its left edge, his feet on the grass. */
  protected shoreAt(share: number): { x: number; y: number } {
    return { x: this.shore! + shoreW() * share, y: SHORE_FEET };
  }

  /** The swamp ends: the shore comes as near as it can, its cliff just past the stage's right edge. */
  protected placeShore(): void {
    this.shore = this.scroll + this.L.vw - SHORE_CLIFF * shoreW();
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

  /** The next stone after the one at `x` (`gap` on) would lie on the shore's cliff: he jumps onto the grass instead. */
  protected nearShore(x: number, gap: number): boolean {
    return x + gap > this.shoreAt(SHORE_CLIFF).x - gap * LAND_GAP;
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
    this.updateLog(dt);
    const f = this.feetInScene();
    this.heroX = f.x - this.scroll;
    this.heroY = f.y;
    this.jump = this.jumpTo ? this.jumpTo.k : 0;
  }

  /** Seconds a word takes the child so far (a slow child's pace before the first word). */
  protected get pace(): number {
    return this.typed ? this.L.playedS / this.typed : 7.5;
  }

  /** The words that push a log away. */
  private get pushes(): number {
    return Math.max(LOG_MIN, Math.min(LOG_MAX, Math.round(this.L.count * LOG_SHARE)));
  }

  /** A log comes now, `reach` words ahead: the bar is at its share, the minimum's time holds those words and its own, and the shore is not there yet. */
  protected logDue(reach: number): boolean {
    return !this.log && this.shore === null && this.logsGone < LOGS_AT.length && this.L.share() >= LOGS_AT[this.logsGone] && this.L.minLeft >= (this.pushes + reach) * this.pace;
  }

  /** The log floats where a stone at `x` would come. */
  protected logAt(x: number): void {
    this.log = { x0: x, x, to: x, pushes: this.pushes, pushed: 0, tg: null };
  }

  /** He stands just before the log: he says he has to wait, and the words that push it come. */
  protected logWords(): void {
    this.L.say(t('story.swampLog'), 4);
    this.logWord();
  }

  private logWord(): void {
    this.log!.tg = this.L.core.add(this.L.word(6, 1), {});
  }

  /** A typed word pushes the log on (a word with a slip half as far); the last one pushes it off the stage. */
  protected pushLog(tg: Target): void {
    const log = this.log!;
    log.pushed = Math.min(log.pushes, log.pushed + (tg.errors === 0 ? 1 : 0.5));
    log.tg = null;
    this.happy();
    this.L.sfx('pop');
    this.L.particles.emit(log.x - this.scroll, SWAMP_FEET - LOG_RISE, 10, 'dot', ['#cfe8c0', '#ffffff'], 110, 6);
    this.L.core.prune();
    const off = this.scroll + this.L.vw + LOG_W;
    log.to = log.x0 + (off - log.x0) * (log.pushed / log.pushes);
    if (log.pushed < log.pushes) this.logWord();
  }

  /** He jumps onto a new stone: after a typed word, or come up where a log lay. */
  protected abstract jumpOnto(s: Stone): void;

  private updateLog(dt: number): void {
    const log = this.log;
    if (!log) return;
    // Each push glides it on, easing out; pushed off the stage, it is gone and a stone comes up where it lay.
    log.x = this.L.reduceMotion ? log.to : log.x + (log.to - log.x) * Math.min(1, dt * 3);
    if (log.pushed < log.pushes || log.x - this.scroll - LOG_W / 2 <= this.L.vw || this.jumpTo) return;
    this.log = null;
    this.logsGone++;
    this.logPushes += log.pushes;
    this.jumpOnto(this.stone(log.x0));
  }

  protected drawLog(g: G): void {
    const log = this.log;
    if (!log) return;
    // It bobs very gently on the water; still with reduced motion.
    const y = SWAMP_FEET - LOG_RISE + (this.L.reduceMotion ? 0 : Math.sin((this.t * Math.PI * 2) / LOG_BOB_S) * LOG_BOB);
    drawSprite(g, 'obj-swamp-log', log.x - this.scroll, y, LOG_W * LOG_RATIO, {}, blob('#a8743f', true, 'rgba(0,0,0,0.12)'));
    if (log.tg) this.L.label(g, log.tg, log.x - this.scroll, y - LOG_W * LOG_RATIO * 0.5 - 30, 46);
  }

  protected drawStones(g: G): void {
    // A higher stone is further back: it is drawn first.
    for (const s of [...this.stones].sort((a, b) => a.y - b.y)) {
      const k = this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, s.age / 0.35));
      const cracked = s.state === 'cracked';
      const sh = cracked ? Math.sin(s.crackT * 60) * 3 : 0;
      drawSprite(g, s.look, s.x - this.scroll + sh, s.y, STONE_H * k, {}, stoneFallback);
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
 * a stone comes where the ring was and he jumps onto it, the view glides after him. Twice a log
 * floats there instead: words push it away and a stone comes up where it lay. After the last
 * word the swamp ends: stones come until the meadow is in sight, he jumps onto it and sees the meadow.
 */
export class SwampMode extends SwampHero {
  readonly pictures = [...SWAMP_PICTURES, 'obj-swamp-log'];
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

  /** Words typed: stones reached and the logs' pushes. */
  private get tasks(): number {
    return this.done + this.logPushes + (this.log?.pushed ?? 0);
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
    if (this.shore === null && this.shoreDue) {
      this.placeShore();
      let left = 1;
      for (let x = from.x; !this.nearShore(x, SWAMP_GAP); x += SWAMP_GAP) left++;
      this.L.count = this.tasks + left;
    }
    this.toLand = this.shore !== null && this.nearShore(from.x, SWAMP_GAP);
    this.nextX = from.x + SWAMP_GAP;
    if (this.logDue(1)) {
      this.logAt(this.nextX);
      return this.logWords();
    }
    this.current = this.L.core.add(this.L.word(6, 2), {});
  }

  private ashore(): void {
    this.happy();
    this.L.say(pickLine('story.swampDone'), 3);
    this.endT = 0;
  }

  update(dt: number): void {
    super.update(dt);
    if (this.endT !== null) this.endT += dt;
  }

  onDone(tg: Target): void {
    this.typed++;
    if (this.log && tg === this.log.tg) return this.pushLog(tg);
    if (tg !== this.current) return;
    this.current = null;
    this.done++;
    this.happy();
    this.L.core.prune();
    if (this.toLand) return this.stepAshore(() => this.ashore());
    // Stones a whole stage behind go, so staying a while does not pile them up.
    this.stones = this.stones.filter((o) => o.x > this.scroll - this.L.vw || o === this.stand);
    this.jumpOnto(this.stone(this.nextX));
  }

  protected jumpOnto(s: Stone): void {
    this.L.particles.emit(s.x - this.scroll, s.y, 10, 'dot', ['#cfe8c0', '#ffffff'], 110, 6);
    this.leap(this.top(s), () => {
      this.stand = s;
      // He moves toward the right edge as the level goes on, never back.
      this.shown = Math.max(this.shown, SWAMP_HOME + (this.L.vw * SHORE_VIEW - SWAMP_HOME) * Math.min(1, this.tasks / this.L.count));
      this.glide(s.x, this.shown, () => this.next());
    });
  }

  render(g: G): void {
    this.drawStones(g);
    this.drawLog(g);
    if (this.current) {
      if (!this.toLand) this.drawNextRing(g, this.nextX);
      this.L.label(g, this.current, this.heroX, wordAbove(SWAMP_FEET));
    }
    this.drawHero(g);
  }

  progress(): number {
    return this.tasks / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > 1.6;
  }
}

/** The super level: jumps from a firm stone before the view moves on, and the words of the sentence on the shore (about). */
const SET = 4;
const SENTENCE_WORDS = 4;
/** Seconds of a cracked stone before he jumps back, and of a crumbled stone sinking away. */
const CRACK_WAIT = 0.45;
const CRUMBLE = 0.9;
/** Seconds of the end: the monolith rises, the crystals fly onto it, and they glow before the level ends. */
const RISE = 1;
const PLACE = 1.2;
const GLOW_S = 3;
/** Seconds by the rocket before the journey's swamp ends. */
const ROCKET_END = 2.5;
const CRADLE_H = 190;
const LIFE_H = 100;
/** The monolith's foot stands this far below the grass line, a dark green shadow behind it. */
const CRADLE_SINK = 30;
/** Above the cradle they float this high, bobbing a little. */
const FLOAT = 26;
const BOB = 6;
/** The shore picture always reaches this far past the stage's right edge, so its end never shows. */
const END_MARGIN = 40;
/** On the dragon story's hero's journey Tapko's rocket stands on the shore's grass this far left of the shore's last view's right edge. */
const ROCKET_IN = 170;

/** The shore's x when the view at 0 ends where the great swamp's last view does (the journey's take-off goes on there). */
export function shoreEndView(vw: number): number {
  return vw + END_MARGIN - shoreW();
}

/** Where the journey's rocket stands on the shore at `shore`, in the scene. */
export function shoreRocketX(shore: number): number {
  return shore + shoreW() - END_MARGIN - ROCKET_IN;
}

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
 * a new word comes. Twice a little log floats where a firm stone would be; each word pushes
 * it a bit to the right until it floats away, and a stone comes up where it lay. Stones come until
 * both minimums are nearly met; then the shore comes just past the stage's right edge, the last stone
 * just before it. He steps onto its grass, and a longer sentence of known words (with a capital and a
 * period once they are known) typed without a slip wakes the monolith beside him; the crystals of
 * life fly onto it, float and pulse in their glow. On the dragon story's hero's journey it is the
 * last swamp before the rocket: no log, and on the shore no sentence, Tapko's rocket stands ready.
 */
export class GreatSwampMode extends SwampHero {
  readonly pictures = [...SWAMP_PICTURES, 'obj-swamp-stone-broken', 'obj-swamp-log', 'obj-cradle', ...LIFE_CRYSTALS, ...STANDING_ROCKET];
  private readonly journey = this.L.def.variant === 'journey';
  /** The little dragon hops after him from stone to stone (in the scene), and the seconds he has stood by the rocket. */
  private friend: { x: number; y: number } | null = null;
  private atRocket: number | null = null;
  private gap = 200;
  private home = 130;
  /** The first stone's x; stone `i` lies at `x0 + i * gap`. */
  private x0 = 0;
  /** Jumps to the last stone, once the shore is placed. */
  private jumps = Infinity;
  /** The firm stone of this set. */
  private base: Stone | null = null;
  private current: Target | null = null;
  /** The last task: the sentence that wakes the monolith. */
  private sentence: Target | null = null;
  private crumbs: Crumb[] = [];
  /** Seconds until the next jump back; null when he is not going back. */
  private back: number | null = null;
  private slipSaid = false;
  private cradle: { x: number; rise: number } | null = null;
  /** 0..1 of the crystals flying onto the cradle, then on; null before. */
  private place: number | null = null;

  startLine(): string {
    return pickLine('story.greatSwampStart');
  }

  start(): void {
    this.gap = Math.min(220, this.L.vw * 0.19);
    this.home = this.L.vw * 0.12;
    this.x0 = this.home;
    this.stand = this.base = this.stone(this.x0);
    this.stand.age = 1;
    this.ask();
  }

  /** The stone's number from the first one. */
  private idx(s: { x: number }): number {
    return Math.round((s.x - this.x0) / this.gap);
  }

  /** Jumps since the firm stone. */
  private get ahead(): number {
    return this.stones.length - 1 - this.stones.indexOf(this.base!);
  }

  /** The view never goes so far that the shore's right edge shows; no limit before the shore. */
  private get maxScroll(): number {
    return this.shore === null ? Infinity : this.shore + shoreW() - this.L.vw - END_MARGIN;
  }

  /** Jumps reached and the log's pushes: the tasks done before the sentence. */
  private get tasksDone(): number {
    const reached = this.stones.length ? this.idx(this.stones[this.stones.length - 1]) : 0;
    // The stone where a log lay is reached by its pushes, not by a jump.
    return reached + this.logPushes - this.logsGone + (this.log?.pushed ?? 0);
  }

  /** The last stone if the shore came now: its cliff just past the stage's right edge, the stone `LAND_GAP` before it. */
  private lastStone(): number {
    return Math.max(this.idx(this.stand!) + 1, Math.ceil((this.scroll + this.L.vw - this.x0) / this.gap - LAND_GAP));
  }

  /** The sentence on the shore: one task of its words; none on the journey. */
  private get sentenceTasks(): number {
    return this.journey ? 0 : 1;
  }

  /** The shore comes when the jumps to it and the sentence (on the journey the scene by the rocket) fill the planned tasks and about the time still left. */
  private get shoreDue(): boolean {
    const left = this.lastStone() - this.idx(this.stand!);
    return this.tasksDone + left + 1 >= this.L.count && this.L.minLeft <= (left + SENTENCE_WORDS) * this.pace;
  }

  private placeShoreAhead(): void {
    this.jumps = this.lastStone();
    this.shore = this.x0 + (this.jumps + LAND_GAP) * this.gap - SHORE_CLIFF * shoreW();
    this.L.count = this.tasksDone + this.jumps - this.idx(this.stand!) + this.sentenceTasks;
  }

  /** The journey's swamp has no log. */
  protected logDue(reach: number): boolean {
    return !this.journey && super.logDue(reach);
  }

  /** The little dragon right behind him: on the stone before his, on the shore beside him. */
  friendSpot(): { x: number; y: number } {
    const f = this.friend;
    return f ? { x: f.x - this.scroll, y: f.y } : super.friendSpot();
  }

  /** Where the little dragon heads for in the scene. */
  private friendAim(): { x: number; y: number } {
    if (this.onShore) return { x: this.onShore.x - 105, y: this.onShore.y };
    const i = this.stand ? this.stones.indexOf(this.stand) : -1;
    const behind = i > 0 ? this.stones[i - 1] : null;
    return behind ? this.top(behind) : { x: this.heroX + this.scroll - 105, y: this.heroY };
  }

  /** The next word, unless the shore comes now; never while a log lies ahead. */
  private ask(): void {
    if (this.shore === null && !this.log && this.shoreDue) this.placeShoreAhead();
    this.current = this.L.core.add(this.L.word(4, 1), {});
  }

  onDone(tg: Target): void {
    this.typed++;
    const log = this.log;
    if (log && tg === log.tg) return this.pushLog(tg);
    if (tg === this.sentence) return this.wake();
    if (tg !== this.current) return;
    this.current = null;
    this.happy();
    this.L.core.prune();
    const s = this.stone(this.stand!.x + this.gap);
    this.L.particles.emit(s.x - this.scroll, s.y, 10, 'dot', ['#cfe8c0', '#ffffff'], 110, 6);
    this.jumpOnto(s);
  }

  protected jumpOnto(s: Stone): void {
    this.leap(this.top(s), () => this.land(s));
  }

  private land(s: Stone): void {
    this.stand = s;
    const i = this.idx(s);
    if (i >= this.jumps) return this.ashore();
    // A log lies where the next stone would come.
    if (this.log && i === this.idx({ x: this.log.x0 }) - 1) return this.logWords();
    if (this.ahead < SET) return this.ask();
    // The fourth jump: this stone is the new firm one and the view moves on.
    this.base = s;
    this.glide(s.x, Math.max(this.home, s.x - this.maxScroll), () => {
      // Only stones gone off the stage on the left go; the view may stop before the shore.
      this.stones = this.stones.filter((o) => o.x > this.scroll - STONE_H || o === s);
      // A log lies where the firm stone after this set would be.
      if (this.logDue(SET)) this.logAt(this.x0 + (i + SET) * this.gap);
      this.ask();
    });
  }

  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    if (tg && tg === this.sentence) return this.sentenceSlip();
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

  /** From the last stone onto the shore's grass, where a sentence typed without a slip wakes the monolith (on the journey the rocket waits). */
  private ashore(): void {
    const land = this.shoreAt(SHORE_LAND);
    const then = () => (this.journey ? this.rocketReady() : this.askSentence());
    this.leap(land, () => {
      this.stand = null;
      this.onShore = land;
      // The view moves on as far as the shore allows, so he and the monolith have room on the grass.
      if (this.maxScroll <= this.scroll) return then();
      this.glide(land.x, land.x - this.maxScroll, then);
    });
  }

  /** On the journey's shore: his rocket is there. */
  private rocketReady(): void {
    this.happy();
    this.atRocket = 0;
    this.L.say(pickLine('story.swampRocket'), ROCKET_END);
    this.L.hooray();
  }

  private askSentence(): void {
    this.L.say(pickLine('story.monolithAsk'), 4);
    this.newSentence();
  }

  /** Three to five known words; the word source adds the capital and the period once they are known. */
  private newSentence(): void {
    this.sentence = this.L.core.add(this.L.word(6, 5, 3), {});
  }

  /** A slip spoils the sentence: a new one comes. */
  private sentenceSlip(): void {
    this.L.core.release(this.sentence!, false);
    this.L.core.prune();
    this.L.say(pickLine('story.monolithSlip'), 3);
    this.newSentence();
  }

  /** The sentence is typed: the monolith rises on the grass beside him, in sight before the right edge. */
  private wake(): void {
    this.sentence = null;
    this.happy();
    this.L.core.prune();
    const w = shoreW(), grass = this.shore! + SHORE_LAND * w;
    const x = Math.max(grass + CRADLE_H * 0.8, Math.min(grass + w * 0.3, this.scroll + this.L.vw - CRADLE_H * 0.6));
    this.cradle = { x, rise: 0 };
    this.L.sfx('whoosh');
  }

  update(dt: number): void {
    super.update(dt);
    if (this.atRocket !== null) this.atRocket += dt;
    if (this.journey) {
      const aim = this.friendAim(), f = this.friend ??= { ...aim }, k = this.L.reduceMotion ? 1 : Math.min(1, dt * 5);
      f.x += (aim.x - f.x) * k;
      f.y += (aim.y - f.y) * k;
    }
    for (const c of this.crumbs) c.t += dt;
    this.crumbs = this.crumbs.filter((c) => c.t < CRUMBLE);
    if (this.back !== null && !this.jumpTo && (this.back -= dt) <= 0) {
      this.back = 0;
      this.stepBack();
      if (this.jumpTo) this.back = Infinity;
    }
    if (this.cradle) {
      this.cradle.rise = Math.min(1, this.cradle.rise + dt / RISE);
      if (this.cradle.rise >= 1 && this.place === null) this.place = 0;
    }
    if (this.place !== null) {
      const before = this.place;
      this.place += dt / PLACE;
      if (before < 1 && this.place >= 1) this.lit();
    }
  }

  /** The crystals of life are on the cradle: they glow, the planet comes to life, Tapko cheers. */
  private lit(): void {
    const c = this.cradle!;
    const x = c.x - this.scroll, y = this.cradleTop();
    this.happy();
    this.L.say(pickLine('story.cradleDone'), 3);
    this.L.hooray({ x, y: y - LIFE_H - 40 });
  }

  /** The monolith's foot on the shore. */
  private get cradleBase(): number {
    return SHORE_FEET + CRADLE_SINK;
  }

  private cradleTop(): number {
    const k = ease.outCubic(this.cradle!.rise);
    return this.cradleBase - CRADLE_H * 0.86 + (1 - k) * CRADLE_H;
  }

  /** The crystals pulse once they float above the monolith: -1..1; 0 before, or with reduced motion. */
  private get pulse(): number {
    return this.place !== null && this.place >= 1 && !this.L.reduceMotion ? Math.sin(this.t * 3.2) : 0;
  }

  render(g: G): void {
    for (const c of this.crumbs) {
      const k = c.t / CRUMBLE;
      drawSprite(g, 'obj-swamp-stone-broken', c.x - this.scroll, c.y + k * 26, STONE_H, { alpha: 1 - k }, stoneFallback);
    }
    this.drawStones(g);
    this.drawLog(g);
    if (this.journey && this.shore !== null) drawStandingRocket(g, shoreRocketX(this.shore) - this.scroll, SHORE_FEET + 6);
    if (this.cradle) this.drawCradle(g);
    if (this.current) {
      this.drawNextRing(g, this.stand!.x + this.gap);
      this.L.label(g, this.current, this.heroX, wordAbove(SWAMP_FEET));
    }
    if (this.sentence) this.L.label(g, this.sentence, this.heroX, wordAbove(SWAMP_FEET));
    this.drawHero(g);
    if (this.place !== null) this.drawLife(g);
  }

  /** The monolith rising out of the grass, a soft dark green shadow behind its foot, and the light above it. */
  private drawCradle(g: G): void {
    const c = this.cradle!, x = c.x - this.scroll, base = this.cradleBase;
    const k = ease.outCubic(c.rise), rx = CRADLE_H * 0.7;
    g.save();
    g.translate(x, base - 6);
    g.scale(1, 0.22);
    const shadow = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    shadow.addColorStop(0, `rgba(22,64,32,${0.6 * k})`);
    shadow.addColorStop(1, 'rgba(22,64,32,0)');
    g.fillStyle = shadow;
    g.fillRect(-rx, -rx, rx * 2, rx * 2);
    g.restore();
    g.save();
    g.beginPath();
    g.rect(0, 0, this.L.vw, base);
    g.clip();
    drawSprite(g, 'obj-cradle', x, this.cradleTop(), CRADLE_H, { ay: 0.14 }, cradleFallback);
    g.restore();
    this.drawCradleGlow(g);
  }

  /** The crystals of life rise from his paws and fly onto the cradle, where they float, glow and pulse. */
  private drawLife(g: G): void {
    const k = ease.inOutQuad(Math.min(1, this.place!));
    const fx = this.heroX, fy = this.heroY - TAPKO_H * 0.45;
    const tx = this.cradle!.x - this.scroll, ty = this.cradleTop() - FLOAT * k + Math.sin(this.t * 2) * BOB * k;
    const x = fx + (tx - fx) * k, y = fy + (ty - fy) * k - Math.sin(k * Math.PI) * 90;
    const p = this.pulse, lit = 0.8 + 0.2 * p;
    drawLifeCrystals(g, x, y, LIFE_H * (0.5 + 0.5 * k) * (1 + 0.05 * p), [lit, lit, lit]);
  }

  /** A soft light above the cradle, waiting for the crystals; brighter once they float there, pulsing with them. */
  private drawCradleGlow(g: G): void {
    const c = this.cradle!, x = c.x - this.scroll, y = this.cradleTop() - LIFE_H * 0.6;
    const k = ease.outCubic(c.rise) * (this.place !== null && this.place >= 1 ? 0.85 + 0.15 * this.pulse : 0.55);
    const r = LIFE_H * 1.4;
    g.save();
    const glow = g.createRadialGradient(x, y, 4, x, y, r);
    glow.addColorStop(0, `rgba(255,240,170,${0.75 * k})`);
    glow.addColorStop(1, 'rgba(255,240,170,0)');
    g.fillStyle = glow;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  }

  /** Jumps reached and the log's pushes out of the planned tasks (the sentence one more); full once the sentence is typed. */
  progress(): number {
    if (this.cradle || this.atRocket !== null) return 1;
    const done = this.tasksDone;
    return done / Math.max(this.L.count, done + 1);
  }

  get finished(): boolean {
    if (this.journey) return (this.atRocket ?? 0) >= ROCKET_END;
    return (this.place ?? 0) >= 1 + GLOW_S / PLACE;
  }
}
