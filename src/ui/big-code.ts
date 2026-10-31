import { t } from '../i18n/i18n';
import { button, h } from './dom';
import { qr } from './link-box';

/**
 * A QR code over the whole screen, readable by a camera across a desk: the child's name (none for
 * a task) and what the code is (`caption`: an exercise, all statistics or a task's title) first,
 * then the code, then copying and closing. `kind` colours the frame so they are told apart at a
 * glance. A click anywhere but the copy button, the close button or Esc closes it.
 */
export function bigCode(link: string, name: string, caption: string, kind: 'exercise' | 'overall' | 'task'): void {
  let copiedTimer = 0;
  const copyLabel = h('span', {}, t('share.copyCode'));
  const copy = button(copyLabel, async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      return;
    }
    copyLabel.textContent = t('share.copied');
    clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => (copyLabel.textContent = t('share.copyCode')), 2000);
  }, 'btn big-code-copy', 'copy');
  copy.addEventListener('click', (e) => e.stopPropagation());
  const code = qr(link);
  const head = h('p', { class: 'big-code-caption' }, ...(name ? [name, h('span', { class: 'big-code-dot', 'aria-hidden': 'true' }, '·')] : []), caption);
  const actions = h('div', { class: 'big-code-actions' }, copy, button(t('share.closeByClick'), () => undefined, 'btn big-code-close', 'close'));
  const view = h('div', { class: `big-code ${kind}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': name ? `${name} · ${caption}` : caption }, head, code, actions);
  // The code takes all the room the caption and the buttons leave, as a square.
  const fit = () => {
    const s = getComputedStyle(view);
    const gap = parseFloat(s.rowGap) || 0;
    const room = view.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom) - 2 * gap - head.offsetHeight - actions.offsetHeight;
    const width = view.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    code.style.width = `${Math.max(120, Math.floor(Math.min(room, width)))}px`;
  };
  const close = () => {
    clearTimeout(copiedTimer);
    view.remove();
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', fit);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    close();
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', fit);
  view.addEventListener('click', close);
  document.body.append(view);
  fit();
  copy.focus();
}
