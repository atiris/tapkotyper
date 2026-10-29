import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { blob, drawFace, drawSprite, type G, lighten } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { TAPKO_H, TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';

/** The pictures this world's levels draw; a level opens when they are loaded. */
const PICTURES = ['obj-bee', 'obj-butterfly', 'obj-fly', 'obj-gloves', 'obj-hedgehog', 'obj-ladybug', 'obj-mouse', 'obj-leaf-birch', 'obj-leaf-card', 'obj-leaf-chestnut', 'obj-leaf-ginkgo', 'obj-leaf-maple', 'obj-leaf-oak'];

const FLYERS = ['obj-bee', 'obj-butterfly'];
const BUGS = ['obj-ladybug', 'obj-fly'];
const COLORS: Record<string, string> = {
  'obj-bee': '#f5c542', 'obj-butterfly': '#8fc5ef', 'obj-ladybug': '#e5534b', 'obj-fly': '#9aa7b4', 'obj-mouse': '#b8b8c4',
};
/** How each creature sends its leaf on at the throw point. */
const THROW: Record<string, 'toss' | 'flap' | 'kick' | 'roll'> = {
  'obj-bee': 'toss', 'obj-butterfly': 'flap', 'obj-ladybug': 'kick', 'obj-fly': 'kick', 'obj-mouse': 'roll',
};

type LeafKind = 'birch' | 'ginkgo' | 'oak' | 'maple' | 'chestnut';
const LEAF_COLORS: Record<LeafKind, string> = { birch: '#e8c547', ginkgo: '#f2b632', oak: '#c8793a', maple: '#d9482b', chestnut: '#8f9a3a' };

/** Word length picks the leaf size, so a long word shows at a glance. */
function leafFor(word: string, pick: <T>(l: readonly T[]) => T): { kind: LeafKind; size: number } {
  const n = word.length;
  if (n <= 3) return { kind: pick(['birch', 'ginkgo'] as const), size: 70 };
  if (n <= 5) return { kind: 'oak', size: 90 };
  return { kind: pick(['maple', 'chestnut'] as const), size: 115 };
}

/** Code-drawn leaf in a w x h box, stem down, until the owner's art is there. */
function leafFallback(kind: LeafKind) {
  const color = LEAF_COLORS[kind];
  return (g: G, w: number, h: number) => {
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const outline = () => {
      g.fillStyle = color;
      g.fill();
      g.strokeStyle = 'rgba(80,45,20,0.6)';
      g.lineWidth = 2.5;
      g.stroke();
    };
    // The stem.
    g.strokeStyle = '#7a4a28';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, h * 0.18);
    g.lineTo(-w * 0.04, h * 0.47);
    g.stroke();
    if (kind === 'chestnut') {
      // Five fingers spreading from the stem.
      for (const a of [-1.75, -0.9, 0, 0.9, 1.75]) {
        g.save();
        g.translate(0, h * 0.2);
        g.rotate(a);
        g.beginPath();
        g.ellipse(0, -h * 0.26 * (a === 0 ? 1.1 : 0.9), w * 0.11, h * 0.26 * (a === 0 ? 1.1 : 0.9), 0, 0, Math.PI * 2);
        outline();
        g.strokeStyle = 'rgba(80,45,20,0.4)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -h * 0.45);
        g.stroke();
        g.restore();
      }
      g.restore();
      return;
    }
    g.beginPath();
    if (kind === 'ginkgo') {
      // A fan with a notch in the middle.
      g.moveTo(0, h * 0.2);
      g.lineTo(-w * 0.42, -h * 0.12);
      g.quadraticCurveTo(-w * 0.3, -h * 0.45, -w * 0.04, -h * 0.38);
      g.lineTo(0, -h * 0.26);
      g.lineTo(w * 0.04, -h * 0.38);
      g.quadraticCurveTo(w * 0.3, -h * 0.45, w * 0.42, -h * 0.12);
      g.closePath();
      outline();
      g.strokeStyle = 'rgba(80,45,20,0.3)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let i = -3; i <= 3; i++) {
        g.moveTo(0, h * 0.2);
        g.lineTo(i * w * 0.11, -h * 0.34 + Math.abs(i) * h * 0.04);
      }
      g.stroke();
      g.restore();
      return;
    }
    // Polar outline around the leaf centre: an oval (birch), soft lobes (oak) or five points (maple).
    const cy = -h * 0.06;
    const rx = kind === 'maple' ? w * 0.46 : w * (kind === 'oak' ? 0.34 : 0.3);
    const ry = kind === 'maple' ? h * 0.42 : h * 0.4;
    const steps = 90;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const f = kind === 'maple' ? 0.5 + 0.5 * Math.abs(Math.cos(a * 2.5)) ** 3
        : kind === 'oak' ? 0.82 + 0.18 * Math.abs(Math.sin(a * 3.5))
          : 1 + 0.03 * Math.sin(a * 26);
      const x = Math.sin(a) * rx * f, y = cy - Math.cos(a) * ry * f;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    outline();
    g.strokeStyle = 'rgba(80,45,20,0.45)';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(0, h * 0.2);
    g.lineTo(0, cy - ry * 0.85);
    for (const s of [-1, 1]) {
      g.moveTo(0, cy + ry * 0.1);
      g.lineTo(s * rx * 0.55, cy - ry * 0.3);
      g.moveTo(0, cy + ry * 0.45);
      g.lineTo(s * rx * 0.5, cy + ry * 0.05);
    }
    g.stroke();
    g.restore();
  };
}

/** Code-drawn goalkeeper gloves: two padded palms side by side, fingers up. */
export function glovesFallback(g: G, w: number, h: number): void {
  g.save();
  g.lineJoin = 'round';
  g.strokeStyle = '#6d5040';
  g.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * w * 0.2, h * 0.08);
    // Fingers, then the padded palm over their roots, then the wrist strap.
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#f59a3c';
      g.beginPath();
      g.roundRect(-w * 0.17 + i * w * 0.088, -h * 0.4 + Math.abs(i - 1.5) * h * 0.04, w * 0.08, h * 0.3, w * 0.04);
      g.fill();
      g.stroke();
    }
    g.fillStyle = '#f59a3c';
    g.beginPath();
    g.roundRect(-w * 0.19, -h * 0.18, w * 0.38, h * 0.32, w * 0.1);
    g.fill();
    g.stroke();
    g.fillStyle = '#fff4dc';
    g.beginPath();
    g.roundRect(-w * 0.14, -h * 0.14, w * 0.28, h * 0.24, w * 0.08);
    g.fill();
    g.fillStyle = '#fff4dc';
    g.beginPath();
    g.roundRect(-w * 0.15, h * 0.12, w * 0.3, h * 0.12, w * 0.03);
    g.fill();
    g.stroke();
    g.restore();
  }
  g.restore();
}

/** Code-drawn hedgehog, facing left like the owner's art: brown spiky back, face, a few leaves. */
function hedgehogFallback(g: G, w: number, h: number): void {
  g.save();
  g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.beginPath();
  g.ellipse(0, h * 0.42, w * 0.4, h * 0.06, 0, 0, Math.PI * 2);
  g.fill();
  // Spikes on the back half oval.
  g.fillStyle = '#7a5a44';
  g.strokeStyle = '#4a3326';
  g.lineWidth = 2.5;
  g.beginPath();
  const spikes = 13;
  for (let i = 0; i <= spikes; i++) {
    const a = Math.PI * 1.05 + (i / spikes) * Math.PI * 0.95;
    const r = i % 2 ? 1 : 1.18;
    g.lineTo(w * 0.08 + Math.cos(a) * w * 0.4 * r, h * 0.2 + Math.sin(a) * h * 0.48 * r);
  }
  g.lineTo(w * 0.48, h * 0.32);
  g.lineTo(-w * 0.1, h * 0.36);
  g.closePath();
  g.fill();
  g.stroke();
  // Face and belly in front (left).
  g.fillStyle = '#c9a283';
  g.beginPath();
  g.ellipse(-w * 0.22, h * 0.18, w * 0.24, h * 0.22, -0.2, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#f08aa0';
  g.beginPath();
  g.arc(-w * 0.45, h * 0.2, w * 0.04, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  drawFace(g, -w * 0.25, h * 0.14, w * 0.09);
  g.fillStyle = '#c9a283';
  for (const fx of [-0.25, -0.05, 0.2, 0.35]) {
    g.beginPath();
    g.ellipse(w * fx, h * 0.4, w * 0.05, h * 0.05, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
}

/** The gust in the third meadow level: its seconds, the leaves it brings at once, their longest word and how much slower they fly. */
const GUST_TIME = 25;
const GUST_LEAVES = 3;
const GUST_LEN = 3;
const GUST_SLOW = 1.3;
/** Seconds between gust leaves, so their creatures do not crowd at the edge. */
const GUST_GAP = 0.7;

/** Seconds of a kick that lifts a leaf to the catching height, and of a caught leaf held in the gloves. */
const KICK_TIME = 0.6;
const HOLD_TIME = 0.35;
/** Speed of a typed leaf on its way into the gloves. */
const SAVE_SPEED = 950;

/** What a catcher holds: its picture, height, lean, where in front of it a caught thing sits (shares of its height) and its picture while missing. */
export interface CatcherLook {
  pic: string;
  h: number;
  lean: number;
  at: [number, number];
  fallback: (g: G, w: number, h: number) => void;
}

/** The picture's palms face the viewer; leaning right they reach for leaves coming from the right. */
const GLOVES: CatcherLook = { pic: 'obj-gloves', h: 72, lean: 0.55, at: [0.3, 0], fallback: glovesFallback };

/** What Tapko holds just right of him (the gloves, the valley's torch); on a finished word it rises with the target and catches it. */
export class Catcher {
  /** Height it reaches for; its rest height when nothing flies at it. */
  aimY: number;
  /** A typed target leads it: it keeps pace with it instead of easing slowly. */
  follow = false;
  y: number;
  private bob = 0;
  private squeeze = 0;
  constructor(private L: LevelRuntime, public x: number, public restY: number, private look: CatcherLook = GLOVES) {
    this.aimY = this.y = restY;
  }

  /** Where a caught thing sits. */
  catchPoint(): [number, number] {
    const [ax, ay] = this.look.at;
    return [this.x + this.look.h * ax, this.y + this.bob + this.look.h * ay];
  }

  catch(): void {
    this.squeeze = 1;
  }

  update(dt: number, t: number): void {
    this.y += (this.aimY - this.y) * Math.min(1, dt * (this.follow ? 30 : 10));
    this.bob = Math.sin(t * 2) * 4;
    this.squeeze = Math.max(0, this.squeeze - dt * 3);
  }

  draw(g: G): void {
    // It joins Tapko when the game starts, not during the preparation cards, and fades out at the end.
    const alpha = this.L.toolAlpha;
    if (!this.L.started || alpha <= 0) return;
    const sq = Math.sin(this.squeeze * Math.PI) * 0.12;
    g.save();
    g.globalAlpha *= alpha;
    drawSprite(g, this.look.pic, this.x, this.y + this.bob, this.look.h, { rot: this.look.lean, sx: 1 - sq, sy: 1 + sq }, this.look.fallback);
    g.restore();
  }
}

/** A creature that brings a leaf, kicks it on, watches it fly and goes home. */
interface Critter {
  sprite: string;
  x: number;
  y: number;
  size: number;
  ground: boolean;
  phase: number;
  /** carry: holds the leaf; watch: at the throw point; joy: jumps after a goal; home: back to the right. */
  state: 'carry' | 'watch' | 'joy' | 'home';
  /** Seconds in the current state. */
  st: number;
  /** Height of the current hop. */
  hop: number;
  gone: number;
}

/**
 * World 1: the meadow animals play with the child. The wind brings them leaves and they want
 * to score a goal with them. At the penalty area they kick it up above Tapko; a typed word
 * sends the leaf into his gloves, where it fades away and its creature goes home; a missed one
 * is a goal everybody cheers.
 */
export class MeadowMode extends ApproachMode {
  readonly pictures = PICTURES;
  readonly world = 'meadow';
  protected gloves: Catcher;
  /** Seconds left of the gust: null before it, 0 after it (it comes once, in the `gust` variant only). */
  private gustLeft: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.playerX = this.tapkoX();
    this.gloves = new Catcher(L, this.glovesX(), this.glovesRest());
  }

  /** The training in level 1, the real match in level 3 (the gust's level). */
  startLine(): string {
    return pickLine(this.L.def.variant === 'gust' ? 'story.matchStart' : 'story.meadowStart');
  }

  /** Tapko's x on the stage. */
  protected tapkoX(): number {
    return TAPKO_X;
  }

  /** Top of Tapko in game units. */
  protected tapkoTop(): number {
    return VH - TAPKO_H;
  }

  /** The middle band above Tapko's head, where kicked leaves fly and typed ones are caught. */
  private bandY(): number {
    return Math.max(150, this.tapkoTop() - 50);
  }

  /** The gloves rest just right of Tapko, toward the leaves, never over him. */
  private glovesX(): number {
    return this.playerX + TAPKO_H * 0.75;
  }

  private glovesRest(): number {
    return VH - TAPKO_H * 0.36;
  }

  private pickSprite(): string {
    const v = this.L.def.variant;
    const r = this.L.rng;
    if (v === 'flyers') return r.pick(FLYERS);
    return r.pick([...FLYERS, ...BUGS, 'obj-mouse']);
  }

  /** A leaf flying toward Tapko from `x`, at height `y`. */
  protected makeLeaf(word: string, x: number, y: number, speed = 1): Mover {
    const { kind, size } = leafFor(word, (l) => this.L.rng.pick(l));
    return {
      x, y, vx: this.speedFor(word, x) * speed, vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0,
      sprite: `obj-leaf-${kind}`, size, kind, by: y, phase: this.L.rng.range(0, 6), lf: 0,
      critter: null, style: 'toss', thrown: -1, throwX: 0, arc: null, caught: false, scored: false, kickFrom: y, kickTo: null, hold: -1, saveY: y, saveDist: 0, saveFrom: y,
    };
  }

  makeMover(word: string): Mover {
    const sprite = this.pickSprite();
    const ground = sprite === 'obj-mouse';
    const L = this.L;
    const x = L.vw + 110;
    const m = this.makeLeaf(word, x, 0, this.gusting ? 1 / GUST_SLOW : 1);
    // Mouse leaves roll in the grass; the others fly at the height of Tapko's body.
    m.by = ground ? VH - m.size / 2 - 6 : L.rng.range(Math.max(170, this.tapkoTop() - 30), VH - 80);
    m.y = m.by;
    m.style = THROW[sprite];
    m.throwX = Math.max(L.vw * L.rng.range(0.58, 0.66), this.playerX + this.waitGap + 80);
    const critter: Critter = { sprite, x, y: m.y, size: ground ? 90 : 95, ground, phase: m.phase, state: 'carry', st: 0, hop: 0, gone: 0 };
    m.critter = critter;
    this.carry(m, critter);
    return m;
  }

  /** The creature holds its leaf from behind (the right): flyers above it, the mouse pushes it. */
  private carry(m: Mover, c: Critter): void {
    c.x = m.x + m.size * 0.4 + c.size * 0.3;
    c.y = c.ground ? VH - c.size / 2 - 4 : m.y - m.size * 0.3;
  }

  private get gusting(): boolean {
    return !!this.gustLeft;
  }

  /** A gust leaf carries one short word. */
  protected nextWord(): string {
    return this.gusting ? this.L.word(GUST_LEN, 1) : super.nextWord();
  }

  protected maxOnScreen(): number {
    return this.gusting ? Math.max(GUST_LEAVES, this.L.maxActive) : this.L.maxActive;
  }

  protected spawnGap(): number {
    return this.gusting ? GUST_GAP : this.L.spawnGap;
  }

  /** Half way through the planned words the wind brings small leaves in threes for a while. */
  private gust(dt: number): void {
    if (this.L.def.variant !== 'gust') return;
    if (this.gustLeft === null && this.resolved >= this.L.def.count / 2) {
      this.gustLeft = GUST_TIME;
      this.L.say(t('story.gustStart'), 3);
    }
    if (!this.gustLeft) return;
    this.gustLeft = Math.max(0, this.gustLeft - dt);
    if (this.L.rng.chance(dt * 4)) this.L.particles.emit(this.L.vw - 20, this.L.rng.range(120, VH - 120), 3, 'leaf', ['#9ccf7a', '#ffd25a', '#c8793a'], 220, 6, 1.2);
  }

  update(dt: number): void {
    this.gust(dt);
    this.playerX = this.tapkoX();
    const gl = this.gloves;
    gl.x = this.glovesX();
    gl.restY = this.glovesRest();
    super.update(dt);
    // A leaf's word shows once the leaf and the animal carrying it are wholly in sight.
    for (const tg of this.L.core.active) {
      const m = tg.data as Mover, c = m.critter as Critter | null;
      if (m.state !== 'come' || !tg.selectable) continue;
      const carrier = c?.state === 'carry' ? c : null;
      const img = carrier ? sprite(carrier.sprite) : null;
      const half = carrier ? (carrier.size * (img ? img.naturalWidth / img.naturalHeight : 1)) / 2 : 0;
      tg.selectable = m.x + m.size / 2 <= this.L.vw && (!carrier || carrier.x + half <= this.L.vw);
    }
    // The gloves rise with the closest leaf on its way to them, reaching its height as it arrives,
    // and hold a caught one, else rest beside Tapko.
    let aim: Mover | null = null;
    for (const tg of this.L.core.targets) {
      const m = tg.data as Mover;
      if (m.state === 'leave' && m.hold < 0 && (!aim || m.x < aim.x)) aim = m;
    }
    const holding = this.L.core.targets.some((tg) => (tg.data as Mover).hold >= 0 && (tg.data as Mover).hold < HOLD_TIME);
    gl.follow = !!aim;
    if (aim) {
      const k = aim.saveDist > 0 ? Math.min(1, Math.max(0, 1 - (aim.x - gl.catchPoint()[0]) / aim.saveDist)) : 1;
      gl.aimY = aim.saveFrom + (aim.saveY - aim.saveFrom) * ease.inOutQuad(k);
    } else if (!holding) gl.aimY = gl.restY;
    gl.update(dt, this.t);
  }

  protected moveComing(m: Mover, dt: number, tg: Target): void {
    super.moveComing(m, dt, tg);
    const c = m.critter as Critter | null;
    if (c && m.thrown < 0 && m.x <= m.throwX) this.throwLeaf(m, c);
    if (m.thrown >= 0) m.thrown += dt;
    this.flutter(m);
    if (c) this.moveCritter(m, c, dt);
  }

  /** At the penalty area the creature sends its leaf on; when the gloves' height is free and the leaf flies elsewhere, it kicks it up there. */
  private throwLeaf(m: Mover, c: Critter): void {
    m.thrown = 0;
    c.state = 'watch';
    c.st = 0;
    const band = this.bandY(), near = (y: number) => Math.abs(y - band) < 60;
    const taken = this.L.core.targets.some((tg) => {
      const o = tg.data as Mover;
      return o !== m && o.state === 'come' && near(o.kickTo ?? o.by);
    });
    if (!near(m.by) && !taken) {
      m.kickFrom = m.by;
      m.kickTo = band;
      m.style = 'kick';
    }
    if (m.style === 'flap') this.L.particles.emit(m.x + 20, m.y - 10, 4, 'puff', ['#ffffff', '#f4f8ff'], 60, 9, 0.6);
  }

  /** Height and spin of a coming leaf: carried, then tossed, kicked or rolled, then fluttering on. */
  private flutter(m: Mover): void {
    const sway = Math.sin(m.age * 3 + m.phase);
    if (m.style === 'roll') {
      m.y = m.by;
      m.rot = m.thrown >= 0 ? m.x / (m.size * 0.45) : sway * 0.1;
      return;
    }
    const k = m.thrown >= 0 ? Math.min(1, m.thrown / KICK_TIME) : 0;
    const lift = m.style === 'kick' ? 55 : m.style === 'toss' ? 35 : 20;
    const toss = k > 0 && k < 1 ? -Math.sin(k * Math.PI) * lift : 0;
    // A kick to the gloves' height carries the leaf there along its arc.
    if (m.kickTo != null) m.by = m.kickFrom + (m.kickTo - m.kickFrom) * ease.inOutQuad(k);
    m.y = m.by + toss + sway * (m.thrown >= 0 ? 10 : 4);
    m.rot = (m.style === 'kick' && k < 1 ? -k * Math.PI * 2 : 0) + Math.sin(m.age * 2.5 + m.phase) * 0.3;
  }

  private moveCritter(m: Mover, c: Critter, dt: number): void {
    c.st += dt;
    if (c.state === 'carry') {
      this.carry(m, c);
      c.hop = c.ground ? -Math.abs(Math.sin(m.age * 8)) * 6 : Math.sin(m.age * 2.2 + c.phase) * 6;
    } else if (c.state === 'watch') {
      // The kick and the toss end with a little bounce, then the creature bobs and watches.
      c.hop = c.ground ? -Math.abs(Math.sin(c.st * 3)) * 3 : Math.sin(c.st * 2 + c.phase) * 8;
    } else if (c.state === 'joy') {
      c.hop = -Math.abs(Math.sin(c.st * 9)) * 30;
      if (c.st > 0.8) {
        c.state = 'home';
        c.st = 0;
      }
    } else {
      c.x += 240 * dt;
      if (!c.ground) c.y -= 70 * dt;
      c.hop = c.ground ? -Math.abs(Math.sin(c.st * 10)) * 6 : Math.sin(c.st * 6) * 5;
      c.gone = Math.min(1, c.gone + dt * 1.1);
    }
  }

  /**
   * A typed leaf speeds up into the gloves (see moveGone): in the middle band when it was typed
   * before the kick or kicked up there, else at its own height.
   */
  protected onLeave(m: Mover): void {
    m.vx = 0;
    m.saveY = m.thrown < 0 || m.kickTo != null ? this.bandY() : Math.max(110, Math.min(VH - 60, m.y));
    // Its way to the gloves, along which they rise from where they are now.
    m.saveDist = m.x - this.gloves.catchPoint()[0];
    m.saveFrom = this.gloves.y;
    this.L.sfx('whoosh');
    const c = m.critter as Critter | null;
    if (c && c.state === 'carry') {
      c.state = 'watch';
      c.st = 0;
    }
  }

  /**
   * The typed leaf flies into the gloves, which hold it a moment: it fades away there and its
   * creature goes home, or it is thrown back where catchPoint says.
   */
  private save(m: Mover, dt: number): void {
    const L = this.L;
    const [gx, gy] = this.gloves.catchPoint();
    if (m.hold < 0) {
      // Toward where the gloves are going, so the leaf meets them there.
      const ty = m.saveY + gy - this.gloves.y;
      const dx = gx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), step = SAVE_SPEED * dt;
      m.rot += dt * 8;
      if (d > step) {
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
        return;
      }
      m.hold = 0;
      this.gloves.catch();
      L.sfx('pop');
      L.particles.emit(gx, gy, 6, 'sparkle', ['#fff6a8', '#ffd25a'], 110, 7);
      const c = m.critter as Critter | null;
      if (c) {
        c.state = 'home';
        c.st = 0;
      }
    }
    m.hold += dt;
    m.x = gx;
    m.y = gy;
    const back = this.catchPoint();
    if (!back) {
      m.lf = Math.min(1, m.hold / HOLD_TIME);
      return;
    }
    if (m.hold < HOLD_TIME) return;
    L.sfx('whoosh');
    m.arc = { x0: m.x, y0: m.y, x1: back[0], y1: back[1], k: 0, dur: Math.max(0.8, Math.min(1.8, (back[0] - m.x) / 520)) };
  }

  /** Where the gloves throw a caught leaf, or null when it fades away in them. */
  protected catchPoint(): [number, number] | null {
    return null;
  }

  /** A thrown-back leaf has landed. */
  protected onCaught(_m: Mover): void {}

  /** A saved leaf goes into the gloves (and may be thrown back); a goal flutters on to the left edge. */
  protected moveGone(m: Mover, dt: number): void {
    const c = m.critter as Critter | null;
    if (c) this.moveCritter(m, c, dt);
    if (m.state === 'pass') {
      m.x += m.vx * dt;
      this.flutter(m);
      m.lf = Math.min(1, m.lf + dt * Math.max(0.6, -m.vx / Math.max(60, m.x + 60)));
    } else if (!m.arc) this.save(m, dt);
    else if (m.arc.k < 1) {
      const a = m.arc;
      a.k = Math.min(1, a.k + dt / a.dur);
      m.x = a.x0 + (a.x1 - a.x0) * ease.inOutQuad(a.k);
      m.y = a.y0 + (a.y1 - a.y0) * a.k - Math.sin(a.k * Math.PI) * 160;
      m.rot += dt * 6;
      if (a.k >= 1) this.onCaught(m);
    }
    m.fade = Math.min(m.lf, c ? c.gone : 1);
  }

  /** Not typed in time: a goal! Confetti, the pop text and a cheer; nothing bad happens. */
  protected onPass(m: Mover): void {
    const L = this.L;
    m.vx *= 0.8;
    const color = LEAF_COLORS[m.kind as LeafKind];
    L.particles.emit(m.x, m.y, 14, 'leaf', [color, lighten(color, 0.4), '#ffd25a', '#9ccf7a'], 200, 7, 1.1);
    L.sfx('cheer');
    const spot = this.goalSpot(m);
    L.shout(t('story.goalShout'), spot.x, spot.y);
    this.cheerGoal(m);
  }

  /** Above the animal that scored (where the leaf is when none stands there). */
  protected goalSpot(m: Mover): { x: number; y: number } {
    const c = m.critter as Critter | null;
    return c ? { x: c.x, y: c.y - c.size * 0.7 } : { x: m.x, y: m.y - 60 };
  }

  /** The creature that sent the leaf jumps with joy, then goes home. */
  protected cheerGoal(m: Mover): void {
    const c = m.critter as Critter | null;
    if (!c) return;
    c.state = 'joy';
    c.st = 0;
  }

  drawMover(g: G, m: Mover): void {
    const c = m.critter as Critter | null;
    if (c && c.gone < 1) {
      g.save();
      g.globalAlpha = 1 - c.gone;
      const flap = c.ground ? 0 : Math.sin(m.age * 14) * 0.04;
      drawSprite(g, c.sprite, c.x, c.y + c.hop, c.size, { flip: c.state !== 'home', sy: 1 + flap, sx: 1 - flap }, blob(COLORS[c.sprite] ?? '#9ccf7a'));
      g.restore();
    }
    if (m.lf < 1) {
      g.save();
      g.globalAlpha = 1 - m.lf;
      drawSprite(g, m.sprite, m.x, m.y, m.size, { rot: m.rot }, leafFallback(m.kind));
      g.restore();
    }
  }

  render(g: G): void {
    const list = [...this.L.core.targets].sort((a, b) => (a.data as Mover).y - (b.data as Mover).y);
    for (const tg of list) this.drawMover(g, tg.data as Mover);
    for (const tg of list) {
      const m = tg.data as Mover;
      if (m.state === 'come') this.L.label(g, tg, m.x, Math.max(40, m.y - m.size * 0.55 - 26));
    }
    this.drawExtras(g);
  }

  renderFront(g: G): void {
    this.gloves.draw(g);
  }

  /** Hook for the hedgehog. */
  protected drawExtras(_g: G): void {}

}

/** Splits `count` leaves into volleys of 2 or 3. */
export function volleys(count: number): number[] {
  const n = Math.max(1, Math.ceil(count / 3));
  return Array.from({ length: n }, (_, i) => Math.floor(count / n) + (i < count % n ? 1 : 0));
}

/** The hedgehog's happy end: hops of END_HOP_TIME seconds, and the seconds of its two shouts. */
const END_HOPS = 4;
const END_HOP_TIME = 0.55;
const END_SHOUT = [0.3, 1.4];

/** World 1 super-obstacle: a hedgehog shakes volleys of leaves off its back toward Tapko. */
export class HedgehogMode extends MeadowMode {
  protected autoSpawn = false;
  private sizes: number[];
  private volley = 0;
  private hy = VH - 102;
  /** Leaves on the hedgehog's back. */
  private pile: number;
  /** Leaves planned in volleys so far; a level still too short asks for more. */
  private planned: number;
  private shake = 0;
  private hop = 0;
  /** Seconds of the happy end (hops on the spot and shouts); -1 before it. */
  private endT = -1;
  /** The cheer it shouts at the end, again on a later hop. */
  private cheer = '';

  constructor(L: LevelRuntime) {
    super(L);
    this.sizes = volleys(L.count);
    this.pile = this.planned = L.count;
    this.spawnTimer = 1;
  }

  private get hx(): number {
    return this.L.vw * 0.68;
  }

  startLine(): string {
    return pickLine('story.hedgehogStart');
  }

  update(dt: number): void {
    const L = this.L;
    if (L.count > this.planned) {
      this.sizes.push(...volleys(L.count - this.planned));
      this.pile += L.count - this.planned;
      this.planned = L.count;
    }
    const flying = L.core.targets.some((tg) => (tg.data as Mover).state === 'come');
    if (this.volley < this.sizes.length && !flying) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.throwVolley();
    }
    this.shake = Math.max(0, this.shake - dt);
    this.hop = Math.max(0, this.hop - dt);
    super.update(dt);
    // A leaf's word shows when its toss ends.
    for (const tg of L.core.active) if ((tg.data as Mover).launch?.k < 1) tg.selectable = false;
    if (this.endT < 0 && this.spawned >= this.total && L.core.targets.length === 0) {
      this.endT = 0;
      L.sfx('reward');
      L.say(pickLine('story.hedgehogDone'), 3);
    } else if (this.endT >= 0) {
      const e = this.endT;
      this.endT += dt;
      const spot = this.goalSpot();
      if (e < END_SHOUT[0] && this.endT >= END_SHOUT[0]) this.cheer = L.hooray(spot);
      if (e < END_SHOUT[1] && this.endT >= END_SHOUT[1]) L.shout(this.cheer, spot.x, spot.y);
    }
  }

  private throwVolley(): void {
    const L = this.L;
    const n = this.sizes[this.volley++];
    this.shake = 0.6;
    this.pile -= n;
    L.sfx('whoosh');
    const top = Math.max(170, VH * 0.5), bottom = VH - 70;
    const lanes = L.rng.chance(0.5) ? [0, 1, 2] : [2, 1, 0];
    for (let i = 0; i < n; i++) {
      const word = L.word();
      const y = top + ((lanes[i] + L.rng.range(-0.2, 0.2)) / 2) * (bottom - top);
      // Tossed off his back in its own direction: forward toward Tapko or behind him, still on the stage.
      const x0 = this.hx - 30, x1 = Math.min(L.vw - 60, this.hx + L.rng.range(-260, 120));
      const m = this.makeLeaf(word, x1, y, 0.75);
      m.launch = { x0, x1, y0: this.hy - 60, k: 0, peak: L.rng.range(60, 140) };
      // Already past the toss: it only flutters.
      m.thrown = 1;
      m.x = x0;
      m.y = this.hy - 60;
      L.core.add(word, m);
      this.spawned++;
    }
    this.spawnTimer = 1.2;
  }

  protected moveComing(m: Mover, dt: number, tg: Target): void {
    super.moveComing(m, dt, tg);
    const l = m.launch;
    if (!l || l.k >= 1) return;
    // Off the back in an arc to its toss spot, then on at its own height.
    l.k = Math.min(1, l.k + dt / 0.9);
    m.x = l.x0 + (l.x1 - l.x0) * ease.outQuad(l.k);
    m.y = l.y0 + (m.y - l.y0) * ease.outQuad(l.k) - Math.sin(l.k * Math.PI) * l.peak;
  }

  /** Saved leaves fly back onto the hedgehog's back. */
  protected catchPoint(): [number, number] {
    return [this.hx + 10, this.hy - 70];
  }

  protected onCaught(m: Mover): void {
    m.lf = 1;
    this.pile++;
    this.hop = 0.4;
    this.L.particles.emit(this.hx, this.hy - 70, 6, 'sparkle', ['#fff6a8', '#ffd25a'], 110, 7);
  }

  /** A goal does not count: the leaf goes back on the pile and is shaken off again. */
  protected goalSpot(): { x: number; y: number } {
    return { x: this.hx, y: this.hy - 150 };
  }

  protected cheerGoal(): void {
    this.hop = 0.6;
    this.pile++;
    this.sizes.push(1);
  }

  protected drawExtras(g: G): void {
    const e = this.endT;
    let jump = 0, tilt = 0;
    if (e >= 0 && e < END_HOPS * END_HOP_TIME && !this.L.reduceMotion) {
      // Happy hops on the spot, leaning a little left and right.
      const k = (e % END_HOP_TIME) / END_HOP_TIME;
      jump = Math.sin(k * Math.PI) * 45;
      tilt = Math.sin(k * Math.PI) * 0.1 * (Math.floor(e / END_HOP_TIME) % 2 ? 1 : -1);
    }
    const shake = this.shake > 0 ? Math.sin(this.shake * 50) * 0.08 : 0;
    const hop = this.hop > 0 ? -Math.abs(Math.sin(this.hop * 10)) * 18 : 0;
    const size = 150;
    g.save();
    g.translate(this.hx, this.hy + hop - jump);
    g.rotate(tilt + shake);
    drawSprite(g, 'obj-hedgehog', 0, 0, size, {}, hedgehogFallback);
    // The pile of leaves on its back.
    const kinds: LeafKind[] = ['maple', 'birch', 'oak', 'ginkgo', 'chestnut', 'maple'];
    for (let i = 0; i < Math.min(6, Math.max(0, this.pile)); i++) {
      drawSprite(g, `obj-leaf-${kinds[i]}`, -5 + (i % 3) * 26, -size * 0.32 + Math.floor(i / 3) * 18, 30, { rot: i * 1.1 }, leafFallback(kinds[i]));
    }
    g.restore();
  }

  get finished(): boolean {
    return this.endT > 3;
  }
}
