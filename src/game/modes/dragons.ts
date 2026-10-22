import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, fontFamily, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { Mode } from '../mode';
import type { Target } from '../typing';

const DRAGON_COLORS = ['#7fd6a8', '#8ec5f0', '#f5d36b'];

interface Dragon {
  x: number;
  y: number;
  sprite: string;
  shield: number;
  hop: number;
}

/** World 4: rocks fall toward baby dragons; a finished word makes a shield bubble that bounces the rock away. */
export class ShieldMode extends Mode {
  readonly world = 'dragons';
  private dragons: Dragon[] = [];
  private spawned = 0;
  private resolved = 0;
  private spawnTimer = 0.8;

  start(): void {
    const n = Math.max(1, Math.min(3, Number(this.L.def.variant) || 3));
    for (let i = 0; i < n; i++) {
      const x = this.L.vw * (n === 1 ? 0.55 : 0.35 + (i * 0.45) / (n - 1));
      this.dragons.push({ x, y: VH * 0.8, sprite: `obj-dragon-baby-${(i % 3) + 1}`, shield: 0, hop: 0 });
    }
  }

  update(dt: number): void {
    const L = this.L;
    const core = L.core;
    this.spawnTimer -= dt;
    if (this.spawned < L.def.count && this.spawnTimer <= 0 && core.active.length < L.maxActive) {
      const word = L.word();
      const d = L.rng.pick(this.dragons);
      const startY = -60;
      const stopY = d.y - 220;
      core.add(word, { d, x: d.x + L.rng.range(-50, 50), y: startY, vy: (stopY + 140 - startY) / L.travelTime(word), vx: 0, rot: 0, state: 'fall', fade: 0, sprite: L.rng.chance(0.5) ? 'obj-rock-falling-1' : 'obj-rock-falling-2', stopY });
      this.spawned++;
      this.spawnTimer = L.spawnGap;
    }
    for (const tg of core.targets) {
      const r = tg.data;
      if (r.state === 'fall') {
        const limit = L.noPressure ? r.stopY : Infinity;
        r.y = Math.min(limit, r.y + r.vy * dt);
        r.x += (r.d.x - r.x) * dt * 0.3;
        tg.urgency = r.y;
        if (r.y >= r.d.y - 90) {
          // Tapko's soft bubble catches the rock: nothing bad happens.
          r.state = 'bounce';
          core.release(tg);
          this.spawned--;
          this.bounce(r, true);
        }
      } else {
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.vy += 300 * dt;
        r.rot += dt * 3;
        r.fade = Math.min(1, r.fade + dt * 0.8);
      }
    }
    for (const d of this.dragons) {
      d.shield = Math.max(0, d.shield - dt * 1.2);
      d.hop = Math.max(0, d.hop - dt * 2);
    }
    core.prune((tg) => tg.data.fade < 1);
    this.scroll += dt * 10;
  }

  private bounce(r: any, soft: boolean): void {
    r.d.shield = 1;
    r.vx = (r.x < this.L.vw / 2 ? -1 : 1) * this.L.rng.range(160, 260);
    r.vy = -420;
    this.L.particles.emit(r.x, r.y + 30, soft ? 6 : 14, 'sparkle', ['#bff3ff', '#ffe8a8', '#ffffff'], 160, 8);
    this.L.sfx('pop');
  }

  onDone(tg: Target): void {
    const r = tg.data;
    r.state = 'bounce';
    this.resolved++;
    r.d.hop = 1;
    this.bounce(r, false);
  }

  render(g: G): void {
    for (const d of this.dragons) {
      const hop = Math.sin(d.hop * Math.PI) * 30;
      drawSprite(g, d.sprite, d.x, d.y - 70 - hop, 150, { sy: 1 + Math.sin(this.t * 2.5 + d.x) * 0.02 }, blob(DRAGON_COLORS[Number(d.sprite.slice(-1)) - 1] ?? '#7fd6a8'));
      if (d.shield > 0) {
        g.save();
        g.globalAlpha = d.shield * 0.8 * this.L.toolAlpha;
        const grad = g.createRadialGradient(d.x, d.y - 80, 40, d.x, d.y - 80, 130);
        grad.addColorStop(0, 'rgba(190,240,255,0.05)');
        grad.addColorStop(0.8, 'rgba(160,230,255,0.45)');
        grad.addColorStop(1, 'rgba(255,255,255,0.9)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(d.x, d.y - 80, 130 * ease.outBack(Math.min(1, (1 - d.shield) * 4 + 0.3)), 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
    for (const tg of this.L.core.targets) {
      const r = tg.data;
      g.save();
      g.globalAlpha = 1 - r.fade;
      drawSprite(g, r.sprite, r.x, r.y, 110, { rot: r.rot }, blob('#9a8a7a', true));
      g.restore();
    }
    for (const tg of this.L.core.targets) if (tg.data.state === 'fall') this.L.label(g, tg, tg.data.x, Math.max(40, tg.data.y - 85));
  }

  progress(): number {
    return this.resolved / this.L.def.count;
  }

  get finished(): boolean {
    return this.spawned >= this.L.def.count && this.L.core.targets.length === 0;
  }
}

/** Super-obstacle: a rolling energy wave calmed by short letter groups typed to a steady beat. */
export class WaveMode extends Mode {
  readonly world = 'dragons';
  private beat = 0;
  private period = 1;
  private group: Target | null = null;
  private groups = 0;
  private calmed = 0;
  private flash = 0;
  private flashText = '';
  private end = 0;
  private dragons = ['obj-dragon-baby-1', 'obj-dragon-baby-2', 'obj-dragon-baby-3'];

  start(): void {
    this.period = 60 / (48 + this.L.difficulty * 4);
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
    this.scroll += dt * 12;
  }

  onDone(tg: Target): void {
    if (tg !== this.group) return;
    const phase = this.beat % 1;
    const nearBeat = Math.min(phase, 1 - phase) < 0.2;
    this.calmed++;
    this.flash = 1;
    this.flashText = nearBeat ? t('wave.onBeat') : t('wave.good');
    this.L.particles.emit(this.waveX(), VH * 0.6, nearBeat ? 18 : 8, 'sparkle', ['#bff3ff', '#ffe8a8', '#ffd1f5'], 200, 9);
    this.L.core.prune();
    this.group = null;
    if (this.calmed >= this.L.def.count) this.L.say(pickLine('story.waveCalm'), 3);
    else this.next();
  }

  private waveX(): number {
    const k = this.calmed / this.L.def.count;
    return this.L.vw * (0.55 + k * 0.5);
  }

  render(g: G): void {
    const vw = this.L.vw;
    const k = this.calmed / this.L.def.count;
    // The wave: a soft glowing band that shrinks as it calms.
    const wx = this.waveX();
    const height = 260 * (1 - k * 0.85);
    g.save();
    const grad = g.createLinearGradient(wx - 100, 0, vw, 0);
    grad.addColorStop(0, 'rgba(150,200,255,0.0)');
    grad.addColorStop(0.2, 'rgba(150,200,255,0.55)');
    grad.addColorStop(1, 'rgba(200,160,255,0.75)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(wx - 120, VH * 0.82);
    for (let x = wx - 120; x <= vw + 20; x += 16) {
      const crest = Math.exp(-(((x - wx) / 140) ** 2)) * height;
      g.lineTo(x, VH * 0.82 - crest - Math.sin(x / 40 + this.t * 3) * 8 * (1 - k) - 30 * (1 - k));
    }
    g.lineTo(vw + 20, VH * 0.82);
    g.closePath();
    g.fill();
    g.restore();
    if (k >= 1) {
      // A calm rainbow.
      g.save();
      g.globalAlpha = Math.min(1, this.end) * 0.6;
      ['#ff9aa2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea'].forEach((c, i) => {
        g.strokeStyle = c;
        g.lineWidth = 16;
        g.beginPath();
        g.arc(vw * 0.6, VH * 0.85, 330 - i * 16, Math.PI, 0);
        g.stroke();
      });
      g.restore();
    }
    // Dragons watching from the left.
    this.dragons.forEach((s, i) => drawSprite(g, s, 120 + i * 120, VH * 0.75 + Math.sin(this.t * 2 + i) * 4, 120, {}, blob(DRAGON_COLORS[i])));
    // Beat indicator.
    const cx = vw * 0.42, cy = VH * 0.3;
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

