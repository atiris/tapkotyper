import { type Finger, type KeyDef, type Layout } from '../../src/keyboard/layouts';

/** Size of the keyboard's grid in keyboard units, as Tapko's on-screen keyboard. */
export const UNIT = 58, GAP = 4, KEY_H = 46;

/** The bottom row's modifiers, which Tapko leaves out, so the hand tools show the whole keyboard. */
export const MODIFIERS: KeyDef[] = [
  ['ControlLeft', 0], ['MetaLeft', 0], ['AltLeft', 4], ['Space', 4, 6.25], ['AltRight', 5], ['MetaRight', 9], ['ContextMenu', 9], ['ControlRight', 9],
].map(([code, finger, w]) => ({ code: code as string, base: code === 'Space' ? ' ' : '', shift: '', finger: finger as Finger, w: (w as number) ?? 1.25 }));

/** A layout with the bottom row's modifiers. */
export const withModifiers = (layout: Layout): Layout => ({ ...layout, rows: [...layout.rows.slice(0, 4), MODIFIERS] });
