import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import type { Companion } from '../storage/schema';
import { button, h, modal } from './dom';

/** Install state of this browser: when the game was first opened and whether the offer was shown. */
const KEY = 'tapkotyper:install';
/** The offer is made only in the first days of use. */
const OFFER_DAYS = 3;
const DAY_MS = 86_400_000;

interface BeforeInstallPrompt extends Event {
  prompt(): Promise<void>;
}

let deferred: BeforeInstallPrompt | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPrompt;
});
window.addEventListener('appinstalled', () => { deferred = null; });

function load(): { firstSeen: number; offered: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (typeof raw?.firstSeen === 'number') return { firstSeen: raw.firstSeen, offered: !!raw.offered };
  } catch { /* blocked storage: no offer */ }
  return { firstSeen: Date.now(), offered: false };
}

function save(state: { firstSeen: number; offered: boolean }): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* blocked storage: no offer next time */ }
}

/** Remembers the first visit; call once when the game starts. */
export function noteVisit(): void {
  try { if (localStorage.getItem(KEY) === null) save({ firstSeen: Date.now(), offered: false }); } catch { /* blocked storage */ }
}

/**
 * Offers the installation as a desktop web app once, in the first days of use and only when
 * the browser can install it (and the game does not already run as one).
 */
export function offerInstall(companion: Companion): void {
  const state = load();
  const standalone = matchMedia('(display-mode: standalone)').matches;
  if (!deferred || standalone || state.offered || Date.now() - state.firstSeen > OFFER_DAYS * DAY_MS) return;
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
