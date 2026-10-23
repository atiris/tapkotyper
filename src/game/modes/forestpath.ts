import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { drawSprite, fontFamily, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';
import { HeroMode } from './planet';

const BIRD_COLORS = ['#7fb2f0', '#f3a46b', '#f7d154', '#a6d98a', '#f4a6b8'];
/** Most birds drawn flying along with Tapko. */
const FLOCK_MAX = 6;

/** A round little bird: the picture, else a body, a wing, an eye and a beak. */
export function drawBird(g: G, x: number, y: number, size: number, color: string, flap = 0, flip = false): void {
  drawSprite(g, 'obj-bird', x, y, size, { flip }, (g2, w) => {
    const r = w * 0.36;
    g2.fillStyle = color;
    g2.beginPath();
    g2.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
    g2.fill();
    g2.fillStyle = 'rgba(255,255,255,0.45)';
    g2.beginPath();
    g2.ellipse(-r * 0.15, -r * 0.1 - flap * r * 0.5, r * 0.5, r * 0.3, -0.4 - flap, 0, Math.PI * 2);
    g2.fill();
    g2.fillStyle = '#ffb347';
    g2.beginPath();
    g2.moveTo(-r * 0.95, -r * 0.05);
    g2.lineTo(-r * 1.3, r * 0.08);
    g2.lineTo(-r * 0.9, r * 0.2);
    g2.fill();
    g2.fillStyle = '#3a2a3e';
    g2.beginPath();
    g2.arc(-r * 0.5, -r * 0.25, r * 0.1, 0, Math.PI * 2);
    g2.fill();
  });
}

function drawBranch(g: G, x: number, y: number): void {
  g.save();
  g.strokeStyle = '#7a5a3e';
  g.lineWidth = 12;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - 80, y + 4);
  g.quadraticCurveTo(x, y - 6, x + 90, y + 10);
  g.stroke();
  g.fillStyle = '#6fae5a';
  for (const dx of [-60, 70]) {
    g.beginPath();
    g.ellipse(x + dx, y - 4, 18, 9, dx > 0 ? -0.4 : 0.4, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/**
 * World 12: birds on branches sing their words (dictation). A typed word lets the bird
 * fly along with Tapko; a missed one just keeps singing in its tree as the path goes on.
 */
export class BirdsMode extends ApproachMode {
  readonly world = 'forestpath';
  /** Level 1 starts with single short words. */
  readonly phraseWords: number = this.L.def.variant === 'short' ? 1 : 2;
  private flock = 0;

  constructor(L: LevelRuntime) {
    super(L);
    this.waitGap = 260;
  }

  protected maxLen(): number | undefined {
    return this.L.def.variant === 'short' ? 5 : undefined;
  }

  makeMover(word: string): Mover {
    const x = this.L.vw + 90;
    return {
      x, y: this.L.rng.range(VH * 0.3, VH * 0.56), vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0,
      sprite: 'obj-bird', size: 90, color: this.L.rng.pick(BIRD_COLORS), flap: 0,
    };
  }

  protected scrollSpeed(): number {
    return 40;
  }

  protected onLeave(m: Mover): void {
    m.vx = -380;
    m.vy = -220;
    m.vr = 0;
    this.L.sfx('note');
  }

  protected onPass(m: Mover): void {
    // It stays on its branch and goes by with the trees.
    m.vy = 0;
  }

  protected moveGone(m: Mover, dt: number): void {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.flap += dt * 14;
    m.fade = Math.min(1, m.fade + dt * (m.state === 'pass' ? 0.5 : 1.2));
    if (m.state === 'leave' && m.fade >= 1 && !m.joined) {
      m.joined = true;
      this.flock++;
    }
  }

  drawMover(g: G, m: Mover): void {
    if (m.state !== 'leave') drawBranch(g, m.x, m.y + m.size * 0.4);
    drawBird(g, m.x, m.y + (m.state === 'come' ? Math.sin(m.age * 6) * 3 : 0), m.size, m.color, m.state === 'leave' ? Math.abs(Math.sin(m.flap)) : 0);
  }

  render(g: G): void {
    super.render(g);
    // The birds that flew along circle above Tapko.
    for (let i = 0; i < Math.min(FLOCK_MAX, this.flock); i++) {
      const a = this.t * 1.4 + (i / FLOCK_MAX) * Math.PI * 2;
      drawBird(g, this.playerX - 40 + Math.cos(a) * 90, VH * 0.36 + Math.sin(a) * 30, 44, BIRD_COLORS[i % BIRD_COLORS.length], Math.abs(Math.sin(this.t * 12 + i)), Math.sin(a) > 0);
    }
  }
}

/**
 * Super-obstacle of the forest path: the owl's riddles. Each riddle is a short sentence
 * dictated part by part; the parts typed so far stand in the owl's speech bubble.
 */
export class OwlMode extends HeroMode {
  readonly world = 'forestpath';
  private parts: string[] = [];
  private typedParts: string[] = [];
  private part: Target | null = null;
  private riddles = 0;
  private end = 0;

  intro(): string {
    return t('story.owlIntro');
  }

  start(): void {
    this.heroY = VH * 0.8;
    this.nextRiddle();
  }

  private nextRiddle(): void {
    this.parts = this.L.word(undefined, 4, 3).split(' ');
    this.typedParts = [];
    this.nextPart();
  }

  private nextPart(): void {
    this.part = this.L.core.add(this.parts[this.typedParts.length], {});
  }

  update(dt: number): void {
    super.update(dt);
    if (this.riddles >= this.L.count) this.end += dt;
  }

  onDone(tg: Target): void {
    if (tg !== this.part) return;
    this.typedParts.push(tg.word);
    this.L.core.prune();
    this.part = null;
    if (this.typedParts.length < this.parts.length) return this.nextPart();
    this.riddles++;
    this.happy();
    this.L.hooray();
    this.L.particles.emit(this.L.vw * 0.7, VH * 0.4, 16, 'leaf', ['#a6e3c9', '#ffe27a', '#f7a8c9'], 170, 8);
    if (this.riddles >= this.L.count) this.L.say(pickLine('story.owlSolved'), 3);
    else this.L.tweens.add(0.8, () => undefined, undefined, () => this.nextRiddle());
  }

  render(g: G): void {
    const x = this.L.vw * 0.72, y = VH * 0.5;
    drawBranch(g, x, y + 90);
    drawSprite(g, 'obj-owl', x, y, 200, { rot: Math.sin(this.t * 1.2) * 0.03 }, (g2, w) => {
      const r = w * 0.36;
      g2.fillStyle = '#a07a58';
      g2.beginPath();
      g2.ellipse(0, r * 0.1, r, r * 1.1, 0, 0, Math.PI * 2);
      g2.fill();
      g2.fillStyle = '#e8d2b0';
      g2.beginPath();
      g2.ellipse(0, r * 0.4, r * 0.6, r * 0.6, 0, 0, Math.PI * 2);
      g2.fill();
      for (const side of [-1, 1]) {
        g2.fillStyle = '#ffffff';
        g2.beginPath();
        g2.arc(side * r * 0.4, -r * 0.35, r * 0.3, 0, Math.PI * 2);
        g2.fill();
        g2.fillStyle = '#3a2a3e';
        g2.beginPath();
        g2.arc(side * r * 0.4, -r * 0.33, r * 0.13, 0, Math.PI * 2);
        g2.fill();
      }
      g2.fillStyle = '#ffb347';
      g2.beginPath();
      g2.moveTo(-r * 0.1, -r * 0.1);
      g2.lineTo(r * 0.1, -r * 0.1);
      g2.lineTo(0, r * 0.12);
      g2.fill();
    });
    // The riddle so far, in the owl's bubble.
    if (this.typedParts.length) {
      const text = this.typedParts.join(' ');
      g.save();
      g.font = `600 30px ${fontFamily()}`;
      const w = Math.min(this.L.vw * 0.8, g.measureText(text).width + 40);
      const bx = Math.min(this.L.vw - w / 2 - 10, x), by = VH * 0.12;
      g.fillStyle = 'rgba(255,253,246,0.92)';
      g.beginPath();
      g.roundRect(bx - w / 2, by - 30, w, 56, 20);
      g.fill();
      g.fillStyle = '#4a3a52';
      g.textAlign = 'center';
      g.fillText(text, bx, by + 10, w - 30);
      g.restore();
    }
    if (this.part) this.L.label(g, this.part, x - 30, VH * 0.27, 44);
    this.drawHero(g);
  }

  progress(): number {
    // A solved riddle already counts in `riddles`.
    const part = this.typedParts.length < this.parts.length ? this.typedParts.length / this.parts.length : 0;
    return Math.min(1, (this.riddles + part) / this.L.count);
  }

  get finished(): boolean {
    return this.end > 1.2;
  }
}
