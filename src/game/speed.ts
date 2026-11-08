/** Shortest and longest interval (seconds) one counted press may add to the speed. */
const MIN_INTERVAL = 0.12;
const MAX_INTERVAL = 3;
/** Weight of the newest interval in the smoothed speed. */
const WEIGHT = 0.15;
/** Seconds without a counted press after which the speed sinks, how fast, and down to where. */
const IDLE_AFTER = 2.5;
const IDLE_DROP = 0.25;
const FLOOR = 0.4;
/** A level opens at most at this share of the gauge. */
const START_SHARE = 0.8;
/** Reaction time (ms) of a press with nothing to measure from. */
const UNKNOWN_RT = 1000;

/** Characters per second of a full speed at a difficulty (the rocket's and the dragons' top). */
export function speedTarget(difficulty: number): number {
  return 0.9 + difficulty * 0.35;
}

/** The days of typing the child's usual pace is taken from, and how far above it the gauge's ring is full. */
export const GAUGE_DAYS = 14;
const GAUGE_ABOVE = 1.2;

/** Characters per second that fill the top bar's speed ring: the child's usual pace and a fifth more, or the difficulty's speed before any. */
export function gaugeTop(usualCpm: number, difficulty: number): number {
  return usualCpm > 0 ? (usualCpm / 60) * GAUGE_ABOVE : speedTarget(difficulty);
}

/** One press: its reaction time for the key statistics, whether it repeated the correct key before it, and whether it moved the speed. */
export interface Press {
  rt: number;
  repeat: boolean;
  counted: boolean;
}

/**
 * The child's speed in correct characters per second, smoothed. Only real moves count: a
 * correct press of the same key as the correct press before it adds nothing, so "ffff"
 * cannot fake speed, and the gauge sinks soon after the typing slows down or stops.
 * Times are `performance.now()` milliseconds.
 */
export class Speed {
  /** Smoothed speed, characters per second. */
  ema: number;
  /** The previous correct key, and when it (or a repeat of it) was pressed. */
  private lastKey: string | null = null;
  private correctAt = 0;
  /** The previous press, right or wrong. */
  private pressAt = 0;
  /** When the child could start typing (play start, a resume); 0 = not known. */
  private readyAt = 0;
  /** The last press that counted. */
  private countedAt = 0;

  /** `lastCpm` is the last session's speed; a level opens at most at 80 % of the gauge. */
  constructor(lastCpm: number, difficulty: number) {
    this.ema = Math.min(lastCpm ? lastCpm / 60 : 1, START_SHARE * speedTarget(difficulty));
  }

  /** The next press is measured from `at`, not from the presses before it. */
  ready(at: number): void {
    this.readyAt = at;
    this.correctAt = this.pressAt = 0;
  }

  /**
   * A press at `at`; `key` is the correct key typed, null for a wrong one. The speed measures
   * from the previous correct press (a run of one key ends at its last press), the statistics
   * from the previous press of any kind.
   */
  press(key: string | null, at: number): Press {
    const since = Math.max(this.pressAt, this.readyAt);
    const rt = since ? at - since : UNKNOWN_RT;
    this.pressAt = at;
    if (key === null) return { rt, repeat: false, counted: false };
    const from = Math.max(this.correctAt, this.readyAt);
    const repeat = key === this.lastKey;
    this.lastKey = key;
    this.correctAt = at;
    if (repeat || !from) return { rt, repeat, counted: false };
    const interval = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, (at - from) / 1000));
    this.ema = this.ema * (1 - WEIGHT) + (1 / interval) * WEIGHT;
    this.countedAt = at;
    return { rt, repeat, counted: true };
  }

  /** `dt` seconds of play went by at `now`: without a counted press for a while the speed sinks. */
  idle(dt: number, now: number): void {
    if (this.ema > FLOOR && now - Math.max(this.countedAt, this.readyAt) > IDLE_AFTER * 1000) this.ema = Math.max(FLOOR, this.ema - dt * IDLE_DROP);
  }

  /** Share of the gauge at a difficulty, 1 at its top. */
  ratio(difficulty: number): number {
    return this.ema / speedTarget(difficulty);
  }

  get cpm(): number {
    return Math.round(this.ema * 60);
  }
}
