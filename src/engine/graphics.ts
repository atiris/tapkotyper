import type { GraphicsChoice } from '../storage/schema';

/** This device was measured too slow for the full drawing ('1'), then for the simple one too ('2'); kept across visits and players. */
const SLOW_KEY = 'tapkotyper:slow-device';

/** Seconds of play before the frames count (pictures still decode at the start), and the seconds of frames that decide. */
const WARM_UP_S = 1.5;
const WATCH_S = 4;
/** The slowest 5 % of frames take longer than this (ms): the computer is too slow for the full drawing. */
export const SLOW_P95_MS = 25;

/**
 * The simple drawing for slow computers: the canvas at `SIMPLE_RES` canvas pixels per screen pixel (`LOW_RES` with `lowRes`), fewer particles,
 * no blurred shadows or blur behind cards, background bands on whole pixels, the start page's sky without its small life.
 * It changes only how the game is drawn, never its pace, word timing or results.
 */
export const graphics = { simple: false, lowRes: false };

/** Canvas pixels per screen pixel in the simple drawing: a full-screen canvas drawn without a graphics card costs by its pixels. */
export const SIMPLE_RES = 0.75;
/**
 * The second step on a device still slow with the simple drawing: half the pixels again. The scene and
 * the word labels on it get softer but stay clear; Tapko, the keyboard and the cards are page elements and stay sharp.
 */
export const LOW_RES = 0.5;

/** How slow this device was measured: 0 not, 1 for the full drawing, 2 for the simple one too. */
function measuredSlow(): number {
  try {
    return Number(localStorage.getItem(SLOW_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Applies the player's choice (the start page has none: automatic). */
export function useGraphics(choice: GraphicsChoice): void {
  const slow = choice === 'auto' ? measuredSlow() : 0;
  graphics.simple = choice === 'simple' || slow > 0;
  graphics.lowRes = slow > 1;
  document.body.classList.toggle('gfx-simple', graphics.simple);
}

/** Remembers that this device is slow and takes the next step: the simple drawing, then its lower resolution. */
export function markSlowDevice(): void {
  if (graphics.simple) graphics.lowRes = true;
  try {
    localStorage.setItem(SLOW_KEY, graphics.lowRes ? '2' : '1');
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
