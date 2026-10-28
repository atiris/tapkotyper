import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { drawSprite, fontFamily, type G, wordBox } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { Mode, TAPKO_H, TAPKO_X } from '../mode';
import type { Target } from '../typing';
import { lifeCrystalFallback } from './planet';

/** The three kinds of crystal, each with its cracked picture, and their colors while the pictures are missing. */
const CRYSTALS = ['obj-crystal-amber', 'obj-crystal-rose', 'obj-crystal-aqua'];
const CRYSTAL_COLOR: Record<string, string> = { 'obj-crystal-amber': '#f2b65a', 'obj-crystal-rose': '#f3b3be', 'obj-crystal-aqua': '#9ed8e2' };
const MOUNDS = ['obj-mound-1', 'obj-mound-2'];
/** A big crystal is about 30 % of Tapko's height; a mound's height. */
const CRYSTAL_H = 80;
const MOUND_H = 58;
/** Seconds a crystal grows, flies into the pocket, lies cracked before it is gone, and a mound rests after. */
const GROW = 1.4;
const FLY = 0.7;
const CRACKED = 1.4;
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
  x: number;
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
    const left = TAPKO_X + 200, right = this.L.vw - 90;
    const n = Math.max(3, Math.min(5, Math.floor((right - left) / 190) + 1));
    for (let i = 0; i < n; i++) {
      const x = left + ((right - left) * i) / (n - 1) + r.range(-18, 18);
      this.mounds.push({ x, y: VH * r.range(0.9, 0.96), pic: r.pick(MOUNDS), flip: r.chance(0.5), crystal: null, rest: r.range(0, 1.5) });
    }
  }

  /** Where the crystal's foot is: in the mound's dip, a bit inside, so the mound covers it. */
  private foot(m: Mound): number {
    return m.y - MOUND_H * 0.62;
  }

  private size(c: Crystal): number {
    const k = Math.min(1, c.age / GROW);
    return CRYSTAL_H * (this.L.reduceMotion ? 1 : 0.25 + 0.75 * ease.outBack(k));
  }

  update(dt: number): void {
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
        if (c.state === 'fly') this.L.particles.emit(TAPKO_X + 30, VH - TAPKO_H * 0.4, 8, 'sparkle', ['#fff6a8', CRYSTAL_COLOR[c.pic]], 90, 6);
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
      const tx = TAPKO_X + 30, ty = VH - TAPKO_H * 0.4;
      const x = c.from!.x + (tx - c.from!.x) * k, y = c.from!.y + (ty - c.from!.y) * k - Math.sin(k * Math.PI) * 140;
      return drawSprite(g, c.pic, x, y, CRYSTAL_H * (1 - 0.7 * k), { rot: c.rot + k * 3, flip: c.flip }, fall);
    }
    const cracked = c.state === 'cracked';
    const alpha = cracked ? Math.max(0, 1 - Math.max(0, c.t - 0.4) / (CRACKED - 0.4)) : 1;
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
const LIFE_SIZE = 230;
const SPELL_INK = '#4a3a6c';

/**
 * Planet 4, the spells (copy twist): three dark crystals of life stand on the right. A spell is a row
 * of words on the panel in the middle, typed left to right; at its fourth slip it breaks and starts
 * again from its first word. A spell cast lights the next third of the crystals with a shout; when
 * all three glow, they fly to Tapko and the level ends.
 */
export class SpellMode extends Mode {
  readonly pictures = ['obj-life-crystal', 'obj-life-crystal-lit'];
  readonly world = 'planet';
  readonly phraseWords = 1;
  private words: string[] = [];
  private at = 0;
  private slips = 0;
  private current: Target | null = null;
  /** Words of the cast spells, and the spells cast. */
  private doneWords = 0;
  private cast = 0;
  /** Seconds since each third started glowing (-1: dark). */
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
    if (++this.slips <= SPELL_SLIPS) return;
    // The fourth slip: the spell fizzles and starts again from its first word.
    this.L.core.release(this.current, false);
    this.L.core.prune();
    this.current = null;
    this.fizzle = FIZZLE;
    this.L.sfx('whoosh');
    this.L.say(pickLine('story.spellBroken'), 2.5);
    const p = this.panel();
    this.L.particles.emit((p.x0 + p.x1) / 2, p.y, 24, 'puff', ['#d8d0e8', '#bfb6d6', '#efeaf7'], 200, 12, 1);
  }

  update(dt: number): void {
    for (let i = 0; i < SPELLS; i++) if (this.light[i] >= 0) this.light[i] += dt;
    if (this.fizzle >= 0 && (this.fizzle -= dt) < 0) this.begin();
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

  /** The crystals' foot on the right. */
  private crystal(): { x: number; y: number } {
    return { x: this.L.vw - 150, y: VH * 0.95 };
  }

  /** The spell panel between Tapko and the crystals. */
  private panel(): { x0: number; x1: number; y: number } {
    return { x0: TAPKO_X + 150, x1: this.L.vw - 290, y: VH * 0.36 };
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
    // The slips the spell still takes: small sparks in the panel's top right corner.
    for (let i = 0; i < SPELL_SLIPS; i++) {
      const on = i < SPELL_SLIPS - this.slips;
      rimmed(g, '✦', p.x1 - 30 - i * 30, p.y - h / 2 + 24, 26, on ? '#e0a92e' : '#cfc8dc');
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

  /** The dark crystals, each lit third glowing over them; at the end they fly to Tapko. */
  private drawCrystals(g: G): void {
    const c = this.crystal();
    let x = c.x, y = c.y, size = LIFE_SIZE;
    if (this.take !== null) {
      const k = ease.inOutQuad(Math.min(1, this.take / TAKE));
      const tx = TAPKO_X + 30, ty = VH - TAPKO_H * 0.35;
      x = c.x + (tx - c.x) * k;
      y = c.y + (ty - c.y) * k - Math.sin(k * Math.PI) * 120;
      size = LIFE_SIZE * (1 - 0.8 * k);
      if (k >= 1) return;
    }
    const img = sprite('obj-life-crystal');
    const w = size * (img ? img.naturalWidth / img.naturalHeight : 1);
    for (let i = 0; i < SPELLS; i++) {
      if (this.light[i] < 0) continue;
      const a = Math.min(1, this.light[i] / LIGHT);
      const gx = x - w / 2 + (w * (i + 0.5)) / SPELLS, gy = y - size * (i === 1 ? 0.6 : 0.45);
      g.save();
      const glow = g.createRadialGradient(gx, gy, 4, gx, gy, size * 0.45);
      glow.addColorStop(0, `rgba(255,240,170,${0.7 * a})`);
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = glow;
      g.fillRect(gx - size * 0.45, gy - size * 0.45, size * 0.9, size * 0.9);
      g.restore();
    }
    drawSprite(g, 'obj-life-crystal', x, y, size, { ay: 0.95 }, lifeCrystalFallback(false));
    for (let i = 0; i < SPELLS; i++) {
      if (this.light[i] < 0) continue;
      g.save();
      g.beginPath();
      g.rect(x - w / 2 + (w * i) / SPELLS, y - size * 1.2, w / SPELLS, size * 1.4);
      g.clip();
      drawSprite(g, 'obj-life-crystal-lit', x, y, size, { ay: 0.95, alpha: Math.min(1, this.light[i] / LIGHT) }, lifeCrystalFallback(true));
      g.restore();
    }
  }

  progress(): number {
    return Math.min(1, (this.doneWords + (this.cast < SPELLS ? this.at : 0)) / this.L.count);
  }

  get finished(): boolean {
    return (this.take ?? 0) > TAKE + 0.6;
  }
}
