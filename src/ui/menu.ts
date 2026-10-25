import { t } from '../i18n/i18n';
import { h } from './dom';
import { paintRound, roundButton } from './hud';
import { tip } from './tooltip';

/** One entry of a menu panel: a round picture and its label. */
export interface MenuEntry {
  label: string;
  art: HTMLElement;
  pick(): void;
  disabled?: boolean;
}

/**
 * Opens a menu panel of `entries` for the button `btn`; `place` puts it into the page. The arrows
 * move, Escape, a click outside the panel and its button or leaving the screen closes it; picking
 * an entry closes it first. `onClose` runs once, with whether focus goes back. Returns the close.
 */
export function menuPanel(btn: HTMLButtonElement, label: string, entries: MenuEntry[], place: (panel: HTMLElement) => void, onClose: (refocus: boolean) => void): (refocus?: boolean) => void {
  const panel = h('div', { class: 'corner-menu-panel', role: 'menu', 'aria-label': label },
    ...entries.map((e) => {
      const item = h('button', { class: 'menu-item', type: 'button', role: 'menuitem', onClick: () => { close(); e.pick(); } }, e.art, h('span', {}, e.label));
      item.disabled = !!e.disabled;
      return item;
    }));
  place(panel);
  const items = () => [...panel.querySelectorAll<HTMLButtonElement>('.menu-item:not(:disabled)')];
  const onKey = (e: KeyboardEvent) => {
    if (!panel.isConnected) return close(false);
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
    if (!panel.isConnected || !(panel.contains(e.target as Node) || btn.contains(e.target as Node))) close(false);
  };
  let closed = false;
  function close(refocus = true): void {
    if (closed) return;
    closed = true;
    panel.remove();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
    btn.setAttribute('aria-expanded', 'false');
    onClose(refocus);
  }
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  btn.setAttribute('aria-expanded', 'true');
  items()[0]?.focus();
  return close;
}

/**
 * Below 600 px the corner's round buttons fold into one Menu button. Its panel lists each
 * button of `row` as the same round picture with its label; picking one closes the panel
 * and clicks the real (hidden) button, so every button keeps its one behaviour.
 */
export function cornerMenu(row: HTMLElement): HTMLElement {
  let close: ((refocus?: boolean) => void) | null = null;
  const wrap = h('div', { class: 'corner-menu' });
  const btn = roundButton('control', 'menu', t('common.menu'), () => (close ? close() : open()));
  btn.classList.add('menu-btn');
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');

  function open(): void {
    const sources = [...row.querySelectorAll<HTMLButtonElement>('button.round-btn')].filter((b) => !b.hidden);
    const entries = sources.map((b) => ({
      label: b.getAttribute('aria-label') ?? '',
      art: h('span', { class: `round-btn${['super', 'update'].filter((k) => b.classList.contains(k)).map((k) => ` ${k}`).join('')}`, 'aria-hidden': 'true', html: b.innerHTML }),
      pick: () => b.click(),
      disabled: b.disabled,
    }));
    close = menuPanel(btn, t('common.menu'), entries, (panel) => wrap.append(panel), (refocus) => {
      close = null;
      btn.setAttribute('aria-label', t('common.menu'));
      tip(btn, t('common.menu'));
      paintRound(btn, 'menu');
      if (refocus && btn.isConnected) btn.focus();
    });
    btn.setAttribute('aria-label', t('common.menuClose'));
    tip(btn, t('common.menuClose'));
    paintRound(btn, 'close');
  }
  wrap.append(btn);
  return wrap;
}
