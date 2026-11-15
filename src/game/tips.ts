import { type Layout, allKeys, diacritics, enterAfter, hasDeadKeys, lettersOnDigitRow, pinkyLetters, swapsYZ } from '../keyboard/layouts';

/** What a layout needs for a tip about its keys; a tip not listed fits every layout. */
const NEEDS: Record<string, (l: Layout) => boolean> = {
  'yz-swap': swapsYZ,
  'z-finger': swapsYZ,
  'number-row': (l) => lettersOnDigitRow(l).length > 0,
  'dead-keys': hasDeadKeys,
  'caron-shift': (l) => allKeys(l).some((d) => d.base === 'dead:acute' && d.shift === 'dead:caron'),
  'accent-pinky': (l) => pinkyLetters(l).length > 0,
  'diacritics-fun': (l) => diacritics(l).size > 0,
};

/** Whether a tip talks about something the layout has. */
export const tipFits = (id: string, layout: Layout): boolean => NEEDS[id]?.(layout) ?? true;

/** The keys tip texts name, taken from the layout: the home pinky key, the digit row's letters, the right pinky's letters. */
export function tipKeys(layout: Layout): { pinky: string; numberRow: string; pinkyKeys: string } {
  return { pinky: enterAfter(layout).toUpperCase(), numberRow: lettersOnDigitRow(layout).join(' '), pinkyKeys: pinkyLetters(layout).join(' ') };
}
