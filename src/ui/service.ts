import { app, go, saveProfile, shownScreen } from '../app/app';
import { openLevelFor, service } from '../app/super';
import { LEVELS } from '../game/levels';
import { t } from '../i18n/i18n';
import { type Profile, SUPER_ID } from '../storage/schema';
import { type ICONS, button, h, modal } from './dom';
import { levelTitleWords, roundPic, roundButton } from './hud';
import { type MenuEntry, menuPanel } from './menu';
import { toast } from './toast';

/** Super mode is on: a round star in the top row that opens the service menu. Nothing otherwise. */
export function superStar(): HTMLButtonElement | null {
  if (!app.superMode) return null;
  let close: ((refocus?: boolean) => void) | null = null;
  const b: HTMLButtonElement = roundButton('super', 'star', t('super.badge'), () => (close ? close() : (close = openServiceMenu(b, () => (close = null)))));
  b.setAttribute('aria-haspopup', 'menu');
  b.setAttribute('aria-expanded', 'false');
  return b;
}

/** Ends super mode: the switch goes off and the super player is gone. */
function endSuperMode(): void {
  app.superMode = false;
  app.superPlayer = null;
  go('start');
}

/**
 * The service menu under the star: the end of super mode and the removal of the settings password
 * everywhere, the simulated passes in a running level, opening a level on a stored player's map.
 */
function openServiceMenu(star: HTMLButtonElement, onClosed: () => void): (refocus?: boolean) => void {
  const entry = (glyph: keyof typeof ICONS, label: string, pick: () => void): MenuEntry => ({ label, art: roundPic('super', glyph), pick });
  const entries = [entry('close', t('service.end'), endSuperMode)];
  if (app.store.data.parentLock) {
    entries.push(entry('lock', t('service.removeLock'), () => {
      delete app.store.data.parentLock;
      app.store.save();
      toast(t('service.lockRemoved'));
    }));
  }
  const level = service.level;
  if (level?.canSimulate()) {
    entries.push(entry('play', t('service.pass0'), () => level.simulate(0)),
      entry('next', t('service.pass1'), () => level.simulate(1)),
      entry('next', t('service.pass2'), () => level.simulate(2)));
  }
  const p = app.profile;
  if (p && p.id !== SUPER_ID && shownScreen() === 'map') entries.push(entry('map', t('service.openLevel'), () => openLevelDialog(p)));
  return menuPanel(star, t('super.badge'), entries, (panel) => {
    // The star may sit folded in the corner's Menu: the panel hangs under what is in sight.
    const anchor = star.offsetParent ? star : star.closest('.top-right')?.querySelector<HTMLElement>('.menu-btn') ?? star;
    const r = anchor.getBoundingClientRect();
    panel.classList.add('service-menu');
    panel.style.top = `${r.bottom + 10}px`;
    panel.style.right = `${Math.max(8, innerWidth - r.right)}px`;
    document.querySelector('#app')!.append(panel);
  }, (refocus) => {
    onClosed();
    if (refocus && star.isConnected) star.focus();
  });
}

/** The levels of a stored player not passed yet; the one picked opens with everything before it. */
function openLevelDialog(p: Profile): void {
  const open = (id: string) => {
    close();
    openLevelFor(p, id);
    saveProfile();
    go('map', {}, false);
  };
  const list = h('div', { class: 'service-levels' },
    ...LEVELS.filter((l) => !p.progress.levels[l.id]).map((l) => button(levelTitleWords(l.world, l.index), () => open(l.id), 'btn small')));
  const close = modal(h('div', { class: 'service-dialog' }, h('h2', {}, t('service.openLevel')), list,
    h('div', { class: 'row center' }, button(t('common.back'), () => close(), 'btn'))));
  list.querySelector<HTMLElement>('button')?.focus();
}

/** The "!" by a serviced account's name: something in it was simulated or opened by the service menu. */
export function serviceMark(p: { serviced?: boolean }): HTMLElement | null {
  return p.serviced ? markEl(t('service.accountMark')) : null;
}

/** The red "!" with its tooltip. */
export function markEl(text: string): HTMLElement {
  return h('span', { class: 'service-mark', tip: text, 'aria-label': text, role: 'img' }, '!');
}
