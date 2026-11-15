import type { LevelRuntime } from '../../runtime';

/** How hard a crossroads' activation word is, easiest first. */
export const ASKS = ['tiny', 'easy', 'normal', 'two', 'twoLong', 'extreme'] as const;
export type Ask = (typeof ASKS)[number];

/** At a crossroads with an easier way out, this many slips in one word bring a slightly easier one instead (and a call to slow down). */
export const EASIER_AFTER = 2;

/** An activation word of the asked difficulty. */
export function askWord(L: LevelRuntime, ask: Ask): string {
  const w = (n: number) => L.word(n, 1);
  switch (ask) {
    case 'tiny': return w(2);
    case 'easy': return w(3);
    case 'normal': return w(5);
    case 'two': return `${w(5)} ${w(5)}`;
    case 'twoLong': return `${w(8)} ${w(8)}`;
    case 'extreme': return L.word(undefined, 4, 3);
  }
}

/** One step down the ladder (the easiest stays). */
export function easierAsk(ask: Ask): Ask {
  return ASKS[Math.max(0, ASKS.indexOf(ask) - 1)];
}
