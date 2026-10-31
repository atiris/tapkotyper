import type { GraphicsChoice } from '../storage/schema';

/** This device was measured too slow for the full drawing; kept across visits and players. */
const SLOW_KEY = 'tapkotyper:slow-device';

/** Seconds of play before the frames count (pictures still decode at the start), and the seconds of frames that decide. */
const WARM_UP_S = 1.5;
const WATCH_S = 4;
/** The slowest 5 % of frames take longer than this (ms): the computer is too slow for the full drawing. */
export const SLOW_P95_MS = 25;

/**
 * The simple drawing for slow computers: the canvas at `SIMPLE_RES` canvas pixels per screen pixel, fewer particles,
 * no blurred shadows or blur behind cards, background bands on whole pixels, the start page's sky without its small life.
 * It changes only how the game is drawn, never its pace, word timing or results.
 */
export const graphics = { simple: false };

/** Canvas pixels per screen pixel in the simple drawing: a full-screen canvas drawn without a graphics card costs by its pixels; word labels are DOM and stay sharp. */
export const SIMPLE_RES = 0.75;

function measuredSlow(): boolean {
  try {
    return localStorage.getItem(SLOW_KEY) === '1';
  } catch {
    return false;
  }
}

/** Applies the player's choice (the start page has none: automatic). */
export function useGraphics(choice: GraphicsChoice): void {
  graphics.simple = choice === 'simple' || (choice === 'auto' && measuredSlow());
  document.body.classList.toggle('gfx-simple', graphics.simple);
}

/** Remembers that this device is slow and switches to the simple drawing. */
export function markSlowDevice(): void {
  try {
    localStorage.setItem(SLOW_KEY, '1');
  } catch {
    // Without storage the next visit measures again.
  }
  graphics.simple = true;
  document.body.classList.add('gfx-simple');
}

/** The 95th percentile of frame times (ms). */
export function p95(times: number[]): number {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
}

/**
 * Watches the frames of the first seconds of play and tells once whether they are too slow.
 * Only frames of active play count: a pause or a card in between starts a new gap.
 */
export class FrameWatch {
  private times: number[] = [];
  private last = 0;
  private played = 0;
  done = false;

  /** A frame of play at `now` (ms); true when the watch just found the frames too slow. */
  frame(now: number): boolean {
    if (this.done) return false;
    const gap = this.last ? now - this.last : 0;
    this.last = now;
    if (!gap) return false;
    this.played += gap / 1000;
    if (this.played < WARM_UP_S) return false;
    this.times.push(gap);
    if (this.played < WARM_UP_S + WATCH_S) return false;
    this.done = true;
    return p95(this.times) > SLOW_P95_MS;
  }

  /** Play stopped: the next frame starts a new gap. */
  pause(): void {
    this.last = 0;
  }
}
