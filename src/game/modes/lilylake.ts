import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, drawWord, type G, wordBox } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { type Target, memoryShow } from '../typing';
import { HeroMode } from './planet';

/** The pictures this world's levels draw; a level opens when they are loaded. */
const PICTURES = ['obj-frog', 'obj-lily', 'obj-lily-pad'];

/** Pads of one stretch of the lake, as parts of the stage width. */
const PADS = [0.4, 0.54, 0.68, 0.82];
const WATER_Y = VH * 0.8;

/** A lily pad, with a lily on it once it bloomed. */
export function drawPad(g: G, x: number, y: number, bloom: number): void {
  drawSprite(g, 'obj-lily-pad', x, y, 60, {}, (g2, w, h) => {
    g2.fillStyle = '#5fae6a';
    g2.beginPath();
    g2.ellipse(0, 0, w * 1.1, h * 0.4, 0, 0.2, Math.PI * 2 - 0.2);
    g2.lineTo(0, 0);
    g2.fill();
  });
  if (bloom <= 0) return;
  const k = ease.outBack(Math.min(1, bloom));
  drawSprite(g, 'obj-lily', x, y - 24 * k, 70 * k, {}, (g2, w) => {
    const r = w * 0.5;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      g2.fillStyle = i % 2 ? '#ffd1e6' : '#ffffff';
      g2.beginPath();
      g2.ellipse(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.42, r * 0.18, a, 0, Math.PI * 2);
      g2.fill();
    }
    g2.fillStyle = '#ffe27a';
    g2.beginPath();
    g2.arc(0, -r * 0.1, r * 0.16, 0, Math.PI * 2);
    g2.fill();
  });
}

/** The frog that hops across the bloomed lilies. */
function drawFrog(g: G, x: number, y: number, size: number): void {
  drawSprite(g, 'obj-frog', x, y, size, { ay: 0.9 }, (g2, w) => {
    const r = w * 0.4;
    g2.fillStyle = '#7cc15a';
    g2.beginPath();
    g2.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
    g2.fill();
    for (const side of [-1, 1]) {
      g2.fillStyle = '#7cc15a';
      g2.beginPath();
      g2.arc(side * r * 0.45, -r * 0.6, r * 0.28, 0, Math.PI * 2);
      g2.fill();
      g2.fillStyle = '#2f3a2a';
      g2.beginPath();
      g2.arc(side * r * 0.45, -r * 0.62, r * 0.11, 0, Math.PI * 2);
      g2.fill();
    }
    g2.strokeStyle = '#2f3a2a';
    g2.lineWidth = r * 0.08;
    g2.beginPath();
    g2.arc(0, -r * 0.05, r * 0.4, 0.2 * Math.PI, 0.8 * Math.PI);
    g2.stroke();
  });
}

/** Rings on the water where a word's reflection faded. */
function ripple(g: G, x: number, y: number, t: number): void {
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    g.globalAlpha = 1 - k;
    g.beginPath();
    g.ellipse(x, y, 30 + k * 90, 8 + k * 22, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

/** The frog sits on the shore by Tapko, then on the newest lily; it hops `hop` 0..1 between them. */
interface Frog {
  from: number;
  to: number;
  hop: number;
}

/**
 * World 13: a word is reflected on the water, then the water ripples and the reflection
 * fades (memory). A word typed from memory makes a lily bloom on the next pad and the frog
 * hops across; after four lilies the friends walk on along the shore.
 */
export class LiliesMode extends HeroMode {
  readonly pictures = PICTURES;
  readonly world = 'lilylake';
  /** Level 1 starts with single short words. */
  readonly phraseWords: number = this.L.def.variant === 'short' ? 1 : 2;
  private blooms: number[] = [];
  private current: Target | null = null;
  private frog: Frog = { from: -1, to: -1, hop: 1 };
  private busy = false;
  private finishT = 0;
  private offset = 0;

  start(): void {
    this.heroY = VH * 0.8;
    this.next();
  }

  private padX(i: number): number {
    return i < 0 ? this.heroX + this.heroSize * 0.75 : this.L.vw * PADS[i] + this.offset;
  }

  private next(): void {
    if (this.done >= this.L.count) return;
    this.current = this.L.core.add(this.L.word(this.L.def.variant === 'short' ? 5 : undefined), {});
  }

  update(dt: number): void {
    super.update(dt);
    this.blooms = this.blooms.map((b) => Math.min(1, b + dt * 2));
    this.frog.hop = Math.min(1, this.frog.hop + dt * 2.2);
    if (this.done >= this.L.count && !this.busy) this.finishT += dt;
    this.L.core.prune();
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.done++;
    this.happy();
    this.current = null;
    const pad = this.blooms.length;
    this.blooms.push(0.01);
    this.frog = { from: pad - 1, to: pad, hop: 0 };
    this.L.sfx('note');
    this.L.particles.emit(this.padX(pad), WATER_Y - 30, 12, 'sparkle', ['#ffd1e6', '#ffffff', '#bff3ff'], 130, 8);
    if (this.blooms.length < PADS.length || this.done >= this.L.count) return this.next();
    // Four lilies: walk on to the next stretch of the lake.
    this.busy = true;
    const dist = this.L.vw * 0.5;
    const start = this.scroll;
    this.L.tweens.add(1.4, (k) => {
      this.scroll = start + dist * k;
      this.offset = -dist * k;
    }, ease.inOutQuad, () => {
      this.busy = false;
      this.offset = 0;
      this.blooms = [];
      this.frog = { from: -1, to: -1, hop: 1 };
      this.next();
    });
  }

  render(g: G): void {
    PADS.forEach((_, i) => drawPad(g, this.padX(i), WATER_Y + (i % 2 ? 8 : -4), this.blooms[i] ?? 0));
    const f = this.frog;
    const fx = this.padX(f.from) + (this.padX(f.to) - this.padX(f.from)) * ease.inOutQuad(f.hop);
    drawFrog(g, fx, WATER_Y - 6 - Math.sin(f.hop * Math.PI) * 70, 64);
    const tg = this.current;
    if (tg) {
      const x = this.padX(this.blooms.length);
      if (!this.L.core.letters(tg)) ripple(g, x, WATER_Y - 60, this.t);
      this.L.label(g, tg, x, VH * 0.46);
    }
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return this.finishT > 0.8;
  }
}

/** One word of the long reflection and where it stands. */
interface Part {
  tg: Target;
  x: number;
  y: number;
}

/**
 * Super-obstacle of the lake: the long reflection. A whole phrase shows once on the water,
 * then it fades and is typed part by part from memory; a slip shows that part again.
 */
export class ReflectionMode extends HeroMode {
  readonly pictures = PICTURES;
  readonly world = 'lilylake';
  private parts: Part[] = [];
  private at = 0;
  private phrases = 0;
  private placed = false;
  private bloom = 0;

  intro(): string {
    return t('story.reflectionIntro');
  }

  start(): void {
    this.heroY = VH * 0.8;
    this.nextPhrase();
  }

  private nextPhrase(): void {
    const phrase = this.L.word(undefined, 5, 4);
    const show = memoryShow(phrase.length, this.L.difficulty);
    this.parts = phrase.split(' ').map((w) => {
      const tg = this.L.core.add(w, {});
      // The phrase shows as a whole, once.
      tg.showLeft = tg.showFor = show;
      return { tg, x: 0, y: 0 };
    });
    this.at = 0;
    this.placed = false;
  }

  /** Lays the words out in rows across the water. */
  private place(g: G): void {
    const size = 40, gap = 30, room = this.L.vw * 0.86;
    const rows: Part[][] = [[]];
    let width = 0;
    for (const p of this.parts) {
      const w = wordBox(g, p.tg.word, size, true).w;
      if (width + w > room && rows[rows.length - 1].length) {
        rows.push([]);
        width = 0;
      }
      rows[rows.length - 1].push(p);
      p.x = width + w / 2;
      width += w + gap;
    }
    rows.forEach((row, r) => {
      const last = row[row.length - 1];
      const total = last.x + wordBox(g, last.tg.word, size, true).w / 2;
      for (const p of row) {
        p.x += (this.L.vw - total) / 2;
        p.y = VH * 0.36 + r * 80;
      }
    });
    this.placed = true;
  }

  update(dt: number): void {
    super.update(dt);
    // Once the phrase hid, only the next part takes keys.
    const hidden = this.parts.every((p) => p.tg.showFor > 0 && (p.tg.showLeft <= 0 || p.tg.done));
    if (hidden) this.parts.forEach((p, i) => (p.tg.selectable = i === this.at));
    if (this.phrases >= this.L.count) this.bloom = Math.min(1, this.bloom + dt * 0.8);
  }

  onDone(tg: Target): void {
    if (tg !== this.parts[this.at]?.tg) return;
    this.at++;
    this.L.sfx('note');
    if (this.at < this.parts.length) return;
    this.phrases++;
    this.happy();
    this.L.hooray();
    this.L.particles.emit(this.L.vw * 0.5, VH * 0.6, 18, 'sparkle', ['#ffd1e6', '#ffffff', '#bff3ff'], 180, 9);
    this.L.core.prune();
    if (this.phrases >= this.L.count) this.L.say(pickLine('story.reflectionDone'), 3);
    else this.L.tweens.add(1, () => undefined, undefined, () => this.nextPhrase());
  }

  render(g: G): void {
    const k = this.phrases / this.L.count;
    PADS.forEach((p, i) => drawPad(g, this.L.vw * p, VH * 0.82 + (i % 2 ? 8 : -4), i < Math.round(k * PADS.length) ? 1 : this.bloom));
    if (!this.placed && this.parts.length) this.place(g);
    for (const p of this.parts) {
      if (p.tg.done) drawWord(g, p.tg.word, p.tg.word.length, p.x, p.y, 0, { size: 40, highContrast: this.L.highContrast });
      else this.L.label(g, p.tg, p.x, p.y, 40);
    }
    if (this.parts.some((p) => !p.tg.done && !this.L.core.letters(p.tg))) ripple(g, this.L.vw * 0.5, VH * 0.74, this.t);
    this.drawHero(g);
  }

  progress(): number {
    // A finished phrase already counts in `phrases`.
    const part = this.at < this.parts.length ? this.at / this.parts.length : 0;
    return Math.min(1, (this.phrases + part) / this.L.count);
  }

  get finished(): boolean {
    return this.bloom >= 1;
  }
}
