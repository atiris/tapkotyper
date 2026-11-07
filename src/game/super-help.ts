/** What the super help leaves in a run: random wrong keys, and words it does not finish in time. */
export type Slip = 'mistake' | 'hesitate';
export type HelpPlan = 'clean' | 'm1' | 'm2' | 'm1h1' | 'm2h2' | 'acc98' | 'acc97' | 'acc92' | 'acc75';

export const HELP_PLANS: Record<HelpPlan, Slip[]> = {
  clean: [],
  m1: ['mistake'],
  m2: ['mistake', 'mistake'],
  m1h1: ['mistake', 'hesitate'],
  m2h2: ['mistake', 'hesitate', 'mistake', 'hesitate'],
  acc98: [],
  acc97: [],
  acc92: [],
  acc75: [],
};

/** Plans that aim at an accuracy instead (4, 3 or 4, 2 and 1 star of a level, see `starsFor`): wrong keys at random all through the level. */
const HELP_ACCURACY: Partial<Record<HelpPlan, number>> = { acc98: 0.98, acc97: 0.97, acc92: 0.92, acc75: 0.75 };

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

/** The letter a beat game (Rytmus) waits for: its number, its key, song seconds to its beat, its catch window (beats each side) and letter beat; `waiting`: the song stands at it until its key comes. */
export interface BeatDue {
  index: number;
  letter: string;
  untilBeat: number;
  w: number;
  T: number;
  waiting: boolean;
}

/** Where a beat catch of the super help lands, as a share of the window from the beat: the middle half, or out towards the band's edges. */
const BEAT_MIDDLE = 0.3;
const BEAT_EDGE: [number, number] = [0.6, 0.95];

/**
 * Plays a beat game like a child of its plan: every letter caught in the middle of the band; a mistake
 * lets a letter fall, a hesitation catches one at the band's late edge, an accuracy plan catches that
 * share in the middle and the rest out towards the edges. The slips are spread evenly over the round.
 */
export class BeatHelper {
  private slips: Slip[];
  private marks: number[];
  private middleShare: number;
  /** The letter decided last, where in its window it is pressed (beats from its beat, null: let it fall), and whether it was pressed. */
  private aim = { index: -1, at: 0 as number | null, done: false };

  constructor(readonly plan: HelpPlan, private rand: () => number = Math.random) {
    this.slips = [...HELP_PLANS[plan]];
    this.marks = slipMarks(this.slips.length);
    this.middleShare = HELP_ACCURACY[plan] ?? 1;
  }

  /** Where the next letter is pressed, in beats from its beat (null: it falls). */
  private decide(progress: number, w: number): number | null {
    if (this.marks.length && progress >= this.marks[0]) {
      this.marks.shift();
      return this.slips.shift() === 'mistake' ? null : BEAT_EDGE[1] * w;
    }
    if (this.rand() < this.middleShare) return (this.rand() * 2 - 1) * BEAT_MIDDLE * w;
    const k = BEAT_EDGE[0] + this.rand() * (BEAT_EDGE[1] - BEAT_EDGE[0]);
    return (this.rand() < 0.5 ? -k : k) * w;
  }

  tick(due: BeatDue | null, progress: number, press: (ch: string) => void): void {
    if (!due) return;
    if (due.index !== this.aim.index) this.aim = { index: due.index, at: this.decide(progress, due.w), done: false };
    if (this.aim.done) return;
    // A letter let fall is still pressed when the song stands waiting for it (after a miss, or without time pressure).
    if (!due.waiting && (this.aim.at === null || -due.untilBeat < this.aim.at * due.T)) return;
    this.aim.done = true;
    press(due.letter);
  }
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
