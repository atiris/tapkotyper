import { app } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, type G, roundRect } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { SHIFT_L, SHIFT_R, SPACE, isKeyReady, keysAccuracy, notReadyKeys, recentAccuracy } from '../../learning/lessons';
import { h } from '../../ui/dom';
import { keyLabel } from '../../ui/keyboard-guide';
import { WORLDS } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { HeroMode } from './planet';

/** The run ends after this many throws or seconds of play, whichever comes first. */
export const AIM_THROWS = 12;
export const AIM_SECONDS = 120;
/** Wrong keys in one flight before the projectile falls. */
export const FALL_ERRORS = 3;
/** How much lower the path runs after each wrong key. */
const SINK = 24;
/** Target radius at no accuracy and at full accuracy. */
const BIG = 120;
const SMALL = 48;
/** Share of the path flown per second, and where it waits before a ring. */
const FLY = 0.22;
const WAIT_BEFORE = 0.05;
/** Words picked for one ring; the one with the most weak keys wins. */
const CANDIDATES = 5;
const PAUSE_AFTER = 1.1;

export const PROJECTILES = ['pebble', 'screw', 'fly', 'tomato', 'arrow', 'duck', 'sock'] as const;
export type Projectile = typeof PROJECTILES[number];

/** The target's radius: big at low accuracy on the weak keys, smaller as it improves. */
export function targetRadius(accuracy: number): number {
  const a = Math.max(0, Math.min(1, accuracy));
  return BIG + (SMALL - BIG) * a;
}

/** The run is over: enough throws, or enough time. */
export function aimOver(throws: number, seconds: number): boolean {
  return throws >= AIM_THROWS || seconds >= AIM_SECONDS;
}

/** Characters of a word that train these keys (a capital trains the Shifts, a space the space bar). */
export function weakCount(word: string, keys: string[]): number {
  const set = new Set(keys);
  return [...word].filter((c) => set.has(c.toLowerCase()) || (c === ' ' && set.has(SPACE)) || (c !== c.toLowerCase() && (set.has(SHIFT_L) || set.has(SHIFT_R)))).length;
}

/** The word richest in the weak keys (the first one on a tie); a word of weak keys alone counts half, so mixed words win. */
export function richestWord(words: string[], keys: string[]): string {
  const score = (w: string) => {
    const n = weakCount(w, keys);
    return n === [...w].length ? n / 2 : n;
  };
  return words.reduce((best, w) => (score(w) > score(best) ? w : best));
}

interface Ring {
  x: number;
  y: number;
  tg: Target | null;
  passed: number;
}

interface Flight {
  kind: Projectile;
  rings: Ring[];
  /** 0 (Tapko's paw) .. 1 (the target), along the path. */
  s: number;
  /** The ring it waits for; rings.length = on its way to the target. */
  next: number;
  errors: number;
  sink: number;
  /** 'fly' along the path, 'fall' after three wrong keys, 'hit' at the target. */
  phase: 'fly' | 'fall' | 'hit';
  /** Falling: the drop below the path and its speed, and whether it is on the ground; seconds since the hit or the landing. */
  drop: number;
  vy: number;
  landed: boolean;
  after: number;
  spin: number;
}

/** What stays on the target after a hit: the splat of a tomato, a buzzing fly. */
interface Mark {
  kind: Projectile;
  dx: number;
  dy: number;
  age: number;
}

/**
 * The target range of a world: Tapko throws a funny projectile at a target through 3 to 5
 * rings, each with a word rich in the weak keys. A wrong key makes it sink, three make it fall
 * softly; the target shrinks as the weak keys get more accurate. No stars.
 */
export class AimMode extends HeroMode {
  readonly world: string;
  readonly phraseWords: number;
  /** The keys trained, the ones still holding the next letters back, and their accuracy at the start. */
  readonly keys: string[];
  private held: string[];
  private readonly before: Map<string, number>;
  private flight: Flight | null = null;
  private throws = 0;
  private time = 0;
  private radius: number;
  private shrink = 0;
  private marks: Mark[] = [];
  private hudEl = h('div', { class: 'aim-keys', role: 'list', 'aria-label': t('aim.keys') });

  constructor(L: LevelRuntime) {
    super(L);
    const p = app.profile!;
    this.world = WORLDS[L.def.world];
    this.keys = L.def.focus ?? [];
    this.held = notReadyKeys(p).filter((k) => this.keys.includes(k));
    this.before = new Map(this.keys.map((k) => [k, recentAccuracy(p.stats.keys[k])]));
    this.phraseWords = this.keys.includes(SPACE) ? 2 : 1;
    this.radius = targetRadius(this.accuracy);
    this.paintHud();
  }

  startLine(): string {
    return t('aim.start', { keys: this.keys.map(keyLabel).join(' ') });
  }

  hud(): HTMLElement {
    return this.hudEl;
  }

  /** Accuracy before and now of each trained key. */
  report(): { key: string; before: number; after: number }[] {
    const p = app.profile!;
    return this.keys.map((key) => ({ key, before: this.before.get(key) ?? 0, after: recentAccuracy(p.stats.keys[key]) }));
  }

  /** The keys still to train: the trained ones minus those that became ready during the run. */
  private get listed(): string[] {
    return this.keys.filter((k) => !this.graduated.includes(k));
  }

  /** The keys the words and the target size follow: the listed ones, all of them once none is left. */
  private get aimed(): string[] {
    return this.listed.length ? this.listed : this.keys;
  }

  private graduated: string[] = [];

  private get accuracy(): number {
    return keysAccuracy(app.profile!, this.aimed);
  }

  private get target(): { x: number; y: number } {
    return { x: this.L.vw * 0.86, y: VH * 0.46 };
  }

  private get hand(): { x: number; y: number } {
    return { x: this.heroX + 60, y: this.heroY - 120 };
  }

  /** The path from Tapko's paw to the target: a gentle arc. */
  private point(s: number): { x: number; y: number } {
    const a = this.hand, b = this.target;
    return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s - Math.sin(s * Math.PI) * VH * 0.12 };
  }

  start(): void {
    this.heroX = Math.max(110, this.L.vw * 0.12);
    this.heroY = VH * 0.82;
    this.throw();
  }

  private throw(): void {
    const n = this.L.rng.int(3, 5);
    const rings: Ring[] = Array.from({ length: n }, (_, i) => {
      const s = (i + 1) / (n + 1);
      return { ...this.point(s), tg: null, passed: 0 };
    });
    this.flight = { kind: this.L.rng.pick(PROJECTILES), rings, s: 0, next: 0, errors: 0, sink: 0, phase: 'fly', drop: 0, vy: 0, landed: false, after: 0, spin: 0 };
    this.happy();
    if (!this.L.reduceMotion) this.L.tweens.add(0.4, (k) => (this.jump = k * 0.6), ease.linear, () => (this.jump = 0));
    this.L.sfx('whoosh');
    this.arm(rings[0]);
  }

  /** A ring gets its word. */
  private arm(r: Ring): void {
    const words = Array.from({ length: CANDIDATES }, () => this.L.word(8));
    r.tg = this.L.core.add(richestWord(words, this.aimed), {});
  }

  /** Where along the path the flight stops before its next ring (1 = the target). */
  private stopAt(f: Flight): number {
    return f.next < f.rings.length ? (f.next + 1) / (f.rings.length + 1) - WAIT_BEFORE : 1;
  }

  update(dt: number): void {
    super.update(dt);
    this.time += dt;
    this.scroll += dt * 4;
    this.radius += (targetRadius(this.accuracy) - this.radius) * Math.min(1, dt * 3);
    this.shrink = Math.max(0, this.shrink - dt);
    for (const m of this.marks) m.age += dt;
    this.marks = this.marks.filter((m) => m.kind === 'fly' || m.kind === 'tomato' ? m.age < 6 : m.age < 1.2);
    const f = this.flight;
    if (!f) return;
    f.spin += dt * (f.kind === 'arrow' ? 0 : 3);
    for (const r of f.rings) if (r.passed) r.passed += dt;
    if (f.phase === 'fly') {
      f.s = Math.min(this.stopAt(f), f.s + FLY * dt);
      if (f.s >= 1) this.hit(f);
    } else if (f.phase === 'fall') {
      if (!f.landed) {
        f.s = Math.min(1, f.s + FLY * 0.4 * dt);
        const ground = VH * 0.9 - this.point(f.s).y - f.sink;
        f.vy += 900 * dt;
        f.drop = Math.min(ground, f.drop + f.vy * dt);
        if (f.drop >= ground) this.land(f);
      } else if ((f.after += dt) >= PAUSE_AFTER) this.done1();
    } else if ((f.after += dt) >= PAUSE_AFTER) this.done1();
    this.L.core.prune();
  }

  /** The throw is over (hit or fallen); the next one comes unless the run is over. */
  private done1(): void {
    this.throws++;
    this.flight = null;
    if (!this.finished) this.throw();
  }

  private hit(f: Flight): void {
    f.phase = 'hit';
    const tg = this.target;
    const dx = this.L.rng.range(-0.4, 0.4) * this.radius, dy = (f.sink / (SINK * FALL_ERRORS)) * this.radius * 0.6;
    this.marks.push({ kind: f.kind, dx, dy, age: 0 });
    this.L.sfx(f.kind === 'fly' ? 'bzzt' : f.kind === 'duck' ? 'squeak' : f.kind === 'tomato' ? 'plop' : 'pop');
    this.L.particles.emit(tg.x + dx, tg.y + dy, 14, f.kind === 'tomato' ? 'dot' : 'sparkle', f.kind === 'tomato' ? ['#e5534b', '#ff8a7a'] : ['#fff6a8', '#ffffff', '#ffd1f5'], 180, 8);
    this.L.shout(t(`aim.hit.${f.kind}`), tg.x, tg.y - this.radius - 40);
    this.happy();
    this.L.setMood('happy', 1.2);
  }

  private land(f: Flight): void {
    f.landed = true;
    this.L.sfx('plop');
    const p = this.point(f.s);
    this.L.particles.emit(p.x, VH * 0.9, 8, 'puff', ['#ffffff', '#e8e2d6'], 80, 10, 0.6);
    this.L.shout(t('aim.plop'), p.x, VH * 0.9 - 60);
  }

  onDone(tg: Target): void {
    const f = this.flight;
    if (!f || f.phase !== 'fly') return;
    const r = f.rings[f.next];
    if (r?.tg !== tg) return;
    r.passed = 0.0001;
    r.tg = null;
    this.L.particles.emit(r.x, r.y, 10, 'sparkle', ['#bfe8ff', '#ffffff', '#ffd1f5'], 140, 7);
    f.next++;
    if (f.next < f.rings.length) this.arm(f.rings[f.next]);
    this.checkReady();
  }

  onCorrect(): void {
    this.checkReady();
  }

  onWrong(): void {
    super.onWrong();
    const f = this.flight;
    if (f?.phase === 'fly') {
      f.errors++;
      f.sink += SINK;
      if (f.errors >= FALL_ERRORS) {
        f.phase = 'fall';
        const r = f.rings[f.next];
        if (r?.tg) this.L.core.release(r.tg, false);
        if (r) r.tg = null;
      }
    }
    this.paintHud();
  }

  /** A weak key that became ready leaves the list: the target shrinks and Tapko cheers. */
  private checkReady(): void {
    const p = app.profile!;
    const ready = this.held.filter((k) => isKeyReady(p, k));
    if (ready.length) {
      this.held = this.held.filter((k) => !ready.includes(k));
      this.graduated.push(...ready);
      this.shrink = 0.6;
      this.L.hooray();
      this.L.say(t('aim.ready', { keys: ready.map(keyLabel).join(', ') }), 3);
    }
    this.paintHud();
  }

  /** The HUD: each weak key with a small bar of its recent accuracy. */
  private paintHud(): void {
    const p = app.profile!;
    this.hudEl.replaceChildren(...this.listed.map((k) => {
      const pct = Math.round(recentAccuracy(p.stats.keys[k]) * 100);
      return h('span', { class: 'aim-key', role: 'listitem', 'aria-label': `${keyLabel(k)} ${pct} %`, tip: t('aim.keyTip', { key: keyLabel(k), n: pct }) },
        h('b', {}, keyLabel(k)), h('i', { style: `--acc: ${pct}%` }));
    }));
  }

  render(g: G): void {
    this.drawTarget(g);
    const f = this.flight;
    if (f) {
      f.rings.forEach((r, i) => this.drawRing(g, r, i === f.next && f.phase === 'fly'));
      if (f.phase === 'fly' || (f.phase === 'fall' && f.after < 0.3)) this.drawProjectile(g, f);
    }
    this.drawHero(g);
  }

  private drawTarget(g: G): void {
    const { x, y } = this.target;
    // A little squash while it shrinks after a weak key got ready.
    const k = this.shrink > 0 && !this.L.reduceMotion ? 1 + Math.sin((0.6 - this.shrink) / 0.6 * Math.PI) * 0.12 : 1;
    const r = this.radius * k;
    // The wooden stand.
    g.save();
    g.fillStyle = '#9a6a3c';
    g.fillRect(x - 8, y, 16, VH * 0.9 - y);
    g.fillRect(x - 40, VH * 0.9 - 10, 80, 12);
    g.restore();
    drawSprite(g, 'obj-aim-target', x, y, r * 2, {}, (c, w) => {
      const rr = w / 2;
      ['#e5534b', '#fffdf6', '#e5534b', '#fffdf6', '#f5c542'].forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(0, 0, rr * (1 - i * 0.2), 0, Math.PI * 2);
        c.fill();
      });
      c.strokeStyle = 'rgba(90,61,43,0.6)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, rr, 0, Math.PI * 2);
      c.stroke();
    });
    for (const m of this.marks) this.drawMark(g, m, x, y);
  }

  private drawMark(g: G, m: Mark, x: number, y: number): void {
    const mx = x + m.dx, my = y + m.dy;
    if (m.kind === 'tomato') {
      g.save();
      g.globalAlpha = Math.min(1, (6 - m.age) / 1.5);
      g.fillStyle = '#d9412f';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, rr = (i % 2 ? 16 : 28) * Math.min(1, m.age * 8);
        g.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr);
      }
      g.fill();
      g.restore();
      return;
    }
    if (m.kind === 'fly') {
      // The fly stuck to the target and buzzes there.
      const jx = this.L.reduceMotion ? 0 : Math.sin(this.t * 40) * 1.5;
      this.drawThing(g, 'fly', mx + jx, my, 36, 0, Math.min(1, (6 - m.age) / 1.5));
      return;
    }
    // Everything else bounces off and drops.
    const k = Math.min(1, m.age / 1.2);
    this.drawThing(g, m.kind, mx + k * 30, my + k * k * 140, 40, k * 4, 1 - k);
  }

  private drawRing(g: G, r: Ring, current: boolean): void {
    const rx = 34, ry = 70;
    if (r.passed) {
      // A passed ring pops like a soap bubble.
      const k = Math.min(1, r.passed / 0.4);
      if (k >= 1) return;
      g.save();
      g.globalAlpha = 1 - k;
      g.strokeStyle = '#bfe8ff';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(r.x, r.y, rx * (1 + k), ry * (1 + k), 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      return;
    }
    const wobble = this.L.reduceMotion ? 0 : Math.sin(this.t * 2 + r.x) * 3;
    drawSprite(g, 'obj-aim-ring', r.x, r.y + wobble, ry * 2, {}, (c) => {
      const grad = c.createLinearGradient(0, -ry, 0, ry);
      grad.addColorStop(0, '#ffd1f5');
      grad.addColorStop(0.5, '#bfe8ff');
      grad.addColorStop(1, '#c9f2d4');
      c.strokeStyle = grad;
      c.lineWidth = current ? 9 : 6;
      c.globalAlpha = current ? 1 : 0.7;
      c.beginPath();
      c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, 0, rx - 6, ry - 6, 0, -2.4, -1.6);
      c.stroke();
    });
    if (r.tg) this.L.label(g, r.tg, r.x, r.y - ry - 34, 38);
  }

  private drawProjectile(g: G, f: Flight): void {
    const p = this.point(f.s);
    const bob = f.phase === 'fly' && f.s >= this.stopAt(f) && !this.L.reduceMotion ? Math.sin(this.t * 5) * 4 : 0;
    // The arrow points along the path; the rest tumbles slowly.
    const next = this.point(Math.min(1, f.s + 0.01));
    const rot = f.kind === 'arrow' ? Math.atan2(next.y - p.y, next.x - p.x) : this.L.reduceMotion ? 0 : f.spin;
    this.drawThing(g, f.kind, p.x, p.y + f.sink + f.drop + bob, 46, rot, 1);
  }

  /** A projectile, drawn in code until its picture is there. */
  private drawThing(g: G, kind: Projectile, x: number, y: number, size: number, rot: number, alpha: number): void {
    if (alpha <= 0) return;
    drawSprite(g, `obj-aim-${kind}`, x, y, size, { rot, alpha }, (c, w, hh) => drawProjectileFallback(c, kind, w, hh, this.t));
  }

  progress(): number {
    return Math.min(1, Math.max(this.throws / AIM_THROWS, this.time / AIM_SECONDS));
  }

  get finished(): boolean {
    return aimOver(this.throws, this.time);
  }
}

function drawProjectileFallback(c: G, kind: Projectile, w: number, hh: number, time: number): void {
  const r = Math.min(w, hh) / 2;
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(90,61,43,0.7)';
  c.lineWidth = 2.5;
  switch (kind) {
    case 'pebble':
      c.fillStyle = '#a8a39a';
      c.beginPath();
      c.ellipse(0, 0, r * 0.9, r * 0.65, 0.3, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      break;
    case 'screw':
      c.fillStyle = '#c9d1d9';
      roundRect(c, -r * 0.18, -r * 0.6, r * 0.36, r * 1.4, 4);
      c.fill();
      c.stroke();
      roundRect(c, -r * 0.45, -r * 0.85, r * 0.9, r * 0.3, 5);
      c.fill();
      c.stroke();
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(-r * 0.18, -r * 0.3 + i * r * 0.25);
        c.lineTo(r * 0.18, -r * 0.2 + i * r * 0.25);
        c.stroke();
      }
      break;
    case 'fly': {
      const flap = Math.sin(time * 50) * 0.3;
      c.fillStyle = 'rgba(220,240,255,0.8)';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.ellipse(s * r * 0.3, -r * 0.45, r * 0.3, r * 0.5, s * (0.6 + flap), 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      c.fillStyle = '#4a4f57';
      c.beginPath();
      c.ellipse(0, 0, r * 0.55, r * 0.42, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#e5534b';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(r * 0.35, s * r * 0.18, r * 0.16, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'tomato':
      c.fillStyle = '#e5534b';
      c.beginPath();
      c.arc(0, r * 0.05, r * 0.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#5aa04a';
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        c.lineTo(Math.cos(a) * r * 0.35, -r * 0.7 + Math.sin(a) * r * 0.15);
        c.lineTo(Math.cos(a + 0.6) * r * 0.12, -r * 0.7 + Math.sin(a + 0.6) * r * 0.05);
      }
      c.fill();
      break;
    case 'arrow':
      c.strokeStyle = '#8a5a2b';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-r, 0);
      c.lineTo(r * 0.7, 0);
      c.stroke();
      c.fillStyle = '#9aa7b4';
      c.beginPath();
      c.moveTo(r, 0);
      c.lineTo(r * 0.55, -r * 0.25);
      c.lineTo(r * 0.55, r * 0.25);
      c.closePath();
      c.fill();
      c.fillStyle = '#e5534b';
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(-r * 0.6, 0);
        c.lineTo(-r, s * r * 0.3);
        c.lineTo(-r * 0.85, 0);
        c.fill();
      }
      break;
    case 'duck':
      c.fillStyle = '#f5d142';
      c.beginPath();
      c.ellipse(0, r * 0.2, r * 0.75, r * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(r * 0.35, -r * 0.35, r * 0.38, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#f28c28';
      c.beginPath();
      c.ellipse(r * 0.8, -r * 0.3, r * 0.22, r * 0.1, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#2d2d2d';
      c.beginPath();
      c.arc(r * 0.45, -r * 0.45, r * 0.07, 0, Math.PI * 2);
      c.fill();
      break;
    case 'sock':
      c.fillStyle = '#8fc5ef';
      c.beginPath();
      c.moveTo(-r * 0.3, -r * 0.9);
      c.lineTo(r * 0.2, -r * 0.9);
      c.lineTo(r * 0.2, r * 0.2);
      c.quadraticCurveTo(r * 0.9, r * 0.25, r * 0.85, r * 0.7);
      c.lineTo(-r * 0.2, r * 0.75);
      c.quadraticCurveTo(-r * 0.4, r * 0.5, -r * 0.3, r * 0.1);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#ffffff';
      c.fillRect(-r * 0.3, -r * 0.9, r * 0.5, r * 0.25);
      break;
  }
}
