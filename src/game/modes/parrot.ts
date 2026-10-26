import { app } from '../../app/app';
import { VH } from '../../engine/loop';
import { drawSprite, fontFamily, type G, roundRect, wordBox } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { LAYOUTS } from '../../keyboard/layouts';
import type { Profile } from '../../storage/schema';
import { WordSource } from '../../words/words';
import { WORLDS, parrotKeys, parrotSizeOf } from '../levels';
import { Mode, TAPKO_X } from '../mode';
import { ParrotRound } from '../parrots';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

/** Height of the parrot on its perch, and seconds of its hop when it repeats a word. */
const PARROT_H = 190;
const HOP = 0.45;
/** Seconds the parrot's repeat stays up. */
const REPEAT_S = 1.8;
const WORD_SIZE = 64;
const NEXT_SIZE = 34;

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

/**
 * The parrot: Tapko says a word, the child types it, and the parrot on its perch repeats it. First
 * the words in turn three times, then each word several times in a row; a wrong key brings the word
 * twice more. Speed does not matter; no stars.
 */
export class ParrotMode extends Mode {
  readonly pictures = ['ui-act-parrot'];
  readonly world: string;
  readonly phraseWords = 1;
  readonly round: ParrotRound;
  private current: Target | null = null;
  private pop = 0;
  private hop = 0;
  private told2 = false;
  /** Right keys and seconds of play in each part, from the first key on: the speed of the learning and of the repeating. */
  private keys = [0, 0];
  private seconds = [0, 0];

  constructor(L: LevelRuntime) {
    super(L);
    this.world = WORLDS[L.def.world];
    this.round = new ParrotRound(parrotWords(app.profile!, L.def.world), parrotSizeOf(L.def.world).repeats);
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

  private get perchY(): number {
    return VH * 0.7;
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

  onDone(tg: Target): void {
    this.countKey();
    this.round.advance();
    this.L.core.prune();
    // The parrot says the word after the child: a bubble by its beak and a squawk.
    this.L.speak('parrot', tg.word, this.parrotX - 60, VH * 0.3, this.parrotX - 30, this.perchY - PARROT_H * 0.8, REPEAT_S, true);
    this.L.sfx('squawk');
    if (!this.L.reduceMotion) this.hop = HOP;
    this.next();
  }

  onWrong(): void {
    this.round.slip();
  }

  render(g: G): void {
    const s = this.L.stage.scale;
    const size = Math.max(WORD_SIZE, 44 / s);
    const x = (TAPKO_X + this.parrotX) / 2, y = VH * 0.36;
    if (this.current) {
      const box = wordBox(g, this.current.word, size);
      // The word's label is Tapko's bubble: a short tail from its lower left toward him.
      const x0 = x - box.w / 2, yb = y + box.h / 2;
      g.save();
      g.globalAlpha = this.pop;
      g.fillStyle = 'rgba(255,253,246,0.94)';
      g.strokeStyle = '#5a3d2b';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x0 + 18, yb - 4);
      g.lineTo(x0 - 26, yb + 44);
      g.lineTo(x0 + 52, yb - 4);
      g.fill();
      g.stroke();
      g.restore();
      this.L.label(g, this.current, x, y + (1 - this.pop) * 12, size);
      // What comes next, greyed after the word.
      const up = this.round.upcoming;
      if (up) {
        g.save();
        g.globalAlpha = 0.55;
        g.fillStyle = '#2d3b33';
        g.font = `600 ${Math.max(NEXT_SIZE, 20 / s)}px ${fontFamily()}`;
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillText(up.word, x + box.w / 2 + size, y);
        g.restore();
      }
    }
    this.drawPerch(g);
  }

  private drawPerch(g: G): void {
    const px = this.parrotX, py = this.perchY;
    g.save();
    g.fillStyle = '#7a5134';
    g.strokeStyle = '#4e3220';
    g.lineWidth = 3;
    roundRect(g, px - 90, py - 8, 180, 16, 8);
    g.fill();
    g.stroke();
    roundRect(g, px - 7, py, 14, VH - py, 6);
    g.fill();
    g.stroke();
    g.restore();
    const k = this.hop > 0 ? Math.sin((1 - this.hop / HOP) * Math.PI) : 0;
    drawSprite(g, 'ui-act-parrot', px, py - k * 26, PARROT_H, { ax: 0.5, ay: 0.95, flip: true }, (c, w, h) => {
      c.fillStyle = '#e0412f';
      c.beginPath();
      c.ellipse(0, 0, w * 0.3, h * 0.45, 0, 0, Math.PI * 2);
      c.fill();
    });
  }

  progress(): number {
    return this.round.progress();
  }

  get finished(): boolean {
    return this.round.done;
  }
}
