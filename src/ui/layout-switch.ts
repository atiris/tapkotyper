import { LAYOUT_IDS } from '../keyboard/layouts';
import { t } from '../i18n/i18n';
import type { LayoutId } from '../storage/schema';
import { h, icon } from './dom';

/**
 * The quiet switch of the keyboard layout in the on-screen keyboard's bottom right corner: a short
 * name ("SK QWERTZ") that looks like a key only under the pointer or with focus, and a small menu of
 * the layouts above it, scrolling when there are many. While the menu is open it takes every key
 * (arrows, Home, End and a first letter move, Enter picks, Esc and Tab close), so nothing reaches
 * the level or a card under it. `flag` marks it when the keys typed do not fit the layout, until
 * it is opened.
 */
export class LayoutSwitch {
  readonly el: HTMLButtonElement;
  private menu: HTMLElement | null = null;
  private offKeys: (() => void) | null = null;

  constructor(private current: LayoutId, private onPick: (id: LayoutId) => void) {
    this.el = h('button', {
      class: 'kb-layout', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': t('layoutSwitch.label', { layout: t(`layouts.${current}`) }), 'data-tip': t('layoutSwitch.tip'),
      onClick: () => (this.menu ? this.close() : this.open()),
    }, icon('keyboard'), h('span', {}, t(`layoutsShort.${current}`)));
  }

  /** The keys typed look like another layout: the switch stands out until it is opened. */
  flag(): void {
    this.el.classList.add('flagged');
  }

  private open(): void {
    this.el.classList.remove('flagged');
    this.el.setAttribute('aria-expanded', 'true');
    const items = LAYOUT_IDS.map((id) => h('button', {
      class: `kb-layout-item ${id === this.current ? 'on' : ''}`, type: 'button', role: 'menuitemradio',
      'aria-checked': String(id === this.current), onClick: () => this.pick(id),
    }, icon('check'), h('span', {}, t(`layouts.${id}`))));
    const menu = this.menu = h('div', { class: 'kb-layout-menu', role: 'menu', 'aria-label': t('layoutSwitch.tip') }, ...items);
    this.el.before(menu);
    const focus = (i: number) => {
      items[i].focus();
      items[i].scrollIntoView({ block: 'nearest' });
    };
    focus(LAYOUT_IDS.indexOf(this.current));
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        focus((at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        focus(e.key === 'Home' ? 0 : items.length - 1);
      } else if ([...e.key].length === 1 && e.key !== ' ') {
        // A first letter goes to the next layout whose name starts with it.
        e.preventDefault();
        const ch = e.key.toLocaleLowerCase();
        const next = [...items.keys()].map((k) => (at + 1 + k) % items.length).find((k) => items[k].textContent!.toLocaleLowerCase().startsWith(ch));
        if (next != null) focus(next);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat && at >= 0) this.pick(LAYOUT_IDS[at]);
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        this.close();
      } else e.preventDefault();
    };
    const onPointer = (e: PointerEvent) => {
      if (!menu.contains(e.target as Node) && !this.el.contains(e.target as Node)) this.close();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    this.offKeys = () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }

  private close(): void {
    this.offKeys?.();
    this.offKeys = null;
    this.menu?.remove();
    this.menu = null;
    this.el.setAttribute('aria-expanded', 'false');
    // Focus left on the switch would take the space bar typed next.
    this.el.blur();
  }

  private pick(id: LayoutId): void {
    this.close();
    if (id !== this.current) this.onPick(id);
  }

  dispose(): void {
    this.close();
  }
}
