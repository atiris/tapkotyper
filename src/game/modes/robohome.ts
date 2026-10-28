import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, type G } from '../../gfx/draw';
import { Mode } from '../mode';
import type { Target } from '../typing';
import { HeroMode } from './planet';

/** The pictures this world's levels draw; a level opens when they are loaded. */
const PICTURES = ['obj-box', 'obj-lamp', 'obj-lamp-on', 'obj-robot-small-1', 'obj-robot-small-2', 'obj-robot-small-3', 'obj-toaster-robot', 'obj-vacuum-robot'];

/** Home robots that wake up when their lamp is switched on, in turn. */
const HELPERS = ['obj-vacuum-robot', 'obj-toaster-robot'];
const HELPER_COLORS: Record<string, string> = { 'obj-vacuum-robot': '#9fb4cc', 'obj-toaster-robot': '#e8b98a' };
const LITTLE = ['obj-robot-small-1', 'obj-robot-small-2', 'obj-robot-small-3'];
const LITTLE_COLORS = ['#7fd1ff', '#ffd84a', '#a6e3c9'];

function drawLamp(g: G, x: number, y: number, on: number): void {
  if (on > 0) {
    g.save();
    g.globalAlpha = on;
    const glow = g.createRadialGradient(x, y - 150, 10, x, y - 150, 220);
    glow.addColorStop(0, 'rgba(255,226,150,0.85)');
    glow.addColorStop(1, 'rgba(255,226,150,0)');
    g.fillStyle = glow;
    g.fillRect(x - 230, y - 380, 460, 460);
    g.restore();
  }
  drawSprite(g, on >= 1 ? 'obj-lamp-on' : 'obj-lamp', x, y, 220, { ay: 1 }, (g2, w, h) => {
    g2.strokeStyle = '#6d5040';
    g2.lineWidth = 6;
    g2.beginPath();
    g2.moveTo(0, h / 2);
    g2.lineTo(0, -h * 0.2);
    g2.stroke();
    g2.fillStyle = on >= 1 ? '#ffe27a' : '#c9b9a6';
    g2.beginPath();
    g2.ellipse(0, -h * 0.3, w * 0.25, h * 0.16, 0, 0, Math.PI * 2);
    g2.fill();
    g2.stroke();
  });
}

interface Lamp {
  x: number;
  on: number;
  helper: string;
  wave: number;
}

/**
 * World 10: Bolt's home is dark. Tapko and Bolt walk from room to room; each typed word
 * switches on a lamp, and a home robot wakes up to wave hello.
 */
export class RoomsMode extends HeroMode {
  readonly pictures = PICTURES;
  readonly world = 'robohome';
  readonly phraseWords = 4;
  private lamps: Lamp[] = [];
  private current: Target | null = null;
  private busy = false;
  private finishT = 0;
  private gap = 260;

  start(): void {
    this.heroY = VH * 0.8;
    this.next();
  }

  private next(): void {
    if (this.done >= this.L.count) return;
    // Lamps a whole stage behind go, so staying a while does not pile them up.
    this.lamps = this.lamps.filter((l) => l.x > this.scroll - this.L.vw);
    this.lamps.push({ x: this.heroX + this.gap + this.scroll, on: 0, helper: HELPERS[this.done % HELPERS.length], wave: 0 });
    this.current = this.L.core.add(this.L.word(), {});
  }

  update(dt: number): void {
    super.update(dt);
    for (const l of this.lamps) {
      if (l.on > 0) l.on = Math.min(1, l.on + dt * 3);
      if (l.on >= 1) l.wave += dt;
    }
    if (this.done >= this.L.count && !this.busy) this.finishT += dt;
    this.L.core.prune();
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.done++;
    this.busy = true;
    this.happy();
    const lamp = this.lamps[this.lamps.length - 1];
    lamp.on = 0.01;
    this.L.sfx('pop');
    this.L.particles.emit(lamp.x - this.scroll, VH * 0.5, 12, 'sparkle', ['#fff6a8', '#ffe27a', '#ffffff'], 140, 8);
    this.current = null;
    this.hop(this.heroY, this.gap, () => {
      this.busy = false;
      this.next();
    });
  }

  render(g: G): void {
    // The rooms brighten with every lamp.
    g.save();
    g.fillStyle = `rgba(20,18,48,${0.55 * (1 - this.done / this.L.count)})`;
    g.fillRect(0, 0, this.L.vw, VH);
    g.restore();
    for (const l of this.lamps) {
      const x = l.x - this.scroll;
      if (x < -300) continue;
      drawLamp(g, x, VH * 0.82, l.on);
      if (l.on >= 1) {
        const hop = Math.abs(Math.sin(l.wave * 5)) * 14 * Math.max(0, 1 - l.wave / 2);
        drawSprite(g, l.helper, x + 110, VH * 0.78 - hop, 100, { rot: Math.sin(l.wave * 8) * 0.08 }, blob(HELPER_COLORS[l.helper], true));
      }
    }
    if (this.current) this.L.label(g, this.current, this.lamps[this.lamps.length - 1].x - this.scroll, VH * 0.18);
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return this.finishT > 0.8;
  }
}

interface Pop {
  box: number;
  sprite: number;
  up: number;
  window: number;
  state: 'rise' | 'wait' | 'happy' | 'hide';
  t: number;
}

/**
 * Super-obstacle: the family's welcome. Little robots pop out of boxes with a short word;
 * a typed one hops with hearts, a missed one waves and hides again.
 */
export class WelcomeMode extends Mode {
  readonly pictures = PICTURES;
  readonly world = 'robohome';
  private spawned = 0;
  private resolved = 0;
  private spawnTimer = 1;
  private boxes: number[] = [];
  private said = false;

  start(): void {
    this.boxes = [0.38, 0.54, 0.7, 0.86].map((k) => this.L.vw * k);
  }

  update(dt: number): void {
    const L = this.L;
    const core = L.core;
    this.spawnTimer -= dt;
    const busy = new Set(core.targets.map((tg) => tg.data.box));
    const free = this.boxes.map((_, i) => i).filter((i) => !busy.has(i));
    if (this.spawned < L.count && this.spawnTimer <= 0 && core.active.length < L.maxActive && free.length) {
      const word = L.word(4, 1);
      core.add(word, { box: L.rng.pick(free), sprite: this.spawned % LITTLE.length, up: 0, window: Math.max(2.5, L.travelTime(word) * 0.55), state: 'rise', t: 0 } satisfies Pop);
      this.spawned++;
      this.spawnTimer = L.spawnGap;
      L.sfx('pop');
    }
    for (const tg of core.targets) this.updatePop(tg, tg.data, dt);
    core.prune((tg) => tg.data.state !== 'hide' || tg.data.up > 0);
    if (this.finished && !this.said) {
      this.said = true;
      this.L.say(pickLine('story.welcomeDone'), 3);
    }
  }

  private updatePop(tg: Target, m: Pop, dt: number): void {
    m.t += dt;
    tg.urgency = 1000 - m.window + m.t;
    tg.selectable = m.up > 0.6 && (m.state === 'rise' || m.state === 'wait');
    if (m.state === 'rise') {
      m.up = Math.min(1, m.up + dt * 3);
      if (m.up >= 1) {
        m.state = 'wait';
        m.t = 0;
      }
    } else if (m.state === 'wait') {
      if (!this.L.noPressure && m.t > m.window) {
        m.state = 'hide';
        m.t = 0;
        this.L.core.release(tg);
        this.spawned--;
      }
    } else if (m.state === 'hide') {
      if (m.t > 0.9) m.up = Math.max(0, m.up - dt * 3);
    } else if (m.t > 1) {
      m.state = 'hide';
      m.t = 0.9;
    }
  }

  onDone(tg: Target): void {
    const m: Pop = tg.data;
    this.resolved++;
    m.state = 'happy';
    m.t = 0;
    this.L.particles.emit(this.boxes[m.box], VH * 0.62, 12, 'heart', ['#ff8fab', '#ffd25a', '#a6e3c9'], 150, 9, 1.2);
  }

  render(g: G): void {
    const y = VH * 0.82;
    const pops = new Map(this.L.core.targets.map((tg) => [tg.data.box as number, tg]));
    this.boxes.forEach((x, i) => {
      const tg = pops.get(i);
      if (tg) {
        const m: Pop = tg.data;
        g.save();
        g.beginPath();
        g.rect(x - 90, y - 260, 180, 230);
        g.clip();
        const hop = m.state === 'happy' ? Math.sin(Math.min(1, m.t) * Math.PI) * 30 : 0;
        const wave = m.state === 'hide' && m.t < 0.9 ? Math.sin(m.t * 18) * 0.12 : 0;
        drawSprite(g, LITTLE[m.sprite], x, y - 90 + (1 - ease.outQuad(m.up)) * 130 - hop, 110, { rot: wave }, blob(LITTLE_COLORS[m.sprite], true));
        g.restore();
      }
      drawSprite(g, 'obj-box', x, y - 20, 120, {}, blob('#c99a62', false));
    });
    for (const tg of this.L.core.targets) {
      const m: Pop = tg.data;
      if (!tg.done && !tg.gone && m.up > 0.5) this.L.label(g, tg, this.boxes[m.box], y - 230, 38);
    }
  }

  progress(): number {
    return this.resolved / this.L.count;
  }

  get finished(): boolean {
    return this.spawned >= this.L.count && this.L.core.targets.length === 0;
  }
}
