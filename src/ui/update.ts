import { t } from '../i18n/i18n';
import { roundButton } from './hud';
import { tip } from './tooltip';

/** How often an open tab asks the server for a newer version. */
const CHECK_MS = 30 * 60 * 1000;

let waiting: ServiceWorker | null = null;
/** The new version is being installed: the page reloads without the leave question. */
export let installing = false;

function found(worker: ServiceWorker): void {
  waiting = worker;
  document.querySelectorAll<HTMLButtonElement>('.update-btn').forEach((b) => (b.hidden = false));
}

/** Registers the service worker and notices a newer version waiting behind the running one. */
export function watchUpdates(url: string): void {
  void navigator.serviceWorker.register(url).then((reg) => {
    // A first install has no controller yet: nothing to update.
    if (reg.waiting && navigator.serviceWorker.controller) found(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      next?.addEventListener('statechange', () => {
        if (next.state === 'installed' && navigator.serviceWorker.controller) found(next);
      });
    });
    setInterval(() => void reg.update().catch(() => undefined), CHECK_MS);
  }).catch(() => undefined);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (installing) location.reload();
  });
}

/** The red round button at the far right, shown once a new version is ready; a click installs it. */
export function updateButton(): HTMLButtonElement {
  const b = roundButton('update', 'update', t('common.update'), () => {
    if (!waiting) return;
    installing = true;
    waiting.postMessage('skipWaiting');
  });
  b.classList.add('update-btn');
  tip(b, t('common.updateTip'));
  b.hidden = !waiting;
  return b;
}
