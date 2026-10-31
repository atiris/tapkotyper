import { app, pickLine } from '../../app/app';
import { ease } from '../../engine/tween';
import type { G } from '../../gfx/draw';
import { drawTapko } from '../../gfx/tapko';
import { tList } from '../../i18n/i18n';
import { TAPKO_H } from '../mode';
import { ROCKET_DOOR, ROCKET_STAND_H, STANDING_ROCKET, drawStandingRocket } from './kit/rocket';
import { SHORE_FEET, SHORE_LAND, shoreEndView, shoreRocketX, shoreW } from './planet';
import { CommandMode } from './space-calm';

/** The rocket's feet a little into the grass, as on the swamp's shore. */
const ROCKET_FEET = SHORE_FEET + 6;
/** Seconds of the end: he and the little dragon climb in, each count of "3, 2, 1, start!", and the rocket rising off the stage. */
const BOARD = 1.2;
const COUNT = 0.8;
const COUNTS = 4;
const RISE = 2.4;
const LIFT_AT = BOARD + COUNT * (COUNTS - 1);
const END_TIME = LIFT_AT + RISE + 0.4;
/** How far the rocket rises: off the top of the stage with its flame. */
const RISE_BY = SHORE_FEET + ROCKET_STAND_H;
/** Accepted commands get the rocket ready step by step; after this one its engines warm up (a little smoke). */
const WARM_STEP = 2;

/**
 * The dragon story's hero's journey ends with the take-off (the rocket world's command game on the
 * ground): Tapko on the shore writes commands on the panel to his rocket standing on the grass. Each
 * accepted command gets it ready a step; a rejected one is answered and nothing happens (it does not
 * veer on the ground). After the last one he and the little dragon climb in, the countdown runs, and
 * the rocket rises off the top of the stage with its flame and smoke.
 */
export class LaunchMode extends CommandMode {
  readonly pictures = [...STANDING_ROCKET, 'obj-console'];
  readonly world = 'planet';
  readonly ground = '-swamp';
  readonly drift = null;
  /** Accepted commands so far. */
  private steps = 0;
  private puff = 0;

  start(): void {
    this.place();
    super.start();
  }

  /** The shore as the swamp's last view showed it, whatever the stage's width now. */
  private place(): void {
    this.shore = shoreEndView(this.L.vw);
  }

  /** He stands on the grass where he stepped ashore. */
  protected get feet(): { x: number; y: number } {
    return { x: this.shore! + shoreW() * SHORE_LAND, y: SHORE_FEET };
  }

  /** The middle of the standing rocket, risen by the take-off. */
  protected rocket(): { x: number; y: number } {
    const lift = this.end === null ? 0 : ease.inQuad(Math.max(0, Math.min(1, (this.end - LIFT_AT) / RISE)));
    return { x: shoreRocketX(this.shore!), y: ROCKET_FEET - ROCKET_STAND_H / 2 - lift * RISE_BY };
  }

  /** 0..1 of his climb into the rocket's door. */
  private get climb(): number {
    return this.end === null ? 0 : Math.min(1, this.end / BOARD);
  }

  /** Him on the way from his spot to the door, smaller as he gets in. */
  private climber(): { x: number; y: number; size: number } {
    const b = ease.inOutQuad(this.climb), f = this.feet, door = { x: shoreRocketX(this.shore!), y: ROCKET_FEET - ROCKET_STAND_H * ROCKET_DOOR };
    return { x: f.x + (door.x - f.x) * b, y: f.y + (door.y - f.y) * b - Math.sin(b * Math.PI) * 60, size: TAPKO_H * (1 - 0.7 * b) };
  }

  heroSpot(): { x: number; y: number } {
    const s = this.climber();
    return { x: s.x, y: s.y - s.size * 1.2 - 20 };
  }

  bubbleSpot(): { x: number; y: number } {
    const s = this.climber();
    return { x: s.x, y: s.y - s.size - 10 };
  }

  /** The little dragon right behind him, then after him into the rocket. */
  friendSpot(): { x: number; y: number } {
    const s = this.climber();
    return { x: s.x - 105 * (1 - this.climb), y: s.y };
  }

  friendAway(): boolean {
    return this.climb >= 0.85;
  }

  /** An accepted command is a step of getting ready; a rejected one changes nothing on the ground. */
  protected answered(accepted: boolean, last: boolean): string {
    if (!accepted) return pickLine('story.commandRejected');
    const lines = tList('story.launchSteps');
    const line = lines[last ? lines.length - 1 : Math.min(lines.length - 2, this.steps)];
    this.steps++;
    return line;
  }

  update(dt: number): void {
    this.place();
    super.update(dt);
    // The engines warm up: now and then a little smoke at its feet; hard smoke as it lifts.
    const lifting = this.end !== null && this.end >= LIFT_AT;
    if ((this.steps > WARM_STEP || lifting) && !this.L.reduceMotion && (this.puff -= dt) <= 0) {
      const r = this.rocket();
      this.puff = lifting ? 0.05 : 0.9;
      this.L.particles.emit(r.x, r.y + ROCKET_STAND_H / 2, lifting ? 4 : 2, 'puff', ['#efe6d2', '#d8cbb0', '#ffffff'], lifting ? 160 : 50, lifting ? 14 : 8, 1.2);
    }
  }

  /** He is in, the countdown, and the rocket rises. */
  protected ending(before: number): void {
    const end = this.end!, r = this.rocket();
    if (before < BOARD && end >= BOARD) this.L.sfx('pop');
    for (let i = 0; i < COUNTS; i++) {
      const at = BOARD + COUNT * i;
      if (before >= at || end < at) continue;
      this.L.shout(tList('story.launchCount')[i], r.x, r.y - ROCKET_STAND_H / 2 - 40);
      this.L.sfx(i === COUNTS - 1 ? 'whoosh' : 'pop');
    }
    if (before < LIFT_AT + RISE * 0.5 && end >= LIFT_AT + RISE * 0.5) this.L.sfx('cheer');
  }

  protected drawScene(g: G): void {
    const r = this.rocket(), feet = r.y + ROCKET_STAND_H / 2;
    if (this.end !== null && this.end >= LIFT_AT) this.drawFlame(g, r.x, feet);
    drawStandingRocket(g, r.x, feet);
    if (this.friendAway()) return;
    const s = this.climber(), c = app.profile!.companion;
    drawTapko(g, c, this.end === null ? this.L.tapkoMood : 'happy', s.x, s.y, s.size, { t: this.t });
  }

  /** A flame drawn in code under the rising rocket, flickering. */
  private drawFlame(g: G, x: number, y: number): void {
    const k = Math.min(1, (this.end! - LIFT_AT) / 0.4), flicker = this.L.reduceMotion ? 1 : 0.85 + Math.sin(this.t * 40) * 0.15;
    const h = 110 * k * flicker, w = 34;
    g.save();
    for (const [scale, color] of [[1, '#ff8a3d'], [0.6, '#ffd35a'], [0.3, '#fff6c8']] as const) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x - w * scale, y - 4);
      g.quadraticCurveTo(x - w * scale * 0.6, y + h * scale * 0.6, x, y + h * scale);
      g.quadraticCurveTo(x + w * scale * 0.6, y + h * scale * 0.6, x + w * scale, y - 4);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  get finished(): boolean {
    return (this.end ?? 0) > END_TIME;
  }
}
