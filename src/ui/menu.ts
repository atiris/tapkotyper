import { t } from '../i18n/i18n';
import { h } from './dom';
import { paintRound, roundButton } from './hud';
import { tip } from './tooltip';

/**
 * Below 600 px the corner's round buttons fold into one Menu button. Its panel lists each
 * button of `row` as the same round picture with its label; picking one closes the panel
 * and clicks the real (hidden) button, so every button keeps its one behaviour.
 */
export function cornerMenu(row: HTMLElement): HTMLElement {
  let panel: HTMLElement | null = null;
  const wrap = h('div', { class: 'corner-menu' });
  const btn = roundButton('control', 'menu', t('common.menu'), () => (panel ? close() : open()));
  btn.classList.add('menu-btn');
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');

  const items = () => panel ? [...panel.querySelectorAll<HTMLButtonElement>('.menu-item:not(:disabled)')] : [];
  const onKey = (e: KeyboardEvent) => {
    if (!wrap.isConnected) return close(false);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length]?.focus();
    }
  };
  const onPointer = (e: PointerEvent) => {
    if (!wrap.isConnected || !wrap.contains(e.target as Node)) close(false);
  };
  function close(refocus = true): void {
    if (!panel) return;
    panel.remove();
    panel = null;
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', t('common.menu'));
    tip(btn, t('common.menu'));
    paintRound(btn, 'menu');
    if (refocus && btn.isConnected) btn.focus();
  }
  function open(): void {
    const sources = [...row.querySelectorAll<HTMLButtonElement>('button.round-btn')].filter((b) => !b.hidden);
    panel = h('div', { class: 'corner-menu-panel', role: 'menu', 'aria-label': t('common.menu') },
      ...sources.map((b) => {
        const label = b.getAttribute('aria-label') ?? '';
        const item = h('button', { class: 'menu-item', type: 'button', role: 'menuitem', onClick: () => { close(); b.click(); } },
          h('span', { class: `round-btn${b.classList.contains('super') ? ' super' : ''}`, 'aria-hidden': 'true', html: b.innerHTML }),
          h('span', {}, label));
        item.disabled = b.disabled;
        return item;
      }));
    wrap.append(panel);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', t('common.menuClose'));
    tip(btn, t('common.menuClose'));
    paintRound(btn, 'close');
    items()[0]?.focus();
  }
  wrap.append(btn);
  return wrap;
}
