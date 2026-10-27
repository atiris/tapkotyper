import { pickLine } from '../../app/app';
import { VH } from '../../engine/loop';
import { ease } from '../../engine/tween';
import { sprite } from '../../gfx/assets';
import { SPEECH_W, blob, drawSprite, type G, speechLayout } from '../../gfx/draw';
import { t } from '../../i18n/i18n';
import { type Drift, Mode } from '../mode';
import type { Target } from '../typing';
import { CopyRow } from './copy-row';
import { ROCKET_H, WINDOW, drawAstronaut } from './space';

const PICTURES = ['obj-asteroid-big', 'obj-asteroid-small', 'obj-rocket-empty', 'obj-rocket-pilot', 'tapko-astronaut'];
/** Round meteors to stand on (the falling rock with its tail is no place to stand). */
const ROCKS = ['obj-asteroid-big', 'obj-asteroid-small'];
/** Where the astronaut stands on the screen, and his size. */
const HOME_X = 260;
const ASTRONAUT = 150;
const ROCK_SIZE = 150;
/** Meteors with a word at once (each starts with another letter), the pause before a new one, and the screen shares they come to. */
const ROCKS_AT_ONCE = 3;
const ROCK_PAUSE = 0.6;
const SLOTS = [0.48, 0.67, 0.86];
/** Seconds of a meteor growing in at its place, of a jump and of the view gliding after it. */
const GROW = 0.5;
const JUMP = 0.7;
const GLIDE = 0.9;
/** Seconds of the end: the rocket comes from the left, he jumps into its window, it flies on to the right. */
const ROCKET_COME = 1.4;
const ROCKET_BOARD = 0.8;
const ROCKET_AWAY = 1.2;

interface Rock {
  /** Place in the scene; the screen shows it at x - view. */
  x: number;
  y: number;
  sprite: string;
  flip: boolean;
  /** Its own turn, under the gentle sway. */
  rot: number;
  /** Seconds since it came. */
  age: number;
  tg: Target | null;
}

/**
 * The rocket world's calm step: still meteors carry short words, each starting with another
 * letter. A typed word sends the suited astronaut jumping onto its meteor, and the view glides
 * after him; meteors left behind stay and leave the screen. At the end the rocket comes for him from the left,
 * he jumps into its window and it flies on to the right.
 */
export class HopMode extends Mode {
  readonly pictures = PICTURES;
  readonly world = 'space';
  readonly drift: Drift = { layer: 'near', speed: 12 };
  private rocks: Rock[] = [];
  /** The meteor he stands on (from the first frame on, also before play), and the jump from it to the next one. */
  private stand: Rock = this.rock(HOME_X, VH * 0.66, null, GROW);
  private jump: { from: Rock; to: Rock; k: number } | null = null;
  /** The scene's left edge on the screen, and where it glides to. */
  private view = 0;
  private viewFrom = 0;
  private viewTo = 0;
  private glide = 1;
  private spawned = 0;
  private done = 0;
  private wait = 0.5;
  /** Seconds of the end; null before it. */
  private end: number | null = null;

  startLine(): string {
    return pickLine('story.hopStart');
  }

  private rock(x: number, y: number, tg: Target | null, age = 0): Rock {
    const r: Rock = { x, y, sprite: this.L.rng.pick(ROCKS), flip: this.L.rng.chance(0.5), rot: this.L.rng.range(0, Math.PI * 2), age, tg };
    this.rocks.push(r);
    return r;
  }

  /** Feet of the astronaut on a meteor, on the screen. */
  private top(r: Rock): { x: number; y: number } {
    return { x: r.x - this.view, y: r.y - ROCK_SIZE * 0.32 + Math.sin(this.t * 1.4 + r.x) * 4 };
  }

  update(dt: number): void {
    for (const r of this.rocks) {
      r.age += dt;
      if (r.tg) {
        r.tg.selectable = r.age >= GROW;
        // The finger guide points to a meteor he can reach.
        r.tg.urgency = r.age - (this.over(r) > 1 ? 1000 : 0);
      }
    }
    this.rocks = this.rocks.filter((r) => r.x - this.view > -300);
    if (this.glide < 1) {
      this.glide = this.L.reduceMotion ? 1 : Math.min(1, this.glide + dt / GLIDE);
      this.view = this.viewFrom + (this.viewTo - this.viewFrom) * ease.inOutQuad(this.glide);
      this.scroll = this.view;
    }
    if (this.jump) {
      const j = this.jump;
      j.k = this.L.reduceMotion ? 1 : Math.min(1, j.k + dt / JUMP);
      if (j.k >= 1) this.land(j.to);
    }
    if (this.end !== null) {
      this.end += dt;
      return;
    }
    if (this.done >= this.L.count && !this.jump && this.glide >= 1) return this.finish();
    this.wait -= dt;
    const waiting = this.rocks.filter((r) => r.tg);
    if (this.wait > 0 || this.jump || this.glide < 1 || waiting.length >= ROCKS_AT_ONCE || this.spawned >= this.L.count) return;
    const free = SLOTS.map((s) => this.view + this.L.vw * s).filter((x) => !this.rocks.some((r) => Math.abs(r.x - x) < 120));
    if (!free.length) return;
    const word = this.L.word(4, 1);
    // Every waiting word starts with its own letter, so the first key picks the meteor.
    if (this.L.core.active.some((t) => t.word[0] === word[0])) {
      this.wait = 0.2;
      return;
    }
    this.rock(this.L.rng.pick(free), this.L.rng.range(VH * 0.38, VH * 0.72), this.L.core.add(word, {}, false));
    this.spawned++;
    this.wait = 0.4;
  }

  onDone(tg: Target): void {
    const to = this.rocks.find((r) => r.tg === tg);
    if (!to) return;
    // A word typed while he is in the air: he lands first, so no meteor is left without a word ahead of him.
    if (this.jump) this.land(this.jump.to);
    // He hops onto the next meteor or over one, never over two: the word comes back on the far one.
    if (this.over(to) > 1) {
      this.L.core.prune();
      to.tg = this.L.core.add(tg.word, {}, false);
      this.L.say(t('story.hopTooFar'), 2.5);
      return;
    }
    to.tg = null;
    this.done++;
    this.L.core.prune();
    this.L.sfx('whoosh');
    this.jump = { from: this.stand, to, k: 0 };
  }

  /** How many meteors lie between his and `to`. */
  private over(to: Rock): number {
    return this.rocks.filter((r) => r !== to && r.x > this.stand.x && r.x < to.x).length;
  }

  /** He stands on the meteor; the view glides so it is back on the left, and the words of the meteors left behind go. */
  private land(r: Rock): void {
    this.jump = null;
    this.stand = r;
    this.L.sfx('pop');
    const feet = this.top(r);
    this.L.particles.emit(feet.x, feet.y, 10, 'sparkle', ['#fff6a8', '#a8f0ff', '#ffd1f5'], 120, 7);
    for (const o of this.rocks) {
      if (o === r || o.x >= r.x) continue;
      if (o.tg) {
        this.L.core.release(o.tg, false);
        o.tg = null;
        this.spawned--;
      }
    }
    this.L.core.prune();
    this.viewFrom = this.view;
    this.viewTo = r.x - HOME_X;
    this.glide = 0;
    this.wait = Math.max(this.wait, ROCK_PAUSE);
  }

  /** The words are done: the meteors still waiting lose theirs and the rocket comes. */
  private finish(): void {
    for (const r of this.rocks) {
      if (r.tg) this.L.core.release(r.tg, false);
      r.tg = null;
    }
    this.L.core.prune();
    this.end = 0;
    this.L.sfx('whoosh');
  }

  /** The rocket at the end: comes from the left edge to just past him, waits while he boards, then flies on to the right; null before the end. */
  private rocket(): { x: number; y: number } | null {
    if (this.end === null) return null;
    const feet = this.top(this.stand);
    const stop = feet.x + 160, y = feet.y - 70;
    const come = ease.outCubic(Math.min(1, this.end / ROCKET_COME));
    const away = Math.max(0, this.end - ROCKET_COME - ROCKET_BOARD) / ROCKET_AWAY;
    // It passes over his head and sinks beside him.
    return { x: -160 + (stop + 160) * come + ease.inQuad(Math.min(1, away)) * (this.L.vw + 400), y: y - (1 - come) * 160 - away * 120 };
  }

  /** 0..1 of his jump from the meteor into the rocket's window. */
  private get boarding(): number {
    return this.end === null ? 0 : Math.max(0, Math.min(1, (this.end - ROCKET_COME) / ROCKET_BOARD));
  }

  /** The astronaut's feet and size now: on his meteor, mid-jump, or on the way into the window. */
  private hero(): { x: number; y: number; size: number } {
    if (this.jump) {
      const a = this.top(this.jump.from), b = this.top(this.jump.to), k = ease.inOutQuad(this.jump.k);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(this.jump.k * Math.PI) * 120, size: ASTRONAUT };
    }
    const feet = this.top(this.stand);
    const rocket = this.rocket();
    const b = this.boarding;
    if (!rocket || b <= 0) return { ...feet, size: ASTRONAUT };
    // The rocket flies to the right, its window on its right side.
    const wx = rocket.x + WINDOW.x, wy = rocket.y + WINDOW.y + 20;
    const e = ease.inOutQuad(b);
    return { x: feet.x + (wx - feet.x) * e, y: feet.y + (wy - feet.y) * e - Math.sin(b * Math.PI) * 100, size: ASTRONAUT + (40 - ASTRONAUT) * e };
  }

  heroSpot(): { x: number; y: number } {
    const s = this.hero();
    return { x: s.x, y: s.y - s.size * 0.9 - 20 };
  }

  bubbleSpot(): { x: number; y: number } {
    const s = this.hero();
    return { x: s.x, y: s.y - s.size * 0.9 - 10 };
  }

  render(g: G): void {
    for (const r of this.rocks) {
      // A new meteor fades in and grows at its place.
      const k = Math.min(1, r.age / GROW);
      const grow = this.L.reduceMotion ? 1 : 0.4 + 0.6 * ease.outBack(k);
      g.save();
      g.globalAlpha = Math.min(1, r.age / 0.3);
      const at = this.top(r);
      drawSprite(g, r.sprite, at.x, at.y + ROCK_SIZE * 0.32, ROCK_SIZE * grow, { flip: r.flip, rot: r.rot + Math.sin(this.t + r.x) * 0.05 }, blob('#9a8a7a', false));
      g.restore();
      if (r.tg) this.L.label(g, r.tg, at.x, at.y - ROCK_SIZE * 0.3);
    }
    const rocket = this.rocket();
    const b = this.boarding;
    // The rocket behind him; its window empty until he is in.
    if (rocket) drawSprite(g, b >= 0.85 ? 'obj-rocket-pilot' : 'obj-rocket-empty', rocket.x, rocket.y, ROCKET_H, {}, blob('#e5534b'));
    if (b < 0.85) {
      const s = this.hero();
      drawAstronaut(g, true, s.x, s.y, s.size);
    }
  }

  progress(): number {
    return this.done / this.L.count;
  }

  get finished(): boolean {
    return (this.end ?? 0) > ROCKET_COME + ROCKET_BOARD + ROCKET_AWAY;
  }
}

/** Where the astronaut stands in the command level, and the rocket's start and stop beside him. */
const COMMAND_X = 230;
const COMMAND_Y = 0.7;
const ROCKET_START = 0.86;
const ROCKET_STOP = 230;
/** A rejected command turns the rocket up or down by this much, within this band of the height. */
const VEER_MIN = 40;
const VEER_MAX = 70;
const VEER_BAND = [0.3, 0.7];
/** Seconds from a sent command to the next row (the rocket answers meanwhile), of the boarding, of the rest before it flies off, and of it flying off to the left. */
const REPLY_TIME = 1.2;
const BOARD = 0.9;
const REST = 0.4;
const FLY_OFF = 2.5;
const END_TIME = BOARD + REST + FLY_OFF + 0.2;
/** The command panel: its middle's height share, its height, and the onboard computer's height on its left edge. */
const PANEL_Y = 0.24;
const PANEL_H = 120;
const CONSOLE_H = 75;
const PANEL_INK = '#e8f6ff';

/**
 * The rocket world's twist: the astronaut on a meteor on the left writes commands to the rocket on
 * the right, one copy row each (`CopyRow`) on the panel with the onboard computer. A sent command
 * flies to the rocket as a trail of dots. A row with every word right is accepted, one with none
 * rejected, a mixed one either; an accepted command fires the engine and brings the rocket closer
 * by the level's fair share, a rejected one turns it up or down. When all is written it is beside
 * him: he jumps into its window and it flies away to the left.
 */
export class CommandMode extends Mode {
  readonly pictures = [...PICTURES, 'obj-console'];
  readonly world = 'space';
  readonly phraseWords = 1;
  readonly drift: Drift = { layer: 'near', speed: 12 };
  private row = new CopyRow(this.L);
  /** Seconds until the next row comes after a sent one (-1: writing). */
  private reply = -1;
  /** The rocket's share of the way to him, set by accepted commands, and shown eased; it never goes back. */
  private goal = 0;
  private shown = 0;
  /** The rocket's height off the middle line, set by the commands, and shown eased. */
  private dy = 0;
  private dyShown = 0;
  /** The rocket's answer, said on the next frame once its bubble can be measured. */
  private answer: string | null = null;
  private flame = 0;
  /** Seconds of the end; null before it. */
  private end: number | null = null;

  startLine(): string {
    return pickLine('story.commandStart');
  }

  start(): void {
    this.row.fill();
  }

  private get feet(): { x: number; y: number } {
    return { x: COMMAND_X, y: VH * COMMAND_Y - ROCK_SIZE * 0.32 + Math.sin(this.t * 1.4) * 4 };
  }

  /**
   * The rocket, mirrored to face him: from the right third to beside him as commands are accepted
   * (`share`), `dy` off the middle line, bobbing; at the end it flies off to the left.
   */
  private rocket(share = this.shown, dy = this.dyShown): { x: number; y: number } {
    const from = this.L.vw * ROCKET_START, to = COMMAND_X + ROCKET_STOP;
    const x = from + (to - from) * ease.inOutQuad(share);
    return { x: x - ease.inQuad(this.away) * (x + 300), y: VH * 0.5 + dy + Math.sin(this.t * 1.8) * 8 };
  }

  /** 0..1 of the rocket flying off to the left after he is in. */
  private get away(): number {
    return this.end === null ? 0 : Math.max(0, Math.min(1, (this.end - BOARD - REST) / FLY_OFF));
  }

  /** 0..1 of his jump into the window at the end. */
  private get boarding(): number {
    return this.end === null ? 0 : Math.min(1, this.end / BOARD);
  }

  private hero(): { x: number; y: number; size: number } {
    const b = this.boarding, f = this.feet;
    if (b <= 0) return { ...f, size: ASTRONAUT };
    const r = this.rocket(), e = ease.inOutQuad(b);
    const wx = r.x - WINDOW.x, wy = r.y + WINDOW.y + 20;
    return { x: f.x + (wx - f.x) * e, y: f.y + (wy - f.y) * e - Math.sin(b * Math.PI) * 100, size: ASTRONAUT + (40 - ASTRONAUT) * e };
  }

  heroSpot(): { x: number; y: number } {
    const s = this.hero();
    return { x: s.x, y: s.y - s.size * 0.9 - 20 };
  }

  bubbleSpot(): { x: number; y: number } {
    const s = this.hero();
    return { x: s.x, y: s.y - s.size * 0.9 - 10 };
  }

  update(dt: number): void {
    this.row.update(dt);
    this.flame = Math.max(0, this.flame - dt * 1.5);
    this.shown = Math.max(this.shown, this.shown + (this.goal - this.shown) * Math.min(1, dt * 2));
    this.dyShown += (this.dy - this.dyShown) * Math.min(1, dt * 2);
    if (this.end !== null) {
      const before = this.end;
      this.end += dt;
      if (before < BOARD && this.end >= BOARD) {
        const r = this.rocket();
        this.L.particles.emit(r.x, r.y, 30, 'sparkle', ['#fff6a8', '#ffd1f5', '#a8f0ff'], 260, 9);
        this.L.shout(t('story.boarded'), r.x, r.y - 110);
        this.L.sfx('cheer');
      }
      if (before < BOARD + REST && this.end >= BOARD + REST) this.L.sfx('whoosh');
      return;
    }
    if (this.reply < 0) return;
    this.reply -= dt;
    if (this.reply > 0) return;
    this.reply = -1;
    this.L.core.prune();
    if (this.row.left > 0) this.row.fill();
    else this.end = 0;
  }

  onDone(tg: Target): void {
    if (!this.row.onDone(tg)) return;
    this.L.sfx('pop');
    this.send();
  }

  onWrong(tg: Target | null): void {
    if (this.row.onWrong(tg)) this.send();
  }

  /**
   * A finished row is sent: dots fly to the rocket. Every word right: accepted; none right:
   * rejected; some right: either, half of the cases each. Accepted, the engine fires and the
   * rocket comes to the level's fair share, halfway back to the middle line; rejected, it turns
   * up or down. The last row is always accepted: the rocket comes all the way.
   */
  private send(): void {
    if (!this.row.complete) return;
    const r = this.rocket(), f = this.feet;
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      this.L.particles.emit(f.x + (r.x - f.x) * k, f.y - 120 + (r.y - f.y + 120) * k, 2, 'sparkle', ['#a8f0ff', '#fff6a8'], 40, 6, 0.6 + k * 0.5);
    }
    this.L.sfx('whoosh');
    const { rowTyped: right, rowSlips: slips } = this.row;
    const last = this.row.left <= 0;
    const accepted = last || slips === 0 || (right > 0 && !this.L.rng.chance(0.5));
    if (last) {
      this.goal = 1;
      this.dy = 0;
    } else if (accepted) {
      this.goal = Math.max(this.goal, Math.min(1, this.L.share()));
      this.dy /= 2;
    } else this.veer();
    if (accepted) this.flame = 1;
    this.answer = pickLine(accepted ? 'story.commandReply' : 'story.commandRejected');
    this.reply = REPLY_TIME;
  }

  /** A rejected command turns the rocket up or down, staying within the band. */
  private veer(): void {
    const by = this.L.rng.range(VEER_MIN, VEER_MAX);
    const [lo, hi] = VEER_BAND.map((k) => VH * (k - 0.5));
    const fits = [this.dy - by, this.dy + by].filter((y) => y >= lo && y <= hi);
    this.dy = fits.length ? this.L.rng.pick(fits) : Math.max(lo, Math.min(hi, this.dy - by));
  }

  /** The command panel fixed in the middle of the stage, and the onboard computer standing on its left edge with a third of it over the panel. */
  private panel(): { x0: number; x1: number; y: number; console: { x: number; w: number } } {
    const w = Math.min(this.L.vw * 0.56, 700), x0 = this.L.vw / 2 - w / 2;
    const img = sprite('obj-console');
    const cw = CONSOLE_H * (img ? img.naturalWidth / img.naturalHeight : 2 / 3);
    return { x0, x1: x0 + w, y: VH * PANEL_Y, console: { x: x0 + cw / 6, w: cw } };
  }

  /** The rocket answers above the place it heads for, or below when that bubble would cover the console. */
  private answerWith(g: G, text: string): void {
    const r = this.rocket(this.goal, this.dy), p = this.panel();
    const lay = speechLayout(g, text, SPEECH_W);
    const x = Math.min(this.L.vw - lay.w / 2 - 8, Math.max(lay.w / 2 + 8, r.x));
    const above = r.y - 110, half = Math.max(PANEL_H, CONSOLE_H) / 2;
    const covers = x + lay.w / 2 > p.console.x - p.console.w / 2 && x - lay.w / 2 < p.x1 && above - lay.h / 2 < p.y + half && above + lay.h / 2 > p.y - half;
    if (covers) this.L.speak('rocket', text, x, r.y + 70 + lay.h / 2, r.x, r.y + 40, REPLY_TIME + 1);
    else this.L.speak('rocket', text, x, above, r.x, r.y - 50, REPLY_TIME + 1);
  }

  render(g: G): void {
    if (this.answer) {
      this.answerWith(g, this.answer);
      this.answer = null;
    }
    const f = this.feet, r = this.rocket(), b = this.boarding;
    drawSprite(g, 'obj-asteroid-big', f.x, f.y + ROCK_SIZE * 0.32, ROCK_SIZE, {}, blob('#9a8a7a', false));
    // The engine's flame on its right, away from where it flies; it burns hard as it flies off.
    const burn = this.away > 0 ? 1 : this.flame;
    g.save();
    g.globalAlpha = 0.45 + burn * 0.55;
    g.fillStyle = '#ffcf5a';
    g.beginPath();
    g.ellipse(r.x + 85 + burn * 18, r.y + 4, 10 + burn * 26, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    const inside = b >= 0.85;
    drawSprite(g, inside ? 'obj-rocket-pilot' : 'obj-rocket-empty', r.x, r.y, ROCKET_H, { flip: true }, blob('#e5534b'));
    if (!inside) {
      const s = this.hero();
      drawAstronaut(g, true, s.x, s.y, s.size);
    }
    if (this.end !== null) return;
    const p = this.panel();
    g.save();
    g.fillStyle = 'rgba(18, 30, 70, 0.88)';
    g.strokeStyle = '#7fd1ff';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(p.x0, p.y - PANEL_H / 2, p.x1 - p.x0, PANEL_H, 16);
    g.fill();
    g.stroke();
    g.restore();
    drawSprite(g, 'obj-console', p.console.x, p.y, CONSOLE_H, {}, blob('#e8eef5'));
    if (this.reply >= 0) return;
    // The row starts right of the computer.
    const x0 = p.console.x + p.console.w / 2 + 16, x1 = p.x1 - 25;
    this.row.draw(g, (x0 + x1) / 2, p.y, x1 - x0, PANEL_INK);
  }

  progress(): number {
    return this.row.resolved / this.L.count;
  }

  get finished(): boolean {
    return (this.end ?? 0) > END_TIME;
  }
}
