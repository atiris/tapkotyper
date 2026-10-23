import { app } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { drawSprite, type G, roundRect } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { SHIFT_L, SHIFT_R, SPACE, isKeyReady, keysAccuracy, notReadyKeys, recentAccuracy } from '../../learning/lessons';
import { hitsPic } from '../../ui/hud';
import { keyLabel } from '../../ui/keyboard-guide';
import { WORLDS } from '../levels';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';
import { HeroMode } from './planet';

/** Seconds of play before the run ends with the throw in the air (staying a while has no end). */
export const AIM_SECONDS = 120;
/** Wrong keys in one flight before the projectile falls. */
export const FALL_ERRORS = 3;
/** How much lower the path runs after each wrong key. */
const SINK = 24;
/** How far the projectile drifts up off its path for each word not typed in time, clear of the ring. */
const DRIFT = 100;
/** Target radius at no accuracy and at full accuracy. */
const BIG = 120;
const SMALL = 48;
/** Rings on the way; the target carries a word too. */
export const RINGS = 4;
/** Share of the path flown per second once the word of the next stop is typed, and while falling. */
const RUSH = 0.9;
const FALL_DRIFT = 0.09;
/** Words picked for one stop; the best fitting one wins. */
const CANDIDATES = 8;
const PAUSE_AFTER = 1.1;

export const PROJECTILES = ['pebble', 'screw', 'fly', 'tomato', 'arrow', 'duck', 'sock'] as const;
export type Projectile = typeof PROJECTILES[number];

/** The target's radius: big at low accuracy on the weak keys, smaller as it improves. */
export function targetRadius(accuracy: number): number {
  const a = Math.max(0, Math.min(1, accuracy));
  return BIG + (SMALL - BIG) * a;
}

/** Characters of a word that train these keys (a capital trains the Shifts, a space the space bar). */
export function weakCount(word: string, keys: string[]): number {
  const set = new Set(keys);
  return [...word].filter((c) => set.has(c.toLowerCase()) || (c === ' ' && set.has(SPACE)) || (c !== c.toLowerCase() && (set.has(SHIFT_L) || set.has(SHIFT_R)))).length;
}

/** Word lengths of one throw, ring by ring and the target last: from the shortest allowed to the longest, or one letter longer in the second half when both are the same. */
export function throwLengths([lo, hi]: [number, number], n = RINGS + 1): number[] {
  return Array.from({ length: n }, (_, i) => (hi > lo ? Math.round(lo + ((hi - lo) * i) / (n - 1)) : lo + (i >= n / 2 ? 1 : 0)));
}

/**
 * The word for a stop: never of the weak keys alone while another one is there, then the
 * closest to the length asked (its longest word), then the richest in the weak keys (the first one on a tie).
 */
export function pickWord(words: string[], keys: string[], len: number): string {
  const mixed = words.filter((w) => weakCount(w, keys) < [...w].length);
  const pool = mixed.length ? mixed : words;
  const off = (w: string) => Math.abs(Math.max(...w.split(' ').map((part) => part.length)) - len);
  const near = Math.min(...pool.map(off));
  return pool.filter((w) => off(w) === near).reduce((best, w) => (weakCount(w, keys) > weakCount(best, keys) ? w : best));
}

/** A ring on the way, or the target as the last stop. */
interface Stop {
  x: number;
  y: number;
  /** Where along the path it stands. */
  s: number;
  len: number;
  tg: Target | null;
  /** Its word is typed: the projectile hurries there. */
  typed: boolean;
  /** Seconds since the projectile passed it (0 = not yet). */
  passed: number;
  missed: boolean;
}

interface Flight {
  kind: Projectile;
  /** The short word that throws it while Tapko still holds it. */
  launch: Target | null;
  stops: Stop[];
  /** 0 (Tapko's paw) .. 1 (the target), along the path. */
  s: number;
  /** Share of the path per second toward the next stop. */
  speed: number;
  /** The stop it flies to. */
  next: number;
  /** Every word typed in time so far: only then the target is hit in the middle. */
  clean: boolean;
  errors: number;
  sink: number;
  /** Where the leg to the next stop began; the drift of the words missed so far, and the drift shown now (negative = up). */
  from: number;
  drift: number;
  lift: number;
  /** 'ready' in Tapko's paw, 'fly' along the path, 'fall' after three wrong keys, 'hit' at the target, 'miss' past it (its word came too late). */
  phase: 'ready' | 'fly' | 'fall' | 'hit' | 'miss';
  /** Thrown within the base time (or while staying): its hit counts. */
  counts: boolean;
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
 * The target range of a world: a short word makes Tapko throw a funny projectile at a target
 * through 4 rings; each ring and the target carry a word rich in the weak keys, longer toward
 * the target. The projectile keeps flying; a ring passed before its word is typed spoils the
 * bullseye. A wrong key makes it sink, three make it fall softly; the target shrinks as the
 * weak keys get more accurate. Hits within the base time are counted. No stars.
 */
export class AimMode extends HeroMode {
  readonly world: string;
  readonly phraseWords: number;
  /** The keys trained, the ones still holding the next letters back, and their accuracy at the start. */
  readonly keys: string[];
  private held: string[];
  private readonly before: Map<string, number>;
  private flight: Flight | null = null;
  private time = 0;
  private radius: number;
  private shrink = 0;
  private marks: Mark[] = [];
  /** Hits on the target and in its middle, from throws within the base time (all of them while staying). */
  hits = 0;
  centers = 0;
  private hitsEl = hitsPic();

  constructor(L: LevelRuntime) {
    super(L);
    const p = app.profile!;
    this.world = WORLDS[L.def.world];
    this.keys = L.def.focus ?? [];
    this.held = notReadyKeys(p).filter((k) => this.keys.includes(k));
    this.before = new Map(this.keys.map((k) => [k, recentAccuracy(p.stats.keys[k])]));
    this.phraseWords = this.keys.includes(SPACE) ? 2 : 1;
    this.radius = targetRadius(this.accuracy);
    this.hitsEl.set(0, 0);
  }

  startLine(): string {
    return t('aim.start', { keys: this.keys.map(keyLabel).join(' ') });
  }

  /** The rules stay up until the first throw. */
  startSeconds(): number {
    return 60;
  }

  rings(): HTMLElement[] {
    return [this.hitsEl.el];
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
    const stops: Stop[] = throwLengths(app.profile!.settings.wordLen).map((len, i) => {
      const s = i < RINGS ? (i + 1) / (RINGS + 1) : 1;
      return { ...this.point(s), s, len, tg: null, typed: false, passed: 0, missed: false };
    });
    const f: Flight = { kind: this.L.rng.pick(PROJECTILES), launch: null, stops, s: 0, speed: 0, next: 0, clean: true, errors: 0, sink: 0, from: 0, drift: 0, lift: 0, phase: 'ready', counts: false, drop: 0, vy: 0, landed: false, after: 0, spin: 0 };
    this.flight = f;
    const len = stops[0].len;
    f.launch = this.L.core.add(pickWord(Array.from({ length: CANDIDATES }, () => this.L.word(len)), this.aimed, len), {});
  }

  /** The launch word is typed: Tapko throws, the first ring gets its word; the rules leave with the first throw. */
  private launch(f: Flight): void {
    f.phase = 'fly';
    f.launch = null;
    f.counts = this.L.staying || this.time < AIM_SECONDS;
    if (this.firstThrow) this.L.hideBubble();
    this.firstThrow = false;
    this.happy();
    if (!this.L.reduceMotion) this.L.tweens.add(0.4, (k) => (this.jump = k * 0.6), ease.linear, () => (this.jump = 0));
    this.L.sfx('whoosh');
    this.arm(f);
  }

  private firstThrow = true;

  /** The next stop gets its word, and the projectile the speed to reach it in the word's travel time. */
  private arm(f: Flight): void {
    const stop = f.stops[f.next];
    const words = Array.from({ length: CANDIDATES }, () => this.L.word(stop.len));
    stop.tg = this.L.core.add(pickWord(words, this.aimed, stop.len), {});
    f.from = f.s;
    f.speed = (stop.s - f.s) / this.L.travelTime(stop.tg.word);
  }

  /** The drift it heads for: the missed words, plus a share of one more as the leg passes with its word still untyped. */
  private liftGoal(f: Flight): number {
    const stop = f.stops[f.next];
    if (f.phase !== 'fly' || stop.typed || !stop.tg) return f.drift;
    const leg = Math.min(1, (f.s - f.from) / Math.max(0.001, stop.s - f.from));
    const left = 1 - stop.tg.typed / stop.tg.word.length;
    return f.drift - DRIFT * leg * left;
  }

  /** The projectile reached its next stop: through the ring (or past it, too late), or at the target. */
  private reach(f: Flight): void {
    const stop = f.stops[f.next];
    if (!stop.typed) {
      stop.missed = true;
      f.clean = false;
      f.drift -= DRIFT;
      if (stop.tg) this.L.core.release(stop.tg);
      stop.tg = null;
    }
    if (f.next === f.stops.length - 1) return f.clean ? this.hit(f) : this.miss(f);
    stop.passed = 0.0001;
    if (stop.typed) this.L.particles.emit(stop.x, stop.y, 10, 'sparkle', ['#bfe8ff', '#ffffff', '#ffd1f5'], 140, 7);
    f.next++;
    this.arm(f);
  }

  update(dt: number): void {
    super.update(dt);
    this.time += dt;
    this.scroll += dt * 4;
    this.radius += (targetRadius(this.accuracy) - this.radius) * Math.min(1, dt * 3);
    this.hitsEl.set(this.hits, this.progress());
    this.shrink = Math.max(0, this.shrink - dt);
    for (const m of this.marks) m.age += dt;
    this.marks = this.marks.filter((m) => m.kind === 'fly' || m.kind === 'tomato' ? m.age < 6 : m.age < 1.2);
    const f = this.flight;
    if (!f || f.phase === 'ready') return;
    if (!f.landed) f.spin += dt * (f.kind === 'arrow' ? 0 : 3);
    f.lift += (this.liftGoal(f) - f.lift) * Math.min(1, dt * 4);
    for (const r of f.stops) if (r.passed) r.passed += dt;
    if (f.phase === 'fly') {
      const stop = f.stops[f.next];
      f.s = Math.min(stop.s, f.s + (stop.typed ? Math.max(RUSH, f.speed) : f.speed) * dt);
      if (f.s >= stop.s) this.reach(f);
    } else if (f.phase === 'fall') {
      if (!f.landed) {
        f.s = Math.min(1, f.s + FALL_DRIFT * dt);
        const ground = VH * 0.9 - this.point(f.s).y - f.sink - f.lift;
        f.vy += 900 * dt;
        f.drop = Math.min(ground, f.drop + f.vy * dt);
        if (f.drop >= ground) this.land(f);
      } else if ((f.after += dt) >= PAUSE_AFTER) this.done1();
    } else if ((f.after += dt) >= PAUSE_AFTER) this.done1();
    this.L.core.prune();
  }

  /** The throw is over (hit or fallen); the next one comes until the time is up, or always while staying. */
  private done1(): void {
    this.flight = null;
    if (this.L.staying || this.time < AIM_SECONDS) this.throw();
  }

  /** A word came too late, so it drifted off: the projectile whizzes past behind the board; no harm, just no hit. */
  private miss(f: Flight): void {
    f.phase = 'miss';
    this.L.sfx('whoosh');
    this.L.shout(t('aim.miss'), this.target.x, this.target.y - this.radius - 40);
  }

  /** At the target (every word came in time): the middle without wrong keys, else lower on the rings. */
  private hit(f: Flight): void {
    f.phase = 'hit';
    const tg = this.target;
    const center = !f.sink;
    if (f.counts) {
      this.hits++;
      if (center) this.centers++;
    }
    const side = this.L.rng.chance(0.5) ? 1 : -1;
    const dx = center ? 0 : side * this.L.rng.range(0.5, 0.75) * this.radius;
    const dy = center ? 0 : (f.sink / (SINK * FALL_ERRORS)) * this.radius * 0.6;
    this.marks.push({ kind: f.kind, dx, dy, age: 0 });
    this.L.sfx(f.kind === 'fly' ? 'bzzt' : f.kind === 'duck' ? 'squeak' : f.kind === 'tomato' ? 'plop' : 'pop');
    this.L.particles.emit(tg.x + dx, tg.y + dy, center ? 28 : 14, f.kind === 'tomato' ? 'dot' : 'sparkle', f.kind === 'tomato' ? ['#e5534b', '#ff8a7a'] : ['#fff6a8', '#ffffff', '#ffd1f5'], 180, 8);
    this.L.shout(t(center ? 'aim.center' : `aim.hit.${f.kind}`), tg.x, tg.y - this.radius - 40);
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
    if (f?.phase === 'ready' && f.launch === tg) this.launch(f);
    if (!f || f.phase !== 'fly') return;
    const stop = f.stops[f.next];
    if (stop.tg !== tg) return;
    stop.typed = true;
    stop.tg = null;
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
        const stop = f.stops[f.next];
        if (stop.tg) this.L.core.release(stop.tg, false);
        stop.tg = null;
      }
    }
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
  }

  render(g: G): void {
    const f = this.flight;
    if (f?.phase === 'miss') {
      const k = Math.min(1, f.after / PAUSE_AFTER), tg = this.target;
      this.drawThing(g, f.kind, tg.x + k * this.L.vw * 0.3, tg.y + f.lift + k * 40, 46, f.spin, 1 - k);
    }
    this.drawTarget(g);
    if (f) {
      f.stops.slice(0, RINGS).forEach((r, i) => this.drawRing(g, r, i === f.next && f.phase === 'fly'));
      const last = f.stops[RINGS];
      if (last.tg) this.L.label(g, last.tg, last.x, last.y - this.radius - 34, 38);
      if (f.launch) this.L.label(g, f.launch, this.hand.x, this.hand.y - 70, 38);
      if (f.phase !== 'hit' && f.phase !== 'miss') this.drawProjectile(g, f);
    }
    this.drawHero(g);
  }

  private drawTarget(g: G): void {
    const { x, y } = this.target;
    // A little squash while it shrinks after a weak key got ready.
    const k = this.shrink > 0 && !this.L.reduceMotion ? 1 + Math.sin((0.6 - this.shrink) / 0.6 * Math.PI) * 0.12 : 1;
    const r = this.radius * k;
    this.drawStand(g, x, y, r);
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

  /** A wooden easel under the board: two splayed legs, a back leg and a crossbar, with a soft shadow. */
  private drawStand(g: G, x: number, y: number, r: number): void {
    const ground = VH * 0.9, spread = Math.max(36, r * 0.75), bar = y + (ground - y) * 0.6;
    const along = (k: number) => spread * ((bar - y) / (ground - y)) * k;
    const back: [number, number, number, number] = [x, y, x + spread * 0.3, ground - 6];
    const parts: [number, number, number, number][] = [[x - 4, y, x - spread, ground], [x + 4, y, x + spread, ground], [x - along(1), bar, x + along(1), bar]];
    g.save();
    g.fillStyle = 'rgba(60, 40, 20, 0.15)';
    g.beginPath();
    g.ellipse(x, ground + 2, spread * 1.25, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.lineCap = 'round';
    const pass = (list: [number, number, number, number][], width: number, color: string) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      for (const [x1, y1, x2, y2] of list) {
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
    };
    pass([back], 13, '#5a3d2b');
    pass([back], 8, '#8a5e36');
    pass(parts, 15, '#5a3d2b');
    pass(parts, 10, '#b07a45');
    // A lighter grain line along each front leg.
    g.globalAlpha = 0.45;
    pass(parts.slice(0, 2).map(([x1, y1, x2, y2]) => [x1 - 2, y1 + 8, x2 - 2, y2 - 6]), 2.5, '#d9a36a');
    g.restore();
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

  private drawRing(g: G, r: Stop, current: boolean): void {
    const rx = 34, ry = 70;
    if (r.passed) {
      // A passed ring pops like a soap bubble; one passed too late fades grey.
      const k = Math.min(1, r.passed / 0.4);
      if (k >= 1) return;
      g.save();
      g.globalAlpha = 1 - k;
      g.strokeStyle = r.missed ? '#b9b4ab' : '#bfe8ff';
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
    // The arrow points along the path; the rest tumbles slowly. A fallen one lies on the grass and fades before the next throw.
    const next = this.point(Math.min(1, f.s + 0.01));
    const rot = f.kind === 'arrow' ? Math.atan2(next.y - p.y, next.x - p.x) : this.L.reduceMotion ? 0 : f.spin;
    this.drawThing(g, f.kind, p.x, p.y + f.sink + f.lift + f.drop, 46, rot, f.landed ? 1 - f.after / PAUSE_AFTER : 1);
  }

  /** A projectile, drawn in code until its picture is there. */
  private drawThing(g: G, kind: Projectile, x: number, y: number, size: number, rot: number, alpha: number): void {
    if (alpha <= 0) return;
    drawSprite(g, `obj-aim-${kind}`, x, y, size, { rot, alpha }, (c, w, hh) => drawProjectileFallback(c, kind, w, hh, this.t));
  }

  progress(): number {
    return Math.min(1, this.time / AIM_SECONDS);
  }

  get finished(): boolean {
    return !this.L.staying && this.time >= AIM_SECONDS && (!this.flight || this.flight.phase === 'ready');
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
