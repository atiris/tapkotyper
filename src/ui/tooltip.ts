/**
 * The app's one tooltip: it replaces every native `title`. An element asks for it with a
 * `data-tip` text; hover or keyboard focus shows it after a short wait, and right after one
 * was seen the next one shows at once.
 */

/** Hover (or focus) this long before the first tooltip shows. */
export const SHOW_DELAY = 450;
/** After a tooltip hides, the next one shows without the wait for this long. */
export const WARM_MS = 800;
/** Leaving waits this long, so moving between neighbours does not flicker. */
export const HIDE_DELAY = 80;
/** A touch held this long shows the tooltip; a plain tap never does. */
export const LONG_PRESS = 500;
/** Gap between the element and the tooltip, and the least distance from the window's edge. */
const GAP = 8;

type Timer = ReturnType<typeof setTimeout>;

/** The timing of showing and hiding, apart from the page: `show` and `hide` do the drawing. */
export function tipMachine<T>(show: (target: T) => void, hide: () => void) {
  let shown: T | null = null;
  let pending: T | null = null;
  let showTimer: Timer | undefined;
  let hideTimer: Timer | undefined;
  let warmUntil = 0;
  const open = (target: T) => {
    clearTimeout(showTimer);
    pending = null;
    shown = target;
    show(target);
  };
  const close = () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    pending = null;
    if (shown === null) return;
    shown = null;
    warmUntil = Date.now() + WARM_MS;
    hide();
  };
  return {
    get shown() { return shown; },
    /** The pointer or the focus came to `target`. */
    enter(target: T): void {
      clearTimeout(hideTimer);
      if (target === shown || target === pending) return;
      clearTimeout(showTimer);
      if (shown !== null || Date.now() < warmUntil) return open(target);
      pending = target;
      showTimer = setTimeout(() => open(target), SHOW_DELAY);
    },
    /** The pointer or the focus left `target`. */
    leave(target: T): void {
      if (target === pending) {
        clearTimeout(showTimer);
        pending = null;
      }
      if (target === shown) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(close, HIDE_DELAY);
      }
    },
    /** Shows at once (a long press). */
    open,
    /** Hides at once (scroll, a click, Esc, a new screen). */
    close,
  };
}

let machine: ReturnType<typeof tipMachine<HTMLElement | SVGElement>> | null = null;
let box: HTMLElement | null = null;

/** Places the tooltip over `el` (or under it without room above), inside the window. */
function place(el: Element): void {
  const r = el.getBoundingClientRect();
  const w = box!.offsetWidth, hh = box!.offsetHeight;
  const below = r.top - GAP - hh < GAP;
  const left = Math.max(GAP, Math.min(innerWidth - w - GAP, r.left + r.width / 2 - w / 2));
  box!.classList.toggle('below', below);
  box!.style.left = `${left}px`;
  box!.style.top = `${below ? r.bottom + GAP : r.top - GAP - hh}px`;
  box!.style.setProperty('--arrow', `${Math.max(14, Math.min(w - 14, r.left + r.width / 2 - left))}px`);
}

function show(el: HTMLElement | SVGElement): void {
  const text = el.dataset.tip;
  if (!el.isConnected || !text) return void queueMicrotask(() => machine?.close());
  box!.textContent = text;
  place(el);
  el.setAttribute('aria-describedby', box!.id);
  box!.classList.add('show');
}

function hide(): void {
  box!.classList.remove('show');
  document.querySelectorAll(`[aria-describedby="${box!.id}"]`).forEach((x) => x.removeAttribute('aria-describedby'));
}

const tipOf = (e: Event) => (e.target instanceof Element ? e.target.closest<HTMLElement | SVGElement>('[data-tip]') : null);

/** Sets an element's tooltip text; a tooltip showing for it changes along. */
export function tip(el: Element, text: string): void {
  (el as HTMLElement).dataset.tip = text;
  if (machine?.shown === el && box) {
    box.textContent = text;
    place(el);
  }
}

/** Hides the tooltip at once (a new screen). */
export function hideTip(): void {
  machine?.close();
}

/** Starts the one tooltip of the app; call once. */
export function installTooltips(): void {
  box = Object.assign(document.createElement('div'), { id: 'app-tip', className: 'tip' });
  box.setAttribute('role', 'tooltip');
  document.body.append(box);
  const m = (machine = tipMachine(show, hide));
  let press: Timer | undefined;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const el = tipOf(e);
    if (el) m.enter(el);
    else if (m.shown && !m.shown.isConnected) m.close();
  });
  document.addEventListener('pointerout', (e) => {
    const el = tipOf(e);
    // Moving inside the same element (onto its picture) is no leaving.
    if (el && !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) m.leave(el);
  });
  document.addEventListener('focusin', (e) => {
    const el = tipOf(e);
    if (el && el === e.target && el.matches(':focus-visible')) m.enter(el);
  });
  document.addEventListener('focusout', (e) => {
    const el = tipOf(e);
    if (el) m.leave(el);
  });
  document.addEventListener('pointerdown', (e) => {
    m.close();
    clearTimeout(press);
    const el = e.pointerType === 'touch' ? tipOf(e) : null;
    if (el) press = setTimeout(() => m.open(el), LONG_PRESS);
  }, true);
  const cancelPress = () => clearTimeout(press);
  document.addEventListener('pointerup', cancelPress, true);
  document.addEventListener('pointercancel', cancelPress, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') m.close(); }, true);
  window.addEventListener('scroll', () => m.close(), { capture: true, passive: true });
}
