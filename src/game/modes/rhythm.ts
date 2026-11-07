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
import { accuracyFill, fillRing, roundTextSvg } from '../../ui/hud';
import { h } from '../../ui/dom';
import { tip } from '../../ui/tooltip';
import {
  CHANGE_S, type Drop, IN_TIME, type Landing, type Lane, type LaneChange, PHRASE, RING_MIN, RING_WINDOW, Song, ZONE_AFTER, ZONE_BEFORE,
  basketFill, beatScore, judge, laneSetup, laneWeights, phraseStep, planChanges, rhythmWord, startTempo,
} from '../beat';
import { WORLDS, parrotKeys, rhythmLetters, rhythmTarget, storyOf } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { HeroMode, sideFeet } from './kit/hero';

/** Clouds: their middle's height, their picture's height and the pictures (five, also drawn mirrored). */
const CLOUD_Y = 84;
const CLOUD_H = 100;
const CLOUDS = [1, 2, 3, 4, 5].map((n) => `obj-rhythm-cloud-${n}`);
/** The basket's five fill levels, its height, and where its rim lies in the picture (share of its height from the top). */
const BASKETS = [0, 1, 2, 3, 4].map((n) => `obj-rhythm-basket-${n}`);
const BASKET_H = 118;
const RIM_AT = 0.32;
/** Where Tapko holds the basket's rim, above his feet (share of his height). */
const HOLD_AT = 0.36;
/** A falling letter's disc radius, its letter size, and the letter's size on its cloud. */
const DISC_R = 30;
const LETTER = 40;
const CLOUD_LETTER = 50;
/** The next letter is the runtime's word label, this big. */
const LABEL = 58;
/** Width of a lane's stripe, and the widest gap between two lanes. */
const STRIPE_W = 76;
const LANE_GAP = 200;
/** Seconds of Tapko's dash under a lane, of a bounce off his basket, a splat on the ground, a wait blink, a lane's flash after a wrong key. */
const DASH_S = 0.16;
const BOUNCE_S = 0.5;
const SPLAT_S = 0.8;
const BLINK_S = 0.35;
const FLASH_S = 0.45;
/** Seconds the song plays on after its closing bar before the round ends, and how far ahead its notes are scheduled. */
const TAIL_S = 0.6;
const AHEAD_S = 0.25;
/** Speed of the background's middle strip. */
const SWAY = 2;

/** One letter in play: its drop, its target while it is the next one, and what became of it (song seconds). */
interface Fall {
  d: Drop;
  tg: Target | null;
  /** When it was caught, or null. */
  caught: number | null;
  /** The zone passed without a catch. */
  missed: boolean;
  /** It reached the basket (the basket counts it). */
  inBasket: boolean;
  /** A missed letter bounces off Tapko's basket to this side (-1, 1), or 0. */
  bounce: number;
  /** It splatted on the ground then, or null. */
  splat: number | null;
  /** The right key came too early then (it blinks). */
  blink: number;
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
 * Rytmus: letters fall from the lane clouds, one lane per finger in its colour, and exactly one lands
 * on each beat of the music. The right key in the catch window around the landing makes Tapko dash
 * under the lane and the letter drops into his basket with a note; earlier it only blinks, any other
 * key is an error; an uncaught letter splats on the ground. The tempo steps between phrases of
 * sixteen landings; the round is three minutes of song (`.specify/game/rhythm.md`).
 */
export class RhythmMode extends HeroMode {
  readonly world: string;
  readonly scene = false;
  readonly midOnly = true;
  readonly phraseWords = 1;
  readonly ownMusic = true;
  readonly doneSfx = null;
  readonly pictures = [...CLOUDS, ...BASKETS];
  readonly lanes: Lane[];
  readonly changes: LaneChange[];
  readonly song: Song;
  private music = new BeatMusic();
  private falls: Fall[] = [];
  /** The next letter to land (the first not caught or missed). */
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
  /** Letters a round at its start tempo brings: the basket is full at about all of them. */
  private planned: number;
  private toldWait = false;
  /** Tapko's dash: from where to where, from when to when (song seconds). */
  private dash = { from: 0, to: 0, at: -1, end: -1 };
  private flash: number[];
  private hudAt = 0;
  private accEl = h('div', { class: 'round-btn accuracy', role: 'img' });
  private beatEl = h('div', { class: 'round-btn place beat-ring', role: 'img' });
  private tempoEl = h('div', { class: 'round-btn place tempo-ring', role: 'img' });
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
    this.song = new Song({ lanes: this.lanes, changes: this.changes, weights, tempo, rand: () => L.rng.next(), roundS });
    this.planned = Math.round((roundS * tempo) / 60);
    this.target = rhythmTarget(L.def.world);
    this.flash = this.lanes.map(() => -9);
    this.dash.from = this.dash.to = this.heroX = this.laneX(this.lanes.findIndex((l) => l.finger > 4) || 0);
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
    const d = this.falls[this.cur]?.d ?? this.song.drops[this.song.drops.length - 1];
    return this.song.phrases[d?.phrase ?? 0].tempo;
  }

  /** Right keys of all keys pressed (early ones do not count); 1 before any. */
  get accuracy(): number {
    return this.ok + this.wrong ? this.ok / (this.ok + this.wrong) : 1;
  }

  /** Letters due so far (caught or missed). */
  get due(): number {
    return this.landings.length;
  }

  /** The round's rhythm (0-100), null with too few landings or without time pressure. */
  get score(): number | null {
    return this.L.noPressure ? null : beatScore(this.landings, this.accuracy);
  }

  /** The basket's fill picture now (0-4). */
  get fill(): number {
    return basketFill(this.caught, this.planned);
  }

  /** The middle of lane `i`: the lanes spread over the middle of the stage. */
  private laneX(i: number): number {
    const n = this.lanes.length;
    const gap = Math.min(LANE_GAP, (this.L.vw * 0.7) / Math.max(1, n - 1));
    return this.L.vw / 2 + (i - (n - 1) / 2) * gap;
  }

  /** The basket's rim: where letters land. */
  private get rimY(): number {
    return this.heroY - this.heroSize * HOLD_AT;
  }

  private get groundY(): number {
    return this.heroY - 6;
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
    // Without time pressure the song waits while the due letter sits on the basket's rim.
    const next = this.songT + dt;
    this.songT = this.L.noPressure && a && a.caught === null && next > a.d.land ? Math.max(this.songT, a.d.land) : next;
    this.perfAt = performance.now();
    this.song.tick(this.songT, () => this.decide());
    while (this.falls.length < this.song.drops.length) this.falls.push({ d: this.song.drops[this.falls.length], tg: null, caught: null, missed: false, inBasket: false, bounce: 0, splat: null, blink: -9 });
    // The window passed: the letter is missed (no error), the next one is due.
    for (let f = this.active; f && f.caught === null && !this.L.noPressure && this.songT > f.d.land + ZONE_AFTER * f.d.T; f = this.active) this.miss(f);
    for (const f of this.falls) this.settle(f);
    const now = this.active;
    if (now && !now.tg && this.songT >= now.d.release) now.tg = this.L.core.add(now.d.letter, {});
    const o = audio.beatOut();
    if (o) this.music.schedule(o, this.song.bars, this.songT, this.songT + AHEAD_S, this.perf);
    this.heroX = this.tapkoX();
    if ((this.hudAt -= dt) <= 0) {
      this.hudAt = 0.25;
      this.paintHud();
    }
    if (this.song.closed && !this.active && this.songT >= this.song.end + TAIL_S) this.over = true;
  }

  /** A caught letter reaches the basket on its landing; a missed one splats when it reaches the ground. */
  private settle(f: Fall): void {
    if (f.caught !== null && !f.inBasket && this.songT >= Math.max(f.d.land, f.caught)) {
      f.inBasket = true;
      this.caught++;
    }
    if (f.missed && f.splat === null && this.fallY(f) >= this.groundY) {
      f.splat = this.songT;
      this.L.sfx('plop');
    }
  }

  private miss(f: Fall): void {
    f.missed = true;
    if (f.tg) this.L.core.release(f.tg);
    this.L.core.prune();
    const x = this.laneX(f.d.lane);
    if (!this.L.reduceMotion && Math.abs(this.tapkoX() - x) < 70) f.bounce = x <= this.tapkoX() ? -1 : 1;
    this.surprised(0.7);
    this.resolve(f, null);
  }

  /** A letter is caught (offset from its landing, seconds) or missed (null): the beat measure and the phrase count take it, the next one is due. */
  private resolve(f: Fall, offset: number | null): void {
    const c = this.count(f.d.phrase);
    c.due++;
    this.landings.push({ offset, T: f.d.T });
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

  waitKey(ch: string, at: number): boolean {
    const f = this.active;
    if (!f?.tg || ch !== f.d.letter || judge(this.songAt(at), f.d.land, f.d.T) !== 'early') return false;
    f.blink = this.songT;
    if (!this.toldWait) {
      this.toldWait = true;
      this.L.say(t('rhythm.wait'), 4);
    }
    return true;
  }

  onKey(_expected: string, _ok: boolean, _rt: number, at: number): void {
    this.keyAt = at;
  }

  onDone(tg: Target): void {
    const f = this.active;
    if (!f || f.tg !== tg) return;
    const T = f.d.T;
    const at = this.songAt(this.keyAt);
    const offset = Math.max(-ZONE_BEFORE * T, Math.min(ZONE_AFTER * T, at - f.d.land));
    f.caught = f.d.land + offset;
    this.ok++;
    const c = this.count(f.d.phrase);
    c.ok++;
    c.caught++;
    if (Math.abs(offset) <= IN_TIME * T) {
      this.inTime++;
      this.happy();
      this.L.particles.emit(this.laneX(f.d.lane), this.rimY - 20, 6, 'sparkle', ['#ffd54a', '#fff3b0'], 90, 9, 0.6);
    }
    // Tapko dashes under the lane, there by the landing (or at once after it).
    const from = this.tapkoX(), to = this.laneX(f.d.lane);
    const end = Math.max(this.songT + 0.05, Math.min(f.d.land, this.songT + DASH_S));
    this.dash = { from, to, at: this.songT, end: this.L.reduceMotion ? this.songT : end };
    const o = audio.beatOut();
    if (o) this.music.bell(o, this.song.bars, Math.max(f.d.land, this.songT), this.perf);
    this.L.core.prune();
    this.resolve(f, offset);
  }

  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    const f = this.active;
    if (!f) return;
    this.wrong++;
    this.count(f.d.phrase).wrong++;
    this.flash[f.d.lane] = this.songT;
  }

  /** Tapko's x: on his way under a lane, or where his last dash ended. */
  private tapkoX(): number {
    const { from, to, at, end } = this.dash;
    if (this.songT >= end) return to;
    return from + (to - from) * ease.outQuad(Math.max(0, (this.songT - at) / (end - at)));
  }

  /** How high a letter is now: from its cloud down to the basket's rim at its landing, on at the same speed below. */
  private fallY(f: Fall): number {
    const top = CLOUD_Y + 14, rim = this.rimY - 8;
    const k = (this.songT - f.d.release) / (f.d.land - f.d.release);
    return top + (rim - top) * k;
  }

  /** Where a letter is drawn: in its lane, a missed one bouncing off the basket first. */
  private fallAt(f: Fall): { x: number; y: number } {
    const x = this.laneX(f.d.lane), y = Math.min(this.groundY, this.fallY(f));
    if (!f.bounce || this.songT <= f.d.land) return { x, y };
    const k = Math.min(1, (this.songT - f.d.land) / BOUNCE_S);
    const rim = this.rimY - 8;
    return { x: x + f.bounce * 110 * k, y: Math.min(this.groundY, k < 1 ? rim - Math.sin(Math.PI * k) * 60 + (this.groundY - rim) * k * k : this.fallY(f)) };
  }

  /** The top bar: accuracy, rhythm (over the last landings; "listening" before enough) and the tempo. */
  private paintHud(): void {
    const acc = Math.round(this.accuracy * 100);
    if (`${acc}` !== this.shown.acc) {
      this.shown.acc = `${acc}`;
      const band = acc < 80 ? 'low' : acc < 90 ? 'mid' : 'high';
      this.accEl.className = `round-btn accuracy acc-${band}`;
      this.accEl.innerHTML = roundTextSvg(`${acc}`, fillRing(accuracyFill(this.accuracy)));
      this.label(this.accEl, t('rhythm.accuracy', { n: acc }));
    }
    const recent = this.landings.slice(-RING_WINDOW);
    const beat = this.L.noPressure ? null : beatScore(recent, this.accuracy, RING_MIN);
    if (`${beat}` !== this.shown.beat) {
      this.shown.beat = `${beat}`;
      this.beatEl.innerHTML = roundTextSvg(beat === null ? '…' : `${beat}`, fillRing(beat === null ? 0 : beat / 100));
      this.label(this.beatEl, beat === null ? t('rhythm.listening') : t('rhythm.ring', { n: beat, word: t(`rhythm.words.${rhythmWord(beat)}`) }));
    }
    const tempo = this.tempo;
    if (`${tempo}` !== this.shown.tempo) {
      this.shown.tempo = `${tempo}`;
      this.tempoEl.innerHTML = roundTextSvg(`${tempo}`, fillRing(tempo / 120));
      this.label(this.tempoEl, t('rhythm.tempo', { n: tempo }));
    }
  }

  private label(el: HTMLElement, text: string): void {
    tip(el, text);
    el.setAttribute('aria-label', text);
  }

  render(g: G): void {
    const pulse = this.L.reduceMotion ? 0 : this.pulse();
    const rim = this.rimY, top = CLOUD_Y + 30;
    const a = this.active;
    this.lanes.forEach((lane, i) => {
      const x = this.laneX(i), color = FINGER_COLORS[lane.finger];
      const flash = Math.max(0, 1 - (this.songT - this.flash[i]) / FLASH_S);
      g.save();
      g.globalAlpha = 0.16 + (a?.d.lane === i ? 0.1 : 0) + 0.25 * flash;
      g.fillStyle = color;
      g.fillRect(x - STRIPE_W / 2, top, STRIPE_W, rim - top);
      // The landing spot on the rim's height, beating with the music.
      g.globalAlpha = 0.45 + 0.4 * pulse;
      g.beginPath();
      g.ellipse(x, rim, STRIPE_W / 2, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
    this.lanes.forEach((_, i) => this.drawCloud(g, i));
    for (let k = Math.max(0, this.cur - 12); k < this.falls.length; k++) {
      const f = this.falls[k];
      if (this.songT < f.d.release || f.inBasket) continue;
      if (f.splat !== null) {
        this.drawSplat(g, f);
        continue;
      }
      const { x, y } = this.fallAt(f);
      if (f === a && f.tg) {
        // The next letter: the word label, a soft white ring while it blinks "wait".
        const blink = this.songT - f.blink < BLINK_S ? 1 - (this.songT - f.blink) / BLINK_S : 0;
        if (blink > 0) {
          g.save();
          g.globalAlpha = blink;
          g.strokeStyle = '#ffffff';
          g.lineWidth = 6;
          g.beginPath();
          g.arc(x, y, DISC_R + 14 + (1 - blink) * 10, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }
        this.L.label(g, f.tg, x, y, LABEL);
      } else this.drawLetter(g, f.d.letter, FINGER_COLORS[this.lanes[f.d.lane].finger], x, y);
    }
    this.drawHero(g);
    const bx = this.tapkoX(), by = rim - BASKET_H * RIM_AT;
    drawSprite(g, BASKETS[this.fill], bx, by + BASKET_H / 2, BASKET_H, {}, (c, w, hh) => {
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

  /** The music's beat now: 1 on a beat, fading to 0 before the next. */
  private pulse(): number {
    const bars = this.song.bars;
    let bar = bars[0];
    for (const b of bars) if (b.start <= this.songT) bar = b;
    if (this.songT < bar.start) return 0;
    const k = ((this.songT - bar.start) / bar.beat) % 1;
    return (1 - k) ** 2;
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
    const w = img ? (CLOUD_H * img.naturalWidth) / img.naturalHeight : CLOUD_H * 1.6;
    const color = FINGER_COLORS[this.lanes[lane].finger];
    stamp(g, `cloud|${name}|${!!img}|${look.flip}|${letter}|${color}`, x, y, w + 8, CLOUD_H + 8, (c) => {
      drawSprite(c, name, w / 2 + 4, CLOUD_H / 2 + 4, CLOUD_H, { flip: look.flip }, (cc, ww, hh) => {
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
      letterAt(c, letter, w / 2 + 4, CLOUD_H / 2 + 8, CLOUD_LETTER, color, '#3b2416', 7);
    }, alpha);
  }

  /** A falling letter: a white disc ringed in its lane's colour, the letter dark on it. */
  private drawLetter(g: G, letter: string, color: string, x: number, y: number): void {
    const s = DISC_R * 2 + 8;
    stamp(g, `drop|${letter}|${color}`, x, y, s, s, (c) => {
      c.fillStyle = '#fffdf6';
      c.strokeStyle = color;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(s / 2, s / 2, DISC_R, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      letterAt(c, letter, s / 2, s / 2 + 2, LETTER, '#3b2416', 'rgba(0,0,0,0)', 0);
    });
  }

  /** A missed letter flat on the ground in its lane's colour, fading. */
  private drawSplat(g: G, f: Fall): void {
    const k = (this.songT - f.splat!) / SPLAT_S;
    if (k >= 1) return;
    const { x } = this.fallAt(f);
    g.save();
    g.globalAlpha = 1 - k;
    g.fillStyle = FINGER_COLORS[this.lanes[f.d.lane].finger];
    g.beginPath();
    g.ellipse(x, this.groundY, DISC_R * (1.3 + 0.4 * k), DISC_R * 0.32, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  progress(): number {
    return this.over ? 1 : Math.min(0.99, this.songT / (this.song.roundS + 2));
  }

  get finished(): boolean {
    return this.over;
  }
}
