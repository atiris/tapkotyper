/** Words this long or shorter count only as a whole word ("hi" not inside "chi"). */
const SHORT = 3;

/** Lower case without diacritics, so "Dračie", "dračie" and "dracie" are one word. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Calls `found` when the child types one of `words` (folded; a short one like "hi" only as a
 * whole word, no letter right before it) anywhere on the page, outside dialogs and text fields; a space inside a phrase
 * ("dobrý deň") does not press the focused button. Returns the cleanup that stops listening.
 */
export function onTypedWord(words: string[], found: () => void): () => void {
  const want = words.map(fold);
  let typed = '';
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || [...e.key].length !== 1) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select') || document.querySelector('.modal-back, .big-code, .badge-show')) return;
    if (e.key === ' ' && want.some((w) => [...w.matchAll(/ /g)].some((m) => typed.endsWith(w.slice(0, m.index))))) e.preventDefault();
    typed = (typed + fold(e.key)).slice(-24);
    if (!want.some((w) => typed.endsWith(w) && (w.length > SHORT || !/\p{L}/u.test(typed.at(-w.length - 1) ?? '')))) return;
    typed = '';
    found();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
