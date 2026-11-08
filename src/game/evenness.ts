import type { Finger } from '../keyboard/layouts';
import { accuracyCap } from './beat';

/**
 * Rhythm as evenness (`.research/learning/rhythm-measure.md`): how even the time between correct
 * key strokes is, whatever the speed. Each interval is compared with the one before it on a log
 * scale (pairwise variability), so a slow drift costs nothing while bursts and hunts show clearly.
 */

/** A pair's log difference counts at most this much (one long hunt is one strong mark). */
const PAIR_MAX = 1;
/** Mean pair difference of this or less is 100, of this or more 0. */
const L_FULL = 0.1;
const L_ZERO = 0.45;
/** Pairs the live ring looks back at, the fewest it shows a value for, and the weight of each new pair in it. */
const WINDOW = 30;
export const LIVE_MIN = 10;
const EASE = 0.2;
/** The fewest pairs a session's score needs. */
export const SESSION_MIN = 20;
/** An interval inside a word counts at most max(HUNT_MS, HUNT_X x the usual one). */
const HUNT_MS = 2000;
const HUNT_X = 4;
/** Intervals each key pair class keeps for its usual one, and how many it needs before its own median is used. */
const KEEP = 200;
const OWN_MIN = 20;

/** Hand alternation, the same hand, the same finger on another key. */
type PairClass = 'alt' | 'hand' | 'finger';
/** A class's usual interval before it has its own: this share of the overall one. */
const CLASS_SHARE: Record<PairClass, number> = { alt: 0.85, hand: 1, finger: 1.3 };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 0-100 from a mean pair difference. */
function scoreOf(mean: number): number {
  return 100 * clamp01((L_ZERO - mean) / (L_ZERO - L_FULL));
}

export class Evenness {
  /** The previous stroke: its key and when its letter came; null after a chain break. */
  private prev: { key: string; end: number } | null = null;
  /** The previous kept interval, when it ended at the previous stroke. */
  private last: { d: number; cls: PairClass } | null = null;
  private readonly kept: Record<PairClass, number[]> = { alt: [], hand: [], finger: [] };
  private readonly pairs: number[] = [];
  /** The live ring's eased value before the accuracy cap; null before LIVE_MIN pairs. */
  private eased: number | null = null;

  /** `fingerOf` names the finger of a key on the child's layout (null when unknown). */
  constructor(private readonly fingerOf: (key: string) => Finger | null) {}

  /** The next stroke is not measured from the ones before it (a new target, a pause, a card, an error). */
  break(): void {
    this.prev = null;
    this.last = null;
  }

  /**
   * A correct stroke of `key`: its first press (the Shift or the dead key of a combo) at `start`,
   * its letter at `end` (ms). The same key again only restarts the chain: holding a key fakes nothing.
   */
  stroke(key: string, start: number, end: number): void {
    const prev = this.prev;
    this.prev = { key, end };
    if (!prev || prev.key === key || start <= prev.end) {
      this.last = null;
      return;
    }
    const cls = this.classOf(prev.key, key);
    const all = this.allKept();
    const d = Math.min(start - prev.end, Math.max(HUNT_MS, HUNT_X * (all.length ? median(all) : 0)));
    const keep = this.kept[cls];
    keep.push(d);
    if (keep.length > KEEP) keep.shift();
    const before = this.last;
    this.last = { d, cls };
    if (!before) return;
    const p = Math.min(PAIR_MAX, Math.abs(Math.log(d / this.usual(cls)) - Math.log(before.d / this.usual(before.cls))));
    this.pairs.push(p);
    if (this.pairs.length < LIVE_MIN) return;
    const win = this.pairs.slice(-WINDOW);
    const now = scoreOf(win.reduce((s, x) => s + x, 0) / win.length);
    this.eased = this.eased === null ? now : this.eased * (1 - EASE) + now * EASE;
  }

  /** The live ring's score (0-100) at the level's `accuracy`, null before LIVE_MIN pairs. It never sinks while nobody types. */
  live(accuracy: number): number | null {
    return this.eased === null ? null : Math.round(Math.min(this.eased, accuracyCap(accuracy)));
  }

  /** The whole level's score (0-100) at its `accuracy`, null with fewer than SESSION_MIN pairs. */
  session(accuracy: number): number | null {
    if (this.pairs.length < SESSION_MIN) return null;
    return Math.round(Math.min(scoreOf(this.pairs.reduce((s, x) => s + x, 0) / this.pairs.length), accuracyCap(accuracy)));
  }

  private allKept(): number[] {
    return [...this.kept.alt, ...this.kept.hand, ...this.kept.finger];
  }

  /** The child's usual interval of a class: its own median, or before enough of them a share of the overall one. */
  private usual(cls: PairClass): number {
    const own = this.kept[cls];
    if (own.length >= OWN_MIN) return median(own);
    return CLASS_SHARE[cls] * median(this.allKept());
  }

  /** The thumbs (the space bar) and unknown keys count as alternation. */
  private classOf(a: string, b: string): PairClass {
    const fa = this.fingerOf(a), fb = this.fingerOf(b);
    if (fa === null || fb === null || fa === 4 || fa === 5 || fb === 4 || fb === 5) return 'alt';
    if (fa === fb) return 'finger';
    return (fa <= 4) === (fb <= 4) ? 'hand' : 'alt';
  }
}
