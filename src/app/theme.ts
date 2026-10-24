import type { Theme } from '../storage/schema';
import type { Store } from '../storage/store';

export type Look = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';
/** The browser bar's color of each look: the top of its page sky. */
const BAR_COLOR: Record<Look, string> = { light: '#7cc79a', dark: '#171631' };

const listeners = new Set<(look: Look) => void>();
/** The device's store, where the chosen theme lives. */
let store: Store;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;

/** The look a stored theme shows: `system` follows the browser. */
export function resolveTheme(theme: Theme, prefersDark: boolean): Look {
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

/** The look shown now (index.html sets it before the first paint). */
export function shownLook(): Look {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function systemDark(): boolean {
  return matchMedia(DARK_QUERY).matches;
}

function show(look: Look): void {
  if (look === shownLook()) return;
  document.documentElement.dataset.theme = look;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[look]);
  for (const fn of listeners) fn(look);
}

/** Shows the stored theme and follows the system's scheme while the device has none of its own. */
export function installTheme(s: Store): void {
  store = s;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[shownLook()]);
  show(resolveTheme(store.data.theme, systemDark()));
  matchMedia(DARK_QUERY).addEventListener('change', (e) => {
    if (store.data.theme === 'system') show(e.matches ? 'dark' : 'light');
  });
}

/** The theme button: stores the opposite of what is shown, so the device stops following the system. */
export function toggleTheme(): void {
  const look: Look = shownLook() === 'dark' ? 'light' : 'dark';
  store.data.theme = look;
  store.save();
  // The page's colors fade into the new look, unless motion is reduced.
  const root = document.documentElement;
  if (!document.body.classList.contains('reduce-motion')) {
    root.classList.add('theme-fade');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => root.classList.remove('theme-fade'), 900);
  }
  show(look);
}

/** Calls `fn` with the new look on every change; returns the unsubscribe. */
export function onThemeChange(fn: (look: Look) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
