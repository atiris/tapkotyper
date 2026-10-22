import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, type G } from '../../gfx/draw';
import { Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

const GROUND = () => VH * 0.8;
const EGG_X = 250;

interface Obstacle {
  kind: 'obstacle';
  x: number;
  vx: number;
  sprite: string;
  cleared: boolean;
  passed: boolean;
  fade: number;
}

interface Mole {
  kind: 'mole';
  x: number;
  up: number;
  window: number;
  state: 'rise' | 'wait' | 'happy' | 'hide';
  t: number;
}

/** World 5: the egg rolls downhill; finished words make it jump over rocks and stumps. */
export class SlopeMode extends Mode {
  readonly world = 'egg';
  protected spawned = 0;
  protected resolved = 0;
  protected spawnTimer = 0.8;
  protected eggY = 0;
  protected jump = 0;
  protected roll = 0;
  protected wobble = 0;
  protected groundSpeed = 90;

  constructor(L: LevelRuntime) {
    super(L);
  }

  protected obstacleSprite(): string {
    const v = this.L.def.variant;
    if (v === 'rocks') return 'obj-rock-round';
    if (v === 'stumps') return 'obj-stump';
    return this.L.rng.chance(0.5) ? 'obj-rock-round' : 'obj-stump';
  }

  protected spawnObstacle(): void {
    const word = this.L.word();
    const x = this.L.vw + 80;
    const o: Obstacle = { kind: 'obstacle', x, vx: -(x - EGG_X) / this.L.travelTime(word), sprite: this.obstacleSprite(), cleared: false, passed: false, fade: 0 };
    this.L.core.add(word, o);
  }

  /** Whether the next spawn is a mole (mole level only). */
  protected spawnSomething(): void {
    this.spawnObstacle();
  }

  update(dt: number): void {
    const L = this.L;
    const core = L.core;
    this.spawnTimer -= dt;
    if (this.spawned < L.def.count && this.spawnTimer <= 0 && core.active.length < L.maxActive) {
      this.spawnSomething();
      this.spawned++;
      this.spawnTimer = L.spawnGap + 0.6;
    }
    this.roll += dt * 2.2;
    this.scroll += dt * this.groundSpeed;
    this.wobble = Math.max(0, this.wobble - dt * 2);
    for (const tg of core.targets) {
      const d = tg.data;
      if (d.kind === 'obstacle') this.updateObstacle(tg, d, dt);
      else this.updateMole(tg, d, dt);
    }
    core.prune((tg) => (tg.data.kind === 'obstacle' ? tg.data.fade < 1 : tg.data.state !== 'hide' || tg.data.up > 0));
  }

  private updateObstacle(tg: Target, o: Obstacle, dt: number): void {
    const stopX = EGG_X + 200;
    if (!(this.L.noPressure && !o.cleared && !tg.gone && o.x <= stopX)) o.x += o.vx * dt;
    if (this.L.noPressure && !o.cleared && !tg.gone) o.x = Math.max(stopX, o.x);
    tg.urgency = -o.x;
    tg.selectable = o.x < this.L.vw - 30;
    if (!o.passed && o.x < EGG_X + 90) {
      o.passed = true;
      if (o.cleared) this.hop(1);
      else {
        // Not typed in time: the egg gently rolls around it.
        this.L.core.release(tg);
        this.spawned--;
        this.wobble = 1;
        this.hop(0.45);
      }
    }
    if (o.x < -100) o.fade = 1;
  }

  protected updateMole(_tg: Target, _m: Mole, _dt: number): void {}

  protected hop(power: number): void {
    if (this.jump > 0) return;
    this.L.tweens.add(0.55 + power * 0.25, (k) => (this.jump = Math.sin(k * Math.PI) * power), ease.linear, () => (this.jump = 0));
  }

  onDone(tg: Target): void {
    const d = tg.data;
    this.resolved++;
    if (d.kind === 'obstacle') {
      d.cleared = true;
      this.L.particles.emit(d.x, GROUND() - 80, 8, 'sparkle', ['#fff6a8', '#ffffff'], 120, 7);
    } else this.moleHappy(tg, d);
  }

  protected moleHappy(_tg: Target, _m: Mole): void {}

  protected drawEgg(g: G): void {
    const y = GROUND() - 70 - this.jump * 170;
    const sprite = this.L.def.index >= 2 || this.L.def.isSuper ? 'obj-egg-cracking' : 'obj-egg';
    const wob = Math.sin(this.t * 30) * 0.15 * this.wobble;
    drawSprite(g, sprite, EGG_X, y, 140, { rot: Math.sin(this.roll) * 0.25 + wob }, blob('#f6efd9', false, '#58c5b8'));
  }

  render(g: G): void {
    for (const tg of this.L.core.targets) if (tg.data.kind === 'mole') this.drawMole(g, tg, tg.data);
    for (const tg of this.L.core.targets) {
      const o = tg.data;
      if (o.kind !== 'obstacle') continue;
      g.save();
      g.globalAlpha = 1 - o.fade;
      drawSprite(g, o.sprite, o.x, GROUND() - 45, o.sprite === 'obj-stump' ? 120 : 95, {}, blob(o.sprite === 'obj-stump' ? '#a0703c' : '#9aa0a6', true));
      if (o.cleared && !o.passed) {
        // Typed: a little glowing star says the egg will jump over it.
        g.globalAlpha *= 0.6 + Math.sin(this.t * 6) * 0.3;
        g.fillStyle = '#ffe27a';
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 7 : 17, a = -Math.PI / 2 + (i * Math.PI) / 5;
          g.lineTo(o.x + Math.cos(a) * r, GROUND() - 130 + Math.sin(a) * r);
        }
        g.fill();
      }
      g.restore();
    }
    this.drawEgg(g);
    for (const tg of this.L.core.targets) {
      const d = tg.data;
      if (d.kind === 'obstacle' && !tg.done && !tg.gone) this.L.label(g, tg, d.x, GROUND() - 160);
      if (d.kind === 'mole' && !tg.done && !tg.gone && d.up > 0.5) this.L.label(g, tg, d.x, GROUND() - 190, 38);
    }
  }

  protected drawMole(_g: G, _tg: Target, _m: Mole): void {}

  progress(): number {
    return this.resolved / this.L.def.count;
  }

  get finished(): boolean {
    return this.spawned >= this.L.def.count && this.L.core.targets.length === 0 && this.jump === 0;
  }
}

/** Super-obstacle: a friendly mole pops up with a short word; missing it just makes it wave and hide. */
export class MoleMode extends SlopeMode {
  protected spawnSomething(): void {
    if (this.spawned % 2 === 0) {
      const word = this.L.word(4, 1);
      const x = this.L.rng.range(EGG_X + 320, this.L.vw - 140);
      const m: Mole = { kind: 'mole', x, up: 0, window: Math.max(2.5, this.L.travelTime(word) * 0.55), state: 'rise', t: 0 };
      this.L.core.add(word, m);
      this.L.sfx('pop');
    } else this.spawnObstacle();
  }

  protected updateMole(tg: Target, m: Mole, dt: number): void {
    m.t += dt;
    m.x -= dt * this.groundSpeed * 0.3;
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
    } else if (m.state === 'happy') {
      if (m.t > 1) {
        m.state = 'hide';
        m.t = 0.9;
      }
    }
  }

  protected moleHappy(_tg: Target, m: Mole): void {
    m.state = 'happy';
    m.t = 0;
    this.L.particles.emit(m.x, GROUND() - 90, 12, 'heart', ['#ff8fab', '#ffd25a', '#a6e3c9'], 150, 9, 1.2);
  }

  protected drawMole(g: G, _tg: Target, m: Mole): void {
    const y = GROUND() - 10;
    g.save();
    g.fillStyle = '#6b4a2f';
    g.beginPath();
    g.ellipse(m.x, y, 70, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.rect(m.x - 90, y - 200, 180, 200);
    g.clip();
    const happyHop = m.state === 'happy' ? Math.sin(Math.min(1, m.t) * Math.PI) * 30 : 0;
    const wave = m.state === 'hide' && m.t < 0.9 ? Math.sin(m.t * 18) * 0.12 : 0;
    drawSprite(g, 'obj-mole', m.x, y - 60 + (1 - m.up) * 140 - happyHop, 130, { rot: wave }, blob('#8a6a55', true));
    g.restore();
  }
}
