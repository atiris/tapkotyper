/** A key of a physical keyboard was seen in this session. */
const SEEN_KEY = 'tapkotyper:keyboard';

let seen = (() => {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
})();
const listeners = new Set<() => void>();
/** A task link that came while the gate was up; it opens once the gate lifts. */
let waiting: string | null = null;

/** The player said this device is a phone, where the detection took it for a computer. */
const PHONE_KEY = 'tapkotyper:phone';

let forced = (() => {
  try { return localStorage.getItem(PHONE_KEY) === '1'; } catch { return false; }
})();

/**
 * A phone or tablet. The pointer alone misleads: some Android phones report a fine pointer that can
 * hover, so the browser's own word on a mobile device and the system's name count first; an iPad
 * calls itself a Mac but has touch points.
 */
function touchOnly(): boolean {
  if (navigator.maxTouchPoints < 1 && !('ontouchstart' in window)) return false;
  const ua = navigator.userAgent;
  const mobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Mobi/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return mobile || matchMedia('(pointer: coarse)').matches || !matchMedia('(any-pointer: fine)').matches;
}

/** The game cannot be played here yet: a phone or tablet and no physical key seen in this session. */
export function keyboardGated(): boolean {
  return !seen && (forced || touchOnly());
}

/** The player switched this device to a phone by hand. */
export function phoneForced(): boolean {
  return forced;
}

/** Switches this device to a phone (the gate waits for a real key again) or back to what the detection says. */
export function forcePhone(on: boolean): void {
  forced = on;
  try {
    if (on) localStorage.setItem(PHONE_KEY, '1');
    else localStorage.removeItem(PHONE_KEY);
  } catch { /* private mode: kept for this visit */ }
  if (!on) return;
  seen = false;
  try { sessionStorage.removeItem(SEEN_KEY); } catch { /* private mode */ }
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
