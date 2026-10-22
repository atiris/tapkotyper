import type { Rng } from '../engine/rng';
import { PUNCTUATION } from '../learning/lessons';
import { DIGITS, letterKeys } from '../words/words';

/** Characters in one group of the main gate's code. */
export const GATE_GROUP = 6;

/**
 * The main gate's code: `count` groups of GATE_GROUP characters from the child's keys,
 * letters with known punctuation and digits; every second group has at least one of them
 * when the child knows any.
 */
export function gateCode(keys: string[], count: number, noDiacritics: boolean, rng: Rng): string[] {
  const found = letterKeys(keys, noDiacritics);
  const letters = found.length ? found : ['f', 'j'];
  const marks = keys.filter((k) => PUNCTUATION.has(k) || DIGITS.has(k));
  return Array.from({ length: count }, (_, i) => {
    const chars = Array.from({ length: GATE_GROUP }, () => rng.pick(letters));
    const n = !marks.length ? 0 : i % 2 ? rng.int(1, 2) : rng.chance(0.3) ? 1 : 0;
    // Marks never open a group, so its first key is always a letter to find.
    for (let k = 0; k < n; k++) chars[rng.int(1, GATE_GROUP - 1)] = rng.pick(marks);
    return chars.join('');
  });
}
