import { pickLine } from '../../app/app';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { blob, drawSprite, type G } from '../../gfx/draw';
import type { TapkoMotion } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './kit/approach';
import { Detour, EggPeek, drawCarrier, lengthen, secondsPerWord } from './kit/egg';
import { HeroMode, PATH_FEET, wordAbove } from './kit/hero';
import { rimmed } from './dragons';

/** He walks in the middle of the mountain path; where he stands, and where the things coming at him reach him. */
const FEET = PATH_FEET;
const HERO_X = 200;
const REACH = 60;
const END_TIME = 3;
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
  protected detour: Detour;
  /** His own bob or hop (0..1), his lean (a share of a turn), and his sit after a stumble (0..1). */
  protected jump = 0;
  protected lean = 0;
  protected sit = 0;
  protected endT: number | null = null;
  private longerSaid = false;

  constructor(L: LevelRuntime, maxWords: number) {
    super(L);
    this.egg = new EggPeek(L);
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
    const sitDrop = Math.sin(Math.PI * Math.min(1, this.sit)) * 14;
    drawCarrier(g, this.L, this.egg, this.L.tapkoMood, HERO_X, FEET + sitDrop, { t: this.t, jump: this.jump, spin: this.lean });
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
    const L = this.L, x = L.vw + GUST_R * 1.5, by = L.rng.range(190, 330);
    const leaves = Array.from({ length: L.rng.int(1, 2) }, (_, i) => ({ pic: L.rng.pick(LEAVES), phase: i * Math.PI + L.rng.range(0, 1) }));
    return { x, y: by, by, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite: '', size: GUST_R * 2, strong: false, grow: 1, rush: false, leaves, phase: L.rng.range(0, 6) };
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
    m.y = m.by + Math.sin(m.age * 2.1 + m.phase) * 10;
  }

  /** A typed gust breaks up in a puff and he walks on up the path. */
  protected onLeave(m: Mover): void {
    m.vx = -30;
    m.vy = -20;
    this.L.particles.emit(m.x, m.y, 14, 'puff', ['#ffffff', '#e8f4ff'], 120, 14);
    this.glide(WALK_ON);
  }

  /** An untyped gust reaches him and pushes him and the egg a few steps back; a rush further, and the way gets longer. */
  protected onPass(m: Mover): void {
    m.vx = -60;
    m.vy = -30;
    this.L.particles.emit(HERO_X + 40, m.y, 12, 'puff', ['#ffffff', '#e8f4ff'], 140, 12);
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
    m.fade = Math.min(1, m.fade + dt * 1.6);
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

  /** A swirl of air: soft blue-grey strokes under white ones, so it reads on a bright sky too. */
  drawMover(g: G, m: Mover): void {
    const r = GUST_R * m.grow, spin = m.age * (m.strong ? 5 : 3.5) + m.phase, w = m.strong ? 1.6 : 1;
    const strokes: ((g: G) => void)[] = [];
    for (let i = 0; i < 4; i++) {
      const rr = r * (0.35 + 0.2 * i), a = spin * (1 - i * 0.12) + i * 1.7;
      strokes.push((gg) => gg.arc(m.x, m.y, rr, a, a + 1.5 + i * 0.25));
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
    for (const [ink, width, alpha] of [['#5f7f9c', 8, 0.35], ['#ffffff', 4.5, 0.95]] as const) {
      g.strokeStyle = ink;
      g.lineWidth = width * w;
      g.globalAlpha = alpha;
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
const BOULDER_SIZE = [72, 86, 100, 114];
/** From this share of the level every third throw is a pair, the second 1-1.5 s after the first. */
const PAIR_FROM = 1 / 3;
const PAIR_EVERY = 3;
const PAIR_GAP: [number, number] = [1, 1.5];
/** A missed boulder makes the way longer by this share of the level's planned words (and its minimum time), at most ten times. */
export const STUMBLE_SHARE = 0.07;
export const STUMBLE_MAX = 10;
/** Seconds of a hop over a typed boulder and of a stumble over a missed one (a late hop, a sit, up again). */
const HOP_S = 0.55;
const STUMBLE_S = 1.4;

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
 * Egg 4, boulders before the summit (a word stream): round boulders roll down the path at him,
 * the word above each; from a third of the level about every third throw is a pair. Typed, it rolls
 * on and he hops over it; missed, he hops too late, stumbles and sits a moment, and the way gets
 * a little longer.
 */
export class BouldersMode extends SlopeStream {
  readonly pictures = [...BOULDERS, 'obj-egg-plain'];
  /** Throws so far, and the second boulder of a pair is due. */
  private throws = 0;
  private pairSecond = false;
  /** Seconds through his stumble, -1 when he stands. */
  private stumble = -1;

  constructor(L: LevelRuntime) {
    super(L, STUMBLE_SHARE * STUMBLE_MAX * L.def.count);
  }

  startLine(): string {
    return pickLine('story.bouldersStart');
  }

  protected doneLine(): string {
    return 'story.bouldersDone';
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
      sprite: L.rng.pick(BOULDERS), size, flip: L.rng.chance(0.5), hopped: false,
    };
  }

  update(dt: number): void {
    super.update(dt);
    // A boulder's word shows once it is wholly in sight.
    for (const tg of this.L.core.active) {
      const m = tg.data as Mover;
      if (m.state === 'come' && tg.selectable) tg.selectable = m.x + m.size / 2 <= this.L.vw;
    }
    if (this.stumble >= 0) {
      this.stumble += dt;
      const k = this.stumble / STUMBLE_S;
      // A late hop, then he sits a moment and gets up.
      this.jump = k < 0.3 ? k / 0.3 : 0;
      this.sit = k < 0.3 ? 0 : Math.min(1, (k - 0.3) / 0.7);
      this.lean = k < 0.3 ? 0 : -0.04 * Math.sin(Math.PI * this.sit);
      if (k >= 1) {
        this.stumble = -1;
        this.jump = this.sit = this.lean = 0;
      }
    }
  }

  /** Rolling on: it turns as it rolls. */
  protected moveComing(m: Mover, dt: number, tg: Target): void {
    const x = m.x;
    super.moveComing(m, dt, tg);
    m.rot += (m.x - x) / (m.size / 2);
  }

  /** A typed boulder rolls on; as it reaches him he hops over it, and it rolls off the left edge. */
  protected onLeave(m: Mover): void {
    m.hopped = false;
  }

  /** A missed one rolls on behind him: he stumbles, and the way gets longer. */
  protected onPass(m: Mover): void {
    m.hopped = true;
    this.stumble = this.L.reduceMotion ? STUMBLE_S : 0;
    this.egg.poke();
    this.exclaim('story.boulderOops');
    this.L.setMood('thinking', 1.4);
    this.longer(STUMBLE_SHARE * this.L.def.count, 'story.bouldersLonger');
  }

  protected moveGone(m: Mover, dt: number): void {
    const x = m.x;
    m.x += m.vx * dt;
    m.rot += (m.x - x) / (m.size / 2);
    if (!m.hopped && m.x - m.size / 2 < HERO_X + REACH) {
      m.hopped = true;
      this.hop();
    }
    if (m.x < -m.size) m.fade = 1;
  }

  /** He hops over a typed boulder (a stumble is never cut short). */
  private hop(): void {
    if (this.stumble >= 0) return;
    this.L.sfx('whoosh');
    this.L.tweens.add(HOP_S, (k) => { this.jump = k; }, ease.linear, () => { this.jump = 0; });
  }

  drawMover(g: G, m: Mover): void {
    drawSprite(g, m.sprite, m.x, m.y, m.size, { rot: m.rot, flip: m.flip }, boulderFallback);
  }

  render(g: G): void {
    // A missed boulder rolls on behind him; the others in front, so he hops over them.
    const list = [...this.L.core.targets];
    for (const tg of list) if ((tg.data as Mover).state === 'pass') this.drawMover(g, tg.data as Mover);
    this.drawHero(g);
    for (const tg of list) if ((tg.data as Mover).state !== 'pass') this.drawMover(g, tg.data as Mover);
    for (const tg of list) {
      const m = tg.data as Mover;
      if (m.state === 'come') this.L.label(g, tg, m.x, m.y - m.size / 2 - 34);
    }
  }
}

/** The path's places right of him (shares of the stage), and the seconds a round's puddles and words grow. */
const SLOTS = [0.42, 0.62, 0.82];
const GROW = 0.35;
/** The puddles: their pictures, their width and most height on the path (flattened, they lie on it), and how many rounds after a mud step have one very hard word. */
const MUDS = ['obj-mud-1', 'obj-mud-2'];
const MUD_W = 170;
const MUD_H = 50;
export const HARD_ROUNDS = 3;
/** A very hard word: the longest of a few drawn from the hardest keys the child knows. */
const HARD_DRAWS = 4;
/** Seconds of his walk to a place, per stage width. */
const WALK_S = 0.9;
/** The words over the places float this high above the path. */
const WORD_UP = 150;

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

/** A place of a round on the path, in the scene (the screen shows it at x - scroll). */
interface Place {
  x: number;
  mud: string | null;
  flip: boolean;
  tg: Target | null;
  age: number;
}

/**
 * Egg 2, sticky puddles (waiting words, a calm step): each round shows 2 or 3 words, each over a
 * place on the path ahead, at least one clean and one with a sticky puddle. He walks to the place
 * of the typed word; in a puddle he is stuck for three rounds of one very hard word each.
 */
export class MudMode extends HeroMode {
  readonly world = 'egg';
  readonly pictures = [...MUDS, 'obj-egg-plain'];
  private egg: EggPeek;
  private places: Place[] = [];
  /** Puddles left behind on the path. */
  private passed: Place[] = [];
  /** The very hard word while he is stuck, and the rounds of it left. */
  private hard: Target | null = null;
  private hardLeft = 0;
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
    return this.egg.motion();
  }

  private placeX(i: number): number {
    return this.scroll + this.L.vw * SLOTS[i];
  }

  /** The next round: words over 2-3 places, a clean one and a puddle at least; one very hard word while he is stuck. */
  private round(): void {
    const L = this.L;
    if (this.done >= L.count) return this.end();
    if (this.hardLeft > 0) {
      this.hard = L.core.add(this.hardWord(), {});
      return;
    }
    const n = L.rng.chance(0.5) ? 2 : 3;
    const slots = L.rng.shuffle([0, 1, 2]).slice(0, n).sort((a, b) => a - b);
    const muds = new Set(L.rng.shuffle([...slots]).slice(0, L.rng.int(1, n - 1)));
    this.places = slots.map((i) => ({
      x: this.placeX(i), mud: muds.has(i) ? L.rng.pick(MUDS) : null, flip: L.rng.chance(0.5), age: 0,
      tg: L.core.add(L.word(6, 1), {}, false),
    }));
  }

  /** The longest of a few words of the hardest keys the child knows. */
  private hardWord(): string {
    let best = '';
    for (let i = 0; i < HARD_DRAWS; i++) {
      const w = this.L.weakWord();
      if (w.length > best.length) best = w;
    }
    return best;
  }

  onDone(tg: Target): void {
    if (tg === this.hard) {
      this.hard = null;
      this.done++;
      this.hardLeft--;
      this.jump = 0.3;
      this.L.tweens.add(0.4, (k) => { this.jump = Math.sin(k * Math.PI) * 0.3; }, ease.linear, () => { this.jump = 0; });
      if (this.hardLeft > 0) return this.round();
      // Free again: he walks on, the view glides after him.
      this.L.shout(pickLine('story.mudFree'), this.heroSpot().x, this.heroSpot().y);
      return this.walkOn(() => this.round());
    }
    const place = this.places.find((p) => p.tg === tg);
    if (!place) return;
    this.done++;
    this.happy();
    for (const p of this.places) if (p !== place && p.tg) this.L.core.release(p.tg, false);
    for (const p of this.places) p.tg = null;
    this.L.core.prune();
    this.passed.push(...this.places);
    this.places = [];
    this.walkTo(place.x - this.scroll, () => {
      if (!place.mud) return this.walkOn(() => this.round());
      // Stuck in the mud: the next rounds have one very hard word each, and he cannot move.
      this.egg.poke();
      this.L.setMood('thinking', 1.4);
      this.L.shout(pickLine('story.mudStep'), this.heroSpot().x, this.heroSpot().y);
      this.L.sfx('pop');
      this.hardLeft = HARD_ROUNDS;
      this.round();
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

  /** The puddles are behind him: he wipes his paws (a little hop) and walks on. */
  private end(): void {
    this.endT = 0;
    this.happy();
    this.L.say(pickLine('story.mudDone'), END_TIME);
    this.L.tweens.add(0.5, (k) => { this.jump = k; }, ease.linear, () => {
      this.jump = 0;
      const from = this.scroll;
      this.L.tweens.add(this.L.reduceMotion ? 0.01 : 1.4, (k) => { this.scroll = from + 220 * k; }, ease.inOutQuad);
    });
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
    if (this.endT !== null) this.endT += dt;
  }

  private drawPuddle(g: G, p: Place, grow: number): void {
    if (!p.mud) return;
    const img = sprite(p.mud), h = MUD_W / (img ? img.naturalWidth / img.naturalHeight : MUD_W / MUD_H);
    drawSprite(g, p.mud, p.x - this.scroll, FEET + 4, h * grow, { flip: p.flip, sy: Math.min(1, MUD_H / h) }, mudFallback);
  }

  render(g: G): void {
    for (const p of this.passed) this.drawPuddle(g, p, 1);
    for (const p of this.places) this.drawPuddle(g, p, this.L.reduceMotion ? 1 : ease.outBack(Math.min(1, p.age / GROW)));
    this.drawHero(g);
    if (this.busy) return;
    for (const p of this.places) if (p.tg) this.L.label(g, p.tg, p.x - this.scroll, FEET - WORD_UP);
    if (this.hard) {
      this.L.label(g, this.hard, this.heroX, wordAbove(FEET));
      // Each mud step says why the words are hard now, under the first of them.
      if (this.hardLeft === HARD_ROUNDS) rimmed(g, t('story.mudSlow'), this.L.vw * 0.6, wordAbove(FEET) + 70, 26);
    }
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
