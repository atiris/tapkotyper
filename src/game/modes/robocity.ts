import { app, pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { type G, drawSprite, drawWord, roundRect } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { activeKeys } from '../../learning/lessons';
import { gateCode } from '../gate';
import type { Target } from '../typing';
import { HeroMode } from './planet';

/** A door: the picture, else a rounded metal door that slides open. */
function drawDoor(g: G, name: string, x: number, y: number, h: number, open: number): void {
  drawSprite(g, open >= 1 ? `${name}-open` : name, x, y, h, { ay: 1 }, (g2, w, hh) => {
    g2.fillStyle = '#ffe9b0';
    roundRect(g2, -w * 0.32, -hh / 2, w * 0.64, hh, w * 0.3);
    g2.fill();
    g2.fillStyle = '#b8c4d4';
    g2.strokeStyle = '#4a5a6e';
    g2.lineWidth = 5;
    roundRect(g2, -w * 0.32, -hh / 2, w * 0.64 * (1 - open * 0.9), hh, w * 0.3);
    g2.fill();
    g2.stroke();
  });
}

/** A keypad panel, lit green when its password is typed. */
function drawPanel(g: G, x: number, y: number, lit: boolean): void {
  drawSprite(g, 'obj-panel', x, y, 70, {}, (g2, w, h) => {
    g2.fillStyle = '#d8dee8';
    g2.strokeStyle = '#4a5a6e';
    g2.lineWidth = 3;
    roundRect(g2, -w * 0.3, -h * 0.4, w * 0.6, h * 0.8, 8);
    g2.fill();
    g2.stroke();
    g2.fillStyle = '#26324a';
    g2.fillRect(-w * 0.2, -h * 0.3, w * 0.4, h * 0.2);
  });
  g.save();
  g.fillStyle = lit ? '#5fe08a' : '#ff8a65';
  g.shadowColor = g.fillStyle;
  g.shadowBlur = lit ? 16 : 6;
  g.beginPath();
  g.arc(x + 26, y - 22, 7, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

interface Door {
  panels: Target[];
  open: number;
}

/**
 * World 9: doors with locked panels on the way through the robot city. Each panel shows
 * a password; when all panels of a door are typed it opens with a chime and the friends walk on.
 */
export class DoorsMode extends HeroMode {
  readonly world = 'robocity';
  private door: Door | null = null;
  private doorX = 0;
  private offset = 0;
  private busy = false;
  private finishT = 0;
  private walk = 0;

  start(): void {
    this.heroY = VH * 0.8;
    this.place();
  }

  /** Most panels on one door. */
  private get maxPanels(): number {
    return Math.max(1, Math.min(3, Number(this.L.def.variant) || 1));
  }

  private place(): void {
    const left = this.L.def.count - this.done;
    if (left <= 0) return;
    const n = Math.min(left, this.L.rng.int(1, this.maxPanels));
    this.doorX = this.L.vw * 0.6;
    this.offset = 0;
    this.door = {
      open: 0,
      panels: Array.from({ length: n }, (_, i) => this.L.core.add(this.L.word(7, 1), { y: VH * 0.26 + i * 105 })),
    };
  }

  update(dt: number): void {
    super.update(dt);
    if (this.door && this.door.panels.every((p) => p.done)) this.door.open = Math.min(1, this.door.open + dt * 2);
    if (this.done >= this.L.def.count && !this.busy) this.finishT += dt;
  }

  onDone(tg: Target): void {
    const door = this.door;
    if (!door?.panels.includes(tg)) return;
    this.done++;
    this.L.sfx('click');
    if (!door.panels.every((p) => p.done)) return;
    this.busy = true;
    this.happy();
    this.L.sfx('cheer');
    if (this.L.rng.chance(0.4)) this.L.say(pickLine('story.doorOpen'), 2.5);
    const dist = this.L.vw * 0.5;
    const start = this.scroll;
    this.L.tweens.add(1.6, (k) => {
      this.scroll = start + dist * k;
      this.offset = -dist * k;
      this.walk = k;
    }, ease.inOutQuad, () => {
      this.walk = 0;
      this.busy = false;
      this.door = null;
      this.L.core.prune();
      this.place();
    });
  }

  render(g: G): void {
    const door = this.door;
    if (door) {
      const x = this.doorX + this.offset;
      drawDoor(g, 'obj-door', x, VH * 0.82, 320, door.open);
      for (const p of door.panels) {
        drawPanel(g, x + 150, p.data.y + 40, p.done);
        if (!p.done) this.L.label(g, p, x + 150, p.data.y, 36);
      }
    }
    this.jump = this.busy ? Math.abs(Math.sin(this.walk * Math.PI * 4)) * 0.25 : this.jump;
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.def.count;
  }

  get finished(): boolean {
    return this.finishT > 0.6;
  }
}

/**
 * Super-obstacle: the main gate wants its whole long code without a single mistake. The
 * code shows at once, one panel per group in two rows; each typed group lights a part of
 * the ring. A wrong key darkens it all and the same code starts again. No timer runs.
 */
export class GateMode extends HeroMode {
  readonly world = 'robocity';
  readonly wrongSfx = 'bzzt';
  private code: string[] = [];
  private lit = 0;
  private group: Target | null = null;
  private opened = 0;
  private restarts = 0;
  /** Seconds left of the soft red flash after a restart. */
  private flash = 0;

  intro(): string {
    return t('story.gateIntro');
  }

  start(): void {
    this.heroY = VH * 0.8;
    const p = app.profile!;
    this.code = gateCode(activeKeys(p), this.L.def.count, p.settings.noDiacritics, this.L.rng);
    this.next();
  }

  private next(): void {
    this.group = this.L.core.add(this.code[this.lit], {});
  }

  update(dt: number): void {
    super.update(dt);
    this.flash = Math.max(0, this.flash - dt);
    if (this.lit >= this.code.length) this.opened = Math.min(1, this.opened + dt * 0.8);
  }

  onDone(tg: Target): void {
    if (tg !== this.group) return;
    this.lit++;
    this.happy();
    this.L.sfx('click');
    this.L.core.prune();
    this.group = null;
    if (this.lit >= this.code.length) {
      this.L.sfx('cheer');
      this.L.say(pickLine('story.gateOpen'), 3);
    } else this.next();
  }

  /** A mistake starts the code again from its first group (nothing to lose before the first key). */
  onWrong(): void {
    super.onWrong();
    const group = this.group;
    if (!group || (this.lit === 0 && group.typed === 0)) return;
    this.lit = 0;
    this.flash = 0.6;
    this.L.core.release(group, false);
    this.L.core.prune();
    this.next();
    if (++this.restarts === 3) this.L.say(t('story.gateSlow'), 4);
  }

  render(g: G): void {
    const x = this.L.vw * 0.62, y = VH * 0.64;
    const n = this.code.length;
    g.save();
    g.globalAlpha = 1 - this.opened * 0.7;
    drawSprite(g, 'obj-gate', x, y, 280, { sx: 1 - this.opened * 0.3 }, (g2, w, h) => {
      g2.fillStyle = '#b8c4d4';
      g2.strokeStyle = '#4a5a6e';
      g2.lineWidth = 6;
      g2.beginPath();
      g2.arc(0, 0, Math.min(w, h) * 0.42, 0, Math.PI * 2);
      g2.fill();
      g2.stroke();
    });
    g.restore();
    // The glowing ring: one part per code group.
    g.save();
    g.lineWidth = 12;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2 + 0.06, a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2 - 0.06;
      g.strokeStyle = i < this.lit ? '#6ff3ff' : this.flash > 0 ? 'rgba(255,140,120,0.6)' : 'rgba(255,255,255,0.35)';
      g.shadowColor = '#6ff3ff';
      g.shadowBlur = i < this.lit ? 14 : 0;
      g.beginPath();
      g.arc(x, y, 150, a0, a1);
      g.stroke();
    }
    g.restore();
    this.drawCode(g);
    if (this.opened > 0) this.heroX = 220 + this.opened * (x - 260);
    this.drawHero(g);
  }

  /** The whole code at the top in two rows; the current group is typed in its own panel. */
  private drawCode(g: G): void {
    const n = this.code.length, cols = Math.ceil(n / 2), gap = 14;
    const w = Math.min(210, (this.L.vw * 0.94 - gap * (cols - 1)) / cols);
    const size = Math.min(40, w / 5);
    this.code.forEach((word, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = this.L.vw / 2 + (col - (cols - 1) / 2) * (w + gap), y = 60 + row * 92;
      const current = i === this.lit && !!this.group;
      g.save();
      g.fillStyle = 'rgba(24,34,56,0.55)';
      g.strokeStyle = i < this.lit ? '#6ff3ff' : current ? '#ffd76a' : this.flash > 0 ? 'rgba(255,140,120,0.8)' : 'rgba(255,255,255,0.3)';
      g.lineWidth = current ? 4 : 3;
      g.shadowColor = g.strokeStyle;
      g.shadowBlur = i < this.lit || current ? 12 : 0;
      roundRect(g, x - w / 2, y - 40, w, 80, 16);
      g.fill();
      g.stroke();
      g.restore();
      if (current) return this.L.label(g, this.group!, x, y, size);
      g.save();
      if (i > this.lit) g.globalAlpha = 0.6;
      drawWord(g, word, i < this.lit ? word.length : 0, x, y, 0, { size, highContrast: this.L.highContrast });
      g.restore();
    });
  }

  progress(): number {
    return this.code.length ? this.lit / this.code.length : 0;
  }

  get finished(): boolean {
    return this.opened >= 1;
  }
}
