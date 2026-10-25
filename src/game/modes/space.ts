import { app } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { blob, drawSprite, fontFamily, type G } from '../../gfx/draw';
import { drawTapko } from '../../gfx/tapko';
import { t } from '../../i18n/i18n';
import { TAPKO_CSS_H, TAPKO_CSS_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';

const ASTEROIDS = ['obj-asteroid-small', 'obj-rock-falling-1'];
const PLANETS = ['obj-planet-1', 'obj-planet-2', 'obj-planet-3', 'obj-planet-4', 'obj-planet-5'];
const COLORS: Record<string, string> = {
  'obj-asteroid-small': '#8d8378', 'obj-asteroid-big': '#a39586', 'obj-rock-falling-1': '#9a8a7a',
  'obj-planet-1': '#f5b06b', 'obj-planet-2': '#8ec5f0', 'obj-planet-3': '#b79be0', 'obj-planet-4': '#c3a6ec', 'obj-planet-5': '#b6b0f0',
};
const ROCKET_X = 150;
const ROCKET_H = 120;
/** The round window of the rocket picture: its centre from the rocket's centre and the glass radius. */
const WINDOW = { x: 39, y: -1, r: 18 };
/** Tapko's size in the window. */
const SEAT_SIZE = 44;
/** Seconds of the suit-up: his things fade away, the suit grows up from the boots, the helmet comes down. */
const UNDRESS = 0.5;
const SUIT_UP = 0.7;
const HELMET = 0.5;
const SUITED = UNDRESS + SUIT_UP + HELMET;
/** Seconds when the hop into the rocket ends, then of the speedometer sliding up. */
const BOARD_TIME = SUITED + 0.9;
const DOCK_TIME = 0.5;
/** The suit picture's collar as a share of its height: without the helmet only the suit below it is drawn. */
const SUIT_NECK = 0.52;
const GAUGE_R = 70;

/** Code-drawn suit (and helmet) in the companion template's square, until the owner's art is there. */
function astronautFallback(g: G, s: number, helmet: boolean): void {
  g.strokeStyle = '#5a3d2b';
  g.lineWidth = s * 0.012;
  g.fillStyle = '#f4f6fa';
  for (const [cx, cy, rx, ry] of [[0.4, 0.86, 0.08, 0.05], [0.6, 0.86, 0.08, 0.05], [0.28, 0.64, 0.07, 0.07], [0.72, 0.64, 0.07, 0.07], [0.5, 0.67, 0.21, 0.2]]) {
    g.beginPath();
    g.ellipse(cx * s, cy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  if (!helmet) return;
  g.beginPath();
  g.arc(0.5 * s, 0.36 * s, 0.27 * s, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#2b3f7a';
  g.beginPath();
  g.ellipse(0.5 * s, 0.38 * s, 0.2 * s, 0.15 * s, 0, 0, Math.PI * 2);
  g.fill();
}

/**
 * Draws the astronaut in the companion template's square, like drawTapko: (x, y) between the feet.
 * Only the rows `from`..`to` (shares of the height) are drawn, for the suit growing and the helmet coming down.
 */
function drawAstronaut(g: G, helmet: boolean, x: number, y: number, size: number, from = 0, to = 1, alpha = 1): void {
  if (alpha <= 0 || to <= from) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x - size / 2, y - size * 0.9);
  g.beginPath();
  g.rect(0, from * size, size, (to - from) * size);
  g.clip();
  const img = sprite(helmet ? 'tapko-astronaut' : 'tapko-astronaut-suit');
  if (img) g.drawImage(img, 0, 0, size, size);
  else astronautFallback(g, size, helmet);
  g.restore();
}

/**
 * World 2: Tapko puts on a space suit and hops into the rocket's window, its soft beam pushes rocks and planets out of the path,
 * and rhythm drives the speedometer docked under the rocket.
 */
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
    return 40 + this.L.rhythm.ema * 70;
  }

  update(dt: number): void {
    super.update(dt);
    this.beam = Math.max(0, this.beam - dt * 3);
    this.speedShown += (this.speedPct() - this.speedShown) * Math.min(1, dt * 3);
  }

  protected speedPct(): number {
    return Math.min(1, this.L.rhythm.ratio(this.L.difficulty));
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

  /** The rocket's centre and tilt; it bobs gently and hops with joy at the end. */
  private rocket(): { x: number; y: number; rot: number } {
    const hop = Math.sin(this.L.endHop * Math.PI) * 24;
    return { x: ROCKET_X, y: this.rocketY + Math.sin(this.t * 1.8) * 10 - hop, rot: Math.sin(this.t * 1.3) * 0.04 };
  }

  /** Centre of the rocket's window, turned with the rocket. */
  private window(): { x: number; y: number } {
    const r = this.rocket();
    const c = Math.cos(r.rot), s = Math.sin(r.rot);
    return { x: r.x + WINDOW.x * c - WINDOW.y * s, y: r.y + WINDOW.x * s + WINDOW.y * c };
  }

  /** 0..1 of the astronaut's hop from the DOM Tapko's place into the window; done at once with reduced motion. */
  private get boarded(): number {
    return this.L.reduceMotion ? 1 : Math.max(0, Math.min(1, (this.t - SUITED) / (BOARD_TIME - SUITED)));
  }

  /** 0..1 of a suit-up phase that starts at `start` seconds and lasts `time`; done with reduced motion. */
  private phase(start: number, time: number): number {
    return this.L.reduceMotion ? 1 : Math.max(0, Math.min(1, (this.t - start) / time));
  }

  /** Tapko's feet and size: where the DOM Tapko stood, on the hop, then seated in the window. */
  private seat(): { x: number; y: number; size: number } {
    const k = this.L.stage.scale;
    const w = this.window();
    const from = { x: TAPKO_CSS_X / k, y: VH - TAPKO_CSS_H * 0.1 / k, size: TAPKO_CSS_H / k };
    const to = { x: w.x, y: w.y + SEAT_SIZE * 0.45, size: SEAT_SIZE };
    const b = this.boarded, e = ease.inOutQuad(b);
    return {
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e - Math.sin(b * Math.PI) * 140,
      size: from.size + (to.size - from.size) * e,
    };
  }

  heroSpot(): { x: number; y: number } {
    const s = this.seat();
    return { x: s.x, y: s.y - s.size * 0.9 - 20 };
  }

  bubbleSpot(): { x: number; y: number } {
    const s = this.seat();
    return { x: s.x, y: s.y - s.size * 0.9 - 10 };
  }

  render(g: G): void {
    const { x: rx, y: ry, rot } = this.rocket();
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
    this.drawRocket(g, rx, ry, rot);
    // Flame grows with speed.
    g.save();
    g.globalAlpha = 0.5 + this.speedShown * 0.5;
    g.fillStyle = '#ffcf5a';
    g.beginPath();
    g.ellipse(rx - 85 - this.speedShown * 20, ry + 4, 10 + this.speedShown * 26, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    this.drawTapko(g);
    super.render(g);
    this.drawSpeedometer(g);
  }

  /**
   * The empty rocket (glass over the picture's window) until the astronaut is in, then the rocket
   * with its pilot; the two cross-fade while the astronaut slips in.
   */
  private drawRocket(g: G, rx: number, ry: number, rot: number): void {
    const inside = Math.max(0, (this.boarded - 0.8) / 0.2);
    if (inside < 1) {
      g.save();
      g.globalAlpha *= 1 - inside;
      drawSprite(g, 'obj-rocket', rx, ry, ROCKET_H, { rot }, blob('#e5534b'));
      const w = this.window();
      g.beginPath();
      g.arc(w.x, w.y, WINDOW.r, 0, Math.PI * 2);
      const glass = g.createRadialGradient(w.x - 5, w.y - 6, 2, w.x, w.y, WINDOW.r);
      glass.addColorStop(0, '#d9f6fa');
      glass.addColorStop(1, '#86cbd8');
      g.fillStyle = glass;
      g.fill();
      g.restore();
    }
    if (inside <= 0) return;
    g.save();
    g.globalAlpha *= inside;
    if (sprite('obj-rocket-pilot')) drawSprite(g, 'obj-rocket-pilot', rx, ry, ROCKET_H, { rot });
    else {
      drawSprite(g, 'obj-rocket', rx, ry, ROCKET_H, { rot }, blob('#e5534b'));
      const w = this.window();
      drawAstronaut(g, true, w.x, w.y + SEAT_SIZE * 0.45, SEAT_SIZE);
    }
    g.restore();
  }

  /**
   * The suit-up where Tapko stands (his things fade away, the suit grows up from the boots, the
   * helmet comes down over his head), then the astronaut's hop into the window.
   */
  private drawTapko(g: G): void {
    const b = this.boarded;
    if (b >= 1) return;
    const s = this.seat();
    const c = app.profile!.companion;
    const undress = this.phase(0, UNDRESS), suit = this.phase(UNDRESS, SUIT_UP), helmet = this.phase(UNDRESS + SUIT_UP, HELMET);
    if (helmet < 1) {
      const motion = { t: this.t, shadow: true };
      const bare = { ...c, accessories: [] };
      // His things fade away, then he hides under the helmet.
      if (undress < 1) drawTapko(g, c, 'idle', s.x, s.y, s.size, { ...motion, alpha: 1 - undress });
      drawTapko(g, bare, 'idle', s.x, s.y, s.size, { ...motion, alpha: undress * (1 - helmet) });
      drawAstronaut(g, false, s.x, s.y, s.size, 1 - (1 - SUIT_NECK) * ease.outQuad(suit), 1);
      // The helmet comes down from above onto the collar.
      const drop = (1 - ease.outCubic(helmet)) * s.size * 0.25;
      drawAstronaut(g, true, s.x, s.y - drop, s.size, 0, SUIT_NECK + 0.04, helmet);
      return;
    }
    // He slips into the window over the last fifth of the hop.
    drawAstronaut(g, true, s.x, s.y, s.size, 0, 1, 1 - Math.max(0, (b - 0.8) / 0.2));
  }

  /** The rocket's own instrument: after Tapko is in, it slides up and sits on the bottom edge under the rocket, still while the rocket bobs. */
  protected drawSpeedometer(g: G): void {
    const slide = this.L.reduceMotion ? 1 : Math.max(0, Math.min(1, (this.t - BOARD_TIME) / DOCK_TIME));
    if (slide <= 0) return;
    const r = GAUGE_R;
    const below = VH + r + 20;
    const cx = ROCKET_X, cy = below + (VH - below) * ease.outCubic(slide);
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
    if (this.bigs < this.L.count && core.active.length === 0) {
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
    return Math.min(1, Math.max(0, done) / this.L.count);
  }

  get finished(): boolean {
    return this.bigs >= this.L.count && this.L.core.targets.length === 0;
  }
}
