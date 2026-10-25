/** What the super help leaves in a run: random wrong keys, and words it does not finish in time. */
export type Slip = 'mistake' | 'hesitate';
export type HelpPlan = 'clean' | 'm1' | 'm2' | 'm1h1' | 'm2h2' | 'acc90' | 'acc75';

export const HELP_PLANS: Record<HelpPlan, Slip[]> = {
  clean: [],
  m1: ['mistake'],
  m2: ['mistake', 'mistake'],
  m1h1: ['mistake', 'hesitate'],
  m2h2: ['mistake', 'hesitate', 'mistake', 'hesitate'],
  acc90: [],
  acc75: [],
};

/** Plans that aim at an accuracy instead (2 stars and 1 star, see `starsFor`): wrong keys at random all through the level. */
const HELP_ACCURACY: Partial<Record<HelpPlan, number>> = { acc90: 0.9, acc75: 0.75 };

/** Characters per minute of the super help, and how much each key's time may vary either way. */
const HELP_CPM = 200;
const JITTER = 0.25;
/** Seconds to read the next word after one is finished. */
const READ_S = 0.5;
/** Seconds a hesitation waits for its word to fly by before it gives up (nothing passes in calm levels). */
const HOLD_S = 15;
/** Seconds of a late frame that may shorten the next key. */
const MAX_CARRY = 0.1;

/** The run cut into `n + 1` equal parts: the progress shares where the slips come. */
export function slipMarks(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
}

/** What the super help reads and does in a level, the same way a child's keys go. */
export interface HelpHost {
  /** The level's progress, 0..1. */
  progress(): number;
  /** The next character the child would type now and whether it ends its target; null when nothing can be typed yet. */
  next(): { ch: string; last: boolean } | null;
  /** Presses a key through the level's own key handler. */
  press(ch: string): void;
  /** A key that is not the expected one. */
  wrongKey(): string;
  /** Targets that flew by untyped so far. */
  missed(): number;
  /** A target can fly by untyped (no waiting targets). */
  canMiss(): boolean;
}

/** Types a level like a child at about 200 characters per minute, with the slips of its plan spread evenly. */
export class SuperHelper {
  private slips: Slip[];
  private marks: number[];
  private wait = READ_S;
  private hold: { missed: number; left: number } | null = null;
  /** Chance that a key is wrong (tried again until a right one comes), so right / all keys meets the plan's accuracy. */
  private wrongChance: number;

  constructor(readonly plan: HelpPlan, private rand: () => number = Math.random) {
    this.slips = [...HELP_PLANS[plan]];
    this.marks = slipMarks(this.slips.length);
    this.wrongChance = 1 - (HELP_ACCURACY[plan] ?? 1);
  }

  private keyTime(): number {
    return (60 / HELP_CPM) * (1 + (this.rand() * 2 - 1) * JITTER);
  }

  tick(dt: number, host: HelpHost): void {
    if (this.hold) {
      this.hold.left -= dt;
      if (host.missed() > this.hold.missed || this.hold.left <= 0) {
        this.hold = null;
        this.wait = READ_S;
      }
      return;
    }
    if ((this.wait -= dt) > 0) return;
    const next = host.next();
    if (!next) {
      this.wait = 0.2;
      return;
    }
    if (this.marks.length && host.progress() >= this.marks[0]) {
      this.marks.shift();
      const slip = this.slips.shift()!;
      if (slip === 'mistake') {
        host.press(host.wrongKey());
        this.wait = Math.max(this.wait, -MAX_CARRY) + this.keyTime() * 2;
        return;
      }
      if (host.canMiss()) {
        this.hold = { missed: host.missed(), left: HOLD_S };
        return;
      }
    }
    if (this.rand() < this.wrongChance) {
      host.press(host.wrongKey());
      this.wait = Math.max(this.wait, -MAX_CARRY) + this.keyTime() * 2;
      return;
    }
    host.press(next.ch);
    // A little of the time left over from this tick carries on, so the pace does not depend on the
    // frame rate, but a late frame never brings a burst of quick keys.
    this.wait = Math.max(this.wait, -MAX_CARRY) + this.keyTime() + (next.last ? READ_S : 0);
  }
}
