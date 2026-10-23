import { app } from '../app/app';
import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { type ParentLock, SUPER_ID } from '../storage/schema';
import { checkLock } from '../storage/lock';
import { button, confirmDialog, h, modal } from '../ui/dom';

/**
 * Settings are for parents: one calm question, or the parent's password when one is set.
 * The super player is never asked.
 */
export function parentAccess(): Promise<boolean> {
  const p = app.profile;
  if (p?.id === SUPER_ID) return Promise.resolve(true);
  const lock = app.store.data.parentLock;
  if (lock) return passwordDialog(lock);
  return confirmDialog({
    title: t('parent.checkTitle'),
    text: t('parent.checkText'),
    ok: t('parent.checkOk'),
    cancel: t('common.back'),
    art: p ? tapkoElement(p.companion, 'thinking', 110) : undefined,
  });
}

const LOCK_TRIES = 5;
const LOCK_WAIT_MS = 30_000;
/** Wrong passwords in a row and the end of the wait after too many; kept while the app runs. */
const lockTries = { wrong: 0, until: 0 };

function passwordDialog(lock: ParentLock): Promise<boolean> {
  return new Promise((resolve) => {
    let yes = false;
    let timer = 0;
    const input = h('input', { type: 'password', class: 'lock-input', autocomplete: 'current-password', 'aria-label': t('parent.lock.password'), autofocus: true });
    const msg = h('p', { class: 'error', role: 'status' });
    const open = button(t('parent.lock.open'), () => void tryOpen(), 'btn primary');
    const tick = () => {
      const left = Math.ceil((lockTries.until - Date.now()) / 1000);
      input.disabled = open.disabled = left > 0;
      if (left > 0) msg.textContent = t('parent.lock.wait', { n: left });
      else if (timer) {
        clearInterval(timer);
        timer = 0;
        msg.textContent = '';
        input.focus();
      }
    };
    const wait = () => { tick(); if (!timer && lockTries.until > Date.now()) timer = window.setInterval(tick, 250); };
    const tryOpen = async () => {
      if (lockTries.until > Date.now()) return;
      if (await checkLock(lock, input.value)) {
        lockTries.wrong = 0;
        yes = true;
        return close();
      }
      input.value = '';
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
      msg.textContent = t('parent.lock.wrong');
      if (++lockTries.wrong >= LOCK_TRIES) {
        lockTries.wrong = 0;
        lockTries.until = Date.now() + LOCK_WAIT_MS;
        wait();
      }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void tryOpen(); });
    const close = modal(h('div', { class: 'confirm lock-dialog' },
      app.profile ? tapkoElement(app.profile.companion, 'thinking', 110) : null,
      h('h2', {}, t('parent.checkTitle')),
      h('p', {}, t('parent.lock.ask')),
      input, msg,
      h('div', { class: 'row center' }, button(t('common.back'), () => close(), 'btn'), open)), {
      cls: 'confirm-modal',
      onClose: () => { clearInterval(timer); resolve(yes); },
    });
    wait();
  });
}
