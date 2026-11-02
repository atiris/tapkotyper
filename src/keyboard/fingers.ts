import type { Finger, KeyDef } from './layouts';

/**
 * Which finger types a key: the standard way (each layout's own `finger`) or the ergonomic one, the standard with a few
 * keys of the digit row moved one finger over (2 by the little finger, 3 ring, 4 middle, 6 left index; 8 right index,
 * 9 middle, 0 ring). Keys are places on the keyboard (codes), so a scheme fits every layout.
 */
export type FingerScheme = 'standard' | 'ergonomic';

const ERGONOMIC: Record<string, Finger> = { Digit2: 0, Digit3: 1, Digit4: 2, Digit6: 3, Digit8: 6, Digit9: 7, Digit0: 8 };

export function fingerOf(def: KeyDef, scheme: FingerScheme = 'standard'): Finger {
  return scheme === 'ergonomic' ? ERGONOMIC[def.code] ?? def.finger : def.finger;
}
