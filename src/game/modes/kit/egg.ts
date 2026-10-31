import { app } from '../../../app/app';
import { ease } from '../../../engine/tween';
import type { G } from '../../../gfx/draw';
import { type Mood, type TapkoMotion, drawTapko } from '../../../gfx/tapko';
import { minActiveS, minWords } from '../../levels';
import { TAPKO_H } from '../../mode';
import type { LevelRuntime } from '../../runtime';

/** Seconds of one peek of the egg on his back, and the wait between two on their own (random within). */
const PEEK_S = 1.2;
const PEEK_EVERY: [number, number] = [6, 10];
/** The peek's share spent rising, and its wobble (radians). */
const PEEK_RISE = 0.3;
const PEEK_WOBBLE = 0.12;

/**
 * The egg Tapko carries on his back up the mountain: a third of it peeks out at rest; now and then
 * and at story moments (`poke`) it rises to show two thirds, wobbles a little and sinks back. With
 * reduced motion it never moves.
 */
export class EggPeek {
  /** 0..1 through a peek, -1 at rest. */
  private k = -1;
  private wait: number;

  constructor(private L: LevelRuntime) {
    this.wait = L.rng.range(...PEEK_EVERY);
  }

  /** A story moment (a gust reaching him, a mud step, a stumble): the egg peeks now. */
  poke(): void {
    if (!this.L.reduceMotion && this.k < 0) this.k = 0;
  }

  update(dt: number): void {
    if (this.L.reduceMotion) return;
    if (this.k >= 0) {
      if ((this.k += dt / PEEK_S) >= 1) {
        this.k = -1;
        this.wait = this.L.rng.range(...PEEK_EVERY);
      }
    } else if ((this.wait -= dt) <= 0) this.k = 0;
  }

  /** What `drawTapko` needs to draw the egg now. */
  motion(): Pick<TapkoMotion, 'carry' | 'peek' | 'wobble'> {
    const k = this.k;
    if (k < 0) return { carry: 'egg' };
    const up = k < PEEK_RISE ? ease.outCubic(k / PEEK_RISE) : k > 1 - PEEK_RISE ? ease.inOutQuad((1 - k) / PEEK_RISE) : 1;
    return { carry: 'egg', peek: up, wobble: PEEK_WOBBLE * Math.sin(k * Math.PI * 6) * Math.sin(k * Math.PI) };
  }
}

/** Tapko with the egg on his back, on the canvas at his usual size; at the level's end he hops happily. */
export function drawCarrier(g: G, L: LevelRuntime, egg: EggPeek, mood: Mood, x: number, y: number, m: TapkoMotion): void {
  const c = app.profile!.companion;
  if (L.endTime != null) return drawTapko(g, c, 'happy', x, y, TAPKO_H, { ...m, ...egg.motion(), jump: L.endHop, spin: 0 });
  drawTapko(g, c, mood, x, y, TAPKO_H, { ...m, ...egg.motion() });
}

/**
 * The way up gets longer (a gust pushed him back, he stumbled over a boulder): planned words and
 * the minimum time grow together, at the story's pace, by fractions kept exact, up to `maxWords`.
 */
export class Detour {
  /** Whole words added so far, and their exact sum. */
  words = 0;
  private exact = 0;

  constructor(readonly maxWords: number, readonly secondsPerWord: number) {}

  /** Adds `words` (a fraction is kept); returns the whole words and the seconds to add now. */
  add(words: number): { words: number; seconds: number } {
    const to = Math.min(this.maxWords, this.exact + words), add = to - this.exact;
    this.exact = to;
    const whole = Math.round(to) - this.words;
    this.words += whole;
    return { words: whole, seconds: add * this.secondsPerWord };
  }

  get full(): boolean {
    return this.exact >= this.maxWords;
  }
}

/** A detour of the level `L` plays: its count and minimum grow; true when it grew. */
export function lengthen(L: LevelRuntime, detour: Detour, words: number): boolean {
  if (detour.full) return false;
  const add = detour.add(words);
  L.count += add.words;
  L.extendMin(add.seconds);
  return true;
}

/** Seconds of the level's minimum per planned word (the story's slow pace: 7.5 s at 8 words a minute). */
export function secondsPerWord(L: LevelRuntime): number {
  return minActiveS(L.def) / minWords(L.def);
}
