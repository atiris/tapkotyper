import { type Finger, type Layout, keyByCode, stepsFor } from '../../../keyboard/layouts';
import { isLetterKey } from '../../../learning/lessons';

/**
 * Sticky finger: one finger (or a few) holds its home key down while the others type. The run takes turns in rounds:
 * the right index holds J while the left hand types, then the left index holds F while the right hand types; once the
 * chosen keys allow it, the hand's other home keys are held while its index finger types alone.
 */

export type Side = 'left' | 'right';

/** One round: the keys held down (codes) and the keys typed meanwhile (lesson keys, one hand's letters). */
export interface HoldRound {
  hold: string[];
  side: Side;
  keys: string[];
}

/** Fewest known letter keys of each hand a sticky run needs (F and J count). */
export const MIN_HAND_KEYS = 4;
/** Fewest known letter keys of an index finger for a round where only it types. */
export const MIN_INDEX_KEYS = 3;
/** Seconds of active play in a round of a run without its own length. */
export const ROUND_S = 45;

const INDEX: Record<Side, Finger> = { left: 3, right: 6 };
const INDEX_HOME: Record<Side, string> = { left: 'KeyF', right: 'KeyJ' };
/** The hand's other home keys, from the index finger outwards: they are held first and given up last. */
const OTHER_HOME: Record<Side, string[]> = { left: ['KeyD', 'KeyS', 'KeyA'], right: ['KeyK', 'KeyL', 'Semicolon'] };

const sideOf = (f: Finger): Side | null => (f === 4 || f === 5 ? null : f < 4 ? 'left' : 'right');

/**
 * The letter keys among `keys` typed by one hand alone (every press by `side`, no Shift, no accent key of the other
 * hand), by `finger` only when given. `layout` carries the profile's fingering.
 */
export function handKeys(keys: readonly string[], layout: Layout, side: Side, finger?: Finger): string[] {
  return keys.filter((k) => {
    if (!isLetterKey(k)) return false;
    const steps = stepsFor(layout, k);
    if (!steps.length) return false;
    return steps.every((s) => {
      const f = keyByCode(layout, s.code)?.finger;
      return !s.shift && f != null && sideOf(f) === side && (finger === undefined || f === finger);
    });
  });
}

/** The lesson key a code types on the layout (its character without Shift). */
const keyAt = (layout: Layout, code: string): string | undefined => keyByCode(layout, code)?.base;

/**
 * The rounds of a sticky run for the chosen keys, or null when they are too few (fewer than MIN_HAND_KEYS of a hand,
 * or F or J missing). `rollover`: how many keys this device's keyboard reports at once (null: not checked yet); a round
 * never holds more than it lets the typing key through.
 */
export function holdRounds(keys: readonly string[], layout: Layout, rollover: number | null): HoldRound[] | null {
  const chosen = new Set(keys);
  const left = handKeys(keys, layout, 'left'), right = handKeys(keys, layout, 'right');
  const f = keyAt(layout, INDEX_HOME.left), j = keyAt(layout, INDEX_HOME.right);
  if (left.length < MIN_HAND_KEYS || right.length < MIN_HAND_KEYS || !f || !j || !chosen.has(f) || !chosen.has(j)) return null;
  const rounds: HoldRound[] = [
    { hold: [INDEX_HOME.right], side: 'left', keys: left },
    { hold: [INDEX_HOME.left], side: 'right', keys: right },
  ];
  // The keyboard reports `rollover` keys at once: the typing key and at most rollover - 1 held ones.
  const most = rollover === null ? Infinity : Math.max(1, rollover - 1);
  for (const side of ['left', 'right'] as Side[]) {
    const index = handKeys(keys, layout, side, INDEX[side]);
    const hold = OTHER_HOME[side].filter((c) => chosen.has(keyAt(layout, c) ?? '')).slice(0, most);
    if (index.length >= MIN_INDEX_KEYS && hold.length) rounds.push({ hold, side, keys: index });
  }
  return rounds;
}

/** Some round holds two keys or more: the keyboard's limit matters. */
export function holdsSeveral(rounds: readonly HoldRound[]): boolean {
  return rounds.some((r) => r.hold.length > 1);
}

/**
 * A sticky run's turns: which round plays, whether its keys are held, and the round's active seconds. While a held key
 * is up the run waits; waiting seconds never count. A new round starts only between targets (`atTarget`).
 */
export class HoldRun {
  round = 0;
  private time = 0;
  private down: ReadonlySet<string> = new Set();

  constructor(readonly rounds: readonly HoldRound[], readonly roundS: number) {}

  get current(): HoldRound {
    return this.rounds[this.round];
  }

  /** A held key of this round is up. */
  get waiting(): boolean {
    return this.current.hold.some((c) => !this.down.has(c));
  }

  /** The round's held keys that are up now. */
  get up(): string[] {
    return this.current.hold.filter((c) => !this.down.has(c));
  }

  holds(code: string): boolean {
    return this.current.hold.includes(code);
  }

  /** The keys held down changed. */
  held(down: ReadonlySet<string>): void {
    this.down = new Set(down);
  }

  /** Seconds of play; they count only while the keys are held. */
  tick(dt: number): void {
    if (!this.waiting) this.time += dt;
  }

  /** Seconds played in this round. */
  get played(): number {
    return this.time;
  }

  /** Between targets: the next round once this one has lasted its time; true when it changed. */
  atTarget(): boolean {
    if (this.time < this.roundS || this.rounds.length < 2) return false;
    this.round = (this.round + 1) % this.rounds.length;
    this.time = 0;
    return true;
  }
}
