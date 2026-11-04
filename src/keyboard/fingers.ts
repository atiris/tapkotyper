import type { Finger, KeyDef, Layout } from './layouts';

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

const fingeredCache = new Map<string, Layout>();
/**
 * The layout with every key's finger by the scheme, so whatever reads a key's `finger` (the guide, the hands, the key
 * cards, the side of Shift) follows the profile's fingering. The same layout and scheme give the same object.
 */
export function fingered(layout: Layout, scheme: FingerScheme): Layout {
  if (scheme === 'standard') return layout;
  const key = `${layout.id}:${scheme}`;
  let out = fingeredCache.get(key);
  if (!out) fingeredCache.set(key, out = { ...layout, rows: layout.rows.map((row) => row.map((d) => ({ ...d, finger: fingerOf(d, scheme) }))) });
  return out;
}
