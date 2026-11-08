import { app, pickLine, profileLayout } from '../../app/app';
import { fast } from '../../app/fast';
import { audio } from '../../audio/audio';
import { BeatMusic } from '../../audio/beat-music';
import { graphics } from '../../engine/graphics';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { type G, WORD, drawSprite, fontFamily, roundRect } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { type Finger, fingerFor } from '../../keyboard/layouts';
import { recentAccuracy } from '../../learning/lessons';
import { recentTyping } from '../../learning/stats';
import { FINGER_COLORS } from '../../ui/finger-colors';
import { filterWords, isBlocked } from '../../words/words';
import {
  CHANGE_S, type Drop, type Landing, type Lane, type LaneChange, PHRASE, RING_MIN, RING_WINDOW, Song, type Step, TEMPO_MAX,
  beatScore, judge, laneNow, laneSetup, laneWeights, nextBase, phraseStep, pickLanes, planChanges, startTempo, timing,
} from '../beat';
import { WORLDS, parrotKeys, rhythmLetters, rhythmRoundS, rhythmShape, rhythmTarget } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { BeatDue } from '../super-help';
import type { Target } from '../typing';
import { HeroMode, sideFeet } from './kit/hero';
import type { Meter } from '../mode';

/** Clouds: their middle's height, their width (a little wider than a lane, never over the lanes beside it) and the pictures (three, also drawn mirrored). */
const CLOUD_Y = 84;
const CLOUD_W = 106;
const CLOUDS = [1, 2, 3].map((n) => `obj-rhythm-cloud-${n}`);
/** About where a cloud's bottom edge is. */
const CLOUD_BOTTOM = CLOUD_Y + 36;
/** Where a letter leaves its cloud. */
const FALL_TOP = CLOUD_Y + 14;
/** The basket's picture and its width: a little wider than a lane's stripe. */
const BASKET = 'obj-rhythm-basket';
const BASKET_W = 90;
/** The catch band's lower edge: this share of the basket's height above its bottom. */
const BAND_AT = 2 / 3;
/** The band glows in the space bar's colour, which no finger lane uses. */
const BAND_COLOR = '255, 255, 255';
/** A falling letter's disc radius and its letter size, and the letter's size on its cloud. */
const DISC_R = 28;
/** The white line behind a letter's disc: how far it reaches past the disc on each side, and its width (units). */
const MID_OUT = 14;
const MID_W = 3;
const LETTER = 38;
const CLOUD_LETTER = 50;
/** Width of a lane's stripe, and the gap between two lanes' middles (the clouds close together). */
const STRIPE_W = 76;
const LANE_GAP = 130;
/** Where the lanes may stand: right of the character, and off the stage's right edge; with many lanes from the left edge too. */
const LANES_LEFT = 320;
const LANES_LEFT_TIGHT = 70;
const LANES_RIGHT = 60;
/** A gap below this many units scales the lanes, clouds, letters and the basket down to fit. */
const GAP_FULL = 120;
/** Seconds of the basket's slide under a lane, of a caught letter dropping in, a lane's flash, a feedback word. */
const SLIDE_S = 0.12;
const DROP_IN_S = 0.15;
/** Seconds of the basket's soft way back to rest after a catch, once the letter dropped in (full graphics with motion). */
const RETURN_S = 0.25;
const FLASH_S = 0.45;
const WORD_S = 0.9;
/** The band's beat flash: its width (seconds to a beat at which it is down to about a third) and how early it is drawn (about a frame). */
const PULSE_S = 0.07;
const PULSE_LEAD_S = 0.017;
/** How often a catch in time shows praise over the basket; a catch off the beat always says which way. */
const PRAISE_SHARE = 0.5;
/** The colours of the words over the basket: praise, too early (calm blue), too late (warm orange). */
const WORD_COLOR = { inTime: '#ffffff', slower: '#bfe3ff', early: '#bfe3ff', faster: '#ffd08a', late: '#ffd08a' } as const;
/**
 * After a miss: seconds everything stands still (the keys wait); then the next letter glides into the
 * band's middle at half the song's speed, taking at most a few seconds; the pause sign blinks this often (seconds).
 */
const HOLD_S = 0.9;
const GLIDE_SPEED = 0.5;
const GLIDE_MAX_S = 3;
const BLINK_S = 0.5;
/** Seconds the song plays on after its closing bar before the round ends, and how far ahead its notes are scheduled. */
const TAIL_S = 0.6;
const AHEAD_S = 0.25;
/** Speed of the background's middle strip. */
const SWAY = 2;
/**
 * The letter strip under the basket: its bottom's gap above the stage's bottom, its height, its letters'
 * size and spacing, where the due letter stays (a share of its width), the gap up to the basket, and
 * the seconds of its glide to the next letter.
 */
const STRIP_BOTTOM = 10;
const STRIP_H = 52;
const STRIP_SIZE = 32;
const STRIP_CELL = 34;
const STRIP_AT = 0.42;
const STRIP_GAP = 8;
const STRIP_GLIDE_S = 0.12;

/** One letter in play: its drop, its target while it is the next one, and what became of it (song seconds). */
interface Fall {
  d: Drop;
  tg: Target | null;
  /** When it was caught, and where it was then, or null. */
  caught: number | null;
  caughtY: number;
  /** The window passed without a catch: it falls on below the stage. */
  missed: boolean;
  /** It dropped into the basket (the basket counts it). */
  inBasket: boolean;
}

/** A phrase's count: letters due and caught, catches on the beat (not while the song waited) and those in time, right and wrong keys. */
interface PhraseCount {
  due: number;
  caught: number;
  timed: number;
  inTime: number;
  ok: number;
  wrong: number;
}

/** Canvases of what is drawn the same way again and again (a cloud with its letter, a falling letter), per device scale. */
const stamps = new Map<string, HTMLCanvasElement>();

/**
 * Draws `paint` (in units, its box from (0, 0) to (w, h)) once into a canvas of its own and copies it
 * centered at (x, y) on whole device pixels: a letter's outline and a scaled picture cost far more than a copy.
 */
function stamp(g: G, key: string, x: number, y: number, w: number, h: number, paint: (c: G) => void, alpha = 1): void {
  const m = g.getTransform();
  const id = `${key}|${m.a}`;
  let c = stamps.get(id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(w * m.a);
    c.height = Math.ceil(h * m.a);
    const cg = c.getContext('2d')!;
    cg.setTransform(m.a, 0, 0, m.a, 0, 0);
    paint(cg);
    stamps.set(id, c);
  }
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha *= alpha;
  g.drawImage(c, Math.round(m.a * (x - w / 2) + m.e), Math.round(m.d * (y - h / 2) + m.f));
  g.restore();
}

/** A letter in the game's font, outlined so it reads on any background. */
function letterAt(c: G, ch: string, x: number, y: number, size: number, fill: string, edge: string, width: number): void {
  c.font = `700 ${size}px ${fontFamily()}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = width;
  c.strokeStyle = edge;
  c.strokeText(ch, x, y);
  c.fillStyle = fill;
  c.fillText(ch, x, y);
}

/**
 * Rytmus: letters fall from the lane clouds, one lane per finger in its colour, and each is in the
 * middle of the glowing catch band on its beat of the music. A lane's letter slides the basket under
 * the lane; the next letter's key while it is in the band catches it, any other key is an error. An
 * uncaught letter falls on below the stage and everything stops; the next letter glides into the band
 * and waits for its key. The character stands at the left. The tempo and the band's height step
 * between phrases of sixteen letters (`.specify/game/rhythm.md`).
 */
export class RhythmMode extends HeroMode {
  readonly world: string;
  readonly scene = false;
  readonly midOnly = true;
  readonly phraseWords = 1;
  readonly ownMusic = true;
  readonly doneSfx = null;
  readonly pictures = [...CLOUDS, BASKET];
  readonly lanes: Lane[];
  readonly changes: LaneChange[];
  readonly song: Song;
  private music = new BeatMusic();
  private falls: Fall[] = [];
  /** The next letter due (the first not caught or missed). */
  private cur = 0;
  /** Song seconds, and `performance.now()` when it was last advanced. */
  private songT = 0;
  private perfAt = 0;
  /** The key time of the press being handled (`onKey` comes before `onDone`). */
  private keyAt = 0;
  private counts: PhraseCount[] = [];
  private landings: Landing[] = [];
  /** Keys right and wrong in the whole round. */
  private ok = 0;
  private wrong = 0;
  /** Letters caught. */
  caught = 0;
  /** The highest tempo held for a whole phrase, and whether a phrase at the world's target tempo went accurately. */
  held = 0;
  reached = false;
  private toldWait = false;
  /**
   * After a miss: everything stands still ('hold'), then the next letter glides into the band's
   * middle ('glide', song time runs on to its beat at `speed`), where the song waits for its key ('ready').
   * Back from a pause the same from 'glide' on, without the miss.
   */
  private recover: { phase: 'hold' | 'glide' | 'ready'; left: number; speed: number } | null = null;
  /** The letter strip's position (letters along it), gliding to the due letter. */
  private stripAt = 0;
  /** The basket's slide: from which x to which lane (null: between the middle lanes), from when to when (song seconds; it waits at `from` until `at`). */
  private basket: { from: number; lane: number | null; at: number; end: number };
  private flash: number[];
  /** The word over the basket after a catch, its colour, and when it came. */
  private word = { text: '', color: '#ffffff', at: -9 };
  /** The top bar's measures, worked out four times a second. */
  private hudAt = 0;
  private shownMeter: Meter | null = null;
  private readonly target: number;
  /** The round's base tempo: the phrases step around it. */
  private readonly base: number;
  /** Real seconds since the last miss, for the blinking pause sign. */
  private blink = 0;
  private over = false;

  constructor(L: LevelRuntime) {
    super(L);
    const p = app.profile!;
    this.world = WORLDS[L.def.world];
    this.heroY = sideFeet(this.world, VH * 0.95);
    const lay = profileLayout(p);
    const shape = rhythmShape(L.def.world);
    // The world's ready letters; with too few of them, all the world's letters.
    let letters = rhythmLetters(p, L.def.world);
    if (letters.length < shape.lanes) letters = parrotKeys(p, L.def.world);
    const { lanes, spare } = pickLanes(laneSetup(letters, (ch) => fingerFor(lay, ch)), shape.lanes, letters);
    this.lanes = lanes;
    const roundS = fast(rhythmRoundS(L.def.world));
    this.changes = planChanges(this.lanes, spare, shape.changes, roundS);
    this.target = rhythmTarget(L.def.world);
    this.base = startTempo(p.progress.rhythmTempo, recentTyping(p, 14).cpm, this.target);
    const weights = laneWeights(this.lanes.map((l) => recentAccuracy(p.stats.keys[l.letters[0]])));
    // Words of the round's letters only, from the child's word language.
    const all = new Set([...this.lanes.map((l) => l.letters[0]), ...this.changes.map((c) => c.letter)]);
    const words = filterWords(app.words[p.settings.wordLang] ?? [], all, [2, 6]).filter((w) => !isBlocked(w));
    this.song = new Song({ lanes: this.lanes, changes: this.changes, weights, tempo: this.base, rand: () => L.rng.next(), roundS, words });
    this.flash = this.lanes.map(() => -9);
    this.basket = { from: this.restX(), lane: null, at: -1, end: -1 };
    stamps.clear();
  }

  startLine(): string {
    return t('rhythm.start');
  }

  meter(): Meter {
    return (this.shownMeter ??= this.measure());
  }

  sessionRhythm(): number | null {
    return this.score;
  }

  /** The tempo playing now, letters a minute. */
  get tempo(): number {
    return Math.round(this.tempoNow);
  }

  /** The exact tempo of the due letter. */
  private get tempoNow(): number {
    const d = this.dueDrop;
    return d ? 60 / d.T : this.song.phrases[0].tempo;
  }

  /** The next round's base: a step from this round's towards where its tempo went. */
  get nextTempo(): number {
    return nextBase(this.base, this.tempoNow);
  }

  /** The next drop due, else the last one. */
  private get dueDrop(): Drop | undefined {
    return this.falls[this.cur]?.d ?? this.song.drops[this.song.drops.length - 1];
  }

  /** Right keys of all keys pressed; 1 before any. */
  get accuracy(): number {
    return this.ok + this.wrong ? this.ok / (this.ok + this.wrong) : 1;
  }

  /** Letters due so far (caught or missed). */
  get due(): number {
    return this.cur;
  }

  /** The round's rhythm (0-100), null with too few letters or without time pressure. */
  get score(): number | null {
    return this.L.noPressure ? null : beatScore(this.landings, this.accuracy);
  }

  /**
   * The lanes' layout: the gap between their middles, the middle of the first, and the scale of what
   * is drawn on them. They stand right of the character around the stage's middle; when they do not
   * fit there they may reach in front of the character, and below a full gap everything gets smaller.
   */
  private get fit(): { gap: number; x0: number; k: number } {
    const n = this.lanes.length, vw = this.L.vw, right = vw - LANES_RIGHT;
    if (n < 2) return { gap: 0, x0: vw / 2, k: 1 };
    const left = (right - LANES_LEFT) / (n - 1) >= GAP_FULL ? LANES_LEFT : LANES_LEFT_TIGHT;
    const gap = Math.min(LANE_GAP, (right - left) / (n - 1));
    const span = gap * (n - 1);
    const mid = Math.max(left + span / 2, Math.min(right - span / 2, vw / 2));
    return { gap, x0: mid - span / 2, k: Math.min(1, gap / GAP_FULL) };
  }

  /** The middle of lane `i`. */
  private laneX(i: number): number {
    const { gap, x0 } = this.fit;
    return x0 + i * gap;
  }

  /** The scale of the lanes, clouds, letters and basket: 1 unless many lanes need less room. */
  private get k(): number {
    return this.fit.k;
  }

  /** Draws `fn` at (x, y) at the lanes' scale, around that point. */
  private scaled(g: G, x: number, y: number, fn: () => void): void {
    const k = this.k;
    if (k === 1) return fn();
    g.save();
    g.translate(x, y);
    g.scale(k, k);
    g.translate(-x, -y);
    fn();
    g.restore();
  }

  /** The basket's resting place: between the two middle lanes (with an odd number, right of the middle one), under none of them. */
  private restX(): number {
    const n = this.lanes.length;
    return n < 2 ? this.L.vw / 2 : (this.laneX(0) + this.laneX(n - 1)) / 2 + (n % 2 ? this.fit.gap / 2 : 0);
  }

  /** The letter strip's top: at the stage's bottom. */
  private get stripTop(): number {
    return VH - STRIP_BOTTOM - STRIP_H;
  }

  /** The basket's bottom: right over the letter strip. */
  private get basketBottom(): number {
    return this.stripTop - STRIP_GAP;
  }

  /** The basket's height, from its picture's shape at its width (at the lanes' scale). */
  private get basketH(): number {
    const img = sprite(BASKET), w = BASKET_W * this.k;
    return img ? (w * img.naturalHeight) / img.naturalWidth : w / 1.5;
  }

  /** The catch band's lower edge: it stays there while the band grows upwards. */
  private get bandBottom(): number {
    return this.basketBottom - this.basketH * BAND_AT;
  }

  /** A drop's fall speed (units a second): it is in the middle of the band on its beat. */
  private speed(d: Drop): number {
    return (this.bandBottom - FALL_TOP) / (d.land - d.release + d.w * d.T);
  }

  /** The catch band of a drop: its top and bottom. */
  private band(d: Drop): { top: number; bottom: number } {
    return { top: this.bandBottom - 2 * this.speed(d) * d.w * d.T, bottom: this.bandBottom };
  }

  /** How high a letter is now: from its cloud through the band and on below the stage. */
  private fallY(f: Fall): number {
    return FALL_TOP + this.speed(f.d) * (this.songT - f.d.release);
  }

  /** Song seconds at a key's time (`performance.now()` ms). */
  private songAt(perf: number): number {
    return this.songT + (perf - this.perfAt) / 1000;
  }

  /** `performance.now()` at song time `s`. */
  private perf = (s: number) => this.perfAt + (s - this.songT) * 1000;

  private get active(): Fall | undefined {
    return this.falls[this.cur];
  }

  /** The step of the phrase playing, on its letters resolved so far: their catches and timing, not wrong keys. */
  private decide(): Step {
    const c = this.counts[this.song.phrases.length - 1];
    if (!c || !c.due) return 0;
    return phraseStep(c.caught / c.due, c.timed ? c.inTime / c.timed : 1);
  }

  private count(phrase: number): PhraseCount {
    return (this.counts[phrase] ??= { due: 0, caught: 0, timed: 0, inTime: 0, ok: 0, wrong: 0 });
  }

  update(dt: number): void {
    super.update(dt);
    this.scroll += dt * SWAY;
    this.blink += dt;
    this.stripAt += (this.cur - this.stripAt) * (this.L.reduceMotion ? 1 : 1 - Math.exp(-dt / STRIP_GLIDE_S));
    if (this.over) return;
    const a = this.active;
    // Without time pressure, and after a miss, the song waits while the due letter is in the middle of the band.
    const next = this.songT + this.advance(dt);
    const waits = (this.L.noPressure || this.recover) && a && a.caught === null && next > a.d.land;
    this.songT = waits ? Math.max(this.songT, a.d.land) : next;
    if (waits && this.recover?.phase === 'glide') {
      this.recover.phase = 'ready';
      this.tell(t('rhythm.goOn'), 3);
    }
    this.perfAt = performance.now();
    this.song.tick(this.songT, () => this.decide());
    while (this.falls.length < this.song.drops.length) this.falls.push({ d: this.song.drops[this.falls.length], tg: null, caught: null, caughtY: 0, missed: false, inBasket: false });
    // The window passed: the letter is missed (no error) and falls on, the next one is due.
    for (let f = this.active; f && f.caught === null && !this.L.noPressure && this.songT > f.d.land + f.d.w * f.d.T; f = this.active) this.miss(f);
    for (const f of this.falls) {
      if (f.caught !== null && !f.inBasket && this.songT >= f.caught + DROP_IN_S) {
        f.inBasket = true;
        this.caught++;
      }
    }
    const now = this.active;
    if (now && !now.tg && this.songT >= now.d.release) now.tg = this.L.core.add(now.d.letter, {});
    const o = this.recover ? null : audio.beatOut();
    if (o) this.music.schedule(o, this.song.bars, this.songT, this.songT + AHEAD_S, this.perf);
    if ((this.hudAt -= dt) <= 0) {
      this.hudAt = 0.25;
      this.shownMeter = this.measure();
    }
    if (this.song.closed && !this.active && this.songT >= this.song.end + TAIL_S) this.over = true;
  }

  /** Song seconds for `dt` real ones: none while everything stands still after a miss, half as many while the next letter glides into the band. */
  private advance(dt: number): number {
    const r = this.recover;
    if (!r || r.phase === 'ready') return dt;
    if (r.phase === 'hold') {
      if ((r.left -= dt) > 0) return 0;
      const a = this.active;
      const gap = a ? Math.max(0, a.d.land - this.songT) : 0;
      r.phase = 'glide';
      r.speed = Math.max(GLIDE_SPEED, gap / GLIDE_MAX_S);
    }
    return dt * r.speed;
  }

  /** A letter passed the band: it falls on, everything stops, and the next one comes into the band to wait for its key. */
  private miss(f: Fall): void {
    f.missed = true;
    if (f.tg) this.L.core.release(f.tg);
    this.L.core.prune();
    this.flash[f.d.lane] = this.songT;
    this.surprised(0.7);
    this.resolve(f, null);
    if (this.active) {
      this.recover = { phase: 'hold', left: HOLD_S, speed: 1 };
      this.blink = 0;
      // "Wait" stays until the letter is in place and "go on" replaces it.
      this.tell(t('rhythm.hold'), HOLD_S + GLIDE_MAX_S + 1);
    }
  }

  /**
   * Back from a pause: no miss, nothing counted, but the child gets time to find the key again: the due
   * letter glides into the band's middle (one already in the band stays the due one), the song waits
   * there for its key, with the same "wait" and "go on" lines and the pause sign as after a miss.
   */
  onResume(): void {
    const a = this.active;
    if (!a || this.over || this.recover) return;
    this.recover = { phase: 'glide', left: 0, speed: Math.max(GLIDE_SPEED, Math.max(0, a.d.land - this.songT) / GLIDE_MAX_S) };
    this.blink = 0;
    this.tell(t('rhythm.hold'), GLIDE_MAX_S + 1);
  }

  /** A line that must be seen now: it replaces whatever the bubble says. */
  private tell(text: string, seconds: number): void {
    this.L.hideBubble();
    this.L.say(text, seconds);
  }

  /**
   * A letter is caught (offset from its beat, seconds) or missed (null): the beat measure and the phrase
   * count take it, the next one is due. `measured` false: caught while the song waited, out of rhythm's count.
   */
  private resolve(f: Fall, offset: number | null, measured = true): void {
    const c = this.count(f.d.phrase);
    c.due++;
    if (measured) this.landings.push({ offset, T: f.d.T });
    this.cur++;
    const n = this.active;
    if (n && !n.tg && this.songT >= n.d.release) n.tg = this.L.core.add(n.d.letter, {});
    const ph = this.song.phrases[f.d.phrase];
    // The phrase's last letter: a whole phrase held at its tempo.
    if (c.due === PHRASE && f.d.index === ph.first + PHRASE - 1) {
      const acc = c.ok + c.wrong ? c.ok / (c.ok + c.wrong) : 1;
      this.held = Math.max(this.held, ph.tempo);
      if (ph.tempo >= this.target && acc >= 0.95 && c.caught / c.due >= 0.9 && !this.L.noPressure) this.reached = true;
      if (!c.wrong && c.caught === c.due) this.L.say(pickLine('rhythm.phrase'), 2.5);
    }
  }

  /** The lane whose letter `ch` is now, or -1. */
  private laneOf(ch: string): number {
    return this.lanes.findIndex((_, i) => this.cloudLetter(i) === ch);
  }

  /**
   * A lane's letter slides the basket under its lane. The next letter's key counts only while the
   * letter is in the band: before or after it, it is an error (the first early one says to wait).
   */
  checkKey(ch: string, at: number): 'pass' | 'wait' | 'wrong' {
    // After a miss the keys wait until the next letter is in the band.
    if (this.recover && this.recover.phase !== 'ready') return 'wait';
    const lane = this.laneOf(ch);
    if (lane >= 0) this.slideTo(lane);
    const f = this.active;
    if (!f?.tg) return lane >= 0 ? 'wait' : 'pass';
    if (ch !== f.d.letter) return 'pass';
    const when = judge(this.songAt(at), f.d.land, f.d.T, f.d.w);
    if (when === 'catch') return 'pass';
    if (when === 'early' && !this.toldWait) {
      this.toldWait = true;
      this.L.say(t('rhythm.wait'), 4);
    }
    return 'wrong';
  }

  readonly beat = true;

  /** The letter the super help presses next: none while everything stands still after a miss; waiting while the song stands at it. */
  beatDue(): BeatDue | null {
    const f = this.active;
    if (!f?.tg || this.over || (this.recover && this.recover.phase !== 'ready')) return null;
    const waiting = (!!this.recover || this.L.noPressure) && this.songT >= f.d.land;
    return { index: f.d.index, letter: f.d.letter, untilBeat: f.d.land - this.songT, w: f.d.w, T: f.d.T, waiting };
  }

  /** Slides the basket under `lane` (null: back to rest), starting `after` song seconds from now and taking `seconds`. */
  private slideTo(lane: number | null, after = 0, seconds = SLIDE_S): void {
    if (this.basket.lane === lane && this.songT >= this.basket.end) return;
    const at = this.songT + after;
    const end = this.L.reduceMotion ? this.songT : at + seconds;
    this.basket = { from: this.basketX(), lane, at, end };
  }

  onKey(_expected: string, _ok: boolean, _rt: number, at: number): void {
    this.keyAt = at;
  }

  onDone(tg: Target): void {
    const f = this.active;
    if (!f || f.tg !== tg) return;
    const T = f.d.T;
    // Caught while the song waited (after a miss, or without time pressure): right on its beat, out of rhythm's count.
    const waited = !!this.recover || this.L.noPressure;
    this.recover = null;
    const offset = waited ? 0 : Math.max(-f.d.w * T, Math.min(f.d.w * T, this.songAt(this.keyAt) - f.d.land));
    f.caught = this.songT;
    f.caughtY = this.fallY(f);
    // The basket goes back to rest, under no lane: the next letter's key slides it again. In the full drawing with
    // motion it waits for the letter to drop in and glides back softly, else it goes at once.
    if (this.L.reduceMotion || graphics.simple) this.slideTo(null);
    else this.slideTo(null, DROP_IN_S, RETURN_S);
    this.ok++;
    const c = this.count(f.d.phrase);
    c.ok++;
    c.caught++;
    const how = timing(offset, f.d.w, T);
    if (!waited) {
      c.timed++;
      if (how === 'inTime') c.inTime++;
    }
    if (how === 'inTime') {
      this.happy();
      this.L.particles.emit(this.laneX(f.d.lane), this.bandBottom, 6, 'sparkle', ['#ffd54a', '#fff3b0'], 90, 9, 0.6);
    }
    // Praise now and then; off the beat always which way (a catch after a wait is right on it and says nothing).
    if (!waited && (how !== 'inTime' || this.L.rng.next() < PRAISE_SHARE)) {
      this.word = { text: how === 'inTime' ? pickLine('rhythm.great') : t(`rhythm.${how}`), color: WORD_COLOR[how], at: this.songT };
    }
    const o = audio.beatOut();
    if (o) this.music.bell(o, this.song.bars, Math.max(f.d.land, this.songT), this.perf);
    this.L.core.prune();
    this.resolve(f, offset, !waited);
  }

  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    const f = this.active;
    if (!f) return;
    this.wrong++;
    this.count(f.d.phrase).wrong++;
    this.flash[f.d.lane] = this.songT;
  }

  /** The basket's x: on its way under a lane, or where its last slide ended. */
  private basketX(): number {
    const { from, lane, at, end } = this.basket;
    const to = lane === null ? this.restX() : this.laneX(lane);
    if (this.songT >= end) return to;
    return from + (to - from) * ease.outQuad(Math.max(0, (this.songT - at) / (end - at)));
  }

  /** The top bar: the accuracy, the beat score of the last landings and the tempo. */
  private measure(): Meter {
    const tempo = this.tempo;
    const rhythm = this.L.noPressure ? null : beatScore(this.landings.slice(-RING_WINDOW), this.accuracy, RING_MIN);
    return { accuracy: this.accuracy, rhythm, speed: tempo, speedFill: tempo / TEMPO_MAX };
  }

  render(g: G): void {
    const a = this.active;
    this.lanes.forEach((_, i) => {
      const x = this.laneX(i), w = STRIPE_W * this.k, top = CLOUD_Y + 30;
      const flash = Math.max(0, 1 - (this.songT - this.flash[i]) / FLASH_S);
      // While the lane's letter changes, its beam fades with the old cloud and grows down again from the new one.
      const c = this.changing(i);
      const fade = c === null ? 1 : c < 0.5 ? 1 - c * 2 : 1;
      const grow = c === null || c < 0.5 ? 1 : ease.outQuad((c - 0.5) * 2);
      g.save();
      g.globalAlpha = (0.26 + (a?.d.lane === i ? 0.1 : 0) + 0.3 * flash) * fade;
      g.fillStyle = FINGER_COLORS[laneNow(this.lanes, this.changes, i, c !== null && c < 0.5 ? this.songT - CHANGE_S : this.songT).finger];
      g.fillRect(x - w / 2, top, w, (VH - top) * grow);
      g.restore();
    });
    this.drawBand(g);
    this.lanes.forEach((_, i) => this.drawCloud(g, i));
    for (let k = Math.max(0, this.cur - 12); k < this.falls.length; k++) {
      const f = this.falls[k];
      if (this.songT < f.d.release || f.inBasket) continue;
      if (f.caught !== null) {
        this.drawDroppingIn(g, f);
        continue;
      }
      const y = this.fallY(f);
      if (y > VH + DISC_R) continue;
      const x = this.laneX(f.d.lane);
      const inBand = f === a && judge(this.songT, f.d.land, f.d.T, f.d.w) === 'catch';
      this.scaled(g, x, y, () => {
        if (inBand) this.drawRinged(g, f.d.letter, FINGER_COLORS[f.d.finger], x, y);
        else this.drawSoft(g, f.d.letter, x, y);
      });
    }
    this.drawHero(g);
    this.drawBasket(g);
    this.drawStrip(g);
    this.drawWord(g);
    this.drawStopLine(g);
  }

  /** The band's ends: a lane's stripe past the outer lanes. */
  private get across(): { left: number; right: number } {
    return { left: this.laneX(0) - STRIPE_W * this.k, right: this.laneX(this.lanes.length - 1) + STRIPE_W * this.k };
  }

  /**
   * The letter strip under the basket, a rounded field like a typed word's: the letters caught (green)
   * and missed (grey), the due one marked, the coming ones after it. It glides letter by letter, so
   * the due letter stays near one point; its ends fade out.
   */
  private drawStrip(g: G): void {
    const { left, right } = this.across, top = this.stripTop, y = top + STRIP_H / 2, w = right - left, hc = this.L.highContrast;
    g.save();
    g.fillStyle = hc ? '#ffffff' : WORD.plate;
    roundRect(g, left, top, w, STRIP_H, STRIP_H / 2);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffb23e';
    g.stroke();
    g.clip();
    g.font = `600 ${STRIP_SIZE}px ${fontFamily()}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const at = left + w * STRIP_AT, fade = STRIP_H / 2 + 10;
    const from = Math.max(0, Math.floor(this.stripAt - (at - left) / STRIP_CELL) - 1);
    const to = Math.min(this.falls.length, Math.ceil(this.stripAt + (right - at) / STRIP_CELL) + 1);
    for (let i = from; i < to; i++) {
      const f = this.falls[i], x = at + (i - this.stripAt) * STRIP_CELL;
      g.globalAlpha = Math.max(0, Math.min(1, (x - left) / fade, (right - x) / fade));
      if (i === this.cur) {
        g.fillStyle = hc ? '#ffe066' : WORD.next;
        roundRect(g, x - STRIP_CELL / 2 + 2, y - STRIP_SIZE * 0.62, STRIP_CELL - 4, STRIP_SIZE * 1.24, STRIP_SIZE * 0.2);
        g.fill();
        g.fillStyle = WORD.nextInk;
      } else if (i < this.cur) g.fillStyle = f.missed ? (hc ? '#5a5f68' : '#8a8f98') : (hc ? '#006b2e' : WORD.typed);
      else g.fillStyle = hc ? '#000' : WORD.ink;
      g.fillText(f.d.letter, x, y + 2);
    }
    g.restore();
  }

  /** The glowing catch band behind the basket, across the lanes, a little brighter on the beat. */
  private drawBand(g: G): void {
    const d = this.dueDrop;
    if (!d) return;
    const { top, bottom } = this.band(d), { left, right } = this.across;
    const glow = this.L.reduceMotion ? 0 : 0.15 * this.pulse();
    const grad = g.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, `rgba(${BAND_COLOR}, 0.12)`);
    grad.addColorStop(0.5, `rgba(${BAND_COLOR}, ${0.62 + glow})`);
    grad.addColorStop(1, `rgba(${BAND_COLOR}, 0.25)`);
    g.save();
    g.fillStyle = grad;
    g.fillRect(left, top, right - left, bottom - top);
    // Its edges: a white frame, 3 screen pixels at any stage size.
    const w = 3 / g.getTransform().a;
    g.strokeStyle = `rgb(${BAND_COLOR})`;
    g.lineWidth = w;
    g.strokeRect(left + w / 2, top + w / 2, right - left - w, bottom - top - w);
    // Its middle, the beat: a solid white line to hold a letter's own middle line against.
    const mid = (top + bottom) / 2;
    g.beginPath();
    g.moveTo(left, mid);
    g.lineTo(right, mid);
    g.stroke();
    g.restore();
  }

  /** A solid white line through a letter's middle, a little wider than its disc, to see how its middle stands to the band's. */
  private midLine(c: G, s: number): void {
    c.strokeStyle = '#ffffff';
    c.lineWidth = MID_W;
    c.beginPath();
    c.moveTo(s / 2 - DISC_R - MID_OUT, s / 2);
    c.lineTo(s / 2 + DISC_R + MID_OUT, s / 2);
    c.stroke();
  }

  /** The basket, sliding under the lanes at the character's feet. */
  private drawBasket(g: G): void {
    drawSprite(g, BASKET, this.basketX(), this.basketBottom - this.basketH / 2, this.basketH, {}, (c, w, hh) => {
      c.fillStyle = '#d9a35b';
      c.strokeStyle = '#7a4a1e';
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(0, -hh * 0.18, w * 0.48, hh * 0.14, 0, 0, Math.PI * 2);
      c.moveTo(-w * 0.48, -hh * 0.18);
      c.quadraticCurveTo(-w * 0.42, hh * 0.45, 0, hh * 0.45);
      c.quadraticCurveTo(w * 0.42, hh * 0.45, w * 0.48, -hh * 0.18);
      c.fill();
      c.stroke();
    });
  }

  /**
   * After a miss the bubble's line also stands by the letter that comes, halfway between the clouds
   * and the band: "wait" with a blinking pause sign while the letter glides into place, then "go on".
   */
  private drawStopLine(g: G): void {
    const r = this.recover, d = this.active?.d;
    if (!r || !d) return;
    const x = this.laneX(d.lane), y = (CLOUD_BOTTOM + this.band(d).top) / 2;
    if (r.phase === 'ready') return letterAt(g, t('rhythm.goOn'), x, y, 34, '#ffffff', '#3b2416', 7);
    letterAt(g, t('rhythm.hold'), x, y, 34, '#ffffff', '#3b2416', 7);
    if (Math.floor(this.blink / BLINK_S) % 2) return;
    // The pause sign over the word: two bars.
    g.save();
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#3b2416';
    g.lineWidth = 4;
    for (const dx of [-11, 11]) {
      g.beginPath();
      g.roundRect(x + dx - 6, y - 74, 12, 36, 3);
      g.stroke();
      g.fill();
    }
    g.restore();
  }

  /** The word after a catch, rising over the basket and fading. */
  private drawWord(g: G): void {
    const k = (this.songT - this.word.at) / WORD_S;
    if (k < 0 || k >= 1 || !this.word.text) return;
    g.save();
    g.globalAlpha = 1 - k * k;
    letterAt(g, this.word.text, this.basketX(), this.bandBottom - 40 - k * 30, 30, this.word.color, '#3b2416', 6);
    g.restore();
  }

  /** A caught letter dropping into the basket, which goes back to rest meanwhile. */
  private drawDroppingIn(g: G, f: Fall): void {
    const k = Math.min(1, (this.songT - f.caught!) / DROP_IN_S), x0 = this.laneX(f.d.lane);
    const x = x0 + (this.basketX() - x0) * k, y = f.caughtY + (this.basketBottom - this.basketH * 0.5 - f.caughtY) * k;
    this.scaled(g, x, y, () => this.drawRinged(g, f.d.letter, FINGER_COLORS[f.d.finger], x, y, 1 - k));
  }

  /**
   * The music's beat now: a short flash centred on each beat, as bright just before it as just after
   * (a flash that only fades after the beat looks late), a frame early for the time the picture takes to show.
   */
  private pulse(): number {
    const now = this.songT + PULSE_LEAD_S;
    const bars = this.song.bars;
    let bar = bars[0];
    for (const b of bars) if (b.start <= now) bar = b;
    if (now < bar.start - bar.beat / 2) return 0;
    const k = (((now - bar.start) / bar.beat) % 1 + 1) % 1;
    const off = Math.min(k, 1 - k) * bar.beat;
    return Math.exp(-((off / PULSE_S) ** 2));
  }

  /** The letter a lane's cloud carries now. */
  private cloudLetter(i: number): string {
    return laneNow(this.lanes, this.changes, i, this.songT).letter;
  }

  /** How far lane `i`'s letter change is now (0 to 1), null while none is going on. */
  private changing(i: number): number | null {
    const c = this.changes.find((x) => x.lane === i && x.at <= this.songT && this.songT < x.at + CHANGE_S);
    return c ? (this.songT - c.at) / CHANGE_S : null;
  }

  /** A lane's cloud with its letter; while the lane's letter changes, the old cloud fades out and a new one comes down. */
  private drawCloud(g: G, i: number): void {
    const x = this.laneX(i);
    const done = this.changes.filter((c) => c.lane === i && c.at <= this.songT).length;
    const k = this.changing(i);
    const look = (n: number) => ({ pic: (i * 2 + n * 3) % CLOUDS.length, flip: (i + n) % 2 === 1 });
    if (k !== null && k < 0.5) {
      // Fading out: the cloud before this change.
      const before = laneNow(this.lanes, this.changes, i, this.songT - CHANGE_S);
      return this.scaled(g, x, CLOUD_Y, () => this.cloudStamp(g, x, CLOUD_Y, before.letter, before.finger, look(done - 1), 1 - k * 2));
    }
    const come = k === null ? 1 : (k - 0.5) * 2;
    const now = laneNow(this.lanes, this.changes, i, this.songT);
    const y = CLOUD_Y - (1 - ease.outQuad(come)) * 70;
    this.scaled(g, x, CLOUD_Y, () => this.cloudStamp(g, x, y, now.letter, now.finger, look(done), come));
  }

  private cloudStamp(g: G, x: number, y: number, letter: string, finger: Finger, look: { pic: number; flip: boolean }, alpha: number): void {
    const name = CLOUDS[look.pic], img = sprite(name);
    const w = CLOUD_W, h = img ? (w * img.naturalHeight) / img.naturalWidth : w / 1.5;
    const color = FINGER_COLORS[finger];
    stamp(g, `cloud|${name}|${!!img}|${look.flip}|${letter}|${color}`, x, y, w + 8, h + 8, (c) => {
      drawSprite(c, name, w / 2 + 4, h / 2 + 4, h, { flip: look.flip }, (cc, ww, hh) => {
        cc.fillStyle = '#ffffff';
        cc.strokeStyle = '#8a6a55';
        cc.lineWidth = 3;
        for (const [dx, dy, r] of [[-0.25, 0.08, 0.3], [0.05, -0.08, 0.36], [0.3, 0.1, 0.26]]) {
          cc.beginPath();
          cc.arc(dx * ww, dy * hh, r * hh, 0, Math.PI * 2);
          cc.fill();
          cc.stroke();
        }
      });
      letterAt(c, letter, w / 2 + 4, h / 2 + 8, Math.min(CLOUD_LETTER, h * 0.7), color, '#3b2416', 7);
    }, alpha);
  }

  /** A falling letter: a white disc with a soft blurred edge, the letter dark on it, its middle line behind. */
  private drawSoft(g: G, letter: string, x: number, y: number): void {
    const s = (DISC_R + MID_OUT) * 2 + 4;
    stamp(g, `soft|${letter}`, x, y, s, s, (c) => {
      this.midLine(c, s);
      const glow = c.createRadialGradient(s / 2, s / 2, DISC_R * 0.7, s / 2, s / 2, DISC_R + 11);
      glow.addColorStop(0, 'rgba(255, 253, 246, 1)');
      glow.addColorStop(1, 'rgba(255, 253, 246, 0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, s, s);
      letterAt(c, letter, s / 2, s / 2 + 2, LETTER, '#3b2416', 'rgba(0,0,0,0)', 0);
    });
  }

  /** The next letter in the band: a white disc ringed in its lane's colour, its middle line behind. */
  private drawRinged(g: G, letter: string, color: string, x: number, y: number, alpha = 1): void {
    const s = (DISC_R + MID_OUT) * 2 + 4;
    stamp(g, `ring|${letter}|${color}`, x, y, s, s, (c) => {
      this.midLine(c, s);
      c.fillStyle = '#fffdf6';
      c.strokeStyle = color;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(s / 2, s / 2, DISC_R, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      letterAt(c, letter, s / 2, s / 2 + 2, LETTER, '#3b2416', 'rgba(0,0,0,0)', 0);
    }, alpha);
  }

  progress(): number {
    return this.over ? 1 : Math.min(0.99, this.songT / (this.song.roundS + 2));
  }

  get finished(): boolean {
    return this.over;
  }
}
