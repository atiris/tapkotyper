import { app, pickLine, profileLayout } from '../../app/app';
import { fast } from '../../app/fast';
import { audio } from '../../audio/audio';
import { BeatMusic } from '../../audio/beat-music';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { type G, drawSprite, fontFamily } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { fingerFor } from '../../keyboard/layouts';
import { recentAccuracy } from '../../learning/lessons';
import { localDate, recentTyping } from '../../learning/stats';
import { FINGER_COLORS } from '../../ui/finger-colors';
import { filterWords, isBlocked } from '../../words/words';
import { accuracyFill, fillRing, roundSvg, roundTextSvg } from '../../ui/hud';
import { h } from '../../ui/dom';
import { tip } from '../../ui/tooltip';
import {
  CHANGE_S, type Drop, IN_TIME, type Landing, type Lane, type LaneChange, PHRASE, RING_MIN, RING_WINDOW, Song,
  beatScore, judge, laneSetup, laneWeights, phraseStep, planChanges, rhythmWord, startTempo,
} from '../beat';
import { WORLDS, parrotKeys, rhythmLetters, rhythmTarget, storyOf } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { HeroMode, sideFeet } from './kit/hero';

/** Clouds: their middle's height, their width (a little wider than a lane, never over the lanes beside it) and the pictures (three, also drawn mirrored). */
const CLOUD_Y = 84;
const CLOUD_W = 106;
const CLOUDS = [1, 2, 3].map((n) => `obj-rhythm-cloud-${n}`);
/** Where a letter leaves its cloud. */
const FALL_TOP = CLOUD_Y + 14;
/** The basket's picture and its height. */
const BASKET = 'obj-rhythm-basket';
const BASKET_H = 50;
/** The catch band's lower edge: this share of the basket's height above its bottom. */
const BAND_AT = 2 / 3;
/** The band glows in the space bar's colour, which no finger lane uses. */
const BAND_COLOR = '255, 255, 255';
/** A falling letter's disc radius and its letter size, and the letter's size on its cloud. */
const DISC_R = 28;
const LETTER = 38;
const CLOUD_LETTER = 50;
/** Width of a lane's stripe, and the widest gap between two lanes. */
const STRIPE_W = 76;
const LANE_GAP = 170;
/** Seconds of the basket's slide under a lane, of a caught letter dropping in, a lane's flash, a feedback word. */
const SLIDE_S = 0.12;
const DROP_IN_S = 0.15;
const FLASH_S = 0.45;
const WORD_S = 0.9;
/** How often a catch shows a word over the basket: near the beat, and anywhere else in the band. */
const GREAT_SHARE = 0.5;
const GOOD_SHARE = 0.3;
/** After a miss: seconds everything stands still (the keys wait), and the most the next letter takes to glide into the band's middle. */
const HOLD_S = 0.9;
const GLIDE_S = 0.6;
/** Seconds the song plays on after its closing bar before the round ends, and how far ahead its notes are scheduled. */
const TAIL_S = 0.6;
const AHEAD_S = 0.25;
/** Speed of the background's middle strip. */
const SWAY = 2;

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

/** A phrase's count: letters due and caught, right and wrong keys. */
interface PhraseCount {
  due: number;
  caught: number;
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
  /** Letters caught, and caught in time (within `IN_TIME` of the beat). */
  caught = 0;
  inTime = 0;
  /** The highest tempo held for a whole phrase, and whether a phrase at the world's target tempo went accurately. */
  held = 0;
  reached = false;
  private toldWait = false;
  /**
   * After a miss: everything stands still ('hold'), then the next letter glides into the band's
   * middle ('glide', song time runs on to its beat at `speed`), where the song waits for its key ('ready').
   */
  private recover: { phase: 'hold' | 'glide' | 'ready'; left: number; speed: number } | null = null;
  /** The basket's slide: from which x to which lane (null: the middle), from when to when (song seconds). */
  private basket: { from: number; lane: number | null; at: number; end: number };
  private flash: number[];
  /** The word over the basket after a catch, and when it came. */
  private word = { text: '', at: -9 };
  private hudAt = 0;
  private accEl = h('div', { class: 'round-btn accuracy', role: 'img' });
  private beatEl = h('div', { class: 'round-btn place beat-ring', role: 'img' });
  private tempoEl = h('div', { class: 'round-btn speed tempo-ring', role: 'img' });
  private shown = { acc: '', beat: '', tempo: '' };
  private readonly target: number;
  private over = false;

  constructor(L: LevelRuntime) {
    super(L);
    const p = app.profile!;
    this.world = WORLDS[L.def.world];
    this.heroY = sideFeet(this.world, VH * 0.95);
    const lay = profileLayout(p);
    let letters = rhythmLetters(p, L.def.world);
    if (letters.length < 2) letters = parrotKeys(p, L.def.world);
    this.lanes = laneSetup(letters, (ch) => fingerFor(lay, ch));
    const roundS = fast(180);
    this.changes = planChanges(this.lanes, storyOf(L.def.world).tier + 1, roundS);
    const tempo = startTempo(p.progress.rhythm[L.def.world], recentTyping(p, 14).cpm, localDate());
    const weights = laneWeights(this.lanes.map((l) => recentAccuracy(p.stats.keys[l.letters[0]])));
    // Words of the lanes' letters only, from the child's word language.
    const all = new Set(this.lanes.flatMap((l) => l.letters));
    const words = filterWords(app.words[p.settings.wordLang] ?? [], all, [2, 6]).filter((w) => !isBlocked(w));
    this.song = new Song({ lanes: this.lanes, changes: this.changes, weights, tempo, rand: () => L.rng.next(), roundS, words });
    this.target = rhythmTarget(L.def.world);
    this.flash = this.lanes.map(() => -9);
    this.basket = { from: this.L.vw / 2, lane: null, at: -1, end: -1 };
    stamps.clear();
  }

  startLine(): string {
    return t('rhythm.start');
  }

  rings(): HTMLElement[] {
    this.paintHud();
    return [this.accEl, this.beatEl, this.tempoEl];
  }

  /** The tempo playing now, letters a minute. */
  get tempo(): number {
    return this.song.phrases[this.dueDrop?.phrase ?? 0].tempo;
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

  /** The middle of lane `i`: the lanes spread over the middle of the stage. */
  private laneX(i: number): number {
    const n = this.lanes.length;
    const gap = Math.min(LANE_GAP, (this.L.vw * 0.6) / Math.max(1, n - 1));
    return this.L.vw / 2 + (i - (n - 1) / 2) * gap;
  }

  /** The basket's bottom: at the character's feet. */
  private get basketBottom(): number {
    return this.heroY - 4;
  }

  /** The catch band's lower edge: it stays there while the band grows upwards. */
  private get bandBottom(): number {
    return this.basketBottom - BASKET_H * BAND_AT;
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

  /** The step of the phrase playing, on its letters resolved so far. */
  private decide(): -1 | 0 | 1 {
    const c = this.counts[this.song.phrases.length - 1];
    if (!c || !c.due) return 0;
    return phraseStep(c.ok + c.wrong ? c.ok / (c.ok + c.wrong) : 1, c.caught / c.due);
  }

  private count(phrase: number): PhraseCount {
    return (this.counts[phrase] ??= { due: 0, caught: 0, ok: 0, wrong: 0 });
  }

  update(dt: number): void {
    super.update(dt);
    this.scroll += dt * SWAY;
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
      this.paintHud();
    }
    if (this.song.closed && !this.active && this.songT >= this.song.end + TAIL_S) this.over = true;
  }

  /** Song seconds for `dt` real ones: none while everything stands still after a miss, faster while the next letter glides into the band. */
  private advance(dt: number): number {
    const r = this.recover;
    if (!r || r.phase === 'ready') return dt;
    if (r.phase === 'hold') {
      if ((r.left -= dt) > 0) return 0;
      const a = this.active;
      const gap = a ? Math.max(0, a.d.land - this.songT) : 0;
      r.phase = 'glide';
      r.speed = Math.max(1, gap / GLIDE_S);
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
      this.tell(t('rhythm.hold'), 2);
    }
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

  private slideTo(lane: number): void {
    if (this.basket.lane === lane && this.songT >= this.basket.end) return;
    const end = this.L.reduceMotion ? this.songT : this.songT + SLIDE_S;
    this.basket = { from: this.basketX(), lane, at: this.songT, end };
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
    this.ok++;
    const c = this.count(f.d.phrase);
    c.ok++;
    c.caught++;
    const near = Math.abs(offset) <= IN_TIME * T;
    if (near) {
      this.inTime++;
      this.happy();
      this.L.particles.emit(this.laneX(f.d.lane), this.bandBottom, 6, 'sparkle', ['#ffd54a', '#fff3b0'], 90, 9, 0.6);
    }
    if (this.L.rng.next() < (near ? GREAT_SHARE : GOOD_SHARE)) this.word = { text: pickLine(near ? 'rhythm.great' : 'rhythm.good'), at: this.songT };
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
    const to = lane === null ? this.L.vw / 2 : this.laneX(lane);
    if (this.songT >= end) return to;
    return from + (to - from) * ease.outQuad(Math.max(0, (this.songT - at) / (end - at)));
  }

  /** The top bar: accuracy and rhythm (a check at 100) and the tempo as the wave's ring. */
  private paintHud(): void {
    const acc = Math.round(this.accuracy * 100);
    if (`${acc}` !== this.shown.acc) {
      this.shown.acc = `${acc}`;
      const band = acc < 80 ? 'low' : acc < 90 ? 'mid' : 'high';
      this.accEl.className = `round-btn accuracy acc-${band}`;
      const ring = fillRing(accuracyFill(this.accuracy));
      this.accEl.innerHTML = acc === 100 ? roundSvg('check', ring) : roundTextSvg(`${acc}`, ring);
      this.label(this.accEl, t('rhythm.accuracy', { n: acc }));
    }
    const recent = this.landings.slice(-RING_WINDOW);
    const beat = this.L.noPressure ? null : beatScore(recent, this.accuracy, RING_MIN);
    if (`${beat}` !== this.shown.beat) {
      this.shown.beat = `${beat}`;
      const ring = fillRing(beat === null ? 0 : beat / 100);
      this.beatEl.innerHTML = beat === 100 ? roundSvg('check', ring) : roundTextSvg(beat === null ? '…' : `${beat}`, ring);
      this.label(this.beatEl, beat === null ? t('rhythm.listening') : t('rhythm.ring', { n: beat, word: t(`rhythm.words.${rhythmWord(beat)}`) }));
    }
    const tempo = this.tempo;
    if (`${tempo}` !== this.shown.tempo) {
      this.shown.tempo = `${tempo}`;
      this.tempoEl.innerHTML = roundSvg('wave', fillRing(tempo / 120));
      this.label(this.tempoEl, t('rhythm.tempo', { n: tempo }));
    }
  }

  private label(el: HTMLElement, text: string): void {
    tip(el, text);
    el.setAttribute('aria-label', text);
  }

  render(g: G): void {
    const a = this.active;
    this.lanes.forEach((lane, i) => {
      const x = this.laneX(i);
      const flash = Math.max(0, 1 - (this.songT - this.flash[i]) / FLASH_S);
      g.save();
      g.globalAlpha = 0.26 + (a?.d.lane === i ? 0.1 : 0) + 0.3 * flash;
      g.fillStyle = FINGER_COLORS[lane.finger];
      g.fillRect(x - STRIPE_W / 2, CLOUD_Y + 30, STRIPE_W, VH - CLOUD_Y - 30);
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
      const color = FINGER_COLORS[this.lanes[f.d.lane].finger];
      const inBand = f === a && judge(this.songT, f.d.land, f.d.T, f.d.w) === 'catch';
      if (inBand) this.drawRinged(g, f.d.letter, color, x, y);
      else this.drawSoft(g, f.d.letter, x, y);
    }
    this.drawHero(g);
    this.drawBasket(g);
    this.drawWord(g);
    this.drawStopLine(g);
  }

  /** The glowing catch band behind the basket, across the lanes, a little brighter on the beat. */
  private drawBand(g: G): void {
    const d = this.dueDrop;
    if (!d) return;
    const { top, bottom } = this.band(d);
    const left = this.laneX(0) - STRIPE_W, right = this.laneX(this.lanes.length - 1) + STRIPE_W;
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
    g.restore();
  }

  /** The basket, sliding under the lanes at the character's feet. */
  private drawBasket(g: G): void {
    drawSprite(g, BASKET, this.basketX(), this.basketBottom - BASKET_H / 2, BASKET_H, {}, (c, w, hh) => {
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

  /** After a miss the bubble's line also stands over the band, by the letter that comes: "wait", then "go on". */
  private drawStopLine(g: G): void {
    const r = this.recover, d = this.active?.d;
    if (!r || !d) return;
    letterAt(g, t(r.phase === 'ready' ? 'rhythm.goOn' : 'rhythm.hold'), this.laneX(d.lane), this.band(d).top - 34, 34, '#ffffff', '#3b2416', 7);
  }

  /** The word after a catch, rising over the basket and fading. */
  private drawWord(g: G): void {
    const k = (this.songT - this.word.at) / WORD_S;
    if (k < 0 || k >= 1 || !this.word.text) return;
    g.save();
    g.globalAlpha = 1 - k * k;
    letterAt(g, this.word.text, this.basketX(), this.bandBottom - 40 - k * 30, 30, '#ffffff', '#3b2416', 6);
    g.restore();
  }

  /** A caught letter dropping into the basket. */
  private drawDroppingIn(g: G, f: Fall): void {
    const k = Math.min(1, (this.songT - f.caught!) / DROP_IN_S);
    const x = this.laneX(f.d.lane), y = f.caughtY + (this.basketBottom - BASKET_H * 0.5 - f.caughtY) * k;
    this.drawRinged(g, f.d.letter, FINGER_COLORS[this.lanes[f.d.lane].finger], x, y, 1 - k);
  }

  /** The music's beat now: 1 on a beat, fading to 0 before the next. */
  private pulse(): number {
    const bars = this.song.bars;
    let bar = bars[0];
    for (const b of bars) if (b.start <= this.songT) bar = b;
    if (this.songT < bar.start) return 0;
    const k = ((this.songT - bar.start) / bar.beat) % 1;
    return (1 - k) ** 2;
  }

  /** The letter a lane's cloud carries now. */
  private cloudLetter(i: number): string {
    const done = this.changes.filter((c) => c.lane === i && c.at <= this.songT);
    return done.length ? done[done.length - 1].letter : this.lanes[i].letters[0];
  }

  /** A lane's cloud with its letter; while the lane's letter changes, the old cloud dissolves and a new one comes down. */
  private drawCloud(g: G, i: number): void {
    const x = this.laneX(i);
    const changes = this.changes.filter((c) => c.lane === i);
    const done = changes.filter((c) => c.at <= this.songT);
    const now = done[done.length - 1];
    const k = now ? (this.songT - now.at) / CHANGE_S : 1;
    const look = (n: number) => ({ pic: (i * 2 + n * 3) % CLOUDS.length, flip: (i + n) % 2 === 1 });
    const letter = (n: number) => (n ? done[n - 1].letter : this.lanes[i].letters[0]);
    if (now && k < 0.5) {
      // Dissolving: the cloud before this change fades as it swells.
      return this.cloudStamp(g, x, CLOUD_Y, letter(done.length - 1), look(done.length - 1), i, 1 - k * 2);
    }
    const come = now && k < 1 ? (k - 0.5) * 2 : 1;
    this.cloudStamp(g, x, CLOUD_Y - (1 - ease.outQuad(come)) * 70, letter(done.length), look(done.length), i, come);
  }

  private cloudStamp(g: G, x: number, y: number, letter: string, look: { pic: number; flip: boolean }, lane: number, alpha: number): void {
    const name = CLOUDS[look.pic], img = sprite(name);
    const w = CLOUD_W, h = img ? (w * img.naturalHeight) / img.naturalWidth : w / 1.5;
    const color = FINGER_COLORS[this.lanes[lane].finger];
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

  /** A falling letter: a white disc with a soft blurred edge, the letter dark on it. */
  private drawSoft(g: G, letter: string, x: number, y: number): void {
    const s = DISC_R * 2 + 24;
    stamp(g, `soft|${letter}`, x, y, s, s, (c) => {
      const glow = c.createRadialGradient(s / 2, s / 2, DISC_R * 0.7, s / 2, s / 2, DISC_R + 11);
      glow.addColorStop(0, 'rgba(255, 253, 246, 1)');
      glow.addColorStop(1, 'rgba(255, 253, 246, 0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, s, s);
      letterAt(c, letter, s / 2, s / 2 + 2, LETTER, '#3b2416', 'rgba(0,0,0,0)', 0);
    });
  }

  /** The next letter in the band: a white disc ringed in its lane's colour. */
  private drawRinged(g: G, letter: string, color: string, x: number, y: number, alpha = 1): void {
    const s = DISC_R * 2 + 8;
    stamp(g, `ring|${letter}|${color}`, x, y, s, s, (c) => {
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
