import type { GraphicsChoice } from '../storage/schema';

/**
 * This device was measured too slow for the full drawing (step 1), then for the simple one too (step 2), at time `at`;
 * kept across visits and players for `RECHECK_DAYS`, then measured again: a busy week or an old driver need not last.
 */
const SLOW_KEY = 'tapkotyper:slow-device';
const RECHECK_DAYS = 7;

/** Seconds of play before the frames count (pictures and fonts still load at the start), and the seconds of frames that decide. */
const WARM_UP_S = 3;
const WATCH_S = 6;
/** The watched seconds split into this many parts; each part's middle frame must be slow. */
const PARTS = 3;
/** A middle frame longer than this (ms, under about 42 frames a second) is too slow for the full drawing. */
export const SLOW_MS = 24;
/** A gap between frames longer than this (ms) is a hiccup, not the frame rate: a hidden tab, a long clean-up of memory, a load. */
const HICCUP_MS = 250;

/**
 * The simple drawing for slow computers: the canvas at `SIMPLE_RES` canvas pixels per screen pixel (`LOW_RES` with `lowRes`), fewer particles,
 * no blurred shadows (word labels keep theirs) or blur behind cards, background bands on whole pixels, the start page's sky without its small life.
 * It changes only how the game is drawn, never its pace, word timing or results.
 */
export const graphics = { simple: false, lowRes: false };

/** Canvas pixels per screen pixel in the simple drawing: a full-screen canvas drawn without a graphics card costs by its pixels. */
export const SIMPLE_RES = 0.75;
/**
 * The second step on a device still slow with the simple drawing: half the pixels again. The scene gets softer;
 * the word labels have their own layer at the screen's resolution (Stage.beginWords), and Tapko, the keyboard
 * and the cards are page elements: they all stay sharp.
 */
export const LOW_RES = 0.5;

/** How slow this device was measured lately: 0 not, 1 for the full drawing, 2 for the simple one too. */
function measuredSlow(): number {
  try {
    const m = JSON.parse(localStorage.getItem(SLOW_KEY) ?? 'null') as { step?: unknown; at?: unknown } | null;
    const fresh = typeof m?.at === 'number' && Date.now() - m.at < RECHECK_DAYS * 864e5;
    return fresh && (m.step === 1 || m.step === 2) ? m.step : 0;
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
    localStorage.setItem(SLOW_KEY, JSON.stringify({ step: graphics.lowRes ? 2 : 1, at: Date.now() }));
  } catch {
    // Without storage the next visit measures again.
  }
  graphics.simple = true;
  document.body.classList.add('gfx-simple');
}

/** The middle frame time (ms). */
export function median(times: number[]): number {
  return [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)] ?? 0;
}

/**
 * Watches the frames of the first seconds of play and tells once whether they are too slow: only when they
 * are slow all the time, so a strong computer never steps down for a moment of trouble. Only frames of active
 * play count: a pause or a card in between starts a new gap, and a hiccup counts neither as a frame nor as time.
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
    if (!gap || gap > HICCUP_MS) return false;
    this.played += gap / 1000;
    if (this.played < WARM_UP_S) return false;
    this.times.push(gap);
    if (this.played < WARM_UP_S + WATCH_S) return false;
    this.done = true;
    const part = Math.ceil(this.times.length / PARTS);
    return Array.from({ length: PARTS }, (_, i) => median(this.times.slice(i * part, (i + 1) * part))).every((m) => m > SLOW_MS);
  }

  /** Play stopped: the next frame starts a new gap. */
  pause(): void {
    this.last = 0;
  }
}
