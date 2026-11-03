import type { Finger, Layout } from '../keyboard/layouts';

/**
 * One hand's outline for one key, as the hand poser (tools/hand-poser) writes it: `public/hands/<side>/<name>.svg`, named
 * by the hand, finger and key it presses (poseName: `l4f0`, `r1sp`), `home` for the home position, `rest` beside the
 * keyboard and `rest1`, `rest2`... on the way from rest to home; the list of them in `public/hands/index.json`. Paths
 * are in units of the full size keyboard (a key and its gap 58 wide, a row 50 high, the digit row on top) over VIEW, so
 * every file lies on the keyboard as it is.
 */

export type Side = 'left' | 'right';

/**
 * The room the hands are drawn in: the keyboard (866 x 246) and around it, where the hands reach out, rest beside it and
 * their wrists lie.
 */
export const VIEW = { x: -400, y: -20, w: 1666, h: 460 };

/**
 * The hand's outline and its thin lines (folds of skin over the joints, the nail beds), as filled shapes (even-odd) with
 * the stroke that thickens the outline, or as middle lines (`fill="none"`) drawn as strokes; the widths are the files'
 * `stroke-width`, which can be changed there.
 */
export interface HandShape {
  lines: string;
  creases: string;
  stroke: number;
  /** The lines are middle lines (drawn as strokes `stroke` and `creaseStroke` wide), not filled shapes. */
  centerline: boolean;
  creaseStroke: number;
  /** Nails filled in their finger's colour (FINGER_COLORS), only in the poses the hand tool gives them to. */
  nails: { finger: Finger; d: string }[];
}

/** The names of the saved outlines per hand. */
export type HandIndex = Record<Side, string[]>;

export function readHandSvg(svg: string): HandShape {
  const lines = /<path class="hand-lines" d="([^"]*)"/.exec(svg)?.[1] ?? '';
  const creases = /<path class="hand-creases" d="([^"]*)"/.exec(svg)?.[1] ?? '';
  const stroke = Number(/<path class="hand-lines"[^>]*stroke-width="([\d.]+)"/.exec(svg)?.[1] ?? 0);
  const centerline = /<path class="hand-lines"[^>]*fill="none"/.test(svg);
  const creaseStroke = Number(/<path class="hand-creases"[^>]*stroke-width="([\d.]+)"/.exec(svg)?.[1] ?? 0);
  const nails = [...svg.matchAll(/<path class="hand-nail" data-finger="(\d)" d="([^"]*)"/g)].map((m) => ({ finger: Number(m[1]) as Finger, d: m[2] }));
  return { lines, creases, stroke, centerline, creaseStroke, nails };
}

/** Keys named by two letters; the bottom row's modifiers only in the hand poser (Tapko's keyboard leaves them out). */
const WORDS: Record<string, string> = {
  Tab: 'tb', CapsLock: 'cp', ShiftLeft: 'ls', ShiftRight: 'rs', Space: 'sp', Enter: 'en', EnterTop: 'en', Backspace: 'bk',
  ControlLeft: 'lc', ControlRight: 'rc', MetaLeft: 'lw', MetaRight: 'rw', AltLeft: 'la', AltRight: 'ra', ContextMenu: 'mn',
};
/** Each row's plain range of keys, as on the English keyboard, and the code of its first key. */
const RANGES: [first: string, keys: string][] = [['Digit1', '1234567890'], ['KeyQ', 'qwertyuiop'], ['KeyA', 'asdfghjkl'], ['KeyZ', 'zxcvbnm']];

/**
 * A key's two-character name by its place: two letters for a named key (`tb`, `ls`, `sp`), else a key of the row's
 * plain range and how many keys further out it is (`a0`, `20` the key itself; `11` left of 1, `01` right of 0, `p1`
 * right of P, `l1` the Slovak ô).
 */
export function keyName(layout: Layout, code: string): string | null {
  if (WORDS[code]) return WORDS[code];
  for (const [r, row] of layout.rows.entries()) {
    const keys = row.filter((d) => !WORDS[d.code]);
    const at = keys.findIndex((d) => d.code === code);
    if (at < 0 || !RANGES[r]) continue;
    const [first, range] = RANGES[r];
    const i = at - keys.findIndex((d) => d.code === first);
    return i < 0 ? `${range[0]}${-i}` : i < range.length ? `${range[i]}0` : `${range.at(-1)}${i - range.length + 1}`;
  }
  return null;
}

/** A finger's number in a pose's name: 1 the thumb .. 5 the little finger. */
export const fingerNumber = (f: Finger): number => (f <= 4 ? 5 - f : f - 4);

/**
 * A pose's name, its file's name: the hand (`l`, `r`), the finger (1 the thumb .. 5 the little finger) and the key it
 * presses (keyName): `l4f0` the left index on F, `r1sp` the right thumb on the space bar, `l520` the left little finger
 * on 2 (the ergonomic way; `l420` the standard way). The poses without a key: `home`, `rest` and the steps `rest1`...
 */
export function poseName(layout: Layout, code: string, finger: Finger): string | null {
  const key = keyName(layout, code);
  return key && `${finger <= 4 ? 'l' : 'r'}${fingerNumber(finger)}${key}`;
}

/** What a pose's name may be. */
export const POSE_NAME = /^([lr][1-5][a-z0-9]{2}|home|rest\d*)$/;
