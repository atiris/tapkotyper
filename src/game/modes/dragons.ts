import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, fontFamily, type G } from '../../gfx/draw';
import { Mode, TAPKO_FEET, TAPKO_H, TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { ApproachMode, type Mover } from './approach';
import { slipWords } from './copy-row';
import { Catcher, type CatcherLook } from './meadow';

/** The baby dragons (their colors take turns) and their colors while a picture is missing. */
export const DRAGONS = ['obj-dragon-baby-1', 'obj-dragon-baby-2', 'obj-dragon-baby-3'];
export const DRAGON_COLOR: Record<string, string> = { 'obj-dragon-baby-1': '#8fd6b0', 'obj-dragon-baby-2': '#f2a6c0', 'obj-dragon-baby-3': '#a9c4f2' };
const FLAMES = ['obj-flame-1', 'obj-flame-2', 'obj-flame-3'];
/** Each flame's outer and inner color while its picture is missing. */
const FLAME_COLOR: Record<string, [string, string]> = {
  'obj-flame-1': ['#f59a3c', '#ffd86b'], 'obj-flame-2': ['#ee7a3a', '#ffc94d'], 'obj-flame-3': ['#ffc94d', '#fff1c2'],
};
/** The bushes and branches of the overgrown path. */
export const BUSHES = ['obj-bush-1', 'obj-bush-2', 'obj-bush-3', 'obj-bush-4'];
const PIT_BURNING = ['obj-firepit-burning-1', 'obj-firepit-burning-2', 'obj-firepit-burning-3'];
export const PIT_PICTURES = ['obj-firepit', ...PIT_BURNING];
/** The ground the valley's things stand on: where Tapko's feet are. */
export const GROUND = TAPKO_FEET + 6;
/** The fire pit's height, and seconds each burning picture shows before the next one. */
export const PIT_H = 84;
const FLICKER = 0.2;
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

/** The fire pit seen a little from above: a ring of stones round the logs; burning (`frame` 0-2) with a flame of its own. */
function pitFallback(frame: number | null) {
  return (g: G, _w: number, h: number) => {
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
    if (frame !== null) {
      const tall = [1, 1.15, 0.85][frame], lean = [-0.12, 0.1, 0][frame];
      g.save();
      g.translate(0, cy - h * 0.1);
      g.rotate(lean);
      flameShape(g, 0, -h * 0.45 * tall, h * 0.9, h * 1.0 * tall, '#f59a3c', '#ffd86b');
      g.restore();
    } else {
      g.fillStyle = '#c9783a';
      for (const dx of [-0.3, 0.1, 0.35]) {
        g.beginPath();
        g.arc(dx * rx, cy - ry * 0.1, h * 0.04, 0, Math.PI * 2);
        g.fill();
      }
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
  };
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

/** A baby dragon at (x, y), its feet there: `flap` squeezes it as its wings beat, `face` -1 turns it to the left. */
export function drawDragon(g: G, pic: string, x: number, y: number, h: number, flap = 0, face = 1, alpha = 1, rot = 0): void {
  drawSprite(g, pic, x, y, h, { ay: 1, flip: face < 0, sx: 1 + flap * 0.06, sy: 1 - flap * 0.06, alpha, rot }, blob(DRAGON_COLOR[pic] ?? '#8fd6b0'));
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
 * The dragons' fire pit: the dead embers, or burning with three pictures taking turns as a
 * flicker. It cross-fades between them in `fade` seconds; its warm glow and sparkles grow with `glow`.
 */
export class Firepit {
  /** 0: dead, 1: burning; it moves toward `litTo`. */
  lit = 0;
  litTo = 0;
  fade = 0.6;
  /** 0..1: how big the fire's glow and sparkles are. */
  glow = 0;
  constructor(private L: LevelRuntime, public x: number) {}

  /** Lit at once (a level that starts with the fire burning). */
  burn(glow: number): this {
    this.lit = this.litTo = 1;
    this.glow = glow;
    return this;
  }

  /** The top of its fire, where caught things go in. */
  get top(): number {
    return GROUND - PIT_H * 0.55;
  }

  update(dt: number): void {
    const step = dt / this.fade;
    this.lit = this.lit < this.litTo ? Math.min(this.litTo, this.lit + step) : Math.max(this.litTo, this.lit - step);
    const heat = this.lit * this.glow;
    if (heat > 0 && this.L.rng.chance(dt * heat * 5)) {
      this.L.particles.emit(this.x + this.L.rng.range(-25, 25), GROUND - PIT_H * (0.9 + 0.3 * this.glow), 1, 'sparkle', ['#ffd86b', '#ffb23d', '#fff6a8'], 60, 5, 1.1);
    }
  }

  draw(g: G, t: number): void {
    const heat = this.lit * this.glow;
    if (heat > 0) {
      const cy = GROUND - PIT_H * 0.6, r = PIT_H * (1.2 + 1.6 * this.glow);
      g.save();
      const glow = g.createRadialGradient(this.x, cy, 4, this.x, cy, r);
      glow.addColorStop(0, `rgba(255,214,120,${0.6 * heat})`);
      glow.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = glow;
      g.fillRect(this.x - r, cy - r, r * 2, r * 2);
      g.restore();
    }
    if (this.lit < 1) drawSprite(g, 'obj-firepit', this.x, GROUND, PIT_H, { ay: 0.9 }, pitFallback(null));
    if (this.lit <= 0) return;
    const frame = Math.floor(t / FLICKER) % PIT_BURNING.length;
    drawSprite(g, PIT_BURNING[frame], this.x, GROUND, PIT_H * (0.9 + 0.2 * this.glow), { ay: 0.9, alpha: this.lit }, pitFallback(frame));
  }
}

/** The torch: held upright just right of Tapko, a caught flame sits on its top. */
const TORCH: CatcherLook = { pic: 'obj-torch', h: 130, lean: 0, at: [0, -0.42], fallback: torchFallback };
/** Up and down of a flame's soft arcs, seconds a caught flame stays on the torch, and of the torch's dip into the pit. */
const ARC = 36;
const HOLD = 0.3;
const DIP = 0.5;
/** Speed of a typed flame on its way into the torch. */
const SAVE_SPEED = 950;
/** Flames caught until the pit burns fully (it cross-fades on the way). */
const LIGHT_UP = 3;

/**
 * Valley 1, the flames (a word stream): little flames fly from the right in soft arcs. A typed one
 * speeds into Tapko's torch, which rises to meet it, then dips to the fire pit under it; the pit
 * starts burning and its glow grows with the level. A flame not typed flies past and goes out.
 */
export class FlamesMode extends ApproachMode {
  readonly pictures = [...FLAMES, 'obj-flame-out', 'obj-torch', ...PIT_PICTURES];
  readonly world = 'dragons';
  private torch: Catcher;
  private pit: Firepit;
  private caught = 0;
  private endT: number | null = null;

  constructor(L: LevelRuntime) {
    super(L);
    this.pit = new Firepit(L, this.torchX());
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

  /** The torch rests just above the pit. */
  private torchRest(): number {
    return GROUND - PIT_H - TORCH.h * 0.45;
  }

  /** The torch's height while it dips its flame into the pit. */
  private dipY(): number {
    return this.pit.top - TORCH.h * 0.05;
  }

  makeMover(word: string): Mover {
    const L = this.L;
    const n = word.length;
    const size = n <= 3 ? 58 : n <= 5 ? 72 : 88;
    const x = L.vw + size;
    const by = L.rng.range(150, VH - 170);
    return {
      x, y: by, by, vx: this.speedFor(word, x), vy: 0, rot: 0, vr: 0, age: 0, state: 'come', fade: 0, sprite: L.rng.pick(FLAMES), size,
      flip: L.rng.chance(0.5), phase: L.rng.range(0, 6), out: false, hold: -1, lf: 0, fed: false, saveY: by, saveDist: 0, saveFrom: by,
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
    // The torch rises with the closest typed flame, dips a caught one into the pit, else rests.
    let aim: Mover | null = null, dip = false, holding = false;
    for (const tg of L.core.targets) {
      const m = tg.data as Mover;
      if (m.state === 'leave' && m.hold < 0 && (!aim || m.x < aim.x)) aim = m;
      if (m.hold >= HOLD && m.lf < 1) dip = true;
      else if (m.hold >= 0 && m.hold < HOLD) holding = true;
    }
    const tc = this.torch;
    tc.follow = !!aim;
    if (aim) {
      const k = aim.saveDist > 0 ? Math.min(1, Math.max(0, 1 - (aim.x - tc.catchPoint()[0]) / aim.saveDist)) : 1;
      tc.aimY = aim.saveFrom + (aim.saveY - aim.saveFrom) * ease.inOutQuad(k);
    } else if (dip) tc.aimY = this.dipY();
    else if (!holding) tc.aimY = tc.restY;
    tc.update(dt, this.t);
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

  /** A typed flame speeds into the torch, which rises to meet it at its height. */
  protected onLeave(m: Mover): void {
    m.vx = 0;
    const lift = TORCH.h * -TORCH.at[1];
    m.saveY = Math.max(120 + lift, Math.min(this.torch.restY, m.y + lift));
    m.saveDist = m.x - this.torch.catchPoint()[0];
    m.saveFrom = this.torch.y;
    this.L.sfx('whoosh');
  }

  /** Not typed: it flies past the torch and goes out. Nothing else happens. */
  protected onPass(m: Mover): void {
    m.out = true;
    m.vx *= 0.7;
  }

  protected moveGone(m: Mover, dt: number): void {
    if (m.state === 'pass') {
      m.x += m.vx * dt;
      m.y = m.by + Math.sin(m.age * 1.6 + m.phase) * ARC;
      m.lf = Math.min(1, m.lf + dt * 0.7);
    } else this.save(m, dt);
    m.fade = m.lf;
  }

  /** On its way into the torch, then on its top while the torch dips it into the pit, where it feeds the fire. */
  private save(m: Mover, dt: number): void {
    const [gx, gy] = this.torch.catchPoint();
    if (m.hold < 0) {
      const ty = m.saveY + gy - this.torch.y;
      const dx = gx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), step = SAVE_SPEED * dt;
      if (d > step) {
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
        return;
      }
      m.hold = 0;
      this.torch.catch();
      this.L.sfx('pop');
      this.L.particles.emit(gx, gy, 6, 'sparkle', ['#fff6a8', '#ffd25a'], 110, 7);
    }
    m.hold += dt;
    m.x = gx;
    m.y = gy;
    m.lf = Math.max(0, Math.min(1, (m.hold - HOLD) / DIP));
    if (m.lf >= 1 && !m.fed) {
      m.fed = true;
      this.caught++;
      this.pit.litTo = Math.min(1, this.caught / LIGHT_UP);
      this.L.particles.emit(this.pit.x, this.pit.top, 10, 'sparkle', ['#ffd86b', '#ffb23d', '#fff6a8'], 140, 7);
    }
  }

  drawMover(g: G, m: Mover): void {
    const flick = Math.sin(m.age * 12 + m.phase) * 0.05;
    if (m.out) drawSprite(g, 'obj-flame-out', m.x, m.y, m.size, { flip: m.flip, rot: m.rot }, flameOutFallback);
    else drawSprite(g, m.sprite, m.x, m.y, m.size, { flip: m.flip, rot: m.rot, sx: 1 - flick, sy: 1 + flick }, flameFallback(m.sprite));
  }

  render(g: G): void {
    this.pit.draw(g, this.t);
    super.render(g);
  }

  renderFront(g: G): void {
    this.torch.draw(g);
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

interface Bush {
  /** Its place on the path (the screen shows it at x - scroll). */
  x: number;
  pic: string;
  flip: boolean;
  /** Mode time when it grew in; -1 for a bush there from the start. */
  born: number;
  /** Seconds it has been shrinking away; -1 while it stands. */
  gone: number;
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
  private glide: { from: number; to: number; k: number } | null = null;
  /** Seconds until Tapko walks on after a cleared bush; -1 when not waiting. */
  private walkIn = -1;
  private endT: number | null = null;

  startLine(): string {
    return pickLine('story.thicketStart');
  }

  start(): void {
    this.plant(false);
    this.ask(this.L.word());
  }

  /** Bushes up to the level's count; the ones a slip or the minimum adds grow in. */
  private plant(grow: boolean): void {
    while (this.bushes.length < this.L.count) {
      const i = this.bushes.length, prev = this.bushes[i - 1]?.pic;
      const pic = this.L.rng.pick(BUSHES.filter((b) => b !== prev));
      this.bushes.push({ x: STAND + i * BUSH_GAP, pic, flip: this.L.rng.chance(0.5), born: grow ? this.t : -1, gone: -1 });
      if (grow) this.L.particles.emit(STAND + i * BUSH_GAP - this.scroll, GROUND - 30, 6, 'leaf', ['#6f9a4a', '#9ccf7a'], 90, 7);
    }
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
      gl.k = Math.min(1, gl.k + dt / GLIDE);
      this.scroll = gl.from + (gl.to - gl.from) * ease.inOutQuad(gl.k);
      if (gl.k >= 1) {
        this.glide = null;
        if (this.endT === null) this.ask(this.L.word());
      }
    }
    if (this.endT !== null) {
      this.endT += dt;
      return;
    }
    if (this.walkIn < 0 || (this.walkIn -= dt) > 0) return;
    this.walkIn = -1;
    if (this.cleared < this.L.count) {
      this.glide = { from: this.scroll, to: this.bushes[this.cleared].x - STAND, k: 0 };
      return;
    }
    // The path is open: the view glides to its end, where the dragons peek out.
    this.endT = 0;
    this.glide = { from: this.scroll, to: this.endX() - this.L.vw * 0.6, k: 0 };
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
      drawSprite(g, b.pic, x, GROUND + 8, BUSH_H * grow * (1 - 0.7 * ease.inQuad(k)), { ay: 1, flip: b.flip, alpha: 1 - k }, bushFallback(i));
    });
    const b = this.bushes[this.cleared];
    const y = GROUND + 8 - BUSH_H - 34;
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
    // The dragons peek out at the path's end.
    const k = ease.outBack(Math.min(1, Math.max(0, this.endT - 0.6) / 0.8));
    DRAGONS.forEach((pic, i) => {
      const x = this.endX() - s + (i - 1) * 110, hop = this.L.reduceMotion ? 0 : Math.abs(Math.sin(this.t * 3 + i)) * 6;
      drawDragon(g, pic, x, GROUND + (1 - k) * 60 - hop, 100 - i * 8, 0, -1, Math.min(1, k));
    });
  }

  progress(): number {
    return Math.min(1, this.cleared / this.L.count);
  }

  get finished(): boolean {
    return (this.endT ?? 0) > END_TIME;
  }
}
