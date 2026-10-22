import { t } from '../i18n/i18n';
import { button, h } from './dom';
import { qr } from './link-box';

/**
 * A QR code over the whole screen, readable by a camera across a desk. `caption` says what
 * the code is (an exercise or all statistics), `kind` colours the frame so the two are told
 * apart at a glance. A click anywhere but the copy row, or Esc, closes it.
 */
export function bigCode(link: string, caption: string, name: string, kind: 'exercise' | 'overall'): void {
  const done = h('span', { 'aria-live': 'polite' });
  const copy = button(t('share.copyCode'), async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      return;
    }
    done.textContent = t('share.copied');
  }, 'btn primary', 'code');
  const view = h('div', { class: `big-code ${kind}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': caption },
    h('p', { class: 'big-code-caption' }, caption),
    qr(link),
    h('p', { class: 'big-code-name' }, name),
    h('div', { class: 'row', onClick: (e: Event) => e.stopPropagation() }, copy, done),
    h('p', { class: 'big-code-hint' }, t('progress.codeClose')));
  const close = () => {
    view.remove();
    window.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    close();
  };
  window.addEventListener('keydown', onKey, true);
  view.addEventListener('click', close);
  document.body.append(view);
}
