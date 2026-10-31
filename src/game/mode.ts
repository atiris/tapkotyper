import type { Sfx } from '../audio/audio';
import { VH } from '../engine/loop';
import type { G } from '../gfx/draw';
import type { Target } from './typing';
import type { LevelRuntime } from './runtime';

/**
 * Centre of `.level-tapko` and its height in game units: the DOM Tapko is sized from them, so he
 * scales with the scene (the size he had at 150 px on a 340 px high stage).
 */
export const TAPKO_X = 150;
export const TAPKO_H = 265;
/** Where the DOM Tapko's feet are when he stands on the stage's bottom edge (the template's feet are at 90 % of its height). */
export const TAPKO_FEET = VH - TAPKO_H * 0.1;

/** A background band that moves slowly on its own, so a scene that stands still feels alive. */
export interface Drift {
  layer: 'mid' | 'near';
  /** Game units per second at that layer. */
  speed: number;
}

/** How far the drifting band moved on its own after `elapsed` seconds; nothing drifts with reduced motion. */
export function driftOffset(drift: Drift | null, elapsed: number, motion: boolean): number {
  return drift && motion ? elapsed * drift.speed : 0;
}

/** One kind of level (meadow creatures, space rocks, swamp stones...). */
export abstract class Mode {
  /** World background name. */
  abstract readonly world: string;
  /** Where the DOM Tapko's feet are: on a path drawn higher than the bottom edge he stands on it. */
  readonly tapkoFeet: number = TAPKO_FEET;
  /** Another set of the world's middle and near bands (`bg-<world><ground>-mid`), '' for the usual one. */
  readonly ground: string = '';
  /** The near layer's x where the ground's shore picture (`bg-<world><ground>-shore`) stands in front of the band, null for none. */
  shore: number | null = null;
  /** The pictures the mode draws; the level opens when they are loaded. */
  readonly pictures: readonly string[] = [];
  /** Background scroll position (parallax). */
  scroll = 0;
  t = 0;
  /** Most words in one target once space is known: two for moving targets, more in calm modes. */
  readonly phraseWords: number = 2;
  /** Fewest words in one target; above 2 the targets are sentences. */
  readonly phraseMin: number = 2;
  /** Only the background's middle strip moves with the scroll (calm scenes: the target range, the parrot). */
  readonly midOnly: boolean = false;
  /** The band that drifts on its own while the scene stands still, also where `midOnly` holds the others. */
  readonly drift: Drift | null = null;
  /** The sound of a wrong key. */
  readonly wrongSfx: Sfx = 'wrong';

  constructor(protected L: LevelRuntime) {}

  /** What the level asks in particular, after its story on the get-ready card, else null. */
  intro(): string | null {
    return null;
  }
  /** The level's story in one line, shown on the get-ready card; null without one. */
  startLine(): string | null {
    return null;
  }
  /** Extra HUD content of the mode (next to the title), else null. */
  hud(): HTMLElement | null {
    return null;
  }
  /** Round pictures of the mode, right after the title. */
  rings(): HTMLElement[] {
    return [];
  }
  /** Called once after construction, when the stage size is known. */
  start(): void {}
  abstract update(dt: number): void;
  abstract render(g: G): void;
  /** Drawn over the DOM Tapko: what he holds in front of him, within `FRONT_W` of the stage's left edge; modes without it have no front layer. */
  renderFront?(g: G): void;
  /** Words typed so far / needed, for the progress bar. */
  abstract progress(): number;
  abstract get finished(): boolean;
  /** The most stars the level gives whatever the accuracy (a level that also counts how it went). */
  starCap(): number {
    return 3;
  }
  /** The level ended lost (the parrot flew off): no celebration before the results. */
  get lost(): boolean {
    return false;
  }
  /** Where the story friend stands (feet; Bolt in story 2, Melody floats above it in story 3), or null for the place next to Tapko; `lift` holds the little dragon that high above its shadow. */
  friendSpot(): { x: number; y: number; lift?: number } | null {
    return null;
  }
  /** The story friend is not by Tapko now (the little dragon flies its own flight, or sits in the rocket). */
  friendAway(): boolean {
    return false;
  }
  /** Above Tapko's head even at the top of a hop, where his shouts pop up: above the DOM Tapko unless the mode draws him. */
  heroSpot(): { x: number; y: number } {
    return { x: TAPKO_X, y: this.tapkoFeet - TAPKO_H * 1.25 - 40 };
  }
  /** Where the tail of Tapko's bubble points, or null for the bubble's corner above the DOM Tapko. */
  bubbleSpot(): { x: number; y: number } | null {
    return null;
  }
  /** The paws may type this target; a decision (a crossroads' sign) is the child's. */
  pawMay(_t: Target): boolean {
    return true;
  }
  /** Enter that no word waits for; true when the mode took it (else it may call the paws). */
  onEnter(): boolean {
    return false;
  }
  /** The level ended on its own or on request, not left early. */
  onFinish(): void {}
  onCorrect(_t: Target): void {}
  onDone(_t: Target): void {}
  onWrong(_t: Target | null): void {}
}
