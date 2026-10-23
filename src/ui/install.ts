import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import type { Companion } from '../storage/schema';
import { button, h, modal } from './dom';
import { type InstallState, OFFER_DAYS, localDay, readInstall, withVisit } from './install-days';

/** Install state of this browser: the days the game was opened on and whether the offer was shown. */
const KEY = 'tapkotyper:install';

interface BeforeInstallPrompt extends Event {
  prompt(): Promise<void>;
}

let deferred: BeforeInstallPrompt | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPrompt;
});
window.addEventListener('appinstalled', () => { deferred = null; });

function load(): InstallState {
  try { return readInstall(localStorage.getItem(KEY)); } catch { return { days: [], offered: true }; /* blocked storage: no offer */ }
}

function save(state: InstallState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* blocked storage: no offer next time */ }
}

/** Counts today as a day of use; call once when the game starts. */
export function noteVisit(): void {
  save(withVisit(load(), localDay(new Date())));
}

/**
 * Offers the installation as a desktop web app once, after the game was opened on three
 * different days, and only when the browser can install it (and the game does not already run as one).
 */
export function offerInstall(companion: Companion): void {
  const state = load();
  const standalone = matchMedia('(display-mode: standalone)').matches;
  if (!deferred || standalone || state.offered || state.days.length < OFFER_DAYS) return;
  save({ ...state, offered: true });
  const event = deferred;
  let close = () => {};
  const install = button(t('install.button'), () => {
    close();
    void event.prompt();
  }, 'btn primary', 'download');
  close = modal(h('div', { class: 'install-offer' },
    tapkoElement(companion, 'happy', 100),
    h('h2', {}, t('install.title')),
    h('p', {}, t('install.text')),
    h('div', { class: 'row' }, install, button(t('install.later'), () => close(), 'btn ghost'))), { cls: 'share-modal' });
}
