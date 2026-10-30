import { app, pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { drawSprite, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { LAYOUTS } from '../../keyboard/layouts';
import type { Profile } from '../../storage/schema';
import { WordSource } from '../../words/words';
import { BEAT_S, FLAP } from '../../ui/parrot-visit';
import { STORIES, WORLDS, parrotKeys, parrotSizeOf, storyOf } from '../levels';
import { Mode, TAPKO_FEET, TAPKO_X } from '../mode';
import { sideFeet } from './kit/hero';
import { ParrotRound, parrotPatience } from '../parrots';
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
/** A learned round: seconds after the last word before the parrot praises, then says it is coming, then flies to the child. */
const PRAISE_AT = 1.2;
const LINE_S = 1.6;
const HOME_S = 2.2;
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

/** The parrot leaves its perch: a short flight round the scene and back, off for good, or home with the child. `t` below 0 still waits on the perch. */
interface Flight {
  kind: 'round' | 'off' | 'home';
  t: number;
}

/**
 * The parrot: Tapko says a word, the child types it, and the parrot on its perch repeats it. First
 * the words in turn three times, then each word several times in a row; a wrong key brings the word
 * twice more. The third mistake sends the parrot on a short flight; more than `parrotPatience` and it
 * flies off, which ends the round lost. A won round ends with the parrot's praise, its "I am coming"
 * and its flight toward the child, up out of the scene, before the results. Speed does not matter; no stars.
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
  private repeats = 0;
  private mistakes = 0;
  private readonly patience: number;
  private flight: Flight | null = null;
  /** The parrot flew off after too many mistakes. */
  flewOff = false;
  /** Right keys and seconds of play in each part, from the first key on: the speed of the learning and of the repeating. */
  private keys = [0, 0];
  private seconds = [0, 0];

  constructor(L: LevelRuntime) {
    super(L);
    this.world = WORLDS[L.def.world];
    this.tapkoFeet = sideFeet(this.world, TAPKO_FEET);
    this.round = new ParrotRound(parrotWords(app.profile!, L.def.world), parrotSizeOf(L.def.world).repeats);
    this.patience = parrotPatience(STORIES.indexOf(storyOf(L.def.world)));
  }

  startLine(): string {
    return t('parrot.start');
  }

  start(): void {
    this.next();
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
    const step = this.round.current;
    this.current = step ? this.L.core.add(step.word, {}) : null;
    this.pop = 0;
    if (step?.phase === 2 && !this.told2) {
      this.told2 = true;
      this.L.say(t('parrot.phase2'), 4);
    }
  }

  update(dt: number): void {
    const step = this.round.current;
    if (step && this.keys[0] + this.keys[1] > 0) this.seconds[step.phase - 1] += dt;
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

  /** A learned round, before the flight home: the praise, then that the parrot is coming. */
  private homeLines(was: number, now: number): void {
    const at = (s: number) => was < s && now >= s;
    if (at(-2 * LINE_S)) this.parrotSays(pickLine('parrot.won'), LINE_S);
    if (at(-LINE_S)) this.parrotSays(pickLine('parrot.coming'), LINE_S + 0.6);
  }

  /** Correct characters per minute in part 1 (learning) or 2 (repeating); 0 before any. */
  speed(phase: 1 | 2): number {
    const s = this.seconds[phase - 1];
    return s > 0 ? Math.round((this.keys[phase - 1] / s) * 60) : 0;
  }

  onCorrect(): void {
    this.countKey();
  }

  private countKey(): void {
    const step = this.round.current;
    if (step) this.keys[step.phase - 1]++;
  }

  /** The parrot says a line by its beak on the perch, or high over the scene while it flies round. */
  private parrotSays(text: string, seconds: number): void {
    const x = this.parrotX;
    if (this.flight?.kind === 'round') this.L.speak('parrot', text, x - 40, VH * 0.42, x - this.L.vw * 0.2, this.clawY - ROUND_UP, seconds, true);
    else this.L.speak('parrot', text, x - 60, VH * 0.3, x - 31, this.clawY - 97, seconds, true);
  }

  onDone(tg: Target): void {
    this.countKey();
    this.round.advance();
    this.L.core.prune();
    // The parrot says the word after the child: a bubble by its beak and a squawk; now and then a little hop.
    this.parrotSays(tg.word, REPEAT_S);
    this.L.sfx('squawk');
    if (!this.L.reduceMotion && ++this.repeats % HOP_EVERY === 0) this.hop = HOP;
    this.next();
    // The round is learned: the parrot praises, says it is coming and flies to the child.
    if (this.round.done) this.flight = { kind: 'home', t: -PRAISE_AT - 2 * LINE_S };
  }

  onWrong(): void {
    if (this.flewOff || this.round.done) return;
    this.round.slip();
    this.mistakes++;
    if (this.mistakes > this.patience) return this.leave();
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
    this.drawParrot(g);
  }

  /** The parrot in front of its perch, claws on the bar; in flight its wings beat, facing where it goes (the flying pictures face right). */
  private drawParrot(g: G): void {
    const px = this.parrotX, py = this.clawY, f = this.flight;
    if (!f || f.t < 0 || (this.L.reduceMotion && f.kind === 'round')) {
      const k = this.hop > 0 ? Math.sin((1 - this.hop / HOP) * Math.PI) : 0;
      drawSprite(g, 'ui-act-parrot', px, py - k * HOP_UP, PARROT_H, { ax: CLAW_X, ay: CLAW_Y, flip: true }, (c, w, h) => {
        c.fillStyle = '#e0412f';
        c.beginPath();
        c.ellipse(0, 0, w * 0.3, h * 0.45, 0, 0, Math.PI * 2);
        c.fill();
      });
      return;
    }
    if (this.L.reduceMotion) return;
    let x: number, y: number, left: boolean;
    if (f.kind === 'round') {
      // Up and to the left in an arc, then back down to the perch.
      const k = f.t / ROUND_S, arc = Math.sin(Math.PI * k);
      x = px - arc * this.L.vw * 0.28;
      y = py - arc * ROUND_UP + Math.sin(k * Math.PI * 6) * 14 * arc;
      left = k < 0.5;
    } else if (f.kind === 'home') {
      // To the left toward Tapko, rising faster and faster up out of the scene.
      const k = Math.min(1, f.t / HOME_S);
      x = px - k * (px - TAPKO_X);
      y = py - k ** 2 * (py + FLY_H);
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

  progress(): number {
    return this.round.progress();
  }

  /** Over once the parrot has flown off (lost) or home to the child (learned). */
  get finished(): boolean {
    const f = this.flight;
    return !!f && (f.kind === 'off' ? f.t >= OFF_S : f.kind === 'home' && f.t >= HOME_S);
  }
}
