import type { Layout } from './layouts';

/** Keys named by two letters; the bottom row's modifiers only in the hand poser (Tapko's keyboard leaves them out). */
const WORDS: Record<string, string> = {
  Tab: 'tb', CapsLock: 'cp', ShiftLeft: 'ls', ShiftRight: 'rs', Space: 'sp', Enter: 'en', EnterTop: 'en', Backspace: 'bk',
  ControlLeft: 'lc', ControlRight: 'rc', MetaLeft: 'lw', MetaRight: 'rw', AltLeft: 'la', AltRight: 'ra', ContextMenu: 'mn',
};
/** Each row's plain range of keys, as on the English keyboard, and the code of its first key. */
const RANGES: [first: string, keys: string][] = [['Digit1', '1234567890'], ['KeyQ', 'qwertyuiop'], ['KeyA', 'asdfghjkl'], ['KeyZ', 'zxcvbnm']];

/**
 * A key's two-character name by its place, the same on every layout (the hand poses and the keys a world counts on use
 * it): two letters for a named key (`tb`, `ls`, `sp`; Enter `en` flat in the home row, `el` L-shaped over two rows,
 * further out), else a key of the row's plain range and how many keys further out it is (`a0`, `20` the key itself;
 * `11` left of 1, `01` right of 0, `p1` right of P, `l1` the Slovak ô).
 */
export function keyName(layout: Layout, code: string): string | null {
  if (code === 'Enter' || code === 'EnterTop') return layout.rows.some((row) => row.some((d) => d.code === 'EnterTop')) ? 'el' : 'en';
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

/** The code of the key with this name on the layout, null when it has none. */
export function codeOfName(layout: Layout, name: string): string | null {
  return layout.rows.flat().find((d) => keyName(layout, d.code) === name)?.code ?? null;
}
