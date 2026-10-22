import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, type G } from '../../gfx/draw';
import { Mode } from '../mode';
import type { Target } from '../typing';
import { BeatMode } from './workshop';

/** Bolt's head, where a drop that was not caught lands. */
const HEAD = VH - 120;
/** Seconds between two "that tickles" lines. */
const TICKLE_GAP = 6;

/** Tapko's umbrella over Bolt: the picture, else a red canopy on a handle. */
function drawUmbrella(g: G, x: number, y: number, size: number, open: number): void {
  drawSprite(g, 'obj-umbrella', x, y, size, { sx: 0.3 + open * 0.7 }, (g2, w, h) => {
    const r = Math.min(w, h) * 0.48;
    g2.fillStyle = '#e5534b';
    g2.strokeStyle = '#8a2f2a';
    g2.lineWidth = 4;
    g2.beginPath();
    g2.arc(0, r * 0.2, r, Math.PI, 0);
    g2.closePath();
    g2.fill();
    g2.stroke();
    g2.beginPath();
    g2.moveTo(0, r * 0.2);
    g2.lineTo(0, r * 0.9);
    g2.stroke();
  });
}

const SUN_X = 0.9;
const WALK_FROM = 0.35;
const WALK_TO = 0.72;

/** Where Bolt stands: from the left of the street toward the sun as the rain thins (`walk` 0..1). */
export function rainWalkX(vw: number, walk: number): number {
  return vw * (WALK_FROM + (WALK_TO - WALK_FROM) * Math.min(1, Math.max(0, walk)));
}

/**
 * World 8: raindrops fall toward Bolt, who must not rust. A typed drop is caught under
 * Tapko's umbrella; a missed one lands on Bolt, who shakes like a dog and giggles.
 */
export class RainMode extends Mode {
  readonly world = 'raintown';
  private spawned = 0;
  private resolved = 0;
  private spawnTimer = 0.8;
  private umbrella = 0;
  private lastTickle = -TICKLE_GAP;
  /** 0..1: how far Bolt has walked toward the sun; follows the thinning rain smoothly. */
  private walk = 0;

  friendSpot(): { x: number; y: number } {
    return { x: rainWalkX(this.L.vw, this.walk), y: VH - 6 };
  }

  update(dt: number): void {
    const L = this.L;
    const core = L.core;
    const bx = this.friendSpot().x;
    this.spawnTimer -= dt;
    if (this.spawned < L.def.count && this.spawnTimer <= 0 && core.active.length < L.maxActive) {
      const word = L.word();
      const x = bx + L.rng.range(-320, 320);
      const startY = -50;
      const stopY = HEAD - 200;
      core.add(word, { x, y: startY, vy: (HEAD - startY) / L.travelTime(word), vx: 0, state: 'fall', fade: 0, stopY, size: L.rng.range(70, 90) });
      this.spawned++;
      this.spawnTimer = L.spawnGap;
    }
    for (const tg of core.targets) {
      const d = tg.data;
      if (d.state === 'fall') {
        d.y = Math.min(L.noPressure ? d.stopY : Infinity, d.y + d.vy * dt);
        // Drops drift toward Bolt as they fall.
        d.x += (bx - d.x) * dt * 0.35;
        tg.urgency = d.y;
        if (d.y >= HEAD) {
          d.state = 'splash';
          core.release(tg);
          this.spawned--;
          this.wet(d);
        }
      } else {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 600 * dt;
        d.fade = Math.min(1, d.fade + dt * 2);
      }
    }
    this.umbrella = Math.max(0, this.umbrella - dt * 0.9);
    this.walk += (this.progress() - this.walk) * Math.min(1, dt * 2.5);
    core.prune((tg) => tg.data.fade < 1);
    this.scroll += dt * 10;
  }

  /** A drop on Bolt: no failure, he just shakes it off. */
  private wet(d: any): void {
    d.vx = 0;
    d.vy = -60;
    this.L.setRobotMood('wet', 1.6);
    this.L.particles.emit(d.x, HEAD, 10, 'dot', ['#8fd3ff', '#d6f0ff'], 160, 6);
    this.L.sfx('pop');
    if (this.t - this.lastTickle > TICKLE_GAP) {
      this.lastTickle = this.t;
      this.L.say(pickLine('story.rainTickle'), 2.5);
    }
  }

  onDone(tg: Target): void {
    const d = tg.data;
    d.state = 'caught';
    this.resolved++;
    this.umbrella = 1;
    // The drop rolls off the umbrella's edge.
    d.vx = (d.x < this.friendSpot().x ? -1 : 1) * this.L.rng.range(160, 240);
    d.vy = -220;
    this.L.particles.emit(d.x, d.y, 10, 'sparkle', ['#bff3ff', '#ffffff'], 150, 7);
  }

  render(g: G): void {
    this.drawSun(g);
    const b = this.friendSpot();
    if (this.umbrella > 0) {
      g.save();
      g.globalAlpha = Math.min(1, this.umbrella * 2) * this.L.toolAlpha;
      drawUmbrella(g, b.x, HEAD - 70, 200, ease.outBack(Math.min(1, (1 - this.umbrella) * 5 + 0.2)));
      g.restore();
    }
    for (const tg of this.L.core.targets) {
      const d = tg.data;
      g.save();
      g.globalAlpha = 1 - d.fade;
      drawSprite(g, 'obj-raindrop', d.x, d.y, d.size, {}, blob('#8fd3ff', true));
      g.restore();
    }
    for (const tg of this.L.core.targets) if (tg.data.state === 'fall') this.L.label(g, tg, tg.data.x, Math.max(40, tg.data.y - 70));
  }

  /** The sun waits at the end of the street and shines brighter as the rain thins. */
  private drawSun(g: G): void {
    const x = this.L.vw * SUN_X, y = VH * 0.24, k = this.walk;
    g.save();
    g.globalAlpha = 0.35 + 0.65 * k;
    g.fillStyle = '#ffd84a';
    g.beginPath();
    g.arc(x, y, 50 + 14 * k, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffd84a';
    g.lineWidth = 6;
    g.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + this.t * 0.2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 76, y + Math.sin(a) * 76);
      g.lineTo(x + Math.cos(a) * (76 + 24 * k), y + Math.sin(a) * (76 + 24 * k));
      g.stroke();
    }
    g.restore();
  }

  progress(): number {
    return this.resolved / this.L.def.count;
  }

  get finished(): boolean {
    return this.spawned >= this.L.def.count && this.L.core.targets.length === 0;
  }
}

/** Super-obstacle of the rainy town: a grumpy storm cloud calmed by a steady rhythm. */
export class StormMode extends BeatMode {
  readonly world = 'raintown';
  protected readonly doneLine = 'story.stormCalm';

  protected drawScene(g: G, k: number): void {
    const x = this.L.vw * 0.72, y = VH * 0.28;
    // Rain under the cloud thins out as it calms.
    g.save();
    g.strokeStyle = 'rgba(150,200,255,0.7)';
    g.lineWidth = 3;
    const lines = Math.round(18 * (1 - k));
    for (let i = 0; i < lines; i++) {
      const lx = x - 150 + ((i * 37) % 300);
      const ly = y + 60 + ((this.t * 300 + i * 53) % (VH - y - 80));
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx - 6, ly + 22);
      g.stroke();
    }
    g.restore();
    if (k >= 1) {
      g.save();
      g.globalAlpha = Math.min(1, this.end);
      g.fillStyle = '#ffd84a';
      g.beginPath();
      g.arc(x + 120, y - 40, 60, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.save();
    g.globalAlpha = 1 - Math.min(1, this.end) * 0.6;
    drawSprite(g, 'obj-storm-cloud', x, y, 240 * (1 - k * 0.4), { rot: Math.sin(this.t * (6 - k * 5)) * 0.04 * (1 - k) }, blob(k > 0.6 ? '#c9d3df' : '#8d98a8', true));
    g.restore();
  }
}
