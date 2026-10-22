import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, fontFamily, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import type { Target } from '../typing';
import { HeroMode } from './planet';

const PETALS = ['#f7a8c9', '#ffd25a', '#b79be8', '#ff9f8a', '#9fd8f5'];

/** A flower bud that opens: the pictures, else petals that spread out of a green bud. */
export function drawBud(g: G, x: number, y: number, size: number, open: number, color: string): void {
  g.save();
  g.strokeStyle = '#5f9a4a';
  g.lineWidth = size * 0.06;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x - size * 0.1, y - size * 0.4, x, y - size * 0.7);
  g.stroke();
  g.restore();
  drawSprite(g, open >= 1 ? 'obj-flower-open' : 'obj-bud', x, y - size * 0.75, size * 0.7, {}, (g2, w) => {
    const r = w * 0.5;
    if (open > 0) {
      g2.fillStyle = color;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        g2.beginPath();
        g2.ellipse(Math.cos(a) * r * 0.5 * open, Math.sin(a) * r * 0.5 * open, r * 0.36, r * 0.22, a, 0, Math.PI * 2);
        g2.fill();
      }
      g2.fillStyle = '#ffe27a';
      g2.beginPath();
      g2.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      g2.fill();
    } else {
      g2.fillStyle = '#7fbf5e';
      g2.beginPath();
      g2.ellipse(0, 0, r * 0.3, r * 0.5, 0, 0, Math.PI * 2);
      g2.fill();
      g2.fillStyle = color;
      g2.beginPath();
      g2.ellipse(0, -r * 0.3, r * 0.14, r * 0.22, 0, 0, Math.PI * 2);
      g2.fill();
    }
  });
}

interface Bud {
  x: number;
  open: number;
  color: string;
}

/**
 * World 11: closed buds stand along the garden path. A typed word opens the bud, which hums
 * one note, and Tapko and Melody walk on to the next one.
 */
export class BudsMode extends HeroMode {
  readonly world = 'garden';
  readonly phraseWords = 3;
  private buds: Bud[] = [];
  private current: Target | null = null;
  private busy = false;
  private finishT = 0;
  private gap = 240;

  start(): void {
    this.heroY = VH * 0.8;
    this.next();
  }

  private next(): void {
    if (this.done >= this.L.def.count) return;
    this.buds.push({ x: this.heroX + this.gap + this.scroll, open: 0, color: PETALS[this.done % PETALS.length] });
    this.current = this.L.core.add(this.L.word(), {});
  }

  update(dt: number): void {
    super.update(dt);
    for (const b of this.buds) if (b.open > 0) b.open = Math.min(1, b.open + dt * 2.5);
    if (this.done >= this.L.def.count && !this.busy) this.finishT += dt;
    this.L.core.prune();
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.done++;
    this.busy = true;
    this.happy();
    const bud = this.buds[this.buds.length - 1];
    bud.open = 0.01;
    this.L.sfx('note');
    this.L.particles.emit(bud.x - this.scroll, VH * 0.6, 10, 'sparkle', [bud.color, '#ffffff', '#ffe27a'], 130, 8);
    this.current = null;
    this.hop(this.heroY, this.gap, () => {
      this.busy = false;
      this.next();
    });
  }

  render(g: G): void {
    for (const b of this.buds) {
      const x = b.x - this.scroll;
      if (x < -200) continue;
      // outBack(0) is not exactly 0: a closed bud stays closed.
      drawBud(g, x, VH * 0.82, 180, b.open > 0 ? ease.outBack(b.open) : 0, b.color);
    }
    if (this.current) this.L.label(g, this.current, this.buds[this.buds.length - 1].x - this.scroll, VH * 0.24);
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.def.count;
  }

  get finished(): boolean {
    return this.finishT > 0.8;
  }
}

/**
 * Super-obstacle of the garden: the big sleeping flower. Melody whispers short words one by
 * one (dictation); each typed word opens it a little, a word with a slip a little less.
 */
export class FlowerMode extends HeroMode {
  readonly world = 'garden';
  private open = 0;
  private word: Target | null = null;
  private bloom = 0;

  intro(): string {
    return t('story.flowerIntro');
  }

  start(): void {
    this.heroY = VH * 0.8;
    this.nextWord();
  }

  private nextWord(): void {
    this.word = this.L.core.add(this.L.word(5, 1), {});
  }

  update(dt: number): void {
    super.update(dt);
    if (this.open >= this.L.def.count) this.bloom = Math.min(1, this.bloom + dt * 0.7);
  }

  onDone(tg: Target): void {
    if (tg !== this.word) return;
    this.open += tg.errors === 0 && !tg.revealed ? 1 : 0.5;
    this.happy();
    this.L.sfx('note');
    this.L.particles.emit(this.L.vw * 0.62, VH * 0.45, 14, 'sparkle', ['#f7a8c9', '#ffe27a', '#ffffff'], 160, 8);
    this.L.core.prune();
    this.word = null;
    if (this.open >= this.L.def.count) {
      this.L.say(pickLine('story.flowerAwake'), 3);
      this.hop(this.heroY, 0);
    } else this.nextWord();
  }

  render(g: G): void {
    const k = Math.min(1, this.open / this.L.def.count);
    const x = this.L.vw * 0.62, y = VH * 0.84;
    const sway = Math.sin(this.t * 1.5) * 0.03;
    drawSprite(g, k >= 1 ? 'obj-big-flower-open' : 'obj-big-flower', x, y - 200, 400, { rot: sway }, (g2, w, h) => {
      g2.strokeStyle = '#5f9a4a';
      g2.lineWidth = 14;
      g2.beginPath();
      g2.moveTo(0, h / 2);
      g2.lineTo(0, -h * 0.05);
      g2.stroke();
      const r = w * 0.32;
      g2.fillStyle = '#f7a8c9';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spread = 0.25 + k * 0.75;
        g2.beginPath();
        g2.ellipse(Math.cos(a) * r * 0.55 * spread, -h * 0.18 + Math.sin(a) * r * 0.55 * spread, r * 0.4, r * 0.2, a, 0, Math.PI * 2);
        g2.fill();
      }
      g2.fillStyle = '#ffe27a';
      g2.beginPath();
      g2.arc(0, -h * 0.18, r * 0.25, 0, Math.PI * 2);
      g2.fill();
    });
    // The sleeping flower's "z" fades as it wakes.
    if (k < 1) {
      g.save();
      g.globalAlpha = (1 - k) * (0.5 + Math.sin(this.t * 2) * 0.3);
      g.fillStyle = '#ffffff';
      g.font = `700 40px ${fontFamily()}`;
      g.fillText('z', x + 120, y - 380 - (this.t * 20) % 40);
      g.restore();
    }
    if (this.bloom > 0) {
      g.save();
      g.globalAlpha = this.bloom * 0.6;
      const glow = g.createRadialGradient(x, y - 260, 20, x, y - 260, 300);
      glow.addColorStop(0, 'rgba(255,240,180,0.9)');
      glow.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = glow;
      g.fillRect(x - 300, y - 560, 600, 600);
      g.restore();
    }
    if (this.word) this.L.label(g, this.word, x, VH * 0.14, 46);
    if (this.bloom > 0) this.heroX = 220 + ease.inOutQuad(this.bloom) * (x - 300 - 220);
    this.drawHero(g);
  }

  progress(): number {
    return Math.min(1, this.open / this.L.def.count);
  }

  get finished(): boolean {
    return this.bloom >= 1;
  }
}
