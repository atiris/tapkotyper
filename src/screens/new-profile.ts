import { app, go, selectProfile } from '../app/app';
import { tapkoElement } from '../gfx/tapko';
import { language, t } from '../i18n/i18n';
import { COMPANION_KINDS, type CompanionKind, type Lang, type LayoutId } from '../storage/schema';
import { NICK_MAX, newProfile } from '../storage/store';
import { addTask } from '../share/task';
import { closeButton, h } from '../ui/dom';
import { LAYOUT_IDS } from '../keyboard/layouts';
import { cornerControls } from '../ui/chrome';

export function newProfileScreen(root: HTMLElement): () => void {
  let kind: CompanionKind = 'fox';
  // Closing the form forgets a task link that brought the child here.
  const cancel = () => { app.pendingTask = null; go('start'); };
  const name = h('input', { id: 'np-name', type: 'text', maxlength: 24, autocomplete: 'off', required: true, autofocus: true });
  const nick = h('input', { id: 'np-nick', type: 'text', maxlength: NICK_MAX, autocomplete: 'off', spellcheck: 'false' });
  const lang = h('select', { id: 'np-lang' },
    h('option', { value: 'sk', selected: language() === 'sk' }, 'Slovenčina'),
    h('option', { value: 'en', selected: language() === 'en' }, 'English'));
  const lay = h('select', { id: 'np-layout' },
    ...LAYOUT_IDS.map((id) => h('option', { value: id, selected: id === (language() === 'sk' ? 'sk-qwertz' : 'us-qwerty') }, t(`layouts.${id}`))));
  lang.addEventListener('change', () => {
    lay.value = lang.value === 'sk' ? 'sk-qwertz' : 'us-qwerty';
  });
  const kinds = h('div', { class: 'kind-picker', role: 'radiogroup', 'aria-label': t('newProfile.companion') },
    ...COMPANION_KINDS.map((k) => {
      const b = h('button', { class: `kind ${k === kind ? 'on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(k === kind), 'aria-label': t(`kinds.${k}`), onClick: () => {
        kind = k;
        kinds.querySelectorAll('.kind').forEach((el) => { el.classList.remove('on'); el.setAttribute('aria-checked', 'false'); });
        b.classList.add('on');
        b.setAttribute('aria-checked', 'true');
      } }, tapkoElement({ name: '', kind: k, accessories: [] }, 'idle', 84), h('span', {}, t(`kinds.${k}`)));
      return b;
    }));
  const error = h('p', { class: 'error', role: 'alert' });
  const form = h('form', { class: 'panel form', onSubmit: async (e: Event) => {
    e.preventDefault();
    const n = name.value.trim();
    if (!n) {
      error.textContent = t('newProfile.nameMissing');
      name.focus();
      return;
    }
    const p = newProfile(n, lang.value as Lang, lay.value as LayoutId, kind, nick.value);
    if (app.pendingTask) addTask(p, app.pendingTask);
    app.pendingTask = null;
    app.store.add(p);
    await selectProfile(p);
    // The map, not a level: a parent may set the player up first; the map welcomes the child.
    go('map');
  } },
    closeButton(cancel),
    h('h1', {}, t('newProfile.title')),
    h('div', { class: 'np-pick' },
      h('div', { class: 'np-col' }, h('label', {}, t('newProfile.companion')), kinds),
      h('div', { class: 'np-col np-side' },
        h('label', { for: 'np-name' }, t('newProfile.name')), name,
        h('p', { class: 'hint' }, t('newProfile.nameHint')),
        h('label', { for: 'np-nick' }, t('newProfile.nickname')), nick,
        h('p', { class: 'hint' }, t('newProfile.nicknameHint')),
        h('label', { for: 'np-lang' }, t('newProfile.language')), lang,
        h('label', { for: 'np-layout' }, t('newProfile.layout')), lay)),
    h('p', { class: 'hint' }, t('newProfile.parentHint')),
    error,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, t('newProfile.create'))));
  root.append(h('div', { class: 'screen form-screen' }, cornerControls(), form));
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || document.querySelector('.modal-back')) return;
    e.preventDefault();
    cancel();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
