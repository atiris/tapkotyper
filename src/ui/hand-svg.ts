import type { Layout } from '../keyboard/layouts';

/**
 * One hand's outline for one key, as the hand poser (tools/hand-poser) writes it: `public/hands/<side>/<name>.svg`, named
 * by the key the hand presses (poseName: `r`, `spac`, `lshi`, `l1`), `home` for the home position, `rest` beside the
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
 * The hand's outline and its thin lines (folds of skin over the joints, the nail beds), as filled shapes (even-odd), and the
 * stroke that thickens the outline (its `stroke-width` in the file, which can be changed there).
 */
export interface HandShape {
  lines: string;
  creases: string;
  stroke: number;
}

/** The names of the saved outlines per hand. */
export type HandIndex = Record<Side, string[]>;

export function readHandSvg(svg: string): HandShape {
  const lines = /<path class="hand-lines" d="([^"]*)"/.exec(svg)?.[1] ?? '';
  const creases = /<path class="hand-creases" d="([^"]*)"/.exec(svg)?.[1] ?? '';
  const stroke = Number(/<path class="hand-lines"[^>]*stroke-width="([\d.]+)"/.exec(svg)?.[1] ?? 0);
  return { lines, creases, stroke };
}

/** Keys named by a word; the bottom row's modifiers only in the hand poser (Tapko's keyboard leaves them out). */
const WORDS: Record<string, string> = {
  Tab: 'tab', CapsLock: 'caps', ShiftLeft: 'lshi', ShiftRight: 'rshi', Space: 'spac', Enter: 'ente', EnterTop: 'ente', Backspace: 'back',
  ControlLeft: 'lctl', ControlRight: 'rctl', MetaLeft: 'lwin', MetaRight: 'rwin', AltLeft: 'lalt', AltRight: 'ralt', ContextMenu: 'menu',
};
/** Each row's plain range of keys, as on the English keyboard, and the code of its first key. */
const RANGES: [first: string, keys: string][] = [['Digit1', '1234567890'], ['KeyQ', 'qwertyuiop'], ['KeyA', 'asdfghjkl'], ['KeyZ', 'zxcvbnm']];

/**
 * A pose's name, its file's name, by the key's place: a word (`tab`, `lshi`, `spac`), a key of the row's plain range (`1`, `r`,
 * `y`), or the range's end key and how many keys further out (`11` left of 1, `01` right of 0, `p1` right of P, `l1` ô).
 */
export function poseName(layout: Layout, code: string): string | null {
  if (WORDS[code]) return WORDS[code];
  for (const [r, row] of layout.rows.entries()) {
    const keys = row.filter((d) => !WORDS[d.code]);
    const at = keys.findIndex((d) => d.code === code);
    if (at < 0 || !RANGES[r]) continue;
    const [first, range] = RANGES[r];
    const i = at - keys.findIndex((d) => d.code === first);
    return i < 0 ? `${range[0]}${-i}` : i < range.length ? range[i] : `${range.at(-1)}${i - range.length + 1}`;
  }
  return null;
}

/** What a pose's name may be. */
export const POSE_NAME = /^[a-z0-9]+$/;
