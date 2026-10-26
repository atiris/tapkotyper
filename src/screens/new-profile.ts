import { app, go, selectProfile } from '../app/app';
import { tapkoElement } from '../gfx/tapko';
import { langOptions, language, t } from '../i18n/i18n';
import { COMPANION_KINDS, type CompanionKind, type Lang, type LayoutId } from '../storage/schema';
import { NICK_MAX, newProfile } from '../storage/store';
import { addTask } from '../share/task';
import { arrowFocus, button, closeButton, h, onEscape } from '../ui/dom';
import { LAYOUT_IDS } from '../keyboard/layouts';
import { cornerControls } from '../ui/chrome';

export function newProfileScreen(root: HTMLElement): () => void {
  let kind: CompanionKind = 'fox';
  // Closing the form forgets a task link that brought the child here.
  const cancel = () => { app.pendingTask = null; go('start'); };
  const nick = h('input', { id: 'np-nick', type: 'text', maxlength: NICK_MAX, autocomplete: 'off', spellcheck: 'false', required: true });
  const name = h('input', { id: 'np-name', type: 'text', maxlength: 24, autocomplete: 'off' });
  const langSelect = (id: string) => h('select', { id },
    ...langOptions().map(([l, name]) => h('option', { value: l, selected: language() === l }, name)));
  const lang = langSelect('np-lang');
  const wordLang = langSelect('np-wordlang');
  const lay = h('select', { id: 'np-layout' },
    ...LAYOUT_IDS.map((id) => h('option', { value: id, selected: id === (language() === 'sk' ? 'sk-qwertz' : 'us-qwerty') }, t(`layouts.${id}`))));
  // A new language brings its words and keyboard along; both can still be chosen apart after it.
  lang.addEventListener('change', () => {
    wordLang.value = lang.value;
    lay.value = lang.value === 'sk' ? 'sk-qwertz' : 'us-qwerty';
  });
  const kinds = h('div', { class: 'kind-picker', role: 'radiogroup', 'aria-label': t('newProfile.companion') },
    ...COMPANION_KINDS.map((k) => {
      // One stop for Tab: the chosen character; the arrows move the choice.
      const b = h('button', { class: `kind ${k === kind ? 'on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(k === kind), tabindex: k === kind ? '0' : '-1', 'aria-label': t(`kinds.${k}`), onClick: () => {
        kind = k;
        kinds.querySelectorAll('.kind').forEach((el) => { el.classList.remove('on'); el.setAttribute('aria-checked', 'false'); el.setAttribute('tabindex', '-1'); });
        b.classList.add('on');
        b.setAttribute('aria-checked', 'true');
        b.setAttribute('tabindex', '0');
      } }, tapkoElement({ name: '', kind: k, accessories: [] }, 'idle', 84), h('span', {}, t(`kinds.${k}`)));
      return b;
    }));
  arrowFocus(kinds, '.kind', (el) => el.click());
  const error = h('p', { class: 'error', role: 'alert' });
  const form = h('form', { class: 'panel form', onSubmit: async (e: Event) => {
    e.preventDefault();
    if (!nick.value.trim()) {
      error.textContent = t('newProfile.nickMissing');
      nick.focus();
      return;
    }
    const p = newProfile(name.value, lang.value as Lang, lay.value as LayoutId, kind, nick.value);
    p.settings.wordLang = p.settings.ownWordLang = wordLang.value as Lang;
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
        h('label', { for: 'np-nick' }, t('newProfile.nickname')), nick,
        h('p', { class: 'hint' }, t('newProfile.nicknameHint')),
        h('label', { for: 'np-name' }, t('newProfile.name')), name,
        h('p', { class: 'hint' }, t('newProfile.nameHint')),
        h('label', { for: 'np-lang' }, t('newProfile.language')), lang,
        h('label', { for: 'np-wordlang' }, t('newProfile.wordLang')), wordLang,
        h('label', { for: 'np-layout' }, t('newProfile.layout')), lay)),
    error,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, t('newProfile.create'))));
  // Enter in a list (the last fields) creates the player too, like in a text field.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target instanceof HTMLSelectElement) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  root.append(h('div', { class: 'screen form-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), cancel, 'btn ghost small', 'back')),
    cornerControls(), form));
  nick.focus();
  return onEscape(cancel);
}
