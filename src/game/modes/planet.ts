import { app, pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { blob, drawSprite, type G } from '../../gfx/draw';
import { drawTapko, type Mood } from '../../gfx/tapko';
import { Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import type { Target } from '../typing';

/** The pictures this world's levels draw; a level opens when they are loaded. */
const PICTURES = ['obj-boulder-1', 'obj-boulder-2', 'obj-boulder-3', 'obj-sign', 'obj-stone'];

/** Tapko as the hero walking and hopping through the planet (and Bolt's robot city and home, Melody's garden and lake). */
export abstract class HeroMode extends Mode {
  readonly world: string = 'planet';
  protected heroX = 220;
  protected heroY = VH * 0.78;
  protected jump = 0;
  protected mood: Mood = 'idle';
  /** Tapko's soft shadow on the ground. */
  protected readonly shadow: boolean = true;
  private moodT = 0;
  protected done = 0;

  constructor(L: LevelRuntime) {
    super(L);
  }

  /** Hops the hero to (x, y) while scrolling the world by `scrollBy`. */
  protected hop(toY: number, scrollBy: number, then?: () => void): void {
    const fromY = this.heroY, fromScroll = this.scroll;
    this.L.tweens.add(0.55, (k) => {
      this.jump = k;
      this.heroY = fromY + (toY - fromY) * k;
      this.scroll = fromScroll + scrollBy * ease.inOutQuad(k);
    }, ease.linear, () => {
      this.jump = 0;
      then?.();
    });
  }

  protected happy(): void {
    this.mood = 'happy';
    this.moodT = 1.2;
  }

  protected surprised(seconds: number): void {
    this.mood = 'surprised';
    this.moodT = seconds;
  }

  update(dt: number): void {
    if (this.moodT > 0 && (this.moodT -= dt) <= 0) this.mood = 'idle';
  }

  onWrong(): void {
    this.mood = 'thinking';
    this.moodT = 1;
  }

  /** The story friend walks (or floats) right behind the hero. */
  friendSpot(): { x: number; y: number } {
    return { x: this.heroX - 105, y: this.heroY };
  }

  heroSpot(): { x: number; y: number } {
    return { x: this.heroX, y: this.heroY - 210 };
  }

  protected drawHero(g: G): void {
    // The level is done: Tapko hops happily in place.
    if (this.L.endTime != null) return drawTapko(g, app.profile!.companion, 'happy', this.heroX, this.heroY, 170, { t: this.t, jump: this.L.endHop, shadow: this.shadow });
    drawTapko(g, app.profile!.companion, this.mood, this.heroX, this.heroY, 170, { t: this.t, jump: this.jump, shadow: this.shadow });
  }
}

/** Swamp: every finished word places a stepping stone and Tapko hops onto it. */
export class SwampMode extends HeroMode {
  readonly pictures = PICTURES;
  readonly phraseWords = 4;
  private stones: { x: number; y: number; pop: number }[] = [];
  private current: Target | null = null;
  private spot = { x: 0, y: 0 };
  private busy = false;
  private finishT = 0;
  private stoneGap = 210;

  start(): void {
    this.heroY = VH * 0.8;
    this.next();
  }

  private next(): void {
    if (this.done >= this.L.count) return;
    this.spot = { x: this.heroX + this.stoneGap + this.scroll, y: VH * (0.78 + (this.done % 2 ? 0.03 : -0.02)) };
    this.current = this.L.core.add(this.L.word(), {});
  }

  update(dt: number): void {
    super.update(dt);
    for (const s of this.stones) s.pop = Math.min(1, s.pop + dt * 3);
    if (this.done >= this.L.count && !this.busy) this.finishT += dt;
    this.L.core.prune();
  }

  onDone(tg: Target): void {
    if (tg !== this.current) return;
    this.done++;
    this.busy = true;
    this.happy();
    const spot = { ...this.spot };
    this.stones.push({ ...spot, pop: 0 });
    this.L.particles.emit(spot.x - this.scroll, spot.y, 10, 'dot', ['#a6e3c9', '#e8fff4'], 120, 6);
    this.L.sfx('pop');
    this.current = null;
    this.hop(spot.y, this.stoneGap, () => {
      this.busy = false;
      this.next();
    });
  }

  render(g: G): void {
    for (const s of this.stones) {
      const k = ease.outBack(s.pop);
      drawSprite(g, 'obj-stone', s.x - this.scroll, s.y + 14, 80 * k, {}, blob('#7f9a6a', false));
    }
    if (this.current) {
      const x = this.spot.x - this.scroll;
      // Where the next stone will appear: a glowing ring on the water.
      g.save();
      const pulse = 0.5 + Math.sin(this.t * 4) * 0.2;
      g.fillStyle = `rgba(255,255,255,${0.25 * pulse + 0.1})`;
      g.strokeStyle = '#ffffff';
      g.setLineDash([12, 8]);
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(x, this.spot.y + 16, 66, 22, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
      this.L.label(g, this.current, x, this.spot.y - 70);
    }
    if (this.done >= this.L.count) {
      // The far bank.
      g.fillStyle = '#7cc79a';
      g.beginPath();
      g.ellipse(this.heroX + this.stoneGap * 1.3, VH * 0.86, 240, 60, 0, Math.PI, 0);
      g.fill();
    }
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return this.finishT > 0.8;
  }
}

/** Road signs: the typed sign is the path taken; every path leads forward. */
export class SignsMode extends HeroMode {
  readonly pictures = PICTURES;
  readonly phraseWords = 4;
  private signs: Target[] = [];
  private postX = 0;
  private busy = false;
  private finishT = 0;
  private walk = 0;
  private postOffset = 0;

  start(): void {
    this.heroY = VH * 0.8;
    this.place();
  }

  private place(): void {
    if (this.done >= this.L.count) return;
    const n = this.L.difficulty >= 4 ? 3 : 2;
    this.postX = this.L.vw * 0.62;
    this.postOffset = 0;
    this.signs = [];
    for (let i = 0; i < n; i++) {
      const word = this.L.word(7);
      const y = VH * 0.24 + i * 120;
      this.signs.push(this.L.core.add(word, { y, dir: i - (n - 1) / 2, pop: 0, gone: 0 }));
    }
  }

  update(dt: number): void {
    super.update(dt);
    for (const s of this.signs) {
      s.data.pop = Math.min(1, s.data.pop + dt * 2.5);
      if (s.gone || s.done) s.data.gone = Math.min(1, s.data.gone + dt * 1.5);
    }
    if (this.done >= this.L.count && !this.busy) this.finishT += dt;
  }

  onDone(tg: Target): void {
    if (!this.signs.includes(tg)) return;
    this.done++;
    this.busy = true;
    this.happy();
    for (const s of this.signs) if (s !== tg) this.L.core.release(s, false);
    this.L.particles.emit(this.postX, tg.data.y, 14, 'leaf', ['#a6e3c9', '#f5a3d3', '#ffe27a'], 150, 8);
    if (this.L.rng.chance(0.4)) this.L.say(pickLine('story.signView'), 2.5);
    const dist = this.L.vw * 0.5;
    const start = this.scroll;
    this.L.tweens.add(1.4, (k) => {
      this.scroll = start + dist * k;
      this.postOffset = -dist * k;
      this.walk = k;
    }, ease.inOutQuad, () => {
      this.walk = 0;
      this.busy = false;
      this.L.core.prune();
      this.place();
    });
  }

  render(g: G): void {
    const x = this.postX + this.postOffset;
    if (this.signs.length && this.signs.some((s) => s.data.gone < 1)) {
      g.save();
      g.fillStyle = '#9b6b43';
      g.fillRect(x - 9, VH * 0.2, 18, VH * 0.62);
      g.restore();
      for (const s of this.signs) {
        g.save();
        g.globalAlpha = 1 - s.data.gone;
        const k = ease.outBack(s.data.pop);
        drawSprite(g, 'obj-sign', x + 30, s.data.y + 40, 150 * k, { rot: s.data.dir * 0.08, ay: 0.32 }, blob('#e2b47e', false));
        g.restore();
        if (!s.done && !s.gone) this.L.label(g, s, x + 30, s.data.y, 36);
      }
    }
    this.jump = this.busy ? Math.abs(Math.sin(this.walk * Math.PI * 4)) * 0.25 : this.jump;
    this.drawHero(g);
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return this.finishT > 0.6;
  }
}

/** Super-obstacle: the boulder cracks with precise chunks; errors only slow the cracking. */
export class BoulderMode extends HeroMode {
  readonly pictures = PICTURES;
  private crack = 0;
  private chunk: Target | null = null;
  private shake = 0;
  private opened = 0;

  start(): void {
    this.heroY = VH * 0.8;
    this.nextChunk();
  }

  private nextChunk(): void {
    this.chunk = this.L.core.add(this.L.word(4, 1), {});
  }

  update(dt: number): void {
    super.update(dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.crack >= this.L.count) this.opened = Math.min(1, this.opened + dt * 0.8);
  }

  onDone(tg: Target): void {
    if (tg !== this.chunk) return;
    this.crack += tg.errors === 0 ? 1 : 0.5;
    this.shake = 1;
    this.happy();
    this.L.sfx('pop');
    this.L.particles.emit(this.L.vw * 0.62, VH * 0.55, 16, 'dot', ['#c9c2b8', '#e9e4dc', '#a39586'], 200, 7);
    this.L.core.prune();
    this.chunk = null;
    if (this.crack >= this.L.count) {
      this.L.say(pickLine('story.boulderOpen'), 3);
      this.hop(this.heroY, 0);
    } else this.nextChunk();
  }

  render(g: G): void {
    const k = this.crack / this.L.count;
    const name = k >= 1 ? 'obj-boulder-3' : k >= 0.5 ? 'obj-boulder-2' : 'obj-boulder-1';
    const sh = Math.sin(this.t * 50) * 6 * this.shake;
    drawSprite(g, name, this.L.vw * 0.62 + sh, VH * 0.56, 380, {}, blob('#a39586', true, 'rgba(0,0,0,0.12)'));
    if (this.chunk) this.L.label(g, this.chunk, this.L.vw * 0.62, VH * 0.16, 46);
    // Crack meter.
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(this.L.vw * 0.62 - 120, VH * 0.86, 240, 14);
    g.fillStyle = '#8ad19a';
    g.fillRect(this.L.vw * 0.62 - 120, VH * 0.86, 240 * Math.min(1, k), 14);
    g.restore();
    if (this.opened > 0) this.heroX = 220 + this.opened * (this.L.vw * 0.62 - 260);
    this.drawHero(g);
  }

  progress(): number {
    return Math.min(1, this.crack / this.L.count);
  }

  get finished(): boolean {
    return this.opened >= 1;
  }
}
