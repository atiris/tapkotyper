/** Pure pacing of story levels: the child's word pace and the pressure valve. */

/** Finished targets the word pace averages. */
export const PACE_WORDS = 5;
/** Seconds per character the travel time allows at least and at most. */
export const PACE_MIN = 0.7;
export const PACE_MAX = 2.4;

/**
 * The child's own seconds per character. From the last finished targets (reading and finding the
 * first key included); before there are enough, from the last session's rhythm.
 */
export function childPace(samples: number[], lastCps: number): number {
  const recent = samples.slice(-PACE_WORDS);
  return recent.length >= PACE_WORDS
    ? recent.reduce((a, b) => a + b, 0) / recent.length
    : 1 / Math.max(0.5, lastCps * 0.85);
}

/** Seconds per character for the travel time: the child's pace within the travel time's bounds. */
export function perChar(samples: number[], lastCps: number): number {
  return Math.min(PACE_MAX, Math.max(PACE_MIN, childPace(samples, lastCps)));
}

/** One step of the valve, and its largest factor. */
const VALVE_STEP = 1.25;
const VALVE_MAX = 2;
/** Misses in a row that slow the level, typed targets in a row that take one step back. */
const VALVE_MISSES = 2;
const VALVE_TYPED = 3;

/** Silent help while the child is overwhelmed: targets passing by slow the next ones down. */
export class PressureValve {
  /** Multiplies the travel time of new targets. */
  factor = 1;
  private misses = 0;
  private typed = 0;

  miss(): void {
    this.typed = 0;
    if (++this.misses < VALVE_MISSES) return;
    this.misses = 0;
    this.factor = Math.min(VALVE_MAX, this.factor * VALVE_STEP);
  }

  hit(): void {
    this.misses = 0;
    if (++this.typed < VALVE_TYPED) return;
    this.typed = 0;
    this.factor = Math.max(1, this.factor / VALVE_STEP);
  }
}

/** Seconds a narrator line stays in the bubble at least, and per character of it. */
export const SAY_MIN = 3.5;
export const SAY_PER_CHAR = 0.08;

/** How long a narrator line is shown, so a child can read it. */
export function sayTime(text: string): number {
  return Math.max(SAY_MIN, text.length * SAY_PER_CHAR);
}
