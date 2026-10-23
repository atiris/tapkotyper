import { h } from './dom';

/** How long a short note stays. */
const TOAST_MS = 1600;

let box: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/** A short note at the bottom of the window (what a shortcut key changed); a new one replaces it. */
export function toast(text: string): void {
  if (!box?.isConnected) {
    box = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  box.textContent = text;
  box.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => box?.classList.remove('show'), TOAST_MS);
}
