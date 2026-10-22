import type { Target } from './typing';

/** Paw helps a child can hold at once. */
export const PAW_MAX = 3;
/** Words in a row without a mistake that charge one paw help. */
export const PAW_STREAK = 15;
/** Words Tapko types for the child per help. */
export const PAW_WORDS = 3;
/** Share of its travel time a word may be on screen before it counts as close. */
const CLOSE_SHARE = 0.7;

/**
 * A hard moment for the automatic paw help: the screen is full (3 words, or as many
 * as the level allows), the closest word is near its end and the child is not on it.
 * `seen` is how long each word has been visible; `travel` is its time to the end.
 */
export function isHardMoment(targets: Target[], locked: Target | null, seen: (t: Target) => number, travel: (t: Target) => number, maxActive: number): boolean {
  const visible = targets.filter((t) => t.selectable && !t.done && !t.gone);
  if (visible.length < Math.min(3, maxActive)) return false;
  const closest = visible.reduce((a, b) => (b.urgency > a.urgency ? b : a));
  return locked !== closest && seen(closest) >= travel(closest) * CLOSE_SHARE;
}
