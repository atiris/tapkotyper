import type { LevelRuntime } from '../../runtime';

/** How hard a crossroads' activation word is, easiest first ('word': one of any length, 'long': the longest of three). */
export const ASKS = ['tiny', 'easy', 'normal', 'word', 'long', 'two', 'twoLong', 'extreme'] as const;
export type Ask = (typeof ASKS)[number];

/** At a crossroads with an easier way out, this many slips in one word bring a slightly easier one instead (and a call to slow down). */
export const EASIER_AFTER = 2;

/** An activation word of the asked difficulty. */
export function askWord(L: LevelRuntime, ask: Ask): string {
  const w = (n: number | undefined) => L.word(n, 1);
  switch (ask) {
    case 'tiny': return w(2);
    case 'easy': return w(3);
    case 'normal': return w(5);
    case 'word': return w(undefined);
    case 'long': return longest([w(undefined), w(undefined), w(undefined)]);
    case 'two': return `${w(5)} ${w(5)}`;
    case 'twoLong': return `${w(8)} ${w(8)}`;
    case 'extreme': return L.word(undefined, 4, 3);
  }
}

/** The longest of the words, the first of equal ones. */
function longest(words: string[]): string {
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

/** One step down the ladder (the easiest stays). */
export function easierAsk(ask: Ask): Ask {
  return ASKS[Math.max(0, ASKS.indexOf(ask) - 1)];
}
