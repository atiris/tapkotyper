import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { blob, drawSprite, type G } from '../../gfx/draw';
import { Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';

const JUNK: Record<string, string[]> = {
  tires: ['obj-tire'],
  crates: ['obj-crate', 'obj-can'],
  mix: ['obj-tire', 'obj-crate', 'obj-can', 'obj-spring'],
};
const JUNK_COLORS: Record<string, string> = { 'obj-tire': '#4d4a52', 'obj-crate': '#c08a52', 'obj-can': '#a9b4bf', 'obj-spring': '#9aa6b2' };
/** Pieces of the pile Bolt is stuck under in the junkyard: offsets from his feet and sprite. */
const PILE: [number, number, string][] = [[-46, -20, 'obj-tire'], [44, -24, 'obj-crate'], [0, -40, 'obj-can'], [-28, -78, 'obj-crate'], [30, -86, 'obj-tire'], [0, -122, 'obj-can']];

/** Draws one piece of junk; without its picture a friendly blob in its color. */
function drawJunk(g: G, sprite: string, x: number, y: number, size: number, rot = 0): void {
  drawSprite(g, sprite, x, y, size, { rot }, blob(JUNK_COLORS[sprite] ?? '#9aa6b2', true));
}

/**
 * World 6: junk rolls and slides toward the pile where Bolt beeps. A typed word lets
 * the soft magnet crane lift the piece away; untyped junk just slides aside.
 */
export class JunkMode extends ApproachMode {
  readonly world = 'junkyard';

  constructor(L: LevelRuntime) {
    super(L);
    this.playerX = 320;
  }

  start(): void {
    if (this.L.robot?.look === 'broken') this.L.say(pickLine('story.junkStart'), 3);
  }

  makeMover(word: string): Mover {
    const sprite = this.L.rng.pick(JUNK[this.L.def.variant] ?? JUNK.mix);
    const size = sprite === 'obj-tire' ? 110 : 95;
    const x = this.L.vw + 80;
    const y = VH - 30 - size / 2 - this.L.rng.range(0, 110);
    return { x, y, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite, size, lift: false };
  }

  protected moveComing(m: Mover, dt: number, tg: Target): void {
    const x = m.x;
    super.moveComing(m, dt, tg);
    // Tires roll, the rest wobbles a little as it slides.
    m.rot = m.sprite === 'obj-tire' ? m.rot + (m.x - x) / (m.size / 2) : Math.sin(m.age * 6) * 0.05;
  }

  protected onLeave(m: Mover): void {
    m.lift = true;
    m.vx = 0;
    m.vy = -360;
    m.vr = 0;
    this.L.sfx('whoosh');
    this.L.particles.emit(m.x, m.y, 10, 'sparkle', ['#fff6a8', '#ffffff', '#ffb0a0'], 140, 8);
  }

  protected onPass(m: Mover): void {
    m.vx *= 0.7;
    m.vy = 50;
  }

  drawMover(g: G, m: Mover): void {
    if (m.lift) {
      // The crane's magnet holds the piece on a chain from the sky.
      const top = m.y - m.size * 0.55;
      g.save();
      g.strokeStyle = '#6b6f78';
      g.lineWidth = 5;
      g.setLineDash([10, 6]);
      g.beginPath();
      g.moveTo(m.x, -10);
      g.lineTo(m.x, top - 50);
      g.stroke();
      g.restore();
      drawSprite(g, 'obj-magnet', m.x, top - 26, 70, {}, magnetFallback);
    }
    drawJunk(g, m.sprite, m.x, m.y, m.size, m.rot);
  }

  render(g: G): void {
    if (this.L.robot?.look === 'broken') this.drawPile(g);
    super.render(g);
  }

  /** The pile over Bolt gets smaller through the world: each level and each lifted piece. */
  private drawPile(g: G): void {
    const left = (1 - this.L.def.index * 0.18) * (1 - this.progress());
    const n = Math.ceil(PILE.length * Math.max(0, left));
    const { x, y } = this.L.friendSpot();
    for (const [dx, dy, s] of PILE.slice(0, n)) drawJunk(g, s, x + dx, y + dy - 30, 70, dx * 0.004);
  }
}

function magnetFallback(g: G, w: number, h: number): void {
  const r = Math.min(w, h) * 0.38;
  g.lineWidth = r * 0.55;
  g.strokeStyle = '#e5534b';
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI);
  g.stroke();
  g.strokeStyle = '#d8dde3';
  for (const dx of [-r, r]) {
    g.beginPath();
    g.moveTo(dx, r * 0.1);
    g.lineTo(dx, r * 0.6);
    g.stroke();
  }
}

/** Super-obstacle: a big tangled cable knot holds Bolt; every short word unties one piece. */
export class KnotMode extends Mode {
  readonly world = 'junkyard';
  private untied = 0;
  private piece: Target | null = null;
  private shake = 0;
  private free = 0;

  start(): void {
    this.next();
  }

  private next(): void {
    this.piece = this.L.core.add(this.L.word(4, 1), {});
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.untied >= this.L.def.count) this.free = Math.min(1, this.free + dt * 0.7);
    this.scroll += dt * 8;
  }

  onDone(tg: Target): void {
    if (tg !== this.piece) return;
    // An exact piece unties a whole loop, one with mistakes half of it.
    this.untied += tg.errors === 0 ? 1 : 0.5;
    this.shake = 1;
    this.L.sfx('pop');
    this.L.particles.emit(this.L.vw * 0.6, VH * 0.5, 14, 'dot', ['#ff8a65', '#7fd1ff', '#ffd25a', '#a6e3c9'], 220, 7);
    this.L.core.prune();
    this.piece = null;
    if (this.untied >= this.L.def.count) {
      this.L.say(pickLine('story.knotOpen'), 3.5);
      this.L.setRobotMood('happy', 4);
    } else this.next();
  }

  render(g: G): void {
    const k = Math.min(1, this.untied / this.L.def.count);
    const x = this.L.vw * 0.6, y = VH * 0.5;
    const sh = Math.sin(this.t * 50) * 6 * this.shake;
    g.save();
    g.globalAlpha = 1 - this.free;
    drawSprite(g, 'obj-cable-knot', x + sh, y, 340 * (1 - k * 0.6), { rot: Math.sin(this.t * 0.8) * 0.05, sx: 1 + this.free }, knotFallback(k));
    g.restore();
    if (this.piece) this.L.label(g, this.piece, x, VH * 0.14, 46);
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(x - 120, VH * 0.86, 240, 14);
    g.fillStyle = '#8ad19a';
    g.fillRect(x - 120, VH * 0.86, 240 * k, 14);
    g.restore();
  }

  progress(): number {
    return Math.min(1, this.untied / this.L.def.count);
  }

  get finished(): boolean {
    return this.free >= 1;
  }
}

/** Loops of colorful cable; fewer of them as the knot is untied. */
function knotFallback(k: number) {
  return (g: G, w: number, h: number) => {
    const r = Math.min(w, h) * 0.4;
    const colors = ['#ff8a65', '#7fd1ff', '#ffd25a', '#a6e3c9', '#c3a6ec'];
    const loops = Math.max(2, Math.round(10 * (1 - k)));
    g.lineWidth = r * 0.12;
    g.lineCap = 'round';
    for (let i = 0; i < loops; i++) {
      g.strokeStyle = colors[i % colors.length];
      g.beginPath();
      g.ellipse(Math.cos(i * 2.4) * r * 0.3, Math.sin(i * 1.7) * r * 0.25, r * 0.7, r * 0.35, i * 0.7, 0, Math.PI * 2);
      g.stroke();
    }
    blob('#7fd1ff', true)(g, w * 0.35, h * 0.35);
  };
}
