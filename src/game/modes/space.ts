import { VH } from '../../engine/loop';
import { blob, drawSprite, fontFamily, type G } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';

const ASTEROIDS = ['obj-asteroid-small', 'obj-rock-falling-1'];
const PLANETS = ['obj-planet-1', 'obj-planet-2', 'obj-planet-3', 'obj-planet-4', 'obj-planet-5'];
const COLORS: Record<string, string> = {
  'obj-asteroid-small': '#8d8378', 'obj-asteroid-big': '#a39586', 'obj-rock-falling-1': '#9a8a7a',
  'obj-planet-1': '#f5b06b', 'obj-planet-2': '#8ec5f0', 'obj-planet-3': '#b79be0', 'obj-planet-4': '#c3a6ec', 'obj-planet-5': '#b6b0f0',
};

/** World 2: the rocket's soft beam pushes rocks and planets out of the path; rhythm drives the speedometer. */
export class SpaceMode extends ApproachMode {
  readonly world = 'space';
  protected rocketY = VH * 0.48;
  protected beam = 0;
  protected beamTo = { x: 0, y: 0 };
  protected speedShown = 0;

  constructor(L: LevelRuntime) {
    super(L);
    this.playerX = 260;
  }

  protected pickSprite(): string {
    const v = this.L.def.variant;
    const r = this.L.rng;
    if (v === 'asteroids') return r.pick(ASTEROIDS);
    if (v === 'planets') return r.pick(PLANETS);
    return r.chance(0.5) ? r.pick(ASTEROIDS) : r.pick(PLANETS);
  }

  makeMover(word: string): Mover {
    const sprite = this.pickSprite();
    const x = this.L.vw + 100;
    const y = this.L.rng.range(130, VH * 0.72);
    const planet = sprite.includes('planet');
    return { x, y, vx: this.speedFor(word, x), vy: this.L.rng.range(-12, 12), rot: 0, vr: this.L.rng.range(-0.3, 0.3), age: 0, state: 'come', fade: 0, sprite, size: planet ? 130 : 105 };
  }

  protected moveComing(m: Mover, dt: number, tg: Target): void {
    super.moveComing(m, dt, tg);
    m.y = Math.max(110, Math.min(VH * 0.78, m.y + m.vy * dt));
    m.rot += m.vr * dt;
  }

  protected scrollSpeed(): number {
    return 40 + this.L.ema * 70;
  }

  update(dt: number): void {
    super.update(dt);
    this.beam = Math.max(0, this.beam - dt * 3);
    this.speedShown += (this.speedPct() - this.speedShown) * Math.min(1, dt * 3);
  }

  protected speedPct(): number {
    return Math.min(1, this.L.ema / (0.9 + this.L.difficulty * 0.35));
  }

  drawMover(g: G, m: Mover): void {
    drawSprite(g, m.sprite, m.x, m.y, m.size, { rot: m.rot }, blob(COLORS[m.sprite] ?? '#9a8a7a', true, 'rgba(0,0,0,0.12)'));
  }

  protected onLeave(m: Mover): void {
    this.fireBeam(m.x, m.y);
    m.vx = 160;
    m.vy = m.y < this.rocketY ? -320 : 320;
    m.vr = m.vy > 0 ? 1.5 : -1.5;
  }

  protected fireBeam(x: number, y: number): void {
    this.beam = 1;
    this.beamTo = { x, y };
    this.L.sfx('whoosh');
    this.L.particles.emit(x, y, 14, 'sparkle', ['#fff6a8', '#a8f0ff', '#ffd1f5'], 180, 9);
  }

  render(g: G): void {
    const rx = 150, ry = this.rocketY + Math.sin(this.t * 1.8) * 10;
    if (this.beam > 0) {
      g.save();
      g.globalAlpha = this.beam;
      const grad = g.createLinearGradient(rx + 60, ry, this.beamTo.x, this.beamTo.y);
      grad.addColorStop(0, 'rgba(160,240,255,0.9)');
      grad.addColorStop(1, 'rgba(255,200,250,0.4)');
      g.strokeStyle = grad;
      g.lineCap = 'round';
      g.lineWidth = 18 * this.beam;
      g.beginPath();
      g.moveTo(rx + 70, ry);
      g.lineTo(this.beamTo.x, this.beamTo.y);
      g.stroke();
      g.restore();
    }
    drawSprite(g, 'obj-rocket', rx, ry, 120, { rot: Math.sin(this.t * 1.3) * 0.04 }, blob('#e5534b'));
    // Flame grows with speed.
    g.save();
    g.globalAlpha = 0.5 + this.speedShown * 0.5;
    g.fillStyle = '#ffcf5a';
    g.beginPath();
    g.ellipse(rx - 85 - this.speedShown * 20, ry + 4, 10 + this.speedShown * 26, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    super.render(g);
    this.drawSpeedometer(g);
  }

  protected drawSpeedometer(g: G): void {
    const cx = this.L.vw - 120, cy = VH - 70, r = 70;
    g.save();
    g.fillStyle = 'rgba(20,16,50,0.55)';
    g.beginPath();
    g.arc(cx, cy, r + 14, Math.PI, 0);
    g.closePath();
    g.fill();
    const grad = g.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0, '#7fd1ff');
    grad.addColorStop(0.5, '#a8f0a0');
    grad.addColorStop(1, '#ffd36b');
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 14;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy, r, Math.PI, 0);
    g.stroke();
    g.strokeStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * Math.max(0.02, this.speedShown));
    g.stroke();
    const a = Math.PI + Math.PI * this.speedShown;
    g.strokeStyle = '#fff';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
    g.stroke();
    g.fillStyle = '#fff';
    g.font = `600 15px ${fontFamily()}`;
    g.textAlign = 'center';
    g.fillText(t('level.speed'), cx, cy - 22);
    g.restore();
  }
}

/** World 2 super-obstacle: a big asteroid splits into smaller rocks with shorter words. */
export class AsteroidMode extends SpaceMode {
  private bigs = 0;
  protected autoSpawn = false;

  update(dt: number): void {
    const core = this.L.core;
    // Spawn the next big asteroid when the sky is clear.
    if (this.bigs < this.L.def.count && core.active.length === 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const word = this.L.word();
        const x = this.L.vw + 140;
        const m: Mover = { x, y: VH * 0.45, vx: this.speedFor(word, x) * 0.7, vy: 0, rot: 0, vr: 0.1, age: 0, state: 'come', fade: 0, sprite: 'obj-asteroid-big', size: 220, big: true };
        core.add(word, m);
        this.bigs++;
        this.spawnTimer = 1;
      }
    }
    super.update(dt);
  }

  protected onLeave(m: Mover): void {
    if (!m.big) return super.onLeave(m);
    this.fireBeam(m.x, m.y);
    m.fade = 1;
    this.L.sfx('pop');
    const pieces = this.L.rng.int(3, 4);
    for (let i = 0; i < pieces; i++) {
      const a = (i / pieces) * Math.PI * 2;
      this.addPiece(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60, Math.sin(a) * 40);
    }
    this.L.particles.emit(m.x, m.y, 24, 'sparkle', ['#fff6a8', '#ffd1f5', '#a8f0ff'], 260, 10);
  }

  /** A passed rock does not count: a big one comes again, a piece returns from the right. */
  protected onPass(m: Mover, tg: Target): void {
    super.onPass(m, tg);
    if (m.big) this.bigs--;
    else this.addPiece(this.L.vw + 100, this.L.rng.range(130, VH * 0.72), 0);
  }

  private addPiece(x: number, y: number, vy: number): void {
    const word = this.L.word(4, 1);
    const piece: Mover = {
      x, y, vx: this.speedFor(word, x) * 0.8, vy, rot: 0, vr: this.L.rng.range(-1, 1),
      age: 0, state: 'come', fade: 0, sprite: 'obj-asteroid-small', size: 95,
    };
    this.L.core.add(word, piece);
  }

  progress(): number {
    const done = this.bigs - (this.L.core.active.some((t) => (t.data as Mover).big) ? 1 : 0);
    return Math.min(1, Math.max(0, done) / this.L.def.count);
  }

  get finished(): boolean {
    return this.bigs >= this.L.def.count && this.L.core.targets.length === 0;
  }
}
