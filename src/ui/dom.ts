/** Tiny DOM helpers. */
import { imageUrl } from '../gfx/assets';

type Attrs = Record<string, string | number | boolean | ((e: any) => void) | undefined | null>;
export type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    // The app's own tooltip (`ui/tooltip`), never the native `title`.
    else if (k === 'tip') el.dataset.tip = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

/** Text with `**phrase**` marks: the marked phrases in bold, built as nodes, never as markup. */
export function richText(text: string): Child[] {
  return text.split('**').map((part, i) => (i % 2 ? h('strong', {}, part) : part)).filter((x) => x !== '');
}

/** Inline SVG icon (24x24, stroke based). */
export function icon(name: keyof typeof ICONS, cls = 'icon'): HTMLElement {
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

export const ICONS = {
  pause: '<rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19 6a8.5 8.5 0 010 12"/>',
  soundLow: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9.5a3.5 3.5 0 010 5"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  read: '<path d="M2.5 12c1.8-2.6 3.7-3.6 5.5-2.8 1.8-.8 3.7.2 5.5 2.8-1.8 2.8-3.7 4-5.5 4s-3.7-1.2-5.5-4z"/><path d="M2.5 12h11"/><path d="M17 9a4.2 4.2 0 010 6"/><path d="M19.8 6.3a8 8 0 010 11.4"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M19 4l2 2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  shirt: '<path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 01-8 0z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  dragon: '<path d="M4 18c2-6 6-9 12-9l4-3-1 5c0 5-4 8-9 8H4z"/><circle cx="15" cy="12" r=".8"/>',
  practice: '<path d="M12 20l8-8a3 3 0 00-4-4l-8 8-2 6z"/><path d="M14 8l2 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 113.6 2.2c-.7.4-1.1 1-1.1 1.8v.5M12 17v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  print: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  rescue: '<path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  paw: '<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="10" r="2"/>',
  wave: '<path d="M2 12c2.5-7 4.5-7 7 0s4.5 7 7 0 3.5-5 6-3"/>',
  replay: '<path d="M4 12a8 8 0 108-8H7"/><path d="M8 1L5 4l3 3"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
  fullscreen: '<path d="M4 9V4h5M4 4l5 5M15 4h5v5M20 4l-5 5M4 15v5h5M4 20l5-5M20 15v5h-5M20 20l-5-5"/>',
  smile: '<path d="M6.5 13.5a6.5 6.5 0 0011 0"/><path d="M8.5 8.5v1.5M15.5 8.5v1.5"/>',
  sortDown: '<path d="M6 9l6 6 6-6"/>',
  sortUp: '<path d="M6 15l6-6 6 6"/>',
  menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
  recheck: '<path d="M4 12a8 8 0 102.3-5.7"/><path d="M4 4v5h5"/>',
  update: '<path d="M19.5 10A8 8 0 005.6 7.2"/><path d="M5 3v4.5h4.5"/><path d="M4.5 14a8 8 0 0013.9 2.8"/><path d="M19 21v-4.5h-4.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  fullscreenExit: '<path d="M4 9h5V4M9 9L4 4M20 9h-5V4M15 9l5-5M4 15h5v5M9 15l-5 5M20 15h-5v5M15 15l5 5"/>',
};

/** The teacher's animal, not one of the players': a turtle with glasses and a mortar board. */
const TEACHER_ART = '<svg viewBox="0 0 76 64" aria-hidden="true">' +
  '<ellipse cx="34" cy="40" rx="26" ry="18" fill="#2f8a4c"/><path d="M18 34l8-10h16l8 10-8 10H26z" fill="#4fb57a"/>' +
  '<ellipse cx="34" cy="56" rx="22" ry="5" fill="#f2d39b"/><circle cx="62" cy="26" r="12" fill="#a8d88a"/>' +
  '<circle cx="58" cy="25" r="4.5" fill="#fff" stroke="#3b2a3f" stroke-width="2"/><circle cx="68" cy="25" r="4.5" fill="#fff" stroke="#3b2a3f" stroke-width="2"/>' +
  '<path d="M62.5 25h1" stroke="#3b2a3f" stroke-width="2"/><circle cx="58" cy="25.5" r="1.6" fill="#3b2a3f"/><circle cx="68" cy="25.5" r="1.6" fill="#3b2a3f"/>' +
  '<path d="M59 32q3 2.5 6 0" fill="none" stroke="#3b2a3f" stroke-width="1.8" stroke-linecap="round"/>' +
  '<rect x="52" y="10" width="20" height="4" rx="1" fill="#3b2a3f"/><path d="M62 10l-3-5h6z" fill="#3b2a3f"/></svg>';

/** A keyboard, drawn: the missing keyboard's fallback picture. */
const KEYBOARD_ART = '<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="2" y="6" width="116" height="52" rx="10" fill="#fff6e6" stroke="#3b2a3f" stroke-width="3"/><g fill="#3b2a3f">' +
  [14, 31, 48, 65, 82].map((x) => `<rect x="${x}" y="16" width="12" height="9" rx="2"/>`).join('') + '<rect x="99" y="16" width="8" height="9" rx="2"/>' +
  [20, 37, 54, 71, 88].map((x) => `<rect x="${x}" y="30" width="12" height="9" rx="2"/>`).join('') + '<rect x="32" y="44" width="56" height="8" rx="2"/></g></svg>';

/** A big button's picture when there is one, else the drawn one. */
function bigArt(name: string, drawn: string): HTMLElement {
  const src = imageUrl(name);
  return src ? h('span', { class: 'teacher-art' }, h('img', { src, alt: '' })) : h('span', { class: 'teacher-art', html: drawn });
}

/** The teacher's turtle. */
export const teacherArt = (): HTMLElement => bigArt('ui-mentor', TEACHER_ART);

/** The mouse with a broken keyboard: a phone without a keyboard. */
export const keyboardArt = (): HTMLElement => bigArt('ui-missing-keyboard', KEYBOARD_ART);

/** A big orange button of the start page: a picture, a title and one line under it. */
export function bigButton(art: HTMLElement, title: string, sub: string, onClick: () => void): HTMLButtonElement {
  return h('button', { class: 'teacher-big', type: 'button', onClick: () => onClick() },
    art,
    h('span', { class: 'teacher-big-text' },
      h('span', { class: 'teacher-big-title' }, title),
      h('span', {}, sub)));
}

/** A keyboard drawn for the card that asks for one. */
/** Escape goes back, like the screen's Back button; a dialog over the screen closes first. Returns the cleanup. */
export function onEscape(back: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    back();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

/** Arrow keys by direction, x and y. */
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * Arrow keys move the focus among the `selector` items inside `container`, to the nearest one
 * in that direction (rows and grids alike); `onMove` hears where it went.
 */
export function arrowFocus(container: HTMLElement, selector: string, onMove?: (el: HTMLElement) => void): void {
  container.addEventListener('keydown', (e) => {
    const dir = ARROWS[e.key];
    const from = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>(selector) : null;
    if (!dir || !from || e.altKey || e.ctrlKey || e.metaKey) return;
    const a = from.getBoundingClientRect();
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of container.querySelectorAll<HTMLElement>(selector)) {
      if (el === from || (el as HTMLButtonElement).disabled || !el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - (a.left + a.width / 2), dy = r.top + r.height / 2 - (a.top + a.height / 2);
      const along = dir[0] ? dx * dir[0] : dy * dir[1];
      if (along < 1) continue;
      // Straight on beats a diagonal step.
      const score = along + 2 * Math.abs(dir[0] ? dy : dx);
      if (score < bestScore) [best, bestScore] = [el, score];
    }
    if (!best) return;
    e.preventDefault();
    best.focus();
    onMove?.(best);
  });
}

export function button(label: string | Node, onClick: () => void, cls = 'btn', iconName?: keyof typeof ICONS): HTMLButtonElement {
  const b = h('button', { class: cls, type: 'button', onClick: () => onClick() });
  if (iconName) b.append(icon(iconName));
  if (label !== '') b.append(typeof label === 'string' ? h('span', {}, label) : label);
  return b;
}

/** The round close button of dialogs and cards. */
export function closeButton(onClick: () => void): HTMLButtonElement {
  return h('button', { class: 'modal-x', type: 'button', 'aria-label': 'close', onClick: () => onClick() }, icon('close'));
}

/** The close function of every open dialog, by its backdrop. */
const closers = new WeakMap<Element, () => void>();
/** A click on the backdrop this soon after opening is the rest of the click that opened it. */
const BACKDROP_GRACE_MS = 500;

/** Closes every open dialog as cancelled (a new screen), so no dialog's promise is left waiting. */
export function closeModals(): void {
  document.querySelectorAll('.modal-back').forEach((m) => (closers.get(m) ?? (() => m.remove()))());
}

/** Modal dialog; returns a close function. */
export function modal(content: HTMLElement, opts: { onClose?: () => void; cls?: string; closable?: boolean } = {}): () => void {
  const prev = document.activeElement as HTMLElement | null;
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: `modal ${opts.cls ?? ''}`, role: 'dialog', 'aria-modal': 'true' }, content);
  back.append(box);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.remove();
    document.removeEventListener('keydown', onKey, true);
    opts.onClose?.();
    prev?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && opts.closable !== false) {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };
  if (opts.closable !== false) {
    const opened = Date.now();
    box.prepend(closeButton(close));
    back.addEventListener('pointerdown', (e) => { if (e.target === back && Date.now() - opened > BACKDROP_GRACE_MS) close(); });
  }
  closers.set(back, close);
  document.addEventListener('keydown', onKey, true);
  document.body.append(back);
  queueMicrotask(() => (box.querySelector('[autofocus]') as HTMLElement | null ?? box.querySelector('button:not(.modal-x), input, select') as HTMLElement | null)?.focus());
  return close;
}

export interface ConfirmOpts {
  title: string;
  text: string;
  ok: string;
  cancel: string;
  /** The confirming action destroys something. */
  danger?: boolean;
  /** Picture above the title (Tapko). */
  art?: HTMLElement;
}

/** Yes/no question in the app's style; resolves true when confirmed. */
export function confirmDialog(o: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    let yes = false;
    const close = modal(h('div', { class: 'confirm' },
      o.art ?? null,
      h('h2', {}, o.title),
      h('p', {}, o.text),
      h('div', { class: 'row center' },
        button(o.cancel, () => close(), 'btn primary'),
        button(o.ok, () => { yes = true; close(); }, `btn ${o.danger ? 'danger' : ''}`))), { cls: 'confirm-modal', onClose: () => resolve(yes) });
  });
}

export function download(filename: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
