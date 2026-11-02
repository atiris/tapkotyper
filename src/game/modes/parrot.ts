import { app, pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { drawSprite, type G } from '../../gfx/draw';
import { ease } from '../../engine/tween';
import { t } from '../../i18n/i18n';
import { LAYOUTS } from '../../keyboard/layouts';
import type { Profile } from '../../storage/schema';
import { WordSource } from '../../words/words';
import { BEAT_S, FLAP } from '../../ui/parrot-visit';
import { WORLDS, parrotKeys, parrotSizeOf, storyOf } from '../levels';
import { Mode, TAPKO_FEET, TAPKO_X } from '../mode';
import { sideFeet } from './kit/hero';
import { MISS_ADD_S, PARROT_MAX_S, PARROT_MIN_S, ParrotRound, parrotPatience } from '../parrots';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

/** Height of the parrot on its perch and of the perch; the perch stands on the ground where Tapko's feet are. */
const PARROT_H = 190;
const PERCH_H = 165;
const GROUND_Y = VH * 0.953;
/** The parrot's claws in its picture (it faces right there, it is drawn mirrored), and the top of the perch's bar above the post, as shares of the pictures. */
const CLAW_X = 0.64;
const CLAW_Y = 0.71;
const BAR_Y = 0.12;
/** Seconds and height of the parrot's hop when it repeats a word, every HOP_EVERY words. */
const HOP = 0.45;
const HOP_UP = 12;
const HOP_EVERY = 3;
/** Seconds the parrot's repeat stays up. */
const REPEAT_S = 2.7;
const WORD_SIZE = 64;
/** The mistake that sends the parrot on a short flight round the scene, the seconds of that flight and how high it rises. */
const SLIP_FLIGHT_AT = 3;
const ROUND_S = 5.1;
const ROUND_UP = 110;
/** Seconds the parrot waits after its last line before it flies off, and of its flight off the scene. */
const OFF_WAIT = 1.65;
const OFF_S = 2.7;
/** Height of the flying parrot. */
const FLY_H = 170;
/** A learned round: seconds after the last word before the parrot praises, then says it is coming, then flies down to Tapko and sits on the grass by him a while. */
const PRAISE_AT = 1.2;
const LINE_S = 1.6;
const HOME_S = 2.2;
const SIT_S = 1.4;
/** Where the parrot sits by Tapko, right of his middle, and how high its flight there rises. */
const SIT_DX = 125;
const HOME_UP = 120;
/** Speed of the background's middle strip. */
const SWAY = 2;

/**
 * The parrot's words for one round: the world's last level keys, the round's length range, all
 * different and with different first letters where the keys allow; new ones each play.
 */
export function parrotWords(p: Profile, world: number, seed?: number): string[] {
  const size = parrotSizeOf(world);
  const src = new WordSource(app.words[p.settings.wordLang], {
    keys: parrotKeys(p, world), len: size.len, noDiacritics: p.settings.noDiacritics, layout: LAYOUTS[p.layout], seed,
  });
  const words: string[] = [];
  for (let i = 0; words.length < size.words && i < 60; i++) {
    const w = src.next(new Set(i < 30 ? words.map((x) => x[0]) : []), size.len[1]);
    if (!words.includes(w) && w.length >= size.len[0]) words.push(w);
  }
  // A tiny key set may give fewer: shorter ones fill up.
  for (let i = 0; words.length < size.words && i < 60; i++) {
    const w = src.next(new Set(), size.len[1]);
    if (!words.includes(w)) words.push(w);
  }
  return words;
}

/** The parrot leaves its perch: a short flight round the scene and back, off for good, or down to Tapko. `t` below 0 still waits on the perch. */
interface Flight {
  kind: 'round' | 'off' | 'home';
  t: number;
}

/**
 * The parrot: Tapko says a word, the child types it, and the parrot on its perch repeats it. The
 * words come in pairs, each pair twice (A B A B C D C D ...), round the list for the round's time
 * (`PARROT_MIN_S`, each mistake `MISS_ADD_S` more up to `PARROT_MAX_S`), ending with a whole pair.
 * The first half measures each word's speed, the second half tries to beat it. The third mistake
 * sends the parrot on a short flight; more than `parrotPatience` and it flies off, which ends the
 * round lost. A won round ends with the parrot's praise, its "I am coming" and its flight down to
 * Tapko, where it sits on the grass by him, before the results. No stars.
 */
export class ParrotMode extends Mode {
  readonly pictures = ['ui-act-parrot', 'obj-parrot-perch', ...new Set(FLAP)];
  readonly world: string;
  readonly tapkoFeet: number;
  readonly phraseWords = 1;
  readonly midOnly = true;
  readonly round: ParrotRound;
  private current: Target | null = null;
  private pop = 0;
  private hop = 0;
  private told2 = false;
  /** Seconds of play when the second half starts; set at the start. */
  private half = Infinity;
  /** Seconds the mistakes added to the round. */
  private extra = 0;
  /** Mode time of the current word's first key. */
  private firstAt = 0;
  /** Each word's best letters a second in the first half, and the words beaten in the second. */
  private best = new Map<string, number>();
  readonly beaten = new Set<string>();
  private repeats = 0;
  private mistakes = 0;
  private readonly patience: number;
  private flight: Flight | null = null;
  /** The parrot flew off after too many mistakes. */
  flewOff = false;
  /** Right keys and seconds of play in each half, from the first key on: the speed of the measuring and of the beating. */
  private keys = [0, 0];
  private seconds = [0, 0];

  constructor(L: LevelRuntime) {
    super(L);
    this.world = WORLDS[L.def.world];
    this.tapkoFeet = sideFeet(this.world, TAPKO_FEET);
    this.round = new ParrotRound(parrotWords(app.profile!, L.def.world));
    this.patience = parrotPatience(storyOf(L.def.world).tier);
  }

  startLine(): string {
    return t('parrot.start');
  }

  start(): void {
    this.half = (this.L.playedS + this.L.minLeft) / 2;
    this.next();
  }

  /** 1 measuring (the first half of the round's time), 2 beating. */
  private get phase(): 1 | 2 {
    return this.L.playedS < this.half ? 1 : 2;
  }

  private get parrotX(): number {
    return this.L.vw - Math.max(130, this.L.vw * 0.14);
  }

  /** The perch's foot: on the ground beside Tapko, as high as his feet. */
  private get perchFoot(): number {
    return GROUND_Y + this.tapkoFeet - TAPKO_FEET;
  }

  /** Where the parrot's claws hold the perch's bar. */
  private get clawY(): number {
    return this.perchFoot - PERCH_H * (1 - BAR_Y);
  }

  private next(): void {
    const word = this.round.current;
    this.current = word ? this.L.core.add(word, {}) : null;
    this.pop = 0;
    if (word && this.phase === 2 && !this.told2) {
      this.told2 = true;
      this.L.say(t('parrot.phase2'), 4);
    }
  }

  update(dt: number): void {
    if (this.current && this.keys[0] + this.keys[1] > 0) this.seconds[this.phase - 1] += dt;
    this.pop = Math.min(1, this.pop + dt * 4);
    this.hop = Math.max(0, this.hop - dt);
    this.scroll += dt * SWAY;
    if (this.flight) {
      const was = this.flight.t;
      this.flight.t += dt;
      if (this.flight.kind === 'home') this.homeLines(was, this.flight.t);
    }
    if (this.flight?.kind === 'round' && this.flight.t >= ROUND_S) this.flight = null;
  }

  /** Where the parrot sits on the grass by Tapko. */
  private get sitX(): number {
    return TAPKO_X + SIT_DX;
  }

  /** A learned round, before the flight home: the praise, then that the parrot is coming. */
  private homeLines(was: number, now: number): void {
    const at = (s: number) => was < s && now >= s;
    if (at(-2 * LINE_S)) this.parrotSays(pickLine('parrot.won'), LINE_S);
    if (at(-LINE_S)) this.parrotSays(pickLine('parrot.coming'), LINE_S + 0.6);
  }

  /** Correct characters per minute in half 1 (measuring) or 2 (beating); 0 before any. */
  speed(phase: 1 | 2): number {
    const s = this.seconds[phase - 1];
    return s > 0 ? Math.round((this.keys[phase - 1] / s) * 60) : 0;
  }

  onCorrect(tg: Target): void {
    if (tg.typed === 1) this.firstAt = this.t;
    this.countKey();
  }

  private countKey(): void {
    if (this.current) this.keys[this.phase - 1]++;
  }

  /** The word's letters a second from its first key: the first half keeps each word's best, the second marks the words that beat it. */
  private measure(word: string): void {
    const s = this.t - this.firstAt;
    if (word.length < 2 || s <= 0) return;
    const speed = (word.length - 1) / s, best = this.best.get(word);
    if (this.phase === 1) this.best.set(word, Math.max(best ?? 0, speed));
    else if (best && speed > best) this.beaten.add(word);
  }

  /** The parrot says a line by its beak on the perch, or high over the scene while it flies round. */
  private parrotSays(text: string, seconds: number): void {
    const x = this.parrotX;
    if (this.flight?.kind === 'round') this.L.speak('parrot', text, x - 40, VH * 0.42, x - this.L.vw * 0.2, this.clawY - ROUND_UP, seconds, true);
    else this.L.speak('parrot', text, x - 60, VH * 0.3, x - 31, this.clawY - 97, seconds, true);
  }

  onDone(tg: Target): void {
    this.countKey();
    this.measure(tg.word);
    this.round.advance();
    if (this.L.minLeft <= 0) this.round.close();
    this.L.core.prune();
    // The parrot says the word after the child: a bubble by its beak and a squawk; now and then a little hop.
    this.parrotSays(tg.word, REPEAT_S);
    this.L.sfx('squawk');
    if (!this.L.reduceMotion && ++this.repeats % HOP_EVERY === 0) this.hop = HOP;
    this.next();
    // The round is learned: the parrot praises, says it is coming and flies down to Tapko.
    if (this.round.done) this.flight = { kind: 'home', t: -PRAISE_AT - 2 * LINE_S };
  }

  onWrong(): void {
    if (this.flewOff || this.round.done) return;
    this.mistakes++;
    if (this.mistakes > this.patience) return this.leave();
    if (this.extra + MISS_ADD_S <= PARROT_MAX_S - PARROT_MIN_S) {
      this.extra += MISS_ADD_S;
      this.L.extendMin(MISS_ADD_S);
    }
    if (this.mistakes === SLIP_FLIGHT_AT && !this.flight) {
      this.flight = { kind: 'round', t: 0 };
      this.L.sfx('squawk');
      this.parrotSays(pickLine('parrot.slip'), ROUND_S);
    }
  }

  /** Too many mistakes: the parrot says so and flies off; the word goes and the round ends lost. */
  private leave(): void {
    this.flewOff = true;
    if (this.current) this.L.core.release(this.current, false);
    this.L.core.prune();
    this.current = null;
    this.L.endMinimum();
    this.flight = { kind: 'off', t: -OFF_WAIT };
    this.L.sfx('squawk');
    this.parrotSays(pickLine('parrot.leave'), OFF_WAIT + 1.5);
  }

  get lost(): boolean {
    return this.flewOff;
  }

  render(g: G): void {
    const size = Math.max(WORD_SIZE, 44 / this.L.stage.scale);
    const x = (TAPKO_X + this.parrotX) / 2, y = VH * 0.36;
    if (this.current) this.L.label(g, this.current, x, y + (1 - this.pop) * 12, size);
    drawSprite(g, 'obj-parrot-perch', this.parrotX, this.perchFoot, PERCH_H, { ax: 0.5, ay: 1 });
    if (this.flight?.kind !== 'home' || this.flight.t < 0) this.drawParrot(g);
  }

  /** The flight down to Tapko and the parrot on the grass by him are in front of him: it may cross him on the way. */
  renderFront(g: G): void {
    if (this.flight?.kind === 'home' && this.flight.t >= 0) this.drawParrot(g);
  }

  /** The parrot sitting, claws at `y`, facing Tapko (its picture faces right, it is drawn mirrored). */
  private drawSitting(g: G, x: number, y: number): void {
    drawSprite(g, 'ui-act-parrot', x, y, PARROT_H, { ax: CLAW_X, ay: CLAW_Y, flip: true }, (c, w, h) => {
      c.fillStyle = '#e0412f';
      c.beginPath();
      c.ellipse(0, 0, w * 0.3, h * 0.45, 0, 0, Math.PI * 2);
      c.fill();
    });
  }

  /** The parrot in front of its perch, claws on the bar; in flight its wings beat, facing where it goes (the flying pictures face right). */
  private drawParrot(g: G): void {
    const px = this.parrotX, py = this.clawY, f = this.flight;
    if (!f || f.t < 0 || (this.L.reduceMotion && f.kind === 'round')) {
      const k = this.hop > 0 ? Math.sin((1 - this.hop / HOP) * Math.PI) : 0;
      return this.drawSitting(g, px, py - k * HOP_UP);
    }
    // On the grass by Tapko once the flight down is over (at once with less motion).
    if (f.kind === 'home' && (f.t >= HOME_S || this.L.reduceMotion)) return this.drawSitting(g, this.sitX, this.perchFoot);
    if (this.L.reduceMotion) return;
    let x: number, y: number, left: boolean;
    if (f.kind === 'round') {
      // Up and to the left in an arc, then back down to the perch.
      const k = f.t / ROUND_S, arc = Math.sin(Math.PI * k);
      x = px - arc * this.L.vw * 0.28;
      y = py - arc * ROUND_UP + Math.sin(k * Math.PI * 6) * 14 * arc;
      left = k < 0.5;
    } else if (f.kind === 'home') {
      // To the left in a low arc, down to the grass by Tapko.
      const k = ease.inOutQuad(Math.min(1, f.t / HOME_S));
      x = px + (this.sitX - px) * k;
      y = py + (this.perchFoot - py) * k - Math.sin(Math.PI * k) * HOME_UP;
      left = true;
    } else {
      // Up and away to the right, faster and faster.
      const k = Math.min(1, f.t / OFF_S) ** 2;
      x = px + k * 500;
      y = py - k * (py + 250);
      left = false;
    }
    const frame = FLAP[Math.floor(this.t / (BEAT_S / FLAP.length)) % FLAP.length];
    drawSprite(g, frame, x, y - FLY_H * 0.35, FLY_H, { flip: left });
  }

  /** The share of the round's time played; the whole once the round is learned. */
  progress(): number {
    if (this.round.done) return 1;
    const all = this.L.playedS + this.L.minLeft;
    return all > 0 ? Math.min(1, this.L.playedS / all) : 0;
  }

  /** Over once the parrot has flown off (lost) or sat down by Tapko (learned). */
  get finished(): boolean {
    const f = this.flight;
    return !!f && (f.kind === 'off' ? f.t >= OFF_S : f.kind === 'home' && f.t >= HOME_S + SIT_S);
  }
}
