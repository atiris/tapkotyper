import { pickLine } from '../../app/app';
import { graphics } from '../../engine/graphics';
import { ease } from '../../engine/tween';
import { WORD_SHADOW_PX, drawCached, drawSprite, type G, roundRect } from '../../gfx/draw';
import { drawRobot, type RobotState } from '../../gfx/robot';
import { t } from '../../i18n/i18n';
import { TAPKO_H } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { Detour, lengthen, secondsPerWord } from './kit/egg';
import { HeroMode } from './kit/hero';
import { BIN, BIN_MOUTH_DX, BIN_RIM, JUNK_FEET, JUNK_HERO_X, binFallback, binHop, pileStage, tireFallback, vanishLook } from './kit/junk';
import { Ribbon, innerWord, knownSentence } from './kit/ribbon';

const FEET = JUNK_FEET;
const HERO_X = JUNK_HERO_X;
/** A slip adds one word to the text, at most this many in a level. */
const GROW_MAX = 10;
const MARGIN = 30;

/** Bolt as the junkyard finds him, broken; he stands up at the end of his program. */
const BROKEN: RobotState = { look: 'broken', raincoat: false };
/** Bolt lying on his back, head on the left: the picture is square, his body's foot at this share of its height, his face this far left of its middle. */
const LYING = 'robot-broken-lying';
const LYING_H = 200;
const LYING_FOOT = 0.72;
const FACE_DX = -0.15;
/** Standing up, Bolt is this high. */
const BOLT_H = 150;

/** Bolt lying while his picture is missing: his standing picture (or its drawing) turned on its back, head on the left. */
function lyingFallback(g: G, _w: number, h: number): void {
  // Turned, his square picture's width stands up: his body takes about its middle three fifths.
  const s = h * 0.85;
  g.save();
  g.translate(s * 0.45, (LYING_FOOT - 0.5) * h - s * 0.3);
  g.rotate(-Math.PI / 2);
  drawRobot(g, BROKEN, 'idle', 0, 0, s, 0);
  g.restore();
}

/** Bolt lying with his feet line at (x, FEET); his eyes glow as bright as `glow` (0..1), `alpha` fades him in. */
function drawLying(g: G, x: number, glow: number, alpha = 1): void {
  g.save();
  g.globalAlpha *= alpha;
  drawSprite(g, LYING, x, FEET + 4, LYING_H, { ay: LYING_FOOT }, lyingFallback);
  if (glow > 0) {
    // Lying on his back, his two eyes sit one above the other in the dark glass.
    const fx = x + FACE_DX * LYING_H, fy = FEET + 4 - (LYING_FOOT - 0.5) * LYING_H, r = LYING_H * 0.025;
    g.globalAlpha *= Math.min(1, glow);
    if (!graphics.simple) {
      g.shadowColor = '#6ff3ff';
      g.shadowBlur = 6 + 16 * glow;
    }
    g.fillStyle = '#9ff8ff';
    for (const dy of [-0.05, 0.05]) {
      g.beginPath();
      g.arc(fx, fy + dy * LYING_H, r * (0.7 + 0.5 * glow), 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

/** The beeping pile: its pictures by stage (big, middle, a last small heap) and their heights; three bins right of it. */
const PILES = ['obj-junk-pile-1', 'obj-junk-pile-2', 'obj-junk-pile-3'];
const PILE_H = [215, 168, 127];
const BIN_H = 100;
const BIN_GAP = 100;
/** The bins stand this much further back (higher) than the path, so the things roll past in front of them; their opening's height. */
const BIN_BACK = 40;
const BIN_FOOT = FEET + 10 - BIN_BACK;
const RIM_Y = BIN_FOOT - BIN_H * BIN_RIM;
/** The last bin is this far from the stage's right edge at least, and this far right of him at most (a wide stage keeps the scene together). */
const BIN_EDGE = 70;
const BIN_FROM_HERO = 900;
/** The things that pop off the pile and their heights, each about its size next to the tire (the first three, wheels, draw as a tire while a picture is missing). */
const THINGS = ['obj-tire', 'obj-bike-wheel', 'obj-wagon-wheel', 'obj-crate', 'obj-can', 'obj-spring', 'obj-nut', 'obj-screw'];
const THING_INKS = ['#3a3a3e', '#3a3a3e', '#8a5a32', '#c08a52', '#b9c2cc', '#8a8f98', '#9aa0a8', '#a9b1bb'];
const THING_H = [56, 64, 66, 50, 34, 42, 24, 30];
/** Seconds of a thing's hop off the pile and roll into its bin, and of a slipped thing's fall onto the pile. */
const OUT_S = 1.6;
const OUT_HOP = 0.6;
const FALL_S = 0.7;
/** A soft beep comes from the pile every few seconds (random within); the little sound waves show this long. */
const BEEP_EVERY: [number, number] = [5, 7];
const WAVES_S = 0.9;
/** The end: the last stage fades away and Bolt lies there, beeps once; the level ends. */
const PILE_FADE_S = 0.8;
const BEEP_AT = 1.1;
const PILE_END_AT = 4;
/** After the first slip's line, the reminder comes with about one slip in this many. */
const CAREFUL_EVERY = 10;

/** The ribbon and its frame on the junkyard: from just right of him to the right margin, over the scene below. */
export function junkArea(vw: number): { x: number; w: number } {
  const x = HERO_X + TAPKO_H * 0.45;
  return { x, w: vw - MARGIN - x };
}

/** The pile's middle and the three bins on a stage `vw` wide: the bins at the right, the pile between them and him. */
export function pileLayout(vw: number): { pile: number; bins: number[] } {
  const last = Math.min(vw - BIN_EDGE, HERO_X + BIN_FROM_HERO);
  const bins = [last - BIN_GAP * 2, last - BIN_GAP, last];
  return { pile: (HERO_X + 90 + bins[0] - 60) / 2, bins };
}

/** A thing off the pile while its picture is missing: a tire, or a small rounded block in the thing's colour. */
function thingFallback(kind: number) {
  if (kind <= 2) return tireFallback;
  return (g: G, w: number, h: number): void => {
    g.save();
    g.fillStyle = THING_INKS[kind];
    g.strokeStyle = 'rgba(40,30,20,0.6)';
    g.lineWidth = 2;
    roundRect(g, -w * 0.35, -h * 0.35, w * 0.7, h * 0.7, h * 0.12);
    g.fill();
    g.stroke();
    g.restore();
  };
}

/** A mixed pile while its pictures are missing: blocks and tires heaped in a mound, fewer by the stage. */
function junkPileFallback(stage: number) {
  return (g: G, w: number, h: number): void => {
    g.save();
    g.fillStyle = '#7d6a55';
    g.beginPath();
    g.ellipse(0, h / 2, w * 0.5, h * 0.95, 0, Math.PI, 0);
    g.fill();
    const n = 7 - stage * 2;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.15 + (0.7 * i) / Math.max(1, n - 1));
      g.save();
      g.translate(-Math.cos(a) * w * 0.3, h / 2 - Math.sin(a) * h * 0.6);
      thingFallback(i % THINGS.length)(g, h * 0.3, h * 0.3);
      g.restore();
    }
    g.restore();
  };
}

/** A thing off the pile: popping out and rolling into a bin, or (a slip) falling onto the pile and vanishing into it. */
interface Thing {
  kind: number;
  out: boolean;
  k: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  x: number;
  y: number;
  rot: number;
  /** 0-1 of its vanishing at its bin's opening. */
  vanish: number;
}

/**
 * Junkyard 4, the beeping pile (the ribbon): a big pile of mixed junk beeps softly now and then; the
 * text runs as the ribbon across the top with its frame under it. Each finished word pops a thing off
 * the pile into one of three bins; a slip starts the word again, adds a word (at most `GROW_MAX`) and
 * drops a thing back onto the pile. The pile shrinks in three stages with the level; at the end it
 * fades away and Bolt lies where it stood, beeps once and does not move.
 */
export class JunkpileMode extends HeroMode {
  readonly world = 'junkyard';
  readonly tapkoFeet = FEET;
  readonly pictures = [...PILES, BIN, ...THINGS, LYING, 'robot-broken'];
  private ribbon: Ribbon;
  private detour: Detour;
  /** The most words ever written (the progress). */
  private best = 0;
  private slips = 0;
  private things: Thing[] = [];
  private nextBin = 0;
  private stage = 0;
  /** The pile before the last change, fading out, and 0..1 of its fade. */
  private oldStage = -1;
  private stageK = 1;
  private beepIn: number;
  private waves = 0;
  private endT: number | null = null;
  private pileFade = 0;

  constructor(L: LevelRuntime) {
    super(L);
    this.detour = new Detour(GROW_MAX, secondsPerWord(L));
    this.ribbon = new Ribbon(L, junkArea);
    this.beepIn = L.rng.range(...BEEP_EVERY);
  }

  startLine(): string {
    return pickLine('story.junkpileStart');
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    this.target();
  }

  private get layout() {
    return pileLayout(this.L.vw);
  }

  /** The next sentence of known words; false when it came empty. */
  private sentence(): boolean {
    const list = knownSentence(this.L);
    list.forEach((w, i) => this.ribbon.words.push(this.ribbon.word(w, i === list.length - 1)));
    return list.length > 0;
  }

  /** The text needs more: either minimum is not met yet. */
  private get more(): boolean {
    return this.L.minLeft > 0 || this.ribbon.words.length < this.L.count;
  }

  /** The word at `at` becomes the target: with its space, unless it ends the text. The next word is always there to read. */
  private target(): void {
    const r = this.ribbon;
    while (r.at + 1 >= r.words.length && this.more && this.sentence());
    const w = r.words[r.at];
    if (!w) return;
    const end = r.at === r.words.length - 1 && !this.more;
    r.current = this.L.core.add(end ? w.text : `${w.text} `, {});
  }

  private get textDone(): boolean {
    return this.ribbon.at >= this.ribbon.words.length && !this.more;
  }

  onDone(tg: Target): void {
    const r = this.ribbon;
    if (tg !== r.current) return;
    this.L.core.prune();
    r.at++;
    this.best = Math.max(this.best, r.at);
    r.current = null;
    this.popOut();
    if (this.textDone) return this.end();
    this.target();
  }

  /** A slip starts the word again, adds a word after it and drops a thing back onto the pile. */
  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    const r = this.ribbon;
    if (!tg || tg !== r.current || this.endT !== null) return;
    this.L.core.release(tg, false);
    this.L.core.prune();
    r.current = null;
    r.erase(tg.word.slice(0, tg.typed));
    if (lengthen(this.L, this.detour, 1)) r.words.splice(r.at + 1, 0, r.word(innerWord(this.L), false));
    this.dropIn();
    this.L.sfx('whoosh');
    if (!this.slips++) this.L.say(t('story.junkpileSlip'), 3);
    else if (this.L.rng.int(1, CAREFUL_EVERY) === 1) this.L.say(t('story.junkpileCareful'), 2.5);
    this.target();
  }

  /** A thing pops out at the pile's right edge, hops off and rolls into the next bin. */
  private popOut(): void {
    const { pile, bins } = this.layout, h = PILE_H[this.stage];
    const fromX = pile + h * 0.45, fromY = FEET - h * 0.45, toX = bins[this.nextBin++ % bins.length] + BIN_H * BIN_MOUTH_DX;
    this.things.push({ kind: this.L.rng.int(0, THINGS.length - 1), out: true, k: 0, fromX, fromY, toX, toY: RIM_Y, x: fromX, y: fromY, rot: 0, vanish: 0 });
    this.L.sfx('pop');
  }

  /** A thing appears above the pile, falls onto it and vanishes into it. */
  private dropIn(): void {
    const { pile } = this.layout, h = PILE_H[this.stage], x = pile + this.L.rng.range(-h * 0.3, h * 0.3);
    this.things.push({ kind: this.L.rng.int(0, THINGS.length - 1), out: false, k: 0, fromX: x, fromY: FEET - h - 150, toX: x, toY: FEET - h * 0.65, x, y: FEET - h - 150, rot: 0, vanish: 0 });
  }

  /** The text is written: the last stage fades away and Bolt lies there. */
  private end(): void {
    this.endT = 0;
    this.puff();
    this.L.tweens.add(this.L.reduceMotion ? 0.01 : PILE_FADE_S, (k) => { this.pileFade = k; }, ease.linear);
  }

  private puff(): void {
    this.L.particles.emit(this.layout.pile, FEET - PILE_H[this.stage] * 0.4, 12, 'puff', ['rgba(200,180,150,0.5)', 'rgba(230,220,200,0.45)'], 160, 22);
  }

  private beep(): void {
    this.L.sfx('robotSad');
    this.waves = WAVES_S;
  }

  update(dt: number): void {
    super.update(dt);
    const L = this.L;
    this.ribbon.update(dt);
    this.waves = Math.max(0, this.waves - dt);
    if (this.endT === null) {
      const stage = pileStage(L.share());
      if (stage > this.stage) {
        this.oldStage = this.stage;
        this.stage = stage;
        this.stageK = 0;
        this.puff();
      }
      if ((this.beepIn -= dt) <= 0) {
        this.beepIn = L.rng.range(...BEEP_EVERY);
        this.beep();
      }
    } else {
      const was = this.endT, now = (this.endT += dt);
      if (was < BEEP_AT && now >= BEEP_AT) {
        this.beep();
        this.surprised(PILE_END_AT);
        L.say(pickLine('story.junkpileDone'), PILE_END_AT);
      }
    }
    if (this.stageK < 1) this.stageK = Math.min(1, this.stageK + dt / 0.5);
    for (const th of this.things) this.moveThing(th, dt);
    this.things = this.things.filter((th) => th.k < 1);
  }

  private moveThing(th: Thing, dt: number): void {
    th.k = Math.min(1, th.k + dt / (this.L.reduceMotion ? 0.01 : th.out ? OUT_S : FALL_S));
    if (!th.out) {
      th.y = th.fromY + (th.toY - th.fromY) * ease.inOutQuad(th.k);
      return;
    }
    // It hops off the pile to the ground, rolls along the path in front of the bins, and hops in front of its bin's opening (`toY`), where it vanishes.
    const ground = FEET + 6 - THING_H[th.kind] / 2, hop = 0.25, k = th.k;
    th.x = th.fromX + (th.toX - th.fromX) * ease.inOutQuad(k);
    if (k < hop) th.y = th.fromY + (ground - th.fromY) * (k / hop) - Math.sin((k / hop) * Math.PI) * 40;
    else if (k < OUT_HOP) th.y = ground;
    else {
      const into = binHop(ground, th.toY, THING_H[th.kind], (k - OUT_HOP) / (1 - OUT_HOP));
      th.y = into.y;
      th.vanish = into.vanish;
    }
    th.rot = (th.x - th.fromX) / (THING_H[th.kind] / 2);
  }

  private drawPile(g: G, stage: number, alpha: number): void {
    if (alpha <= 0) return;
    g.save();
    g.globalAlpha *= alpha;
    drawSprite(g, PILES[stage], this.layout.pile, FEET + 10, PILE_H[stage], { ay: 1 }, junkPileFallback(stage));
    g.restore();
  }

  private drawThing(g: G, th: Thing): void {
    g.save();
    // A slipped thing fades into the pile over its last third.
    if (!th.out) g.globalAlpha *= Math.min(1, (1 - th.k) * 3);
    const look = vanishLook(th.vanish);
    g.globalAlpha *= look.alpha;
    drawSprite(g, THINGS[th.kind], th.x, th.y, THING_H[th.kind] * look.scale, { rot: th.rot }, thingFallback(th.kind));
    g.restore();
  }

  /** Little sound waves at the pile's top right while it (or Bolt) beeps. */
  private drawWaves(g: G, x: number, y: number): void {
    if (this.waves <= 0) return;
    const k = 1 - this.waves / WAVES_S;
    g.save();
    g.strokeStyle = '#6ff3ff';
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      g.globalAlpha = Math.max(0, 1 - k) * (i ? 0.6 : 1);
      g.beginPath();
      g.arc(x, y, 14 + i * 12 + k * 10, -Math.PI * 0.35, Math.PI * 0.05);
      g.stroke();
    }
    g.restore();
  }

  render(g: G): void {
    const { pile, bins } = this.layout, h = PILE_H[this.stage];
    if (this.endT !== null) drawLying(g, pile, 0, this.pileFade);
    const fade = 1 - this.pileFade;
    if (this.oldStage >= 0 && this.stageK < 1) this.drawPile(g, this.oldStage, (1 - this.stageK) * fade);
    this.drawPile(g, this.stage, (this.oldStage >= 0 ? this.stageK : 1) * fade);
    // The bins stand further back: the things roll past in front of them and vanish at their openings.
    for (const x of bins) drawSprite(g, BIN, x, BIN_FOOT, BIN_H, { ay: 1 }, binFallback);
    for (const th of this.things) this.drawThing(g, th);
    this.drawWaves(g, pile + h * 0.3, FEET - (this.endT !== null ? LYING_H * 0.3 : h * 0.9));
    this.drawHero(g);
    this.ribbon.draw(g, this.endT === null);
  }

  progress(): number {
    if (this.textDone) return 1;
    return this.best / Math.max(this.L.count, this.ribbon.words.length);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > PILE_END_AT;
  }
}

/** Bolt lies this far right of him; the screens fill the stage right of his head and above Bolt. */
const BOLT_DX = 190;
const SCREENS_X = HERO_X + 120;
const SCREENS_TOP = 24;
const SCREENS_BOTTOM = FEET - 150;
const SCREEN_GAP = 18;
/** Narrower than this, the target screen stands under the source; beside it, the source takes this share, the target the rest. */
const SIDE_BY_SIDE = 640;
const SOURCE_SHARE = 0.44;
const STACKED_SOURCE = 0.78;
/** The program's letters (monospace: a letter is this share of the size wide at most), lines and the screens' bezel and padding. */
const MONO_SIZE = 24;
const MONO_W = 0.62;
const MONO_LINE = 34;
const BEZEL = 12;
const SCREEN_PAD = 14;
const MONO = `600 ${MONO_SIZE}px ui-monospace, Consolas, "Cascadia Mono", "Courier New", monospace`;
/** The end: his eyes light fully and he beeps, gets up, and hops with the character. */
const UP_AT = 0.8;
const UP_S = 0.6;
const HOP_AT = 1.6;
const HOP_S = 0.6;
const CODE_END_AT = 4;

type Box = { x: number; y: number; w: number; h: number };

/** The source and target screens on a stage `vw` wide: side by side of different widths, or (narrow) the target under the source, wider. */
export function codeScreens(vw: number): { src: Box; dst: Box } {
  const w = vw - MARGIN - SCREENS_X, h = SCREENS_BOTTOM - SCREENS_TOP;
  if (w >= SIDE_BY_SIDE) {
    const sw = w * SOURCE_SHARE;
    return { src: { x: SCREENS_X, y: SCREENS_TOP, w: sw, h }, dst: { x: SCREENS_X + sw + SCREEN_GAP, y: SCREENS_TOP, w: w - sw - SCREEN_GAP, h } };
  }
  const sh = (h - SCREEN_GAP) / 2;
  return { src: { x: SCREENS_X, y: SCREENS_TOP, w: w * STACKED_SOURCE, h: sh }, dst: { x: SCREENS_X, y: SCREENS_TOP + sh + SCREEN_GAP, w, h: sh } };
}

/** Letters a line of a screen `w` wide holds. */
export function screenColumns(w: number): number {
  return Math.max(4, Math.floor((w - (BEZEL + SCREEN_PAD) * 2) / (MONO_SIZE * MONO_W)));
}

/** Whole lines a screen `h` high shows. */
function screenRows(h: number): number {
  return Math.max(1, Math.floor((h - (BEZEL + SCREEN_PAD) * 2) / MONO_LINE));
}

/** Words broken into lines of at most `cols` letters at whole words (a longer word on a line of its own); each line its first and after-last word. */
export function breakLines(words: string[], cols: number): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let from = 0, len = 0;
  words.forEach((w, i) => {
    if (i > from && len + 1 + w.length > cols) {
      out.push({ from, to: i });
      from = i;
      len = w.length;
    } else len += (i > from ? 1 : 0) + w.length;
  });
  if (words.length) out.push({ from, to: words.length });
  return out;
}

/** Source lines fully copied once `at` words are written. */
export function linesCopied(lines: { from: number; to: number }[], at: number): number {
  return lines.filter((ln) => ln.to <= at).length;
}

/**
 * Junkyard 5, Bolt's program (the super level, the first transcribe): Bolt lies right of him. His
 * program stands on an old green screen, the child copies it onto an empty screen of another width,
 * so the lines break elsewhere. The source greys what is copied; a wrong letter is not written and
 * adds one word at the end of the program with its share of the minimum (at most `GROW_MAX`).
 * Nothing is ever erased. Each copied line makes his eyes glow brighter; at the end he beeps, gets up
 * and hops with the character.
 */
export class CodeMode extends HeroMode {
  readonly world = 'junkyard';
  readonly tapkoFeet = FEET;
  readonly pictures = [LYING, 'robot-broken'];
  /** The narrator's bubble stays left of the program, which the child copies from. */
  readonly bubbleEnd = SCREENS_X - SCREEN_GAP;
  private words: string[] = [];
  private at = 0;
  private current: Target | null = null;
  private detour: Detour;
  private slips = 0;
  /** Lines copied as his eyes show them: they glow toward it. */
  private lit = 0;
  private glow = 0;
  private endT: number | null = null;
  private boltJump = 0;

  constructor(L: LevelRuntime) {
    super(L);
    this.detour = new Detour(GROW_MAX, secondsPerWord(L));
  }

  startLine(): string {
    return pickLine('story.codeStart');
  }

  start(): void {
    this.heroX = HERO_X;
    this.heroY = FEET;
    while (this.words.length < this.L.count && this.sentence());
    this.ask();
  }

  private sentence(): boolean {
    const list = knownSentence(this.L);
    this.words.push(...list);
    return list.length > 0;
  }

  private get more(): boolean {
    return this.L.minLeft > 0 || this.words.length < this.L.count;
  }

  /** The word to copy with its space, unless it ends the program. The next word is always there to read. */
  private ask(): void {
    while (this.at + 1 >= this.words.length && this.more && this.sentence());
    const w = this.words[this.at];
    if (!w) return;
    const end = this.at === this.words.length - 1 && !this.more;
    this.current = this.L.core.add(end ? w : `${w} `, {});
  }

  private get boltX(): number {
    return HERO_X + BOLT_DX;
  }

  /** The source's lines at its own width. */
  private sourceLines(): { from: number; to: number }[] {
    return breakLines(this.words, screenColumns(codeScreens(this.L.vw).src.w));
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.L.core.prune();
    this.at++;
    this.current = null;
    const lines = this.sourceLines(), lit = linesCopied(lines, this.at);
    if (lit > this.lit) {
      this.lit = lit;
      this.L.sfx('note');
    }
    if (this.at >= this.words.length && !this.more) return this.end();
    this.ask();
  }

  /** A wrong letter is not written: one word more at the end of the program, the first time the narrator says so. */
  onWrong(tg: Target | null): void {
    super.onWrong(tg);
    if (!tg || tg !== this.current || this.endT !== null) return;
    if (!lengthen(this.L, this.detour, 1)) return;
    const end = this.at === this.words.length - 1;
    this.words.push(innerWord(this.L));
    // The word in progress ended the program: now its space comes before the new word.
    if (end && !tg.word.endsWith(' ')) tg.word += ' ';
    if (!this.slips++) this.L.say(t('story.codeSlip'), 3);
  }

  /** The program is copied: his eyes light fully, he beeps, gets up and hops with the character. */
  private end(): void {
    this.endT = 0;
    this.lit = Number.POSITIVE_INFINITY;
    this.L.sfx('robotHappy');
    this.L.say(pickLine('story.codeDone'), CODE_END_AT);
  }

  update(dt: number): void {
    super.update(dt);
    const total = Math.max(1, this.sourceLines().length);
    const aim = Math.min(1, this.lit / total);
    this.glow += (aim - this.glow) * Math.min(1, dt * 3);
    if (this.endT === null) return;
    const was = this.endT, now = (this.endT += dt);
    if (was < HOP_AT && now >= HOP_AT) {
      this.happy();
      this.L.hooray();
      this.L.tweens.add(this.L.reduceMotion ? 0.01 : HOP_S, (k) => {
        this.boltJump = Math.sin(k * Math.PI);
        this.jump = Math.sin(k * Math.PI) * 0.3;
      }, ease.linear, () => {
        this.boltJump = 0;
        this.jump = 0;
      });
    }
  }

  render(g: G): void {
    this.drawBolt(g);
    this.drawHero(g);
    const { src, dst } = codeScreens(this.L.vw);
    this.drawSource(g, src);
    this.drawTarget(g, dst);
  }

  /** Bolt lying with his glowing eyes; at the end he gets up and stands, and hops once. */
  private drawBolt(g: G): void {
    const e = this.endT, up = e === null ? 0 : this.L.reduceMotion ? (e >= UP_AT ? 1 : 0) : Math.max(0, Math.min(1, (e - UP_AT) / UP_S));
    if (up < 1) drawLying(g, this.boltX, this.glow, 1 - up);
    if (up > 0) drawRobot(g, BROKEN, 'happy', this.boltX, FEET + 4 - this.boltJump * 60 + (1 - up) * 20, BOLT_H, this.t, up);
  }

  /** An old monitor: a beige bezel round a dark screen. */
  private drawMonitor(g: G, b: Box, screen: string): void {
    g.save();
    if (!graphics.simple) {
      g.shadowColor = 'rgba(40,30,20,0.3)';
      g.shadowBlur = 10;
      g.shadowOffsetY = 4;
    }
    g.fillStyle = '#c9c1ad';
    roundRect(g, b.x, b.y, b.w, b.h, 16);
    g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = '#8f8670';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = screen;
    roundRect(g, b.x + BEZEL, b.y + BEZEL, b.w - BEZEL * 2, b.h - BEZEL * 2, 10);
    g.fill();
    g.restore();
  }

  /**
   * A monitor with what `write` writes on it, from a picture made once per `key` (what it shows): its
   * letters and shadow cost far more to draw than their copy.
   */
  private drawScreen(g: G, key: string, b: Box, screen: string, write: (g: G) => void): void {
    // Room for the shadow, which a canvas draws in device pixels.
    const bleed = graphics.simple ? 2 : WORD_SHADOW_PX / g.getTransform().a;
    drawCached(g, `wake-screen|${screen}|${graphics.simple}|${this.L.highContrast}|${key}`, b.x - bleed, b.y - bleed, b.w + 2 * bleed, b.h + 2 * bleed, (c) => {
      c.translate(bleed - b.x, bleed - b.y);
      this.drawMonitor(c, b, screen);
      c.font = MONO;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      write(c);
    }, true);
  }

  /** Bolt's program on the green screen: the copied words grey, the line in progress kept in view. */
  private drawSource(g: G, b: Box): void {
    const lines = this.sourceLines(), rows = screenRows(b.h);
    // The line in progress (the last one once all is copied) is the second in view.
    const at = lines.findIndex((ln) => ln.to > this.at), cur = at < 0 ? lines.length - 1 : at;
    const first = Math.max(0, Math.min(cur - 1, lines.length - rows)), hc = this.L.highContrast;
    const shown = lines.slice(first, first + rows);
    this.drawScreen(g, `${this.at}|${shown.map((ln) => `${ln.from}:${this.words.slice(ln.from, ln.to).join(' ')}`).join('\n')}`, b, '#0d2416', (c) => {
      shown.forEach((ln, i) => {
        const y = b.y + BEZEL + SCREEN_PAD + MONO_LINE * (i + 0.5);
        let x = b.x + BEZEL + SCREEN_PAD;
        for (let k = ln.from; k < ln.to; k++) {
          c.fillStyle = k < this.at ? (hc ? '#7f9a86' : '#3f6a4c') : hc ? '#b8ffcc' : '#5dff8a';
          c.fillText(this.words[k], x, y);
          x += c.measureText(`${this.words[k]} `).width;
        }
      });
    });
  }

  /** What is written, breaking at the target screen's own width, its last lines in view, with a blinking cursor. */
  private drawTarget(g: G, b: Box): void {
    const tg = this.current, word = this.words[this.at] ?? '';
    const part = tg ? word.slice(0, Math.min(tg.typed, word.length)) : '';
    const written = part ? [...this.words.slice(0, this.at), part] : this.words.slice(0, this.at);
    const lines = breakLines(written, screenColumns(b.w)), rows = screenRows(b.h);
    const first = Math.max(0, lines.length - rows);
    const x0 = b.x + BEZEL + SCREEN_PAD, y0 = b.y + BEZEL + SCREEN_PAD;
    const texts = lines.slice(first).map((ln) => written.slice(ln.from, ln.to).join(' ')), key = texts.join('\n');
    this.drawScreen(g, key, b, '#1b2230', (c) => {
      c.fillStyle = '#e8f1ff';
      texts.forEach((text, i) => c.fillText(text, x0, y0 + MONO_LINE * (i + 0.5)));
    });
    if (!tg || !(this.L.reduceMotion || Math.sin(this.t * 6) > -0.2)) return;
    const caretKey = `${b.w}|${b.h}|${part ? '' : word}|${key}`;
    if (this.caret?.key !== caretKey) {
      // After a whole word (its space still to type) or at the start of the next line.
      let text = texts[texts.length - 1] ?? '', row = Math.max(0, texts.length - 1);
      if (!part && written.length) {
        const wraps = text.length + 1 + word.length > screenColumns(b.w) && row + 1 < rows;
        text = wraps ? '' : `${text} `;
        if (wraps) row++;
      }
      g.save();
      g.font = MONO;
      this.caret = { key: caretKey, dx: g.measureText(text).width, row };
      g.restore();
    }
    g.fillStyle = '#e8f1ff';
    g.fillRect(x0 + this.caret.dx + 1, y0 + MONO_LINE * (this.caret.row + 0.5) - MONO_SIZE * 0.55, 3, MONO_SIZE * 1.1);
  }

  /** Where the target screen's cursor stands (from the text's left edge, and its line), measured when what is written changes. */
  private caret: { key: string; dx: number; row: number } | null = null;

  progress(): number {
    if (this.endT !== null) return 1;
    return this.at / Math.max(this.L.count, this.words.length);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > CODE_END_AT;
  }
}
