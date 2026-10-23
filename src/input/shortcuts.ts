/**
 * The function keys of the whole app: F1 help, F2 the keyboard guide, F3 reading aloud,
 * F4 the sound level, F8 the next song. The screen shown now (a level) sets its own
 * handlers over the app's defaults; a key without a handler does nothing.
 */

export interface ShortcutHandlers {
  help?: () => void;
  guide?: () => void;
  read?: () => void;
  sound?: () => void;
  track?: () => void;
}

export const SHORTCUT_KEYS = { F1: 'help', F2: 'guide', F3: 'read', F4: 'sound', F8: 'track' } as const;
export type ShortcutKey = keyof typeof SHORTCUT_KEYS;

let defaults: ShortcutHandlers = {};
let context: ShortcutHandlers = {};

/** The app's handlers, used where the shown screen sets none. */
export function setDefaultShortcuts(h: ShortcutHandlers): void {
  defaults = h;
}

/** The shown screen's handlers; the returned function puts back the ones before. */
export function setShortcuts(h: ShortcutHandlers): () => void {
  const prev = context;
  context = h;
  return () => {
    if (context === h) context = prev;
  };
}

/** Inputs where a key types text; buttons and boxes are not. */
const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

function inTextField(target: EventTarget | null): boolean {
  const el = target as { tagName?: string; type?: string; isContentEditable?: boolean } | null;
  if (!el?.tagName) return false;
  if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
  return el.tagName === 'INPUT' && !NOT_TEXT.has(el.type ?? 'text');
}

type KeyEventLike = Pick<KeyboardEvent, 'key' | 'target' | 'repeat' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault' | 'stopPropagation'>;

/** Runs the handler of a shortcut key; true when the key was one (the browser's own action is stopped). */
export function handleShortcut(e: KeyEventLike): boolean {
  const action = SHORTCUT_KEYS[e.key as ShortcutKey];
  // Alt+F4 and the like stay with the browser and the system.
  if (!action || e.altKey || e.ctrlKey || e.metaKey) return false;
  e.preventDefault();
  e.stopPropagation();
  // A text field keeps its keys for typing; only help opens from it.
  if (e.repeat || (action !== 'help' && inTextField(e.target))) return true;
  (context[action] ?? defaults[action])?.();
  return true;
}

/** Starts listening; call once. */
export function installShortcuts(): void {
  window.addEventListener('keydown', handleShortcut, true);
}

/** A button's label with its key, for the tooltip: "Keyboard (F2)". */
export function withKey(label: string, key: ShortcutKey): string {
  return `${label} (${key})`;
}
