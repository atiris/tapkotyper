import { drawSprite, type G } from '../../../gfx/draw';
import type { LevelRuntime } from '../../runtime';

/**
 * What a catcher holds: its picture, height, lean, where in front of it a caught thing sits (shares
 * of its height from its middle), where the hand holds it when it tips (a share of its height below
 * its middle) and its picture while missing.
 */
export interface CatcherLook {
  pic: string;
  h: number;
  lean: number;
  at: [number, number];
  grip?: number;
  fallback: (g: G, w: number, h: number) => void;
}

/** What Tapko holds just right of him (the gloves, the valley's torch); on a finished word it rises with the target and catches it. */
export class Catcher {
  /** Height it reaches for; its rest height when nothing flies at it. */
  aimY: number;
  /** A typed target leads it: it keeps pace with it instead of easing slowly. */
  follow = false;
  y: number;
  /** How far it tips over its grip (radians, to the right), easing toward `tiltAim`. */
  tilt = 0;
  tiltAim = 0;
  private bob = 0;
  private squeeze = 0;
  constructor(private L: LevelRuntime, public x: number, public restY: number, private look: CatcherLook) {
    this.aimY = this.y = restY;
  }

  /** The grip it tips around. */
  private grip(): [number, number] {
    return [this.x, this.y + this.bob + this.look.h * (this.look.grip ?? 0)];
  }

  /** Where a caught thing sits. */
  catchPoint(): [number, number] {
    const [ax, ay] = this.look.at, h = this.look.h, [gx, gy] = this.grip();
    const dx = h * ax, dy = h * (ay - (this.look.grip ?? 0)), c = Math.cos(this.tilt), s = Math.sin(this.tilt);
    return [gx + dx * c - dy * s, gy + dx * s + dy * c];
  }

  catch(): void {
    this.squeeze = 1;
  }

  update(dt: number, t: number): void {
    this.y += (this.aimY - this.y) * Math.min(1, dt * (this.follow ? 30 : 10));
    this.tilt += (this.tiltAim - this.tilt) * Math.min(1, dt * 7);
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
    const [gx, gy] = this.grip();
    g.translate(gx, gy);
    g.rotate(this.tilt);
    drawSprite(g, this.look.pic, 0, -this.look.h * (this.look.grip ?? 0), this.look.h, { rot: this.look.lean, sx: 1 - sq, sy: 1 + sq }, this.look.fallback);
    g.restore();
  }
}
