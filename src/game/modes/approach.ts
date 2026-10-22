import { VH } from '../../engine/loop';
import type { G } from '../../gfx/draw';
import { Mode } from '../mode';
import type { Target } from '../typing';

export interface Mover {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  /** Seconds since spawn. */
  age: number;
  /** come: approaching; leave: resolved peacefully; pass: floated by; wait: waiting near the player. */
  state: 'come' | 'leave' | 'pass';
  /** 0..1 fade while leaving. */
  fade: number;
  sprite: string;
  size: number;
  /** Mode specific extras. */
  [k: string]: any;
}

/**
 * Targets come from the right toward the player. Typed targets leave peacefully;
 * untyped ones just pass by with a smile. Nothing is ever lost.
 */
export abstract class ApproachMode extends Mode {
  protected spawned = 0;
  protected resolved = 0;
  protected spawnTimer = 0.6;
  /** x where targets reach the player. */
  protected playerX = 230;
  /** Spawns `total` targets by itself; modes with their own spawning turn it off. */
  protected autoSpawn = true;

  abstract makeMover(word: string): Mover;
  abstract drawMover(g: G, m: Mover, tg: Target): void;
  /** Distance before the player where targets wait when there is no time pressure. */
  protected waitGap = 200;

  protected get total(): number {
    return this.L.def.count;
  }

  protected maxLen(): number | undefined {
    return undefined;
  }

  update(dt: number): void {
    this.spawnTimer -= dt;
    const core = this.L.core;
    if (this.autoSpawn && this.spawned < this.total && this.spawnTimer <= 0 && core.active.length < this.L.maxActive) {
      const word = this.L.word(this.maxLen());
      const m = this.makeMover(word);
      core.add(word, m);
      this.spawned++;
      this.spawnTimer = this.L.spawnGap;
    }
    for (const tg of core.targets) {
      const m = tg.data as Mover;
      m.age += dt;
      if (m.state === 'come') {
        this.moveComing(m, dt, tg);
        tg.urgency = -m.x;
        // Only targets the child can see can be typed.
        tg.selectable = m.x < this.L.vw - 30;
        if (m.x < this.playerX) {
          m.state = 'pass';
          core.release(tg);
          this.spawned--;
          this.onPass(m, tg);
        }
      } else this.moveGone(m, dt);
    }
    core.prune((tg) => (tg.data as Mover).fade < 1);
    this.scroll += dt * this.scrollSpeed();
  }

  protected scrollSpeed(): number {
    return 30;
  }

  /** Default approach: straight to the left, waiting near the player without time pressure. */
  protected moveComing(m: Mover, dt: number, _tg: Target): void {
    const stopAt = this.playerX + this.waitGap;
    if (this.L.noPressure && m.x <= stopAt) return;
    m.x += m.vx * dt;
    if (this.L.noPressure) m.x = Math.max(stopAt, m.x);
  }

  /** A resolved target drifts away and fades out. */
  protected moveGone(m: Mover, dt: number): void {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.rot += m.vr * dt;
    m.fade = Math.min(1, m.fade + dt * (m.state === 'pass' ? 0.8 : 0.9));
  }

  /** Speed so the target needs `travelTime` to reach the player. */
  protected speedFor(word: string, startX: number): number {
    return -(startX - this.playerX) / this.L.travelTime(word);
  }

  onDone(tg: Target): void {
    const m = tg.data as Mover;
    m.state = 'leave';
    this.resolved++;
    this.onLeave(m, tg);
  }

  protected onLeave(m: Mover, _tg: Target): void {
    m.vx = 260;
    m.vy = -260;
    m.vr = 2;
  }

  protected onPass(m: Mover, _tg: Target): void {
    m.vy = -40;
    m.vx = m.vx * 0.6;
  }

  render(g: G): void {
    const list = [...this.L.core.targets].sort((a, b) => (a.data as Mover).y - (b.data as Mover).y);
    for (const tg of list) {
      g.save();
      g.globalAlpha = 1 - (tg.data as Mover).fade;
      this.drawMover(g, tg.data as Mover, tg);
      g.restore();
    }
    for (const tg of list) {
      const m = tg.data as Mover;
      if (m.state === 'come') this.L.label(g, tg, m.x, Math.max(40, m.y - m.size * 0.62 - 26));
    }
  }

  progress(): number {
    return this.resolved / this.total;
  }

  get finished(): boolean {
    return this.spawned >= this.total && this.L.core.targets.length === 0;
  }
}

export const groundY = () => VH * 0.8;
