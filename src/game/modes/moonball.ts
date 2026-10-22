import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { drawSprite, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { Mode } from '../mode';
import type { Target } from '../typing';

/** The dance floor, where fireflies land. */
const FLOOR_Y = VH * 0.84;

/** A firefly: the picture, else a glowing dot with little wings. */
function drawFirefly(g: G, x: number, y: number, size: number, t: number): void {
  const glow = 0.6 + Math.sin(t * 5 + x) * 0.25;
  g.save();
  const light = g.createRadialGradient(x, y, 2, x, y, size);
  light.addColorStop(0, `rgba(255,246,168,${glow})`);
  light.addColorStop(1, 'rgba(255,246,168,0)');
  g.fillStyle = light;
  g.fillRect(x - size, y - size, size * 2, size * 2);
  g.restore();
  drawSprite(g, 'obj-firefly', x, y, size * 0.6, {}, (g2, w) => {
    g2.fillStyle = 'rgba(220,240,255,0.7)';
    for (const side of [-1, 1]) {
      g2.beginPath();
      g2.ellipse(side * w * 0.22, -w * 0.18, w * 0.2, w * 0.12, side * 0.5, 0, Math.PI * 2);
      g2.fill();
    }
    g2.fillStyle = '#fff3a0';
    g2.beginPath();
    g2.arc(0, 0, w * 0.2, 0, Math.PI * 2);
    g2.fill();
  });
}

/** The dance floor of the moonlight ball, brighter with every lit light (`k` 0..1). */
function drawFloor(g: G, vw: number, k: number, t: number): void {
  g.save();
  g.fillStyle = 'rgba(40,30,80,0.35)';
  g.beginPath();
  g.ellipse(vw * 0.5, FLOOR_Y + 30, vw * 0.42, 60, 0, 0, Math.PI * 2);
  g.fill();
  const lights = 12;
  for (let i = 0; i < lights; i++) {
    const a = (i / lights) * Math.PI * 2;
    const on = i < Math.round(k * lights);
    g.fillStyle = on ? `rgba(255,240,170,${0.7 + Math.sin(t * 3 + i) * 0.3})` : 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.arc(vw * 0.5 + Math.cos(a) * vw * 0.36, FLOOR_Y + 30 + Math.sin(a) * 46, on ? 9 : 6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

interface Fly {
  x: number;
  y: number;
  vy: number;
  stopY: number;
  state: 'drift' | 'lit' | 'landed';
  fade: number;
}

/**
 * World 15: fireflies drift down slowly, each carrying a short sentence that Melody sings
 * (dictation). A typed one lights the dance floor more; one that lands just dances on it.
 */
export class FirefliesMode extends Mode {
  readonly world = 'moonball';
  readonly phraseWords = 6;
  readonly phraseMin = 3;
  private spawned = 0;
  private resolved = 0;
  private lit = 0;
  private spawnTimer = 0.8;

  update(dt: number): void {
    const L = this.L, core = L.core;
    this.spawnTimer -= dt;
    // Sentences are long: one at a time, two for quick typists.
    if (this.spawned < L.def.count && this.spawnTimer <= 0 && core.active.length < Math.min(2, L.maxActive)) {
      const word = L.word();
      // It starts just under its sentence, so the label never hides it.
      const startY = 120;
      core.add(word, { x: L.vw * L.rng.range(0.38, 0.62), y: startY, vy: (FLOOR_Y - startY) / L.travelTime(word), stopY: VH * 0.45, state: 'drift', fade: 0 } satisfies Fly);
      this.spawned++;
      this.spawnTimer = L.spawnGap * 1.5;
    }
    for (const tg of core.targets) {
      const f = tg.data as Fly;
      if (f.state === 'drift') {
        f.y = Math.min(L.noPressure ? f.stopY : Infinity, f.y + f.vy * dt);
        f.x += Math.sin(this.t * 1.3 + tg.id) * dt * 20;
        tg.urgency = f.y;
        if (f.y >= FLOOR_Y) {
          f.state = 'landed';
          core.release(tg);
          this.spawned--;
        }
      } else {
        f.y += (f.state === 'lit' ? 1 : 0) * (FLOOR_Y - f.y) * dt * 3;
        f.fade = Math.min(1, f.fade + dt * 0.8);
      }
    }
    core.prune((tg) => (tg.data as Fly).fade < 1);
    this.scroll += dt * 6;
  }

  onDone(tg: Target): void {
    const f = tg.data as Fly;
    f.state = 'lit';
    this.resolved++;
    this.lit++;
    this.L.sfx('note');
    this.L.particles.emit(f.x, f.y, 14, 'sparkle', ['#fff6a8', '#ffffff', '#ffd1f5'], 150, 8);
  }

  render(g: G): void {
    drawFloor(g, this.L.vw, this.lit / this.L.def.count, this.t);
    for (const tg of this.L.core.targets) {
      const f = tg.data as Fly;
      g.save();
      g.globalAlpha = 1 - f.fade;
      drawFirefly(g, f.x, f.y, 60, this.t);
      g.restore();
    }
    for (const tg of this.L.core.targets) {
      const f = tg.data as Fly;
      if (f.state === 'drift') this.L.label(g, tg, f.x, Math.max(50, f.y - 70), 40);
    }
  }

  progress(): number {
    return this.resolved / this.L.def.count;
  }

  get finished(): boolean {
    return this.spawned >= this.L.def.count && this.L.core.targets.length === 0;
  }
}

/**
 * Super-obstacle of the ball: the last song. Short sentences are dictated one after another;
 * each one brings more fireflies to the dance, and at the end the whole forest sings.
 */
export class LastSongMode extends Mode {
  readonly world = 'moonball';
  readonly phraseWords = 4;
  readonly phraseMin = 3;
  private line: Target | null = null;
  private sung = 0;
  private end = 0;

  intro(): string {
    return t('story.lastSongIntro');
  }

  start(): void {
    this.next();
  }

  private next(): void {
    this.line = this.L.core.add(this.L.word(), {});
  }

  update(dt: number): void {
    if (this.sung >= this.L.def.count) this.end += dt;
    this.scroll += dt * 6;
  }

  onDone(tg: Target): void {
    if (tg !== this.line) return;
    this.sung++;
    this.L.sfx('note');
    this.L.particles.emit(this.L.vw * 0.5, VH * 0.4, 16, 'sparkle', ['#fff6a8', '#ffd1f5', '#bff3ff'], 180, 8);
    this.L.core.prune();
    this.line = null;
    if (this.sung >= this.L.def.count) {
      this.L.sfx('reward');
      this.L.say(pickLine('story.lastSongDone'), 3);
    } else this.next();
  }

  render(g: G): void {
    const k = this.sung / this.L.def.count;
    drawFloor(g, this.L.vw, k, this.t);
    // Fireflies dance in a ring, more with every sung line.
    const n = Math.round(k * 14);
    for (let i = 0; i < n; i++) {
      const a = this.t * 0.6 + (i / 14) * Math.PI * 2;
      drawFirefly(g, this.L.vw * 0.5 + Math.cos(a) * this.L.vw * 0.3, VH * 0.6 + Math.sin(a) * 90, 46, this.t + i);
    }
    if (this.end > 0) {
      g.save();
      g.globalAlpha = Math.min(1, this.end) * 0.35;
      g.fillStyle = '#fff6d0';
      g.fillRect(0, 0, this.L.vw, VH);
      g.restore();
    }
    if (this.line) this.L.label(g, this.line, this.L.vw * 0.5, VH * 0.3, 44);
  }

  progress(): number {
    return Math.min(1, this.sung / this.L.def.count);
  }

  get finished(): boolean {
    return this.end > 1.8;
  }
}
