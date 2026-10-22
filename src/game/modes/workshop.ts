import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { blob, drawSprite, fontFamily, type G, roundRect } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';

const PARTS: Record<string, string[]> = {
  gears: ['obj-gear', 'obj-wheel'],
  bolts: ['obj-bolt', 'obj-spring'],
  mix: ['obj-gear', 'obj-bolt', 'obj-wheel', 'obj-antenna', 'obj-spring'],
};
const PART_COLORS: Record<string, string> = { 'obj-gear': '#e8b544', 'obj-bolt': '#b9c2cc', 'obj-wheel': '#4d4a52', 'obj-antenna': '#ffd84a', 'obj-spring': '#9aa6b2' };
/** Top of the conveyor belt. */
const BELT_Y = VH - 120;
/** Seconds a part flies into the basket, and the pull down while it flies. */
const FLY = 0.7;
const GRAVITY = 1400;

/**
 * World 7: parts ride on a conveyor belt past Bolt. Typing a part's word drops it into his
 * basket; other parts just ride on.
 */
export class BeltMode extends ApproachMode {
  readonly world = 'workshop';
  private caught = 0;

  constructor(L: LevelRuntime) {
    super(L);
    this.playerX = 300;
  }

  private basket(): { x: number; y: number } {
    return { x: this.L.friendSpot().x + 95, y: VH - 40 };
  }

  makeMover(word: string): Mover {
    const sprite = this.L.rng.pick(PARTS[this.L.def.variant] ?? PARTS.mix);
    const x = this.L.vw + 70;
    const size = 90;
    return { x, y: BELT_Y - size / 2, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite, size };
  }

  protected scrollSpeed(): number {
    return 0;
  }

  protected onLeave(m: Mover): void {
    // A throw that lands in the basket after FLY seconds.
    const b = this.basket();
    m.vx = (b.x - m.x) / FLY;
    m.vy = (b.y - 30 - m.y - 0.5 * GRAVITY * FLY * FLY) / FLY;
    m.vr = 5;
    this.L.sfx('whoosh');
  }

  protected onPass(m: Mover): void {
    m.vy = 0;
  }

  protected moveGone(m: Mover, dt: number): void {
    if (m.state === 'pass') {
      // Rides on to the end of the belt.
      m.x += m.vx * dt;
      m.fade = Math.min(1, m.fade + dt * 0.6);
      return;
    }
    m.vy += GRAVITY * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.rot += m.vr * dt;
    if (m.vy > 0 && m.y >= this.basket().y - 30 && m.fade === 0) {
      m.fade = 1;
      this.caught++;
      this.L.sfx('pop');
      this.L.particles.emit(m.x, m.y, 8, 'sparkle', ['#fff6a8', '#ffffff'], 110, 7);
    }
  }

  drawMover(g: G, m: Mover): void {
    drawSprite(g, m.sprite, m.x, m.y, m.size, { rot: m.rot }, blob(PART_COLORS[m.sprite] ?? '#b9c2cc', false));
  }

  render(g: G): void {
    this.drawBelt(g);
    const b = this.basket();
    drawSprite(g, 'obj-basket', b.x, b.y, 80, {}, basketFallback);
    g.save();
    g.fillStyle = '#fff';
    g.strokeStyle = 'rgba(60,40,30,0.6)';
    g.lineWidth = 4;
    g.font = `700 24px ${fontFamily()}`;
    g.textAlign = 'center';
    g.strokeText(String(this.caught), b.x, b.y + 10);
    g.fillText(String(this.caught), b.x, b.y + 10);
    g.restore();
    super.render(g);
  }

  private drawBelt(g: G): void {
    const x0 = this.playerX - 60, w = this.L.vw - x0 + 20;
    g.save();
    g.fillStyle = '#4a4f5a';
    roundRect(g, x0, BELT_Y, w, 34, 17);
    g.fill();
    // Stripes move with the belt.
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 4;
    const shift = (this.t * 60) % 40;
    for (let x = x0 + 20 - shift; x < x0 + w - 10; x += 40) {
      g.beginPath();
      g.moveTo(x, BELT_Y + 6);
      g.lineTo(x - 10, BELT_Y + 28);
      g.stroke();
    }
    g.fillStyle = '#8d939e';
    for (let x = x0 + 24; x < x0 + w - 10; x += 70) {
      g.beginPath();
      g.arc(x, BELT_Y + 44, 12, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

function basketFallback(g: G, w: number, h: number): void {
  g.strokeStyle = '#6b6f78';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-w * 0.45, -h * 0.3);
  g.lineTo(-w * 0.35, h * 0.4);
  g.lineTo(w * 0.35, h * 0.4);
  g.lineTo(w * 0.45, -h * 0.3);
  for (let i = -3; i <= 3; i++) {
    g.moveTo(i * w * 0.12, -h * 0.3);
    g.lineTo(i * w * 0.1, h * 0.4);
  }
  g.stroke();
}

/**
 * Super-obstacles calmed by rhythm: short letter groups typed to a steady beat. A group
 * near the beat counts more sparkle, any finished group counts.
 */
export abstract class BeatMode extends Mode {
  private beat = 0;
  private period = 1;
  private group: Target | null = null;
  private groups = 0;
  protected calmed = 0;
  private flash = 0;
  private flashText = '';
  protected end = 0;
  /** Where the beat ring and its group stand. */
  protected ringX = 0.42;

  /** The narrator's line when all groups are done. */
  protected abstract readonly doneLine: string;
  /** The scene, `k` = 0..1 done. */
  protected abstract drawScene(g: G, k: number): void;

  /** Beats per minute. */
  protected tempo(): number {
    return 48 + this.L.difficulty * 4;
  }

  start(): void {
    this.period = 60 / this.tempo();
    this.next();
  }

  private next(): void {
    if (this.groups >= this.L.def.count) return;
    this.groups++;
    this.group = this.L.core.add(this.L.word(3, 1), {});
  }

  update(dt: number): void {
    const prev = this.beat;
    this.beat += dt / this.period;
    if (Math.floor(prev) !== Math.floor(this.beat) && this.calmed < this.L.def.count) this.L.sfx('beat');
    this.flash = Math.max(0, this.flash - dt * 1.5);
    if (this.calmed >= this.L.def.count) this.end += dt;
    this.scroll += dt * 8;
  }

  onDone(tg: Target): void {
    if (tg !== this.group) return;
    const phase = this.beat % 1;
    const nearBeat = Math.min(phase, 1 - phase) < 0.2;
    this.calmed++;
    this.flash = 1;
    this.flashText = nearBeat ? t('wave.onBeat') : t('wave.good');
    this.L.particles.emit(this.L.vw * 0.7, VH * 0.45, nearBeat ? 18 : 8, 'sparkle', ['#bff3ff', '#ffe8a8', '#ffd1f5'], 200, 9);
    this.L.core.prune();
    this.group = null;
    if (this.calmed >= this.L.def.count) {
      this.L.say(pickLine(this.doneLine), 3);
      this.L.setRobotMood('happy', 4);
      this.L.setFairyMood('happy', 4);
    } else this.next();
  }

  render(g: G): void {
    this.drawScene(g, this.calmed / this.L.def.count);
    const cx = this.L.vw * this.ringX, cy = VH * 0.3;
    const pulse = 1 - (this.beat % 1);
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(cx, cy, 62 + pulse * 26, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = `rgba(255,214,120,${0.25 + pulse * 0.5})`;
    g.beginPath();
    g.arc(cx, cy, 52, 0, Math.PI * 2);
    g.fill();
    g.restore();
    if (this.group) this.L.label(g, this.group, cx, cy, 40);
    if (this.flash > 0) {
      g.save();
      g.globalAlpha = this.flash;
      g.fillStyle = '#fff';
      g.font = `700 30px ${fontFamily()}`;
      g.textAlign = 'center';
      g.fillText(this.flashText, cx, cy + 120 - (1 - this.flash) * 30);
      g.restore();
    }
  }

  progress(): number {
    return this.calmed / this.L.def.count;
  }

  get finished(): boolean {
    return this.end > 1.5;
  }
}

/** Super-obstacle of the workshop: a steady rhythm charges Bolt's new battery bar by bar. */
export class BatteryMode extends BeatMode {
  readonly world = 'workshop';
  protected readonly doneLine = 'story.batteryFull';

  protected drawScene(g: G, k: number): void {
    const x = this.L.vw * 0.72, y = VH * 0.5;
    drawSprite(g, 'obj-battery', x, y, 260, {}, (g2, w, h) => {
      g2.fillStyle = '#7fd6a8';
      g2.strokeStyle = '#3d5a4a';
      g2.lineWidth = 6;
      roundRect(g2, -w * 0.25, -h * 0.42, w * 0.5, h * 0.84, 24);
      g2.fill();
      g2.stroke();
      g2.fillStyle = '#3d5a4a';
      g2.fillRect(-w * 0.08, -h * 0.5, w * 0.16, h * 0.08);
    });
    // Four charge bars light up one by one.
    const bars = Math.floor(k * 4 + 1e-6);
    for (let i = 0; i < 4; i++) {
      g.save();
      g.fillStyle = i < bars ? '#ffd84a' : 'rgba(255,255,255,0.45)';
      g.strokeStyle = 'rgba(60,50,30,0.5)';
      g.lineWidth = 3;
      roundRect(g, x - 110 + i * 56, VH * 0.86, 48, 22, 8);
      g.fill();
      g.stroke();
      g.restore();
    }
    if (k >= 1) {
      g.save();
      g.globalAlpha = Math.min(1, this.end) * 0.8;
      g.fillStyle = '#fff6a8';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + this.t;
        g.beginPath();
        g.arc(x + Math.cos(a) * 170, y + Math.sin(a) * 150, 8, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  }
}
