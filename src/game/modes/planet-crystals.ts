import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, fontFamily, type G, wordBox } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { Mode, TAPKO_H, TAPKO_X } from '../mode';
import { PATH_FEET } from './planet';
import type { Target } from '../typing';

/** The three kinds of crystal, each with its cracked picture, and their colors while the pictures are missing. */
export const CRYSTALS = ['obj-crystal-amber', 'obj-crystal-rose', 'obj-crystal-aqua'];
const CRYSTAL_COLOR: Record<string, string> = { 'obj-crystal-amber': '#f2b65a', 'obj-crystal-rose': '#f3b3be', 'obj-crystal-aqua': '#9ed8e2' };
/** The heaps crystals grow out of; each also mirrored at random. */
const MOUNDS = ['obj-mound-1', 'obj-mound-2', 'obj-mound-3'];
/** A full-grown crystal is about 30 % of Tapko's height; a heap's height. */
const CRYSTAL_H = 84;
const MOUND_H = 72;
/** The molehills start this far from the stage's left edge, right of Tapko. */
const MOUND_LEFT = TAPKO_X + 200;
/** A crystal grows while its word sinks two thirds of the way down; seconds it flies into the pocket, lies cracked before it is gone, and a heap rests after. */
const GROW_SHARE = 2 / 3;
const FLY = 0.7;
const CRACKED = 2.4;
const REST = 1;
/** Where a word starts above its crystal, as a share of the height. */
const WORD_START = 0.1;
/** Seconds of the end: when the line about the crystals shows, and when the level ends. */
const COUNT_LINE = 0.4;
const END_TIME = 3.2;
const INK = '#3d3355';

/** A crystal while its picture is missing: a pointed six-sided column. */
function crystalFallback(color: string) {
  return (g: G, w: number, h: number) => {
    g.fillStyle = color;
    g.strokeStyle = 'rgba(80,50,40,0.5)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-w * 0.25, h * 0.5);
    g.lineTo(-w * 0.25, -h * 0.2);
    g.lineTo(0, -h * 0.5);
    g.lineTo(w * 0.25, -h * 0.2);
    g.lineTo(w * 0.25, h * 0.5);
    g.closePath();
    g.fill();
    g.stroke();
  };
}

function moundFallback(g: G, w: number, h: number): void {
  g.fillStyle = '#8a6a4a';
  g.beginPath();
  g.ellipse(0, h * 0.5, w * 0.5, h, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = '#7dbf5a';
  g.beginPath();
  g.ellipse(0, h * 0.5 - h * 0.7, w * 0.42, h * 0.3, 0, Math.PI, 0);
  g.fill();
}

/** A text with a white rim, in the scene. */
function rimmed(g: G, text: string, x: number, y: number, size: number, ink = INK, alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  g.font = `700 ${size}px ${fontFamily()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(4, size / 6);
  g.strokeStyle = '#fff';
  g.strokeText(text, x, y);
  g.fillStyle = ink;
  g.fillText(text, x, y);
  g.restore();
}

interface Crystal {
  pic: string;
  rot: number;
  flip: boolean;
  /** Seconds since it started growing; its word reaches it at `travel`. */
  age: number;
  travel: number;
  tg: Target | null;
  state: 'grow' | 'cracked' | 'fly';
  /** Seconds in the cracked or flying state. */
  t: number;
  /** Where it flew from, on the screen. */
  from?: { x: number; y: number };
}

interface Mound {
  /** Its place on the stage, from its share of the room right of Tapko (kept when the stage is resized) and a little jitter. */
  x: number;
  share: number;
  jitter: number;
  /** Its bottom. */
  y: number;
  pic: string;
  flip: boolean;
  crystal: Crystal | null;
  /** Seconds before a new crystal may grow here. */
  rest: number;
}

/**
 * Planet 2, the meadow of crystals (a stream): crystals grow out of mounds, stay big a while and
 * crack. As a crystal grows its word shows high above it and sinks toward its tip; typed in time,
 * the crystal flies into Tapko's pocket; when the word reaches it, it cracks, fades, and later a new
 * one grows there. Tapko wants as many as he can get: the end says how many he has.
 */
export class CrystalsMode extends Mode {
  readonly tapkoFeet = PATH_FEET;
  readonly pictures = [...CRYSTALS, ...CRYSTALS.map((c) => `${c}-cracked`), ...MOUNDS];
  readonly world = 'planet';
  private mounds: Mound[] = [];
  private collected = 0;
  private wait = 1;
  private endT: number | null = null;

  startLine(): string {
    return pickLine('story.crystalsStart');
  }

  start(): void {
    const r = this.L.rng;
    const n = Math.max(3, Math.min(5, Math.floor((this.L.vw - 90 - MOUND_LEFT) / 190) + 1));
    for (let i = 0; i < n; i++) {
      this.mounds.push({ x: 0, share: i / (n - 1), jitter: r.range(-18, 18), y: PATH_FEET + r.range(4, 24), pic: r.pick(MOUNDS), flip: r.chance(0.5), crystal: null, rest: r.range(0, 1.5) });
    }
    this.place();
  }

  /** The molehills spread over the room right of Tapko as the stage is now. */
  private place(): void {
    const right = this.L.vw - 90;
    for (const m of this.mounds) m.x = MOUND_LEFT + (right - MOUND_LEFT) * m.share + m.jitter;
  }

  /** Where the crystal's foot is: a quarter of the heap below its crown, so the heap covers it. */
  private foot(m: Mound): number {
    return m.y - MOUND_H * 0.68;
  }

  private size(c: Crystal): number {
    const k = Math.min(1, c.age / (c.travel * GROW_SHARE));
    return CRYSTAL_H * (this.L.reduceMotion ? 1 : 0.25 + 0.75 * ease.outBack(k));
  }

  update(dt: number): void {
    this.place();
    for (const m of this.mounds) {
      m.rest = Math.max(0, m.rest - dt);
      const c = m.crystal;
      if (!c) continue;
      if (c.state === 'grow') {
        // With no time pressure the word waits at the crystal's tip.
        c.age = this.L.noPressure ? Math.min(c.travel, c.age + dt) : c.age + dt;
        c.tg!.urgency = c.age / c.travel;
        if (!this.L.noPressure && c.age >= c.travel) this.crack(m, c);
      } else if ((c.t += dt) >= (c.state === 'fly' ? FLY : CRACKED)) {
        m.crystal = null;
        m.rest = REST;
        if (c.state === 'fly') this.L.particles.emit(TAPKO_X + 30, this.tapkoFeet - TAPKO_H * 0.3, 8, 'sparkle', ['#fff6a8', CRYSTAL_COLOR[c.pic]], 90, 6);
      }
    }
    this.L.core.prune();
    if (this.endT !== null) {
      this.endT += dt;
      return;
    }
    if (this.collected >= this.L.count) {
      if (this.mounds.every((m) => !m.crystal)) {
        this.endT = 0;
        this.L.sfx('cheer');
      }
      return;
    }
    this.wait -= dt;
    const growing = this.mounds.filter((m) => m.crystal?.state === 'grow').length;
    // A cracked crystal is replaced: only collected ones bring the level closer to its end.
    if (this.wait > 0 || growing >= this.L.maxActive || this.collected + growing >= this.L.count) return;
    const free = this.mounds.filter((m) => !m.crystal && m.rest <= 0);
    if (!free.length) return;
    const word = this.L.word();
    // Every word starts with its own letter, so the first key picks the crystal.
    if (this.L.core.active.some((tg) => tg.word[0] === word[0])) {
      this.wait = 0.2;
      return;
    }
    const r = this.L.rng;
    const pic = r.pick(CRYSTALS);
    r.pick(free).crystal = { pic, rot: r.range(-0.22, 0.22), flip: r.chance(0.5), age: 0, travel: this.L.travelTime(word), tg: this.L.core.add(word, {}), state: 'grow', t: 0 };
    this.wait = this.L.spawnGap;
  }

  /** The word reached its crystal: the crystal cracks and its word goes. */
  private crack(m: Mound, c: Crystal): void {
    this.L.core.release(c.tg!);
    c.tg = null;
    c.state = 'cracked';
    c.t = 0;
    this.L.sfx('crack');
    this.L.particles.emit(m.x, this.foot(m) - CRYSTAL_H * 0.6, 10, 'dot', [CRYSTAL_COLOR[c.pic], '#ffffff'], 120, 5);
  }

  onDone(tg: Target): void {
    const m = this.mounds.find((o) => o.crystal?.tg === tg);
    if (!m) return;
    const c = m.crystal!;
    c.tg = null;
    c.state = 'fly';
    c.t = 0;
    c.from = { x: m.x, y: this.foot(m) - this.size(c) * 0.5 };
    this.collected++;
    this.L.sfx('pop');
    this.L.particles.emit(c.from.x, c.from.y, 12, 'sparkle', ['#fff6a8', CRYSTAL_COLOR[c.pic], '#ffffff'], 140, 7);
  }

  private drawCrystal(g: G, m: Mound, c: Crystal): void {
    const fall = crystalFallback(CRYSTAL_COLOR[c.pic]);
    if (c.state === 'fly') {
      // In an arc into Tapko's pocket, shrinking.
      const k = ease.inOutQuad(Math.min(1, c.t / FLY));
      const tx = TAPKO_X + 30, ty = this.tapkoFeet - TAPKO_H * 0.3;
      const x = c.from!.x + (tx - c.from!.x) * k, y = c.from!.y + (ty - c.from!.y) * k - Math.sin(k * Math.PI) * 140;
      return drawSprite(g, c.pic, x, y, CRYSTAL_H * (1 - 0.7 * k), { rot: c.rot + k * 3, flip: c.flip }, fall);
    }
    const cracked = c.state === 'cracked';
    const alpha = cracked ? Math.max(0, 1 - Math.max(0, c.t - 0.4) / (CRACKED - 0.4)) : 1;
    // A soft glow of its own color sets a game crystal apart from the ones painted in the background.
    if (!cracked) {
      const h = this.size(c), cy = this.foot(m) + 10 - h * 0.5, r = h * 1.1;
      g.save();
      const glow = g.createRadialGradient(m.x, cy, 2, m.x, cy, r);
      glow.addColorStop(0, 'rgba(255,255,240,0.9)');
      glow.addColorStop(0.35, `${CRYSTAL_COLOR[c.pic]}cc`);
      glow.addColorStop(1, `${CRYSTAL_COLOR[c.pic]}00`);
      g.fillStyle = glow;
      g.fillRect(m.x - r, cy - r, r * 2, r * 2);
      g.restore();
    }
    const sh = cracked && c.t < 0.3 ? Math.sin(c.t * 70) * 3 : 0;
    drawSprite(g, cracked ? `${c.pic}-cracked` : c.pic, m.x + sh, this.foot(m) + 10, this.size(c), { ay: 1, rot: c.rot, flip: c.flip, alpha }, fall);
  }

  render(g: G): void {
    // Lower mounds are nearer: they draw last, each over its own crystal.
    for (const m of [...this.mounds].sort((a, b) => a.y - b.y)) {
      if (m.crystal && m.crystal.state !== 'fly') this.drawCrystal(g, m, m.crystal);
      drawSprite(g, m.pic, m.x, m.y, MOUND_H, { ay: 1, flip: m.flip }, moundFallback);
    }
    for (const m of this.mounds) {
      const c = m.crystal;
      if (c?.state === 'fly') this.drawCrystal(g, m, c);
      if (c?.tg) {
        // The word sinks from high above toward the crystal's tip.
        const tip = this.foot(m) + 10 - this.size(c) - 34;
        const top = VH * WORD_START;
        this.L.label(g, c.tg, m.x, top + (tip - top) * Math.min(1, c.age / c.travel));
      }
    }
    if (this.endT === null || this.endT < COUNT_LINE) return;
    const n = this.collected;
    const line = t(n === 1 ? 'story.crystalsDoneOne' : n > 1 && n < 5 ? 'story.crystalsDoneFew' : 'story.crystalsDoneMany', { n });
    const a = Math.min(1, (this.endT - COUNT_LINE) / 0.4);
    line.split('\n').forEach((l, i) => rimmed(g, l, this.L.vw / 2, VH * 0.26 + i * 56, 44, INK, a));
  }

  progress(): number {
    return this.collected / this.L.count;
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** Slips a spell takes; one more breaks it. */
export const SPELL_SLIPS = 3;
const SPELLS = 3;
/** The longest spell, the size of its words and the gap between them. */
const SPELL_MAX = 14;
const SPELL_SIZE = 36;
const SPELL_GAP = 22;
const SPELL_LINE = 54;
/** Seconds of a broken spell before it starts again, of a lit third, of the rest before the next spell, and of the crystals flying to Tapko. */
const FIZZLE = 1.3;
const LIGHT = 0.8;
const NEXT_SPELL = 1.3;
const TAKE = 1.2;
const SPELL_INK = '#4a3a6c';
/** The slips left: three different small mushrooms on the panel's top edge, their height, and seconds a lost one takes to go. */
const SHROOMS = ['obj-mushroom-red', 'obj-mushroom-gold', 'obj-mushroom-aqua'];
const SHROOM_H = 46;
/** The parasol is slim: drawn a bit taller so it reads as big as the others. */
const SHROOM_SCALE = [1, 1.3, 1];
const SHROOM_GONE = 0.5;

/** The three crystals of life: each kind, its place beside the middle one, its height and its lean (heights of the middle one: 1). */
const LIFE = [
  { pic: CRYSTALS[0], dx: -0.36, h: 0.78, rot: -0.2 },
  { pic: CRYSTALS[1], dx: 0, h: 1, rot: 0 },
  { pic: CRYSTALS[2], dx: 0.36, h: 0.78, rot: 0.2 },
];
/** A crystal still asleep: grey and dull. */
const ASLEEP = 'saturate(0.15) brightness(0.8)';

/**
 * The three crystals of life at (x, y), the middle one `size` tall, their feet at y: each asleep (grey)
 * or glowing as `lit` says (0..1), each turned a little more while it shakes (`shake`, radians).
 */
export function drawLifeCrystals(g: G, x: number, y: number, size: number, lit: number[], shake: number[] = [0, 0, 0]): void {
  LIFE.forEach((c, i) => {
    const cx = x + c.dx * size, h = c.h * size, k = lit[i];
    if (k > 0) {
      const r = h * 0.9, cy = y - h * 0.55;
      g.save();
      const glow = g.createRadialGradient(cx, cy, 2, cx, cy, r);
      glow.addColorStop(0, `rgba(255,244,190,${0.8 * k})`);
      glow.addColorStop(1, 'rgba(255,244,190,0)');
      g.fillStyle = glow;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
      g.restore();
    }
    const fall = crystalFallback(CRYSTAL_COLOR[c.pic]);
    const o = { ay: 1, rot: c.rot + shake[i] };
    if (k < 1) {
      g.save();
      g.filter = ASLEEP;
      drawSprite(g, c.pic, cx, y, h, { ...o, alpha: 1 - k }, fall);
      g.restore();
    }
    if (k > 0) drawSprite(g, c.pic, cx, y, h, { ...o, alpha: k }, fall);
  });
}

/** A small mushroom for the slips left (one of three kinds), its foot at (x, y); code-drawn while its picture is missing. */
function drawShroom(g: G, kind: number, x: number, y: number, h: number, alpha: number): void {
  if (alpha <= 0 || h <= 0) return;
  drawSprite(g, SHROOMS[kind], x, y, h * SHROOM_SCALE[kind], { ay: 0.95, alpha }, (g2, w, hh) => {
    g2.fillStyle = '#fff1d6';
    g2.fillRect(-w * 0.12, -hh * 0.1, w * 0.24, hh * 0.55);
    g2.fillStyle = '#c8553a';
    g2.beginPath();
    g2.ellipse(0, -hh * 0.1, w * 0.45, hh * 0.32, 0, Math.PI, 0);
    g2.fill();
  });
}

/** The crystals of life peek out of a big molehill on the right: its height, and the middle crystal's. */
const LIFE_MOUND_H = 120;
const LIFE_SIZE = 150;
/** Now and then one crystal shakes: the pause between, and its seconds. */
const SHAKE_EVERY = [2, 5];
const SHAKE_TIME = 0.4;

/**
 * Planet 4, the spells (copy twist): three sleeping crystals of life peek out of a molehill on the
 * right. A spell is a row of words on the panel in the middle, typed left to right; three small
 * mushrooms on the panel are the slips it takes, one goes at each slip, and at the fourth slip the
 * spell breaks and a new spell comes. A spell cast lights the next crystal with a shout; when all
 * three glow, they fly to Tapko and the level ends.
 */
export class SpellMode extends Mode {
  readonly tapkoFeet = PATH_FEET;
  readonly pictures = [...CRYSTALS, 'obj-mound-2', ...SHROOMS];
  readonly world = 'planet';
  readonly phraseWords = 1;
  private words: string[] = [];
  private at = 0;
  private slips = 0;
  private current: Target | null = null;
  /** Words of the cast spells, and the spells cast. */
  private doneWords = 0;
  private cast = 0;
  /** Seconds since each slip took a mushroom (-1: still there). */
  private shroomGone = [-1, -1, -1];
  /** Which crystal shakes, its seconds left, and the seconds until the next one does. */
  private shaking = -1;
  private shakeT = 0;
  private shakeIn = 3;
  /** Seconds since each crystal started glowing (-1: dark). */
  private light = [-1, -1, -1];
  /** Seconds until the broken spell starts again, or the next one comes; -1: none. */
  private fizzle = -1;
  private pause = -1;
  /** Seconds of the crystals flying to Tapko; null before. */
  private take: number | null = null;

  startLine(): string {
    return pickLine('story.spellStart');
  }

  start(): void {
    this.spell();
  }

  /**
   * A new spell: the level's words in three, but long enough that the spells left fill the minimum
   * time at the child's pace so far.
   */
  private spell(): void {
    const left = SPELLS - this.cast;
    let n = Math.max(3, Math.round(this.L.count / SPELLS));
    const pace = this.doneWords > 0 ? this.L.playedS / this.doneWords : 0;
    if (pace > 0) n = Math.max(n, Math.ceil((this.L.minLeft * 1.1) / pace / left));
    n = Math.min(SPELL_MAX, n);
    this.L.count = this.doneWords + n * left;
    this.words = Array.from({ length: n }, () => this.L.word(6, 1));
    this.begin();
  }

  private begin(): void {
    this.at = 0;
    this.slips = 0;
    this.shroomGone = [-1, -1, -1];
    this.current = this.L.core.add(this.words[0], {});
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.L.sfx('pop');
    this.at++;
    this.L.core.prune();
    if (this.at < this.words.length) {
      this.current = this.L.core.add(this.words[this.at], {});
      return;
    }
    this.current = null;
    this.doneWords += this.words.length;
    this.light[this.cast] = 0;
    this.cast++;
    const c = this.crystal();
    this.L.sfx('cheer');
    this.L.shout(pickLine('story.spellCast'), c.x, c.y - LIFE_SIZE - 20);
    this.L.particles.emit(c.x, c.y - LIFE_SIZE * 0.5, 26, 'sparkle', ['#fff6a8', '#ffd1f5', '#a8f0ff'], 220, 9);
    this.pause = NEXT_SPELL;
  }

  onWrong(tg: Target | null): void {
    if (!this.current || tg !== this.current) return;
    // Each slip takes a mushroom, from the left.
    if (this.slips < SPELL_SLIPS) this.shroomGone[SPELL_SLIPS - 1 - this.slips] = 0;
    if (++this.slips <= SPELL_SLIPS) return;
    // The fourth slip: the spell fizzles and starts again from its first word.
    this.L.core.release(this.current, false);
    this.L.core.prune();
    this.current = null;
    this.fizzle = FIZZLE;
    this.L.sfx('whoosh');
    this.L.hideBubble();
    this.L.say(pickLine('story.spellBroken'), 2.5);
    const p = this.panel();
    this.L.particles.emit((p.x0 + p.x1) / 2, p.y, 24, 'puff', ['#d8d0e8', '#bfb6d6', '#efeaf7'], 200, 12, 1);
  }

  update(dt: number): void {
    for (let i = 0; i < SPELLS; i++) if (this.light[i] >= 0) this.light[i] += dt;
    for (let i = 0; i < SPELL_SLIPS; i++) if (this.shroomGone[i] >= 0) this.shroomGone[i] += dt;
    // Now and then one of the crystals gives a little shake.
    if (this.shaking >= 0 && (this.shakeT -= dt) <= 0) this.shaking = -1;
    if (this.shaking < 0 && (this.shakeIn -= dt) <= 0) {
      this.shaking = this.L.rng.int(0, SPELLS - 1);
      this.shakeT = SHAKE_TIME;
      this.shakeIn = this.L.rng.range(SHAKE_EVERY[0], SHAKE_EVERY[1]);
    }
    // A broken spell is gone: a new one of the same length comes.
    if (this.fizzle >= 0 && (this.fizzle -= dt) < 0) {
      this.words = this.words.map(() => this.L.word(6, 1));
      this.begin();
    }
    if (this.pause >= 0 && (this.pause -= dt) < 0) {
      if (this.cast < SPELLS) this.spell();
      else {
        this.take = 0;
        this.L.sfx('whoosh');
        this.L.setMood('happy', 2);
      }
    }
    if (this.take !== null) this.take += dt;
  }

  /** The molehill's foot on the right. */
  private crystal(): { x: number; y: number } {
    return { x: this.L.vw - 150, y: PATH_FEET + 14 };
  }

  /** The spell panel between Tapko and the crystals. */
  private panel(): { x0: number; x1: number; y: number } {
    return { x0: TAPKO_X + 150, x1: this.L.vw - 290, y: VH * 0.32 };
  }

  /** The spell's words in lines that fit the panel: each word's center and line. */
  private layout(g: G, width: number): { x: number; line: number; w: number }[] {
    const out: { x: number; line: number; w: number }[] = [];
    let x = 0, line = 0;
    for (const w of this.words.map((word) => wordBox(g, word, SPELL_SIZE).w)) {
      if (x > 0 && x + w > width) {
        x = 0;
        line++;
      }
      out.push({ x: x + w / 2, line, w });
      x += w + SPELL_GAP;
    }
    return out;
  }

  render(g: G): void {
    this.drawCrystals(g);
    if (this.take !== null) return;
    const p = this.panel();
    const width = p.x1 - p.x0 - 60;
    const lay = this.layout(g, width);
    const lines = (lay[lay.length - 1]?.line ?? 0) + 1;
    const h = lines * SPELL_LINE + 70;
    g.save();
    g.globalAlpha = this.fizzle >= 0 ? 0.6 : 1;
    g.fillStyle = 'rgba(250,246,255,0.92)';
    g.strokeStyle = '#9b86c9';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(p.x0, p.y - h / 2, p.x1 - p.x0, h, 22);
    g.fill();
    g.stroke();
    g.restore();
    // The slips the spell still takes: small mushrooms growing from the panel's top edge; a lost one shrinks away.
    for (let i = 0; i < SPELL_SLIPS; i++) {
      const k = this.shroomGone[i] < 0 ? 0 : Math.min(1, this.shroomGone[i] / SHROOM_GONE);
      drawShroom(g, i, p.x1 - 46 - i * 46, p.y - h / 2 + 6, SHROOM_H * (1 - k * 0.6), 1 - k);
    }
    if (this.fizzle >= 0 || this.pause >= 0) return;
    // Each line is centred in the panel.
    const lineW = (l: number) => {
      const ws = lay.filter((o) => o.line === l);
      return ws.length ? ws[ws.length - 1].x + ws[ws.length - 1].w / 2 : 0;
    };
    const y0 = p.y - ((lines - 1) * SPELL_LINE) / 2 + 12;
    lay.forEach((o, i) => {
      const x = (p.x0 + p.x1) / 2 - lineW(o.line) / 2 + o.x, y = y0 + o.line * SPELL_LINE;
      if (i === this.at && this.current) return this.L.label(g, this.current, x, y, SPELL_SIZE);
      g.save();
      g.font = `600 ${SPELL_SIZE}px ${fontFamily()}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = SPELL_INK;
      g.globalAlpha = i < this.at ? 1 : 0.35;
      g.fillText(this.words[i], x, y);
      g.restore();
    });
  }

  /** The crystals peeking out of their molehill, each lit one glowing; at the end they fly to Tapko. */
  private drawCrystals(g: G): void {
    const c = this.crystal();
    const lit = this.light.map((t) => (t < 0 ? 0 : Math.min(1, t / LIGHT)));
    const shake = [0, 1, 2].map((i) => (i === this.shaking ? Math.sin(this.t * 40) * 0.06 * (this.shakeT / SHAKE_TIME) : 0));
    if (this.take === null) {
      drawLifeCrystals(g, c.x, c.y - LIFE_MOUND_H * 0.55, LIFE_SIZE, lit, shake);
      drawSprite(g, 'obj-mound-2', c.x, c.y, LIFE_MOUND_H, { ay: 1 }, moundFallback);
      return;
    }
    // They rise out of the molehill and fly to Tapko, shrinking.
    const k = ease.inOutQuad(Math.min(1, this.take / TAKE));
    if (k < 1) {
      const fx = c.x, fy = c.y - LIFE_MOUND_H * 0.55, tx = TAPKO_X + 30, ty = this.tapkoFeet - TAPKO_H * 0.25;
      drawLifeCrystals(g, fx + (tx - fx) * k, fy + (ty - fy) * k - Math.sin(k * Math.PI) * 120, LIFE_SIZE * (1 - 0.8 * k), lit);
    }
    drawSprite(g, 'obj-mound-2', c.x, c.y, LIFE_MOUND_H, { ay: 1 }, moundFallback);
  }

  progress(): number {
    return Math.min(1, (this.doneWords + (this.cast < SPELLS ? this.at : 0)) / this.L.count);
  }

  get finished(): boolean {
    return (this.take ?? 0) > TAKE + 0.6;
  }
}
