import type { Finger } from '../keyboard/layouts';

/**
 * Each finger's colour (the keys' stripes, the finger chips, the hands' nails). The hand tool (tools/hand-poser)
 * rewrites this file when the owner approves a new palette there.
 */
export const FINGER_COLORS: Record<Finger, string> = {
  0: '#e69f00', 1: '#56b4e9', 2: '#009e73', 3: '#f0c419', 4: '#bbbbbb',
  5: '#bbbbbb', 6: '#0072b2', 7: '#d55e00', 8: '#cc79a7', 9: '#8fbc3a',
};
