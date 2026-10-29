import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, fontFamily, type G } from '../../gfx/draw';
import { SPACE } from '../../learning/lessons';
import { Mode, TAPKO_FEET, TAPKO_H, TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';
import { slipWords } from './copy-row';
import { Catcher, type CatcherLook } from './meadow';

/** The baby dragons (their colors take turns) and their colors while a picture is missing. */
export const DRAGONS = ['obj-dragon-baby-1', 'obj-dragon-baby-2', 'obj-dragon-baby-3'];
export const DRAGON_COLOR: Record<string, string> = { 'obj-dragon-baby-1': '#8fd6b0', 'obj-dragon-baby-2': '#f2a6c0', 'obj-dragon-baby-3': '#a9c4f2' };
/** The flames from the smallest to the biggest. */
export const FLAMES = ['obj-flame-1', 'obj-flame-2', 'obj-flame-3', 'obj-flame-4'];
/** Each flame's outer and inner color while its picture is missing. */
const FLAME_COLOR: Record<string, [string, string]> = {
  'obj-flame-1': ['#f2b632', '#ffe9a8'], 'obj-flame-2': ['#ffc94d', '#fff1c2'], 'obj-flame-3': ['#f59a3c', '#fff1c2'], 'obj-flame-4': ['#ee7a3a', '#fff1c2'],
};
/** The round leafy bushes of the valley. */
export const BUSHES = ['obj-bush-1', 'obj-bush-2', 'obj-bush-3'];
export const PIT_PICTURES = ['obj-firepit', ...FLAMES];
/** The ground the valley's things stand on: where Tapko's feet are. */
export const GROUND = TAPKO_FEET + 6;
/** The fire pit's height (the flight levels draw it smaller). */
export const PIT_H = 88;
const INK = '#3d3355';
const END_TIME = 3;

/** Dragons a flight level starts with, and the most it gets. */
export const FLOCK_START = 3;
export const FLOCK_MAX = 5;

/** Dragons of a flight level once `done` of them are done: one more while the minimum is not played, at most `FLOCK_MAX`. */
export function flockAfter(planned: number, done: number, minLeft: number): number {
  return done >= planned && minLeft > 0 ? Math.min(FLOCK_MAX, planned + 1) : planned;
}

/** `flockAfter` in a level; played on without an end ("stay a while"), one more always comes. */
export function flockFor(L: LevelRuntime, planned: number, done: number): number {
  return L.staying ? Math.max(planned, done + 1) : flockAfter(planned, done, L.minLeft);
}

/** A teardrop flame in a box `h` high, pointing up. */
function flameShape(g: G, x: number, y: number, w: number, h: number, outer: string, inner: string): void {
  const drop = (k: number, dy: number) => {
    g.beginPath();
    g.moveTo(x, y - h * 0.48 * k + dy);
    g.bezierCurveTo(x + w * 0.5 * k, y - h * 0.1 * k + dy, x + w * 0.42 * k, y + h * 0.45 * k + dy, x, y + h * 0.45 * k + dy);
    g.bezierCurveTo(x - w * 0.42 * k, y + h * 0.45 * k + dy, x - w * 0.5 * k, y - h * 0.1 * k + dy, x, y - h * 0.48 * k + dy);
    g.closePath();
  };
  g.fillStyle = outer;
  drop(1, 0);
  g.fill();
  g.strokeStyle = 'rgba(120,60,30,0.45)';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = inner;
  drop(0.55, h * 0.18);
  g.fill();
}

function flameFallback(pic: string) {
  const [outer, inner] = FLAME_COLOR[pic] ?? FLAME_COLOR[FLAMES[0]];
  return (g: G, w: number, h: number) => flameShape(g, 0, 0, w * 0.7, h, outer, inner);
}

/** A flame gone out: a grey curl of smoke with a dull ember at its foot. */
function flameOutFallback(g: G, w: number, h: number): void {
  g.save();
  g.strokeStyle = '#b8b0a8';
  g.lineWidth = w * 0.08;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, h * 0.35);
  g.bezierCurveTo(w * 0.3, h * 0.1, -w * 0.3, -h * 0.1, 0, -h * 0.4);
  g.stroke();
  g.fillStyle = '#c9783a';
  g.beginPath();
  g.arc(0, h * 0.38, w * 0.07, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** A wooden torch held upright, its small flame on top. */
function torchFallback(g: G, _w: number, h: number): void {
  g.save();
  g.strokeStyle = '#6d5040';
  g.lineWidth = 2;
  g.fillStyle = '#c99a62';
  g.beginPath();
  g.roundRect(-h * 0.045, -h * 0.18, h * 0.09, h * 0.66, h * 0.03);
  g.fill();
  g.stroke();
  g.fillStyle = '#b98a5a';
  g.beginPath();
  g.roundRect(-h * 0.08, -h * 0.3, h * 0.16, h * 0.16, h * 0.04);
  g.fill();
  g.stroke();
  flameShape(g, 0, -h * 0.4, h * 0.16, h * 0.2, '#f59a3c', '#ffd86b');
  g.restore();
}

/** The fire pit seen a little from above: a ring of stones round the burnt logs. */
function pitFallback(g: G, _w: number, h: number): void {
  const rx = h * 0.9, ry = h * 0.24, cy = h * 0.2;
  g.save();
  g.strokeStyle = 'rgba(70,50,40,0.6)';
  g.lineWidth = 2;
  g.fillStyle = '#5b4335';
  g.beginPath();
  g.ellipse(0, cy, rx * 0.8, ry * 0.75, 0, 0, Math.PI * 2);
  g.fill();
  for (const a of [-0.35, 0.35]) {
    g.save();
    g.translate(0, cy - ry * 0.2);
    g.rotate(a);
    g.fillStyle = '#7a5434';
    g.beginPath();
    g.roundRect(-rx * 0.55, -h * 0.06, rx * 1.1, h * 0.12, h * 0.06);
    g.fill();
    g.stroke();
    g.restore();
  }
  g.fillStyle = '#a9a39a';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.ellipse(Math.cos(a) * rx, cy + Math.sin(a) * ry, h * 0.13, h * 0.09, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
}

/** A round bush of leaves (or a tangle of branches) while its picture is missing. */
export function bushFallback(kind: number) {
  const green = ['#4f8a4a', '#6f9a4a', '#5a9a5a', '#4a7a3a'][kind % 4];
  return (g: G, w: number, h: number) => {
    g.save();
    g.fillStyle = green;
    g.strokeStyle = 'rgba(40,60,30,0.6)';
    g.lineWidth = 2;
    for (const [dx, dy, r] of [[-0.25, 0.15, 0.28], [0.22, 0.12, 0.3], [0, -0.12, 0.34]]) {
      g.beginPath();
      g.arc(dx * w, dy * h, r * Math.min(w, h), 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.strokeStyle = '#7a5434';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-w * 0.1, h * 0.1);
    g.lineTo(-w * 0.45, -h * 0.25);
    g.moveTo(w * 0.1, h * 0.05);
    g.lineTo(w * 0.42, -h * 0.3);
    g.stroke();
    g.restore();
  };
}

/** A baby dragon at (x, y), its feet there: `flap` squeezes it as its wings beat, `wide` changes only its width (a pulse), `face` -1 turns it to the left. */
export function drawDragon(g: G, pic: string, x: number, y: number, h: number, flap = 0, face = 1, alpha = 1, rot = 0, wide = 0): void {
  drawSprite(g, pic, x, y, h, { ay: 1, flip: face < 0, sx: (1 + flap * 0.06) * (1 + wide), sy: 1 - flap * 0.06, alpha, rot }, blob(DRAGON_COLOR[pic] ?? '#8fd6b0'));
}

/** A text with a white rim in the middle of the scene; `\n` breaks it. */
export function rimmed(g: G, text: string, x: number, y: number, size: number, alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  g.font = `700 ${size}px ${fontFamily()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(4, size / 6);
  g.strokeStyle = '#fff';
  g.fillStyle = INK;
  text.split('\n').forEach((l, i) => {
    g.strokeText(l, x, y + i * size * 1.25);
    g.fillText(l, x, y + i * size * 1.25);
  });
  g.restore();
}

/**
 * The fire in the pit, from the back to the front: the biggest flame at the back, the smallest in
 * front; each one's place (shares of the pit's width), its height (of the pit's) and its own flicker.
 */
const FIRE = [
  { pic: 3, dx: 0.01, dy: -0.06, h: 1.15 },
  { pic: 2, dx: -0.08, dy: -0.03, h: 0.92 },
  { pic: 1, dx: 0.08, dy: -0.01, h: 0.78 },
  { pic: 0, dx: -0.01, dy: 0.03, h: 0.62 },
];
/** Where the flames stand in the pit: their bottoms at the middle of its inside (a share of its height from the ground). */
const FIRE_FOOT = 0.48;
/** The pit picture's width per height (a code-drawn pit is drawn about as wide). */
const PIT_RATIO = 1.47;

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  size: number;
  /** A spark glows orange, smoke is a soft grey puff that grows. */
  smoke: boolean;
}

/**
 * The dragons' fire pit: dead embers, or burning with four flames that flicker each its own way,
 * the biggest at the back. It lights up or goes out toward `litTo` in `fade` seconds, the flames
 * coming one by one from the front; sparks rise while it burns, smoke while it goes out. Its warm
 * glow, the flames' size and the sparks grow with `glow`.
 */
export class Firepit {
  /** 0: dead, 1: burning; it moves toward `litTo`. */
  lit = 0;
  litTo = 0;
  fade = 0.6;
  /** 0..1: how big the fire, its glow and its sparks are. */
  glow = 0;
  private embers: Ember[] = [];
  private t = 0;
  constructor(private L: LevelRuntime, public x: number, readonly h = PIT_H) {}

  /** Lit at once (a level that starts with the fire burning). */
  burn(glow: number): this {
    this.lit = this.litTo = 1;
    this.glow = glow;
    return this;
  }

  /** The top of its fire, where caught things go in. */
  get top(): number {
    return GROUND - this.h * 0.55;
  }

  /** A burst of sparks: a flame handed to the fire. */
  sparkle(n: number): void {
    for (let i = 0; i < n; i++) this.ember(false);
  }

  private ember(smoke: boolean): void {
    const r = this.L.rng;
    this.embers.push({
      x: this.x + r.range(-0.22, 0.22) * this.h * PIT_RATIO, y: GROUND - this.h * (smoke ? 0.7 : 0.9 + 0.4 * this.glow),
      vx: r.range(-12, 12), vy: -r.range(smoke ? 25 : 50, smoke ? 45 : 110), t: 0, life: r.range(smoke ? 1.6 : 0.8, smoke ? 2.6 : 1.6),
      size: smoke ? r.range(9, 15) : r.range(1.6, 3.2), smoke,
    });
  }

  update(dt: number): void {
    this.t += dt;
    const step = dt / this.fade, going = this.litTo < this.lit;
    this.lit = this.lit < this.litTo ? Math.min(this.litTo, this.lit + step) : Math.max(this.litTo, this.lit - step);
    const heat = this.lit * (0.3 + 0.7 * this.glow);
    if (!this.L.reduceMotion) {
      if (heat > 0 && this.L.rng.chance(dt * heat * 9)) this.ember(false);
      if (going && this.L.rng.chance(dt * 6)) this.ember(true);
    }
    for (const e of this.embers) {
      e.t += dt;
      // Sparks wiggle as they rise; smoke drifts and slows.
      e.x += (e.vx + (e.smoke ? 0 : Math.sin(e.t * 9 + e.size * 3) * 30)) * dt;
      e.y += e.vy * dt;
      if (e.smoke) e.vy *= 1 - dt * 0.3;
    }
    this.embers = this.embers.filter((e) => e.t < e.life);
  }

  /** How much of each flame shows: they come one by one from the front and go from the back. */
  private shown(k: number): number {
    return Math.max(0, Math.min(1, this.lit * FIRE.length - (FIRE.length - 1 - k)));
  }

  draw(g: G): void {
    const heat = this.lit * this.glow;
    if (heat > 0) {
      const cy = GROUND - this.h * 0.7, r = this.h * (1.2 + 1.6 * this.glow);
      g.save();
      const glow = g.createRadialGradient(this.x, cy, 4, this.x, cy, r);
      glow.addColorStop(0, `rgba(255,214,120,${0.6 * heat})`);
      glow.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = glow;
      g.fillRect(this.x - r, cy - r, r * 2, r * 2);
      g.restore();
    }
    drawSprite(g, 'obj-firepit', this.x, GROUND, this.h, { ay: 0.9 }, pitFallback);
    const w = this.h * PIT_RATIO, foot = GROUND - this.h * FIRE_FOOT, size = 0.8 + 0.35 * this.glow;
    const motion = !this.L.reduceMotion;
    FIRE.forEach((f, k) => {
      const a = this.shown(k);
      if (a <= 0) return;
      // Each flame flickers on its own, from a few waves that never line up.
      const ph = k * 1.7;
      const up = motion ? 0.08 * Math.sin(this.t * 7.3 + ph) + 0.05 * Math.sin(this.t * 12.7 + ph * 2) + 0.03 * Math.sin(this.t * 3.1 + ph) : 0;
      const lean = motion ? 0.07 * Math.sin(this.t * 4.3 + ph * 1.3) + 0.03 * Math.sin(this.t * 10.9 + ph) : 0;
      const pic = FLAMES[f.pic];
      drawSprite(g, pic, this.x + f.dx * w, foot + f.dy * this.h, this.h * f.h * size * (0.4 + 0.6 * a) * (1 + up), { ay: 0.96, rot: lean, sx: 1 - up * 0.5, alpha: a }, flameFallback(pic));
    });
    for (const e of this.embers) {
      const k = e.t / e.life;
      g.save();
      if (e.smoke) {
        g.globalAlpha = 0.45 * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k);
        g.fillStyle = '#b8b0a8';
        g.beginPath();
        g.arc(e.x, e.y, e.size * (1 + k * 1.8), 0, Math.PI * 2);
      } else {
        g.globalAlpha = 1 - k;
        g.fillStyle = k < 0.4 ? '#fff1a8' : '#ffb23d';
        g.beginPath();
        g.arc(e.x, e.y, e.size * (1 - k * 0.5), 0, Math.PI * 2);
      }
      g.fill();
      g.restore();
    }
  }
}

/** The torch: held upright just right of Tapko, a caught flame sits on its top; the first one lights it, and its flame stays small. */
const TORCH: CatcherLook = { pic: 'obj-torch', h: 130, lean: 0, at: [0, -0.46], grip: 0.3, fallback: torchFallback };
/** How far the torch tips over to the right to hand its flame to the fire, and how far right of it the pit stands. */
const DIP_TILT = 1.5;
const PIT_GAP = 95;
const TORCH_FLAME = 34;
/** A warm glow round the torch's top, so it stands out from the background: unlit and lit. */
const TORCH_GLOW = [0.55, 0.85];
/** Up and down of a flame's soft arcs; seconds the torch holds a caught flame before it goes to tip, and stays over the fire before it stands up again. */
const ARC = 36;
const HOLD = 0.3;
const REACH = 0.25;
/** Sparks when the torch catches a flame and when it hands it to the fire. */
const TORCH_SPARKS = 18;
const FIRE_SPARKS = 22;
const SPARKS = ['#fff6a8', '#ffd25a', '#ffb23d'];
/** Speed of a typed flame on its way into the torch. */
const SAVE_SPEED = 950;
/** Flames caught until the pit burns fully (it cross-fades on the way). */
const LIGHT_UP = 3;

/**
 * Valley 1, the flames (a word stream): little flames fly from the right in soft arcs. A typed one
 * speeds into Tapko's torch, which rises to meet it, then tips over in an arc and hands it to the fire pit; the pit
 * starts burning and its glow grows with the level. A flame not typed flies past and goes out.
 */
export class FlamesMode extends ApproachMode {
  readonly pictures = [...PIT_PICTURES, 'obj-flame-out', 'obj-torch'];
  readonly world = 'dragons';
  private torch: Catcher;
  private pit: Firepit;
  private caught = 0;
  /** Seconds since the first caught flame lit the torch; -1 while it is not lit. */
  private torchLit = -1;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    // The pit right of the torch: the torch tips over in an arc and hands its flame to the fire.
    this.pit = new Firepit(L, this.torchX() + PIT_GAP);
    this.torch = new Catcher(L, this.torchX(), this.torchRest(), TORCH);
    // A flame past the torch has passed.
    this.playerX = this.torchX() - 40;
  }

  startLine(): string {
    return pickLine('story.flamesStart');
  }

  private torchX(): number {
    return TAPKO_X + TAPKO_H * 0.62;
  }

  /** The torch rests with its grip at Tapko's hand. */
  private torchRest(): number {
    return VH - TAPKO_H * 0.33 - TORCH.h * (TORCH.grip ?? 0);
  }

  makeMover(word: string): Mover {
    const L = this.L;
    const n = word.length, k = n <= 3 ? 0 : n <= 5 ? 1 : n <= 7 ? 2 : 3;
    const size = [56, 66, 78, 90][k];
    const x = L.vw + size;
    const by = L.rng.range(150, VH - 170);
    return {
      x, y: by, by, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite: FLAMES[k], size,
      flip: L.rng.chance(0.5), phase: L.rng.range(0, 6), out: false, hold: -1, lf: 0, fed: false, fedAt: 0, handed: false, saveY: by, saveDist: 0, saveFull: 1, shrink: 1, saveFrom: by,
    };
  }

  update(dt: number): void {
    const L = this.L;
    super.update(dt);
    // A flame's word shows once the flame is wholly in sight.
    for (const tg of L.core.active) {
      const m = tg.data as Mover;
      if (m.state === 'come' && tg.selectable) tg.selectable = m.x + m.size / 2 <= L.vw;
    }
    // The torch rises with the closest typed flame, tips a caught one into the fire, else rests.
    let aim: Mover | null = null, dip = false, holding = false;
    for (const tg of L.core.targets) {
      const m = tg.data as Mover;
      if (m.state === 'leave' && m.hold < 0 && (!aim || m.x < aim.x)) aim = m;
      if (m.hold >= HOLD && !m.handed) dip = true;
      else if (m.hold >= 0 && m.hold < HOLD) holding = true;
    }
    const tc = this.torch;
    tc.follow = !!aim;
    if (aim) {
      const k = aim.saveDist > 0 ? Math.min(1, Math.max(0, 1 - (aim.x - tc.catchPoint()[0]) / aim.saveDist)) : 1;
      tc.aimY = aim.saveFrom + (aim.saveY - aim.saveFrom) * ease.inOutQuad(k);
    } else if (!holding) tc.aimY = tc.restY;
    // Back at Tapko's hand first, then it tips over to the fire.
    tc.tiltAim = dip && Math.abs(tc.y - tc.restY) < 8 ? DIP_TILT : 0;
    tc.update(dt, this.t);
    if (this.torchLit >= 0) this.torchLit += dt;
    this.pit.glow = Math.min(1, this.resolved / this.total);
    this.pit.update(dt);
    if (this.endT === null && super.finished) {
      this.endT = 0;
      L.sfx('cheer');
      L.say(pickLine('story.flamesDone'), END_TIME);
    } else if (this.endT !== null) this.endT += dt;
  }

  protected moveComing(m: Mover, dt: number, tg: Target): void {
    super.moveComing(m, dt, tg);
    m.y = m.by + Math.sin(m.age * 1.6 + m.phase) * ARC;
    m.rot = Math.sin(m.age * 2.4 + m.phase) * 0.15;
  }

  /** A typed flame speeds into the torch, which rises to meet it at its height; it shrinks on the way and is gone in the torch. */
  protected onLeave(m: Mover): void {
    m.vx = 0;
    const lift = TORCH.h * -TORCH.at[1];
    m.saveY = Math.max(120 + lift, Math.min(this.torch.restY, m.y + lift));
    const [cx, cy] = this.torch.catchPoint();
    m.saveDist = m.x - cx;
    m.saveFull = Math.max(1, Math.hypot(m.x - cx, m.y - cy));
    m.shrink = 1;
    m.saveFrom = this.torch.y;
    this.L.sfx('whoosh');
  }

  /** The torch has no scroll to move: the scene stands still in this level. */
  protected scrollSpeed(): number {
    return 0;
  }

  /** Not typed: it flies past the torch and goes out. Nothing else happens. */
  protected onPass(m: Mover): void {
    m.out = true;
    m.vx *= 0.7;
    this.L.particles.emit(m.x, m.y - m.size * 0.2, 6, 'puff', ['#d8d2cc', '#b8b0a8', '#efeae4'], 40, 10, 1.4);
  }

  protected moveGone(m: Mover, dt: number): void {
    if (m.state === 'pass') {
      m.x += m.vx * dt;
      m.y = m.by + Math.sin(m.age * 1.6 + m.phase) * ARC;
      m.lf = Math.min(1, m.lf + dt * 0.7);
      // A thin wisp of smoke trails it as it fades.
      if (this.L.rng.chance(dt * 5)) this.L.particles.emit(m.x, m.y - m.size * 0.4, 1, 'puff', ['#d8d2cc', '#b8b0a8'], 15, 7, 1.2);
      m.fade = m.lf;
      return;
    }
    this.save(m, dt);
    // Caught, the flame is in the torch; it is done once the torch stands up again.
    m.fade = m.handed && this.torch.tilt < 0.2 ? 1 : 0;
  }

  /**
   * On its way into the torch, shrinking until it is gone in it (the torch sparkles), then the
   * torch tips over and hands the flame to the fire, which sparkles and feeds on it.
   */
  private save(m: Mover, dt: number): void {
    const [gx, gy] = this.torch.catchPoint();
    if (m.hold < 0) {
      const ty = m.saveY + gy - this.torch.y;
      const dx = gx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), step = SAVE_SPEED * dt;
      m.shrink = Math.min(1, d / m.saveFull);
      if (d > step) {
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
        return;
      }
      m.hold = 0;
      m.shrink = 0;
      this.torch.catch();
      if (this.torchLit < 0) this.torchLit = 0;
      this.L.sfx('pop');
      this.L.particles.emit(gx, gy, TORCH_SPARKS, 'sparkle', SPARKS, 150, 6);
    }
    m.hold += dt;
    m.x = gx;
    m.y = gy;
    // Handed over once the torch is over the fire; a moment later it stands up again.
    if (m.fed && m.hold - m.fedAt >= REACH) m.handed = true;
    if (!m.fed && this.torch.tilt >= DIP_TILT * 0.85) {
      m.fed = true;
      m.fedAt = m.hold;
      this.caught++;
      this.pit.litTo = Math.min(1, this.caught / LIGHT_UP);
      this.L.sfx('whoosh');
      this.pit.sparkle(FIRE_SPARKS);
      this.L.particles.emit(gx, gy, TORCH_SPARKS, 'sparkle', SPARKS, 150, 6);
    }
  }

  drawMover(g: G, m: Mover): void {
    const flick = Math.sin(m.age * 12 + m.phase) * 0.05;
    if (m.out) return drawSprite(g, 'obj-flame-out', m.x, m.y, m.size, { flip: m.flip, rot: m.rot }, flameOutFallback);
    const k = m.state === 'leave' ? Math.sqrt(m.shrink) : 1;
    if (k <= 0) return;
    drawSprite(g, m.sprite, m.x, m.y, m.size * k, { flip: m.flip, rot: m.rot, sx: 1 - flick, sy: 1 + flick }, flameFallback(m.sprite));
  }

  render(g: G): void {
    this.pit.draw(g);
    super.render(g);
  }

  renderFront(g: G): void {
    if (this.L.started && this.L.toolAlpha > 0) {
      const [gx, gy] = this.torch.catchPoint(), r = TORCH_FLAME * 2.6;
      const a = TORCH_GLOW[this.torchLit < 0 ? 0 : 1] * this.L.toolAlpha;
      g.save();
      const glow = g.createRadialGradient(gx, gy - 6, 2, gx, gy - 6, r);
      glow.addColorStop(0, `rgba(255,236,170,${a})`);
      glow.addColorStop(1, 'rgba(255,200,110,0)');
      g.fillStyle = glow;
      g.fillRect(gx - r, gy - 6 - r, r * 2, r * 2);
      g.restore();
    }
    this.torch.draw(g);
    if (this.torchLit < 0 || !this.L.started || this.L.toolAlpha <= 0) return;
    const [x, y] = this.torch.catchPoint();
    const up = this.L.reduceMotion ? 0 : 0.07 * Math.sin(this.t * 8.1) + 0.04 * Math.sin(this.t * 13.3);
    const k = Math.min(1, this.torchLit / 0.4);
    drawSprite(g, 'obj-flame-1', x, y + 4, TORCH_FLAME * (0.5 + 0.5 * k) * (1 + up), { ay: 0.95, sx: 1 - up * 0.5, alpha: this.L.toolAlpha }, flameFallback('obj-flame-1'));
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}

/** The overgrown path: a bush's height, the room between bushes, where the bush to clear stands, and the seconds of a few things. */
const BUSH_H = 150;
const BUSH_GAP = 300;
const STAND = TAPKO_X + 290;
const GLIDE = 1.1;
const SHRINK = 0.6;
const GROW_IN = 0.7;
const SLIP_FADE = 0.6;
/** Seconds after a cleared bush before Tapko walks on. */
const WALK_IN = 0.35;
const SLIP_INK = '#d9482b';
/** The dragon story's place in the story order, for the growing-copy ceiling: (1 + 1) x 3 = 6 extra words. */
const STORY_ORDER = 1;
/** One big bush of several stacked ones stands this far along the path; its spell is two words (or the longest of a few words). */
const BIG_AT = 0.6;
const BIG_TRIES = 4;
/** After the first slip, a slip says why now and then. */
const SLIP_SAY = 0.1;
/** Seconds of the walk to the dragons at the end. */
const WALK_END = 2.4;

interface Bush {
  /** Its place on the path (the screen shows it at x - scroll). */
  x: number;
  pic: string;
  flip: boolean;
  /** Mode time when it grew in; -1 for a bush there from the start. */
  born: number;
  /** Seconds it has been shrinking away; -1 while it stands. */
  gone: number;
  /** Several bushes stacked on each other: a harder spell. */
  big: boolean;
}

/**
 * Valley 2, the overgrown path (calm, growing copy): bushes stand on the path one after another,
 * the nearest has its spell above it. Typed without a slip it shrinks away and Tapko walks on; a
 * slip fades the spell red, two more bushes grow ahead (at most three times) and the spell comes again.
 */
export class ThicketMode extends Mode {
  readonly pictures = [...BUSHES, ...DRAGONS];
  readonly world = 'dragons';
  readonly phraseWords = 1;
  private bushes: Bush[] = [];
  private cleared = 0;
  /** Words added by slips. */
  private added = 0;
  private spell = '';
  private current: Target | null = null;
  /** A slipped spell fading red, with its seconds. */
  private slip: { word: string; t: number } | null = null;
  private glide: { from: number; to: number; k: number; dur: number } | null = null;
  /** Seconds until Tapko walks on after a cleared bush; -1 when not waiting. */
  private walkIn = -1;
  private slips = 0;
  private endT: number | null = null;

  startLine(): string {
    return pickLine('story.thicketStart');
  }

  start(): void {
    this.plant(false);
    this.ask(this.spellFor(this.bushes[0]));
  }

  /** Bushes up to the level's count; the ones a slip or the minimum adds grow in. One of the first ones planned is big. */
  private plant(grow: boolean): void {
    const big = Math.floor(this.L.def.count * BIG_AT);
    while (this.bushes.length < this.L.count) {
      const i = this.bushes.length, prev = this.bushes[i - 1]?.pic;
      const pic = this.L.rng.pick(BUSHES.filter((b) => b !== prev));
      this.bushes.push({ x: STAND + i * BUSH_GAP, pic, flip: this.L.rng.chance(0.5), born: grow ? this.t : -1, gone: -1, big: i === big });
      if (grow) this.L.particles.emit(STAND + i * BUSH_GAP - this.scroll, GROUND - 30, 6, 'leaf', ['#6f9a4a', '#9ccf7a'], 90, 7);
    }
  }

  /** A bush's spell: one word; the big bush's two words once space is known, else the longest of a few. */
  private spellFor(b: Bush | undefined): string {
    const L = this.L;
    if (!b?.big) return L.word();
    if (L.words.knows(SPACE)) return L.word(undefined, 2, 2);
    return Array.from({ length: BIG_TRIES }, () => L.word()).reduce((a, w) => (w.length > a.length ? w : a));
  }

  private ask(word: string): void {
    this.spell = word;
    this.current = this.L.core.add(word, {});
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.current = null;
    this.L.core.prune();
    const b = this.bushes[this.cleared++];
    b.gone = 0;
    this.L.sfx('pop');
    this.L.particles.emit(b.x - this.scroll, GROUND - BUSH_H * 0.5, 12, 'leaf', ['#4f8a4a', '#9ccf7a', '#7a5434'], 160, 8);
    this.walkIn = WALK_IN;
  }

  /** A slip: the spell fades red, two more bushes grow ahead while the ceiling allows, and the same spell comes again. */
  onWrong(tg: Target | null): void {
    if (!this.current || tg !== this.current) return;
    // The first slip says why, later ones now and then.
    if (this.slips++ === 0 || this.L.rng.chance(SLIP_SAY)) this.L.say(pickLine('story.thicketSlip'), 2);
    const more = slipWords(STORY_ORDER, this.added);
    this.added += more;
    this.L.count += more;
    this.L.core.release(this.current, false);
    this.L.core.prune();
    this.current = null;
    this.slip = { word: this.spell, t: 0 };
  }

  update(dt: number): void {
    this.plant(true);
    for (const b of this.bushes) if (b.gone >= 0) b.gone += dt;
    if (this.slip && (this.slip.t += dt) >= SLIP_FADE) {
      this.slip = null;
      this.ask(this.spell);
    }
    if (this.glide) {
      const gl = this.glide;
      gl.k = Math.min(1, gl.k + dt / gl.dur);
      this.scroll = gl.from + (gl.to - gl.from) * ease.inOutQuad(gl.k);
      if (gl.k >= 1) {
        this.glide = null;
        if (this.endT === null) this.ask(this.spellFor(this.bushes[this.cleared]));
      }
    }
    if (this.endT !== null) {
      this.endT += dt;
      return;
    }
    if (this.walkIn < 0 || (this.walkIn -= dt) > 0) return;
    this.walkIn = -1;
    if (this.cleared < this.L.count) {
      this.glide = { from: this.scroll, to: this.bushes[this.cleared].x - STAND, k: 0, dur: GLIDE };
      return;
    }
    // The path is open: Tapko walks on to its end, where the dragons wait for him and cheer.
    this.endT = 0;
    this.glide = { from: this.scroll, to: this.endX() - (TAPKO_X + 230), k: 0, dur: WALK_END };
    this.L.sfx('cheer');
    this.L.say(pickLine('story.thicketDone'), END_TIME);
  }

  /** Where the path ends, past the last bush. */
  private endX(): number {
    return this.bushes[this.bushes.length - 1].x + BUSH_GAP * 0.8;
  }

  render(g: G): void {
    const s = this.scroll;
    this.bushes.forEach((b, i) => {
      const x = b.x - s;
      if (x < -BUSH_H * 2 || x > this.L.vw + BUSH_H * 2 || b.gone >= SHRINK) return;
      const grow = b.born < 0 || this.L.reduceMotion ? 1 : Math.max(0.05, ease.outBack(Math.min(1, (this.t - b.born) / GROW_IN)));
      const k = b.gone < 0 ? 0 : Math.min(1, b.gone / SHRINK);
      const h = BUSH_H * grow * (1 - 0.7 * ease.inQuad(k)), o = { ay: 1, flip: b.flip, alpha: 1 - k };
      if (b.big) {
        // Bushes stacked on each other: two at the sides, one on top, the main one in front.
        for (const [dx, dy, sc, j] of [[-0.42, 0, 0.75, 1], [0.42, 0, 0.8, 2], [0.05, -0.55, 0.7, 1]] as const) {
          drawSprite(g, BUSHES[(BUSHES.indexOf(b.pic) + j) % BUSHES.length], x + dx * h, GROUND + 8 + dy * h, h * sc, { ...o, flip: !b.flip }, bushFallback(i + j));
        }
      }
      drawSprite(g, b.pic, x, GROUND + 8, h, o, bushFallback(i));
    });
    const b = this.bushes[this.cleared];
    const y = GROUND + 8 - BUSH_H * (b?.big ? 1.45 : 1) - 46;
    if (b && this.current) this.L.label(g, this.current, b.x - s, y);
    if (b && this.slip) {
      g.save();
      g.globalAlpha = 1 - this.slip.t / SLIP_FADE;
      g.font = `600 40px ${fontFamily()}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = SLIP_INK;
      g.fillText(this.slip.word, b.x - s, y);
      g.restore();
    }
    if (this.endT === null) return;
    // The dragons wait at the path's end and cheer as he comes: each hops its own way, the further back higher up.
    const k = ease.outBack(Math.min(1, this.endT / 0.8));
    [2, 0, 1].forEach((i) => {
      const x = this.endX() - s + i * 95, up = [0, 18, 34][i];
      const hop = this.L.reduceMotion ? 0 : Math.abs(Math.sin(this.t * 5 + i * 1.3)) * 22;
      drawDragon(g, DRAGONS[i], x, GROUND - up + (1 - k) * 60 - hop, 104, 0, -1, Math.min(1, k));
    });
  }

  progress(): number {
    return Math.min(1, this.cleared / this.L.count);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
