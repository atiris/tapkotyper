/**
 * Panels driven by the keyboard: every button of a panel gets its own letter, underlined in its
 * label, and pressing that letter presses the button; the leftmost button is the default.
 */

const LETTER = /\p{L}/u;

/**
 * Each label's letter, left to right: its first letter (lower case) no earlier label has taken;
 * letters with diacritics are their own letters. A label with no free letter gets none.
 */
export function assignHotkeys(labels: string[]): (string | null)[] {
  const taken = new Set<string>();
  return labels.map((label) => {
    for (const ch of label) {
      const k = ch.toLocaleLowerCase();
      if (!LETTER.test(ch) || taken.has(k)) continue;
      taken.add(k);
      return k;
    }
    return null;
  });
}

/** The buttons of every panel with letters, by their letter. */
const panels = new WeakMap<HTMLElement, Map<string, HTMLButtonElement>>();

/** The label's own text nodes: not those of an icon. */
function labelTexts(b: HTMLElement): Text[] {
  const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('[aria-hidden="true"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const out: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

/** Takes away the underline and the letter given earlier, so a button is marked once. */
function unmark(b: HTMLButtonElement): void {
  for (const u of b.querySelectorAll('u.hk')) u.replaceWith(...u.childNodes);
  b.normalize();
  b.removeAttribute('aria-keyshortcuts');
  b.classList.remove('kbd-default');
}

/** Underlines the first character of the label that is `key` in lower case. */
function underline(b: HTMLButtonElement, key: string): void {
  for (const text of labelTexts(b)) {
    const at = [...text.data].findIndex((ch) => ch.toLocaleLowerCase() === key);
    if (at < 0) continue;
    const start = [...text.data].slice(0, at).join('').length;
    const letter = text.splitText(start);
    letter.splitText(letter.data.codePointAt(0)! > 0xffff ? 2 : 1);
    const u = document.createElement('u');
    u.className = 'hk';
    letter.replaceWith(u);
    u.append(letter);
    return;
  }
}

/**
 * Gives the panel's buttons (left to right, the round X not among them) their letters: underlined,
 * in `aria-keyshortcuts`, and pressed by the key while the panel is the topmost one on screen. The
 * first button is the default (`kbd-default`). Called again for the same panel, the new buttons
 * take the letters (a panel whose buttons were rebuilt).
 */
export function panelHotkeys(panel: HTMLElement, buttons: HTMLButtonElement[]): void {
  const own = buttons.filter((b) => !b.classList.contains('modal-x'));
  for (const b of own) unmark(b);
  const keys = assignHotkeys(own.map((b) => labelTexts(b).map((n) => n.data).join('')));
  const map = new Map<string, HTMLButtonElement>();
  own.forEach((b, i) => {
    const k = keys[i];
    if (!k) return;
    underline(b, k);
    b.setAttribute('aria-keyshortcuts', k);
    map.set(k, b);
  });
  own[0]?.classList.add('kbd-default');
  panels.set(panel, map);
  panel.dataset.hotkeys = '';
}

/** Moves the focus to the panel's default button, its ring showing also after a mouse click. */
export function focusDefault(panel: HTMLElement): boolean {
  const b = panel.querySelector<HTMLButtonElement>('.kbd-default');
  if (!b || b.disabled) return false;
  b.focus({ focusVisible: true } as FocusOptions);
  return true;
}

/** The panel is on top where its buttons are: nothing over it, not hidden (an end card peeked under). */
function onTop(panel: HTMLElement, buttons: Iterable<HTMLButtonElement>): boolean {
  for (const b of buttons) {
    if (!b.isConnected) continue;
    const r = b.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (!r.width || x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
    const el = document.elementFromPoint(x, y);
    return !!el && panel.contains(el);
  }
  return false;
}

/** Keys typed into a field are the field's. */
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.matches('input, textarea, select') || el.isContentEditable);

/** The topmost panel with letters takes its letter; panels inside others come later in the page, so they are asked first. */
function onKey(e: KeyboardEvent): void {
  if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || [...e.key].length !== 1 || typing(e.target)) return;
  const key = e.key.toLocaleLowerCase();
  const all = [...document.querySelectorAll<HTMLElement>('[data-hotkeys]')].reverse();
  for (const panel of all) {
    const map = panels.get(panel);
    if (!map || !onTop(panel, map.values())) continue;
    const b = map.get(key);
    if (!b || !b.isConnected || b.disabled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    b.click();
    return;
  }
}

// Before every other key listener, so a letter a panel takes reaches nothing under it.
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey, true);
