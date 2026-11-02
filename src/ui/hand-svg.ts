/**
 * One hand's outline for one key, as the hand poser (tools/hand-poser) writes it: `public/hands/<side>/<name>.svg`, named
 * by the key the hand presses (poseName: `r`, `spc`, `lsft`, `home` for the home position); the list of them in
 * `public/hands/index.json`. Paths are in units of the full size keyboard (a key and its gap 58 wide, a row 50 high, the
 * digit row on top) over VIEW, so every file lies on the keyboard as it is.
 */

export type Side = 'left' | 'right';

/** The room the hands are drawn in: the keyboard (866 x 246) and around it, where the hands reach out and their wrists lie. */
export const VIEW = { x: -150, y: -20, w: 1166, h: 460 };

/** The hand's lines (filled shapes, even-odd) and its nails by finger (0-4 left pinky..thumb, 5-9 right thumb..pinky). */
export interface HandShape {
  lines: string;
  nails: { f: number; d: string }[];
}

/** The names of the saved outlines per hand. */
export type HandIndex = Record<Side, string[]>;

export function readHandSvg(svg: string): HandShape {
  const lines = /<path class="hand-lines" d="([^"]*)"/.exec(svg)?.[1] ?? '';
  const nails = [...svg.matchAll(/<path class="hand-nail" data-finger="(\d)" d="([^"]*)"/g)].map((m) => ({ f: Number(m[1]), d: m[2] }));
  return { lines, nails };
}

/** The keys without a letter or digit, by their code: a short word of at most 4 letters, `l` and `r` for a pair (the ISO Enter's top is the Enter). */
const WORDS: Record<string, string> = {
  Backquote: 'grv', Minus: 'dash', Equal: 'eql', BracketLeft: 'lbrk', BracketRight: 'rbrk', Backslash: 'bsl', Semicolon: 'semi',
  Quote: 'quot', Comma: 'comm', Period: 'dot', Slash: 'slsh', Tab: 'tab', CapsLock: 'caps', Enter: 'entr', EnterTop: 'entr', Backspace: 'bksp',
  Space: 'spc', ShiftLeft: 'lsft', ShiftRight: 'rsft', ControlLeft: 'lctl', ControlRight: 'rctl', MetaLeft: 'lwin', MetaRight: 'rwin',
  AltLeft: 'lalt', AltRight: 'ralt', ContextMenu: 'menu',
};

/** A pose's name, its file's name: the key's letter or digit, or its word, in small letters (`KeyR` -> `r`, `ShiftLeft` -> `lsft`). */
export const poseName = (code: string): string => WORDS[code] ?? code.replace(/^(Key|Digit)/, '').toLowerCase();

/** What a pose's name may be. */
export const POSE_NAME = /^[a-z0-9]+$/;
