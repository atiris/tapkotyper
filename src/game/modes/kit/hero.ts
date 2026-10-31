import { app } from '../../../app/app';
import { VH } from '../../../engine/loop';
import { ease } from '../../../engine/tween';
import type { G } from '../../../gfx/draw';
import { drawTapko, type Mood, type TapkoMotion } from '../../../gfx/tapko';
import { Mode, TAPKO_H } from '../../mode';
import type { LevelRuntime } from '../../runtime';
import type { Target } from '../../typing';

/** Tapko as the hero walking and hopping through the planet (and Bolt's robot city and home, Melody's garden and lake). */
export abstract class HeroMode extends Mode {
  readonly world: string = 'planet';
  protected heroX = 220;
  protected heroY = VH * 0.78;
  /** Height of his picture: as big as the meadow's Tapko in every world. */
  protected readonly heroSize: number = TAPKO_H;
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

  onWrong(_tg?: Target | null): void {
    this.mood = 'thinking';
    this.moodT = 1;
  }

  /** The story friend walks (or floats) right behind the hero. */
  friendSpot(): { x: number; y: number } {
    return { x: this.heroX - 105, y: this.heroY };
  }

  /** Above his head even at the top of a hop. */
  heroSpot(): { x: number; y: number } {
    return { x: this.heroX, y: this.heroY - this.heroSize * 1.2 - 20 };
  }

  /** What else his picture shows (the egg he carries up the mountain). */
  protected heroExtras(): Partial<TapkoMotion> {
    return {};
  }

  protected drawHero(g: G): void {
    // The level is done: Tapko hops happily in place.
    if (this.L.endTime != null) return drawTapko(g, app.profile!.companion, 'happy', this.heroX, this.heroY, this.heroSize, { t: this.t, jump: this.L.endHop, shadow: this.shadow, ...this.heroExtras() });
    drawTapko(g, app.profile!.companion, this.mood, this.heroX, this.heroY, this.heroSize, { t: this.t, jump: this.jump, shadow: this.shadow, ...this.heroExtras() });
  }
}

/** On the planet's meadow he walks in the middle of the path, which the near band draws at this height. */
export const PATH_FEET = VH * 0.89;
/** Where Tapko stands in a world's side activity (the target range, the parrot, free typing): on the planet's and the mountain's path, else at `ground`. */
export const sideFeet = (world: string, ground: number): number => (world === 'planet' || world === 'egg' ? PATH_FEET : ground);
/** The word to type is above his head. */
export const wordAbove = (feet: number): number => feet - TAPKO_H * 0.8 - 100;
