/** A key of a physical keyboard was seen in this session. */
const SEEN_KEY = 'tapkotyper:keyboard';

let seen = (() => {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
})();
const listeners = new Set<() => void>();
/** A task link that came while the gate was up; it opens once the gate lifts. */
let waiting: string | null = null;

/** A phone or tablet without a mouse or trackpad. */
function touchOnly(): boolean {
  return !matchMedia('(any-pointer: fine)').matches && 'ontouchstart' in window;
}

/** The game cannot be played here yet: a touch-only device and no physical key seen in this session. */
export function keyboardGated(): boolean {
  return !seen && touchOnly();
}

/** Calls `fn` once when a physical key lifts the gate; returns the unsubscribe. */
export function onKeyboard(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function waitForKeyboard(route: string): void {
  waiting = route;
}

/** The task link held back by the gate, once. */
export function takeWaiting(): string | null {
  const r = waiting;
  waiting = null;
  return r;
}

// The gate has no text field, so an on-screen keyboard cannot fire this: a key here is a real one.
window.addEventListener('keydown', (e) => {
  if (seen) return;
  const el = e.target as HTMLElement | null;
  if (el?.closest?.('input, textarea, select, [contenteditable]')) return;
  seen = true;
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode: kept for this visit */ }
  const fns = [...listeners];
  listeners.clear();
  fns.forEach((f) => f());
}, { capture: true });
