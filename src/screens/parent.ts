import { app, applyProfileLook, go, saveProfile, selectProfile, useLanguage } from '../app/app';
import { t } from '../i18n/i18n';
import { LAYOUTS, LAYOUT_IDS, allKeys } from '../keyboard/layouts';
import { LEVELS, type LevelDef, WORLDS } from '../game/levels';
import { SURPRISES_MAX, SURPRISE_LEN, SURPRISE_N_MAX, TRIGGERS, newSurprise, restartSurprise, surpriseCount } from '../game/own-content';
import { wordSource } from '../game/runtime';
import { lessonKeyOf, lessonOrder, punctuationKeys } from '../learning/lessons';
import { COMPANION_KINDS, GUEST_ID, SUPER_ID, type FontChoice, type Lang, type LayoutId, type OwnMix, type ParentLock, type Profile, type Surprise, type SurpriseTrigger, type TaskKind } from '../storage/schema';
import { checkLock, makeLock } from '../storage/lock';
import { linkOf } from '../share/codec';
import { TASK_GROUP_MAX, TASK_MINUTES, TASK_TITLE_MAX, type TaskSpec, addTask, taskCode } from '../share/task';
import { moveCode } from '../share/transfer';
import { linkBox } from '../ui/link-box';
import { handInDialog } from './task';
import { NICK_MAX, applyImport, parseImport, planImport } from '../storage/store';
import { KeyboardGuide, keyLabel } from '../ui/keyboard-guide';
import { button, confirmDialog, download, h, modal } from '../ui/dom';
import { tapkoElement } from '../gfx/tapko';
import { cornerControls, starRow } from '../ui/chrome';
import { tabBar } from '../ui/tabs';
import { clickableHeatmap, summaryRow } from './stats';
import { barChart, lineChart } from '../ui/charts';
import { hasCompanion, masteredCount, totalStars } from '../game/rewards';
import { OWN_TEXT_MAX, OWN_WORDS_MAX, parseOwnWords, typableText, untypableWords } from '../words/words';

/**
 * Settings are for parents: one calm question, or the parent's password when one is set.
 * The super player is never asked.
 */
function parentAccess(): Promise<boolean> {
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

/** `granted`: re-render inside the parent area without asking again; `tab`: the tab to open. */
export async function parentScreen(root: HTMLElement, params: { granted?: boolean; tab?: string }): Promise<void> {
  if (!params.granted && !(await parentAccess())) return go('map');
  const p = app.profile!;
  const others = app.store.profiles.filter((q) => q.id !== p.id);
  const tabs = ['settings', 'own', 'surprises', 'task', 'keys', 'dashboard', 'data'] as const;
  type Tab = (typeof tabs)[number];
  const body = h('div', { class: 'tab-panel' });
  let current: Tab = tabs.find((x) => x === params.tab) ?? 'settings';
  const nav = tabBar(tabs.map((tab) => [tab, t(`parent.tab.${tab}`)] as const), current, (tab) => {
    current = tab;
    body.replaceChildren(tab === 'settings' ? settingsTab(p) : tab === 'own' ? ownTab(p) : tab === 'surprises' ? surprisesTab(p) : tab === 'task' ? taskTab(p) : tab === 'keys' ? keysTab(p) : tab === 'dashboard' ? dashboardTab(p) : dataTab(p));
  });
  root.append(h('div', { class: 'screen parent-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'),
      others.length ? childSwitch(p, others, () => current) : null, h('h1', {}, t('parent.title'))),
    cornerControls(),
    nav, body));
}

/** The button by "Back": the child, and a card list of the other profiles to switch to without leaving the parent area. */
function childSwitch(p: Profile, others: Profile[], tab: () => string): HTMLElement {
  const pick = async (q: Profile) => {
    await selectProfile(q);
    go('parent', { granted: true, tab: tab() });
  };
  const b = button(h('span', { class: 'switch-label' }, tapkoElement(p.companion, 'idle', 28), h('span', {}, p.name)), () => {
    const close = modal(h('div', { class: 'switch-dialog' },
      h('h2', {}, t('parent.switchTitle')),
      h('div', { class: 'switch-list' }, ...others.map((q) =>
        h('button', { class: 'profile-card small', type: 'button', onClick: () => { close(); void pick(q); } },
          tapkoElement(q.companion, 'idle', 64),
          h('span', { class: 'profile-name' }, q.name),
          h('span', { class: 'profile-sub' }, t('start.stars', { n: totalStars(q) })))))), { cls: 'confirm-modal' });
  }, 'btn small switch-btn');
  b.title = t('parent.switchTitle');
  return b;
}

function field(label: string, control: HTMLElement, hint?: string, tag: 'label' | 'div' = 'label'): HTMLElement {
  return h(tag, { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('small', {}, hint) : null);
}

function range(value: number, min: number, max: number, step: number, onInput: (v: number) => void, fmt: (v: number) => string = String): HTMLElement {
  const out = h('output', {}, fmt(value));
  const input = h('input', { type: 'range', min, max, step, value });
  input.addEventListener('input', () => { out.textContent = fmt(Number(input.value)); onInput(Number(input.value)); });
  return h('span', { class: 'range' }, input, out);
}

function check(value: boolean, onChange: (v: boolean) => void): HTMLInputElement {
  const c = h('input', { type: 'checkbox' });
  c.checked = value;
  c.addEventListener('change', () => onChange(c.checked));
  return c;
}

let switchIds = 0;

/** A checkbox on the left, its bold title to the right and an optional short line under the title. */
function switchField(title: string, box: HTMLInputElement, hint?: string): HTMLElement {
  const id = hint ? `switch-hint-${++switchIds}` : '';
  if (id) box.setAttribute('aria-describedby', id);
  return h('div', { class: 'switch-field' },
    h('label', {}, box, h('span', { class: 'switch-title' }, title)),
    hint ? h('small', { id }, hint) : null);
}

function select<T extends string>(value: T, options: [T, string][], onChange: (v: T) => void): HTMLSelectElement {
  const s = h('select', {}, ...options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
  s.addEventListener('change', () => onChange(s.value as T));
  return s;
}

/** Sliders with an "automatic" switch: while automatic, the app moves them and they are read-only. */
function autoField(ranges: HTMLElement[], auto: boolean, onAuto: (v: boolean) => void, title: string, hint: string): HTMLElement {
  const lock = (on: boolean) => ranges.forEach((r) => r.querySelectorAll('input').forEach((i) => (i.disabled = on)));
  lock(auto);
  return h('span', { class: 'auto-field' }, ...ranges,
    switchField(title, check(auto, (v) => { lock(v); onAuto(v); }), hint));
}

function settingsTab(p: Profile): HTMLElement {
  const s = p.settings;
  const save = () => { saveProfile(); applyProfileLook(p); };
  const name = h('input', { type: 'text', value: p.name, maxlength: 24 });
  name.addEventListener('change', () => { p.name = name.value.trim() || p.name; save(); });
  const nick = h('input', { type: 'text', value: p.companion.name, maxlength: NICK_MAX, placeholder: p.name });
  nick.addEventListener('change', () => { p.companion.name = nick.value.trim(); save(); });
  const tapko = h('span', { class: 'child-tapko' });
  const paintTapko = () => tapko.replaceChildren(tapkoElement(p.companion, 'happy', 96));
  const kinds = h('div', { class: 'kind-picker', role: 'radiogroup', 'aria-label': t('parent.companionKind') },
    ...COMPANION_KINDS.map((k) => h('button', { class: `kind ${k === p.companion.kind ? 'on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(k === p.companion.kind), 'aria-label': t(`kinds.${k}`), onClick: (e: Event) => {
      p.companion.kind = k;
      p.avatar = k;
      if (!hasCompanion(p, k)) p.progress.companionsUnlocked.push(k);
      save();
      kinds.querySelectorAll('.kind').forEach((el) => { el.classList.remove('on'); el.setAttribute('aria-checked', 'false'); });
      (e.currentTarget as HTMLElement).classList.add('on');
      (e.currentTarget as HTMLElement).setAttribute('aria-checked', 'true');
      paintTapko();
    } }, tapkoElement({ name: '', kind: k, accessories: [] }, 'idle', 64), h('span', {}, t(`kinds.${k}`)))));
  paintTapko();
  return h('div', { class: 'settings-grid' },
    h('fieldset', {}, h('legend', {}, t('parent.group.child')),
      h('div', { class: 'child-summary' }, tapko, field(t('parent.childName'), name)),
      field(t('parent.companionKind'), kinds, undefined, 'div'),
      field(t('parent.nickname'), nick, t('parent.nicknameHint')),
      field(t('parent.language'), select<Lang>(p.language, [['sk', 'Slovenčina'], ['en', 'English']], async (v) => { p.language = v; save(); await useLanguage(v); go('parent', { granted: true }); })),
      field(t('parent.layout'), select<LayoutId>(p.layout, LAYOUT_IDS.map((id) => [id, t(`layouts.${id}`)]), (v) => {
        p.layout = v;
        // Keep the progress, but only keys the new layout teaches.
        const order = lessonOrder(v);
        p.progress.unlockedKeys = order.slice(0, Math.max(2, p.progress.unlockedKeys.filter((k) => order.includes(k)).length));
        save();
      }), t('parent.layoutHint'))),
    h('fieldset', {}, h('legend', {}, t('parent.group.practice')),
      field(t('parent.difficulty'), autoField(
        [range(s.difficulty, 1, 10, 1, (v) => { s.difficulty = v; save(); })],
        s.autoDifficulty, (v) => { s.autoDifficulty = v; save(); }, t('parent.autoDifficulty'), t('parent.autoDifficultyHint')), t('parent.autoHint'), 'div'),
      field(t('parent.wordLen'), autoField([
        range(s.wordLen[0], 1, 8, 1, (v) => { s.wordLen = [v, Math.max(v, s.wordLen[1])]; save(); }, (v) => t('parent.min', { n: v })),
        range(s.wordLen[1], 2, 12, 1, (v) => { s.wordLen = [Math.min(v, s.wordLen[0]), v]; save(); }, (v) => t('parent.max', { n: v }))],
        s.autoWordLen, (v) => { s.autoWordLen = v; save(); }, t('parent.autoWordLen'), t('parent.autoWordLenHint')), undefined, 'div'),
      switchField(t('parent.noDiacritics'), check(s.noDiacritics, (v) => { s.noDiacritics = v; save(); }), t('parent.noDiacriticsHint')),
      switchField(t('parent.noTimePressure'), check(s.noTimePressure, (v) => { s.noTimePressure = v; save(); }), t('parent.noTimePressureHint')),
      field(t('parent.sessionMinutes'), range(s.sessionMinutes, 5, 30, 5, (v) => { s.sessionMinutes = v; save(); }, (v) => t('parent.minutes', { n: v }))),
      field(t('parent.guide'), select(s.guide, [['auto', t('parent.guideAuto')], ['on', t('parent.guideOn')], ['off', t('parent.guideOff')]], (v) => { s.guide = v; save(); })),
      switchField(t('parent.guideLocked'), check(s.guideLocked, (v) => { s.guideLocked = v; save(); }))),
    h('fieldset', {}, h('legend', {}, t('parent.group.look')),
      field(t('parent.sfx'), range(s.sfxVolume, 0, 1, 0.1, (v) => { s.sfxVolume = v; save(); }, (v) => `${Math.round(v * 100)} %`)),
      field(t('parent.music'), range(s.musicVolume, 0, 1, 0.1, (v) => { s.musicVolume = v; save(); }, (v) => `${Math.round(v * 100)} %`)),
      switchField(t('parent.speakTyped'), check(s.speakTyped, (v) => { s.speakTyped = v; save(); }), t('parent.speakTypedHint')),
      field(t('parent.font'), select<FontChoice>(s.font, [['lexend', 'Lexend'], ['atkinson', 'Atkinson Hyperlegible'], ['opendyslexic', 'OpenDyslexic']], (v) => { s.font = v; save(); })),
      switchField(t('parent.largeText'), check(s.largeText, (v) => { s.largeText = v; save(); })),
      switchField(t('parent.reduceMotion'), check(s.reduceMotion, (v) => { s.reduceMotion = v; save(); })),
      switchField(t('parent.highContrast'), check(s.highContrast, (v) => { s.highContrast = v; save(); })),
      switchField(t('parent.autoFullscreen'), check(s.autoFullscreen, (v) => { s.autoFullscreen = v; save(); }), t('parent.autoFullscreenHint'))),
    lockGroup());
}

/** The device-wide password on this screen: set, change or remove. The super player needs no current one. */
function lockGroup(): HTMLElement {
  const box = h('fieldset', { class: 'lock-group' });
  const render = (done = '') => {
    const lock = app.store.data.parentLock;
    const pw = (auto: string) => h('input', { type: 'password', autocomplete: auto, maxlength: 64 });
    const current = lock && app.profile?.id !== SUPER_ID ? pw('current-password') : null;
    const next = pw('new-password');
    const again = pw('new-password');
    const msg = h('p', { class: done ? 'hint lock-msg' : 'error lock-msg', role: 'status' }, done);
    const fail = (key: string) => { msg.className = 'error lock-msg'; msg.textContent = t(key); };
    const allowed = async () => !lock || !current || (await checkLock(lock, current.value));
    const keep = (l: ParentLock | null, doneKey: string) => {
      if (l) app.store.data.parentLock = l;
      else delete app.store.data.parentLock;
      app.store.save();
      render(t(doneKey));
    };
    const setPassword = async () => {
      if (!(await allowed())) return fail('parent.lock.wrong');
      if (!next.value) return fail('parent.lock.empty');
      if (next.value !== again.value) return fail('parent.lock.mismatch');
      keep(await makeLock(next.value), 'parent.lock.saved');
    };
    const remove = async () => {
      if (!(await allowed())) return fail('parent.lock.wrong');
      keep(null, 'parent.lock.removed');
    };
    box.replaceChildren(h('legend', {}, t('parent.group.lock')),
      h('p', { class: 'hint' }, t(lock ? 'parent.lock.on' : 'parent.lock.off')),
      ...(current ? [field(t('parent.lock.current'), current)] : []),
      field(t(lock ? 'parent.lock.new' : 'parent.lock.password'), next),
      field(t('parent.lock.again'), again),
      h('div', { class: 'row' },
        button(t(lock ? 'parent.lock.change' : 'parent.lock.set'), () => void setPassword(), 'btn primary', 'lock'),
        lock ? button(t('parent.lock.remove'), () => void remove(), 'btn danger', 'trash') : null),
      msg);
  };
  render();
  return box;
}

/** The parent's own content: encouragements, words and text. */
function ownTab(p: Profile): HTMLElement {
  const messages = h('textarea', { rows: 3, placeholder: t('parent.messagesPlaceholder') });
  messages.value = p.customMessages.join('\n');
  messages.addEventListener('change', () => { p.customMessages = messages.value.split('\n').map((m) => m.trim()).filter(Boolean).slice(0, 20); saveProfile(); });
  return h('div', { class: 'settings-grid own-tab' },
    h('fieldset', {}, h('legend', {}, t('own.group.messages')), field(t('parent.messages'), messages, t('parent.messagesHint'))),
    ...ownWordsEditors(p));
}

const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

/** Story level name for the level picker and the table. */
function levelName(l: LevelDef): string {
  return `${t(`worlds.${WORLDS[l.world]}`)}: ${l.isSuper ? t('map.super') : l.index + 1}`;
}

/** When a rule tells its answer, in words. */
function whenText(s: Surprise): string {
  if (s.trigger === 'level') {
    const l = LEVELS.find((x) => x.id === s.level);
    return l ? levelName(l) : '?';
  }
  if (s.trigger === 'random') return t('surprises.when.random');
  const n = s.n ?? 1;
  return t(`surprises.when.${s.trigger}${s.trigger === 'minutes' ? '' : n === 1 ? 'One' : 'Many'}`, { n });
}

/** Where a rule stands: done, its count, or waiting; with the last reveal of a repeating one. */
function stateText(p: Profile, s: Surprise): string {
  const date = (d: string) => new Date(d).toLocaleDateString(p.language, { day: 'numeric', month: 'numeric' });
  if (s.doneAt) return t('surprises.state.done', { date: date(s.doneAt) });
  const { have, need } = surpriseCount(p, s);
  const now = s.trigger === 'minutes' ? t('surprises.state.minutes', { have, need })
    : s.trigger === 'levels' || s.trigger === 'stars' ? `${have} / ${need}` : t('surprises.state.waiting');
  return s.lastShownAt ? `${now} · ${t('surprises.state.last', { date: date(s.lastShownAt) })}` : now;
}

/**
 * Real rewards a parent hides behind rules: after a level, after minutes of training, after
 * more levels or stars, or now and then from a pool. One table, and a form to add or edit.
 */
function surprisesTab(p: Profile): HTMLElement {
  let editing: Surprise | null = null;
  const q = h('textarea', { rows: 2, maxlength: SURPRISE_LEN, placeholder: t('surprises.qPlaceholder') });
  const a = h('textarea', { rows: 2, maxlength: SURPRISE_LEN, placeholder: t('surprises.aPlaceholder') });
  const trigger = select<SurpriseTrigger>('level', TRIGGERS.map((x): [SurpriseTrigger, string] => [x, t(`surprises.trigger.${x}`)]), () => sync());
  const level = h('select', {}, ...WORLDS.map((w, i) => h('optgroup', { label: t(`worlds.${w}`) },
    ...LEVELS.filter((l) => l.world === i).map((l) => h('option', { value: l.id }, levelName(l))))));
  const n = h('input', { type: 'number', min: 1, max: SURPRISE_N_MAX, step: 1, value: 10, inputmode: 'numeric' });
  const repeat = check(false, () => undefined);
  const levelField = field(t('surprises.level'), level);
  const nLabel = h('span', { class: 'field-label' });
  const nField = h('label', { class: 'field' }, nLabel, n);
  const sync = () => {
    const tr = trigger.value as SurpriseTrigger;
    levelField.hidden = tr !== 'level';
    nField.hidden = tr === 'level' || tr === 'random';
    if (!nField.hidden) nLabel.textContent = t(`surprises.n.${tr}`);
  };
  const msg = h('p', { class: 'error', role: 'alert' });
  const saveLabel = h('span', {}, t('surprises.add'));
  const save = button(saveLabel, () => submit(), 'btn small primary', 'plus');
  const cancel = button(t('surprises.cancel'), () => reset(), 'btn small ghost');
  const body = h('tbody');
  const table = h('table', {},
    h('thead', {}, h('tr', {}, ...['q', 'a', 'when', 'repeat', 'state', 'actions'].map((c) => h('th', {}, t(`surprises.col.${c}`))))),
    body);
  const empty = h('p', { class: 'hint' }, t('surprises.empty'));
  const reset = () => {
    editing = null;
    q.value = a.value = '';
    trigger.value = 'level';
    n.value = '10';
    repeat.checked = false;
    saveLabel.textContent = t('surprises.add');
    cancel.hidden = true;
    msg.textContent = '';
    sync();
  };
  const edit = (s: Surprise) => {
    editing = s;
    q.value = s.q;
    a.value = s.a;
    trigger.value = s.trigger;
    if (s.level) level.value = s.level;
    n.value = String(s.n ?? 10);
    repeat.checked = s.repeat;
    saveLabel.textContent = t('surprises.save');
    cancel.hidden = false;
    msg.textContent = '';
    sync();
    q.focus();
  };
  const submit = () => {
    msg.textContent = '';
    const tr = trigger.value as SurpriseTrigger;
    const counts = tr === 'minutes' || tr === 'levels' || tr === 'stars';
    const count = Number(n.value);
    if (!q.value.trim() || !a.value.trim()) return void (msg.textContent = t('surprises.needBoth'));
    if (counts && !(Number.isInteger(count) && count >= 1 && count <= SURPRISE_N_MAX)) return void (msg.textContent = t('surprises.badN', { max: SURPRISE_N_MAX }));
    if (!editing && p.surprises.length >= SURPRISES_MAX) return void (msg.textContent = t('surprises.tooMany', { n: SURPRISES_MAX }));
    const rule = {
      q: q.value.trim(), a: a.value.trim(), trigger: tr, repeat: repeat.checked,
      n: counts ? count : undefined,
      level: tr === 'level' ? level.value : undefined,
    };
    if (editing) {
      const s = editing;
      // A changed condition waits again from now; new wording keeps the state.
      const changed = s.trigger !== rule.trigger || s.n !== rule.n || s.level !== rule.level || s.repeat !== rule.repeat;
      Object.assign(s, rule);
      if (changed) restartSurprise(p, s);
    } else p.surprises.push(newSurprise(p, rule));
    saveProfile();
    reset();
    paint();
  };
  const cell = (col: string, text: string) => h('td', { 'data-label': t(`surprises.col.${col}`) }, text);
  const paint = () => {
    body.replaceChildren(...p.surprises.map((s) => h('tr', { class: s.doneAt ? 'done' : '' },
      cell('q', s.q),
      cell('a', s.a),
      cell('when', whenText(s)),
      cell('repeat', t(s.repeat ? 'surprises.yes' : 'surprises.no')),
      cell('state', stateText(p, s)),
      h('td', { class: 'actions' },
        button(t('surprises.edit'), () => edit(s), 'btn small ghost', 'edit'),
        button(t('surprises.remove'), () => {
          p.surprises = p.surprises.filter((x) => x !== s);
          if (editing === s) reset();
          saveProfile();
          paint();
        }, 'btn small ghost', 'trash')))));
    table.hidden = !p.surprises.length;
    empty.hidden = !!p.surprises.length;
  };
  reset();
  paint();
  return h('div', { class: 'surprises-tab' },
    h('p', { class: 'hint' }, t('surprises.hint')),
    h('div', { class: 'surprise-table' }, table),
    empty,
    h('fieldset', { class: 'surprise-form' }, h('legend', {}, t('surprises.formTitle')),
      field(t('surprises.q'), q),
      field(t('surprises.a'), a),
      h('div', { class: 'row' }, field(t('surprises.whenLabel'), trigger), levelField, nField,
        switchField(t('surprises.repeat'), repeat)),
      msg,
      h('div', { class: 'row' }, save, cancel)));
}

/** Own words and own text, how much of them comes into the levels, and five sample targets. */
function ownWordsEditors(p: Profile): HTMLElement[] {
  const s = p.settings;
  const lay = LAYOUTS[p.layout];
  const words = h('textarea', { rows: 4, placeholder: t('own.wordsPlaceholder') });
  words.value = s.ownWords.join('\n');
  const wordsInfo = h('p', { class: 'hint', 'aria-live': 'polite' });
  const text = h('textarea', { rows: 6, maxlength: OWN_TEXT_MAX, placeholder: t('own.textPlaceholder') });
  text.value = s.ownText;
  const textInfo = h('p', { class: 'hint', 'aria-live': 'polite' });
  const preview = h('ul', { class: 'own-preview' });
  const paintPreview = () => {
    const src = wordSource(p);
    preview.replaceChildren(...Array.from({ length: 5 }, () => h('li', {}, src.next(new Set(), undefined, 2))));
  };
  const paint = () => {
    const bad = untypableWords(s.ownWords, lay);
    wordsInfo.replaceChildren(t('own.wordsCount', { n: s.ownWords.length, max: OWN_WORDS_MAX }),
      bad.length ? h('span', { class: 'error' }, ` ${t('own.untypableWords', { list: bad.join(', ') })}`) : '');
    const dropped = typableText(s.ownText, lay).dropped;
    textInfo.replaceChildren(t('own.textCount', { n: s.ownText.length, max: OWN_TEXT_MAX }),
      dropped.length ? h('span', { class: 'error' }, ` ${t('own.untypableChars', { list: dropped.join(' ') })}`) : '');
    paintPreview();
  };
  words.addEventListener('change', () => {
    s.ownWords = parseOwnWords(words.value);
    words.value = s.ownWords.join('\n');
    saveProfile();
    paint();
  });
  text.addEventListener('change', () => { s.ownText = text.value.slice(0, OWN_TEXT_MAX).trim(); saveProfile(); paint(); });
  const mix = select<OwnMix>(s.ownMix, (['off', 'some', 'half', 'most'] as const).map((m): [OwnMix, string] => [m, t(`own.mix.${m}`)]), (v) => { s.ownMix = v; saveProfile(); paintPreview(); });
  paint();
  return [
    h('fieldset', { class: 'own-words' }, h('legend', {}, t('own.group.words')),
      field(t('own.words'), words, t('own.wordsHint')),
      wordsInfo),
    h('fieldset', { class: 'own-text' }, h('legend', {}, t('own.group.text')),
      field(t('own.text'), text, t('own.textHint')),
      textInfo,
      field(t('own.mix.label'), mix, t('own.mixHint')),
      h('div', { class: 'own-preview-box' },
        h('span', { class: 'field-label' }, t('own.preview')),
        preview,
        button(t('own.previewMore'), paintPreview, 'btn small ghost', 'replay'))),
  ];
}

/** A task for this child or a whole class: a link (and QR) with words, text, minutes and what to play. */
function taskTab(p: Profile): HTMLElement {
  const title = h('input', { type: 'text', maxlength: TASK_TITLE_MAX, placeholder: t('task.titlePlaceholder') });
  const words = h('textarea', { rows: 3, placeholder: t('own.wordsPlaceholder') });
  const text = h('textarea', { rows: 4, maxlength: OWN_TEXT_MAX, placeholder: t('own.textPlaceholder') });
  const group = h('input', { type: 'text', maxlength: TASK_GROUP_MAX, placeholder: t('task.groupPlaceholder') });
  let minutes = 10;
  const kind = select<TaskKind>('practice', [['practice', t('task.kind.practice')], ['story', t('task.kind.story')]], () => undefined);
  const msg = h('p', { class: 'error', role: 'alert' });
  const out = h('div', { class: 'task-out' });
  const list = h('ul', { class: 'own-list task-list' });
  const make = async () => {
    msg.textContent = '';
    const spec: TaskSpec = { id: newId(), title: title.value.trim(), words: parseOwnWords(words.value), text: text.value.slice(0, OWN_TEXT_MAX).trim(), minutes, kind: kind.value as TaskKind, ...(group.value.trim() && { group: group.value.trim() }) };
    if (!spec.words.length && !spec.text) return void (msg.textContent = t('task.needContent'));
    const link = linkOf('task', await taskCode(spec));
    out.replaceChildren(
      h('h3', {}, t('task.linkTitle')),
      h('p', { class: 'hint' }, t('task.linkHint')),
      linkBox(link),
      button(t('task.giveHere', { name: p.name }), () => { addTask(p, spec); saveProfile(); paint(); }, 'btn small', 'plus'));
  };
  const paint = () => list.replaceChildren(...(p.tasks.length ? [] : [h('li', { class: 'hint' }, t('task.none'))]), ...p.tasks.map((x) => h('li', { class: x.doneAt ? 'revealed' : '' },
    h('div', {}, h('b', {}, x.title || t('task.untitled')),
      h('small', {}, `${t(`task.kind.${x.kind}`)} · ${x.doneAt ? t('task.doneAt', { date: new Date(x.doneAt).toLocaleDateString(p.language) }) : t('task.played', { n: Math.floor(x.seconds / 60), total: x.minutes })}`)),
    x.doneAt ? button(t('task.handIn'), () => void handInDialog(p, x), 'btn small', 'upload') : null,
    button(t('own.remove'), () => { p.tasks = p.tasks.filter((y) => y !== x); saveProfile(); paint(); }, 'btn small ghost', 'trash'))));
  paint();
  return h('div', { class: 'settings-grid task-tab' },
    h('fieldset', { class: 'task-new' }, h('legend', {}, t('task.group.new')),
      h('p', { class: 'hint' }, t('task.intro')),
      field(t('task.title'), title),
      field(t('task.group'), group, t('task.groupHint')),
      field(t('own.words'), words, t('own.wordsHint')),
      field(t('own.text'), text),
      h('div', { class: 'row' },
        field(t('task.minutes'), range(minutes, TASK_MINUTES[0], TASK_MINUTES[1], 1, (v) => (minutes = v), (v) => t('parent.minutes', { n: v }))),
        field(t('task.kindLabel'), kind)),
      msg,
      button(t('task.make'), () => void make(), 'btn primary', 'code'),
      out),
    h('fieldset', { class: 'task-own' }, h('legend', {}, t('task.group.list', { name: p.name })),
      list));
}

function keysTab(p: Profile): HTMLElement {
  const s = p.settings;
  const lay = LAYOUTS[p.layout];
  const kb = new KeyboardGuide(lay);
  kb.el.classList.add('picker');
  const picked = new Set(s.manualKeys.length ? s.manualKeys : p.progress.unlockedKeys);
  const toggle = (key: string) => {
    if (picked.has(key)) picked.delete(key); else picked.add(key);
    s.manualKeys = [...picked];
    paint();
    saveProfile();
  };
  const marks = punctuationKeys(lay).map(({ key, base, shift }) => {
    const chip = button(shift ? `${key} (Shift + ${base})` : key, () => toggle(key), 'chip');
    chip.dataset.key = key;
    return chip;
  });
  const paint = () => {
    for (const def of allKeys(lay)) {
      const el = kb.keyEl(def.code);
      const key = lessonKeyOf(def);
      el?.classList.toggle('picked', !!key && picked.has(key));
    }
    for (const chip of marks) chip.classList.toggle('on', picked.has(chip.dataset.key!));
  };
  kb.onKeyClick((code) => {
    const key = lessonKeyOf(allKeys(lay).find((d) => d.code === code)!);
    if (key) toggle(key);
  });
  paint();
  const mode = select(s.activeKeysMode, [['auto', t('parent.keysAuto')], ['manual', t('parent.keysManual')]], (v) => { s.activeKeysMode = v; if (v === 'manual') s.manualKeys = [...picked]; saveProfile(); kb.el.classList.toggle('disabled', v === 'auto'); });
  kb.el.classList.toggle('disabled', s.activeKeysMode === 'auto');
  const presets: [string, string][] = [['home', 'fjdkslaô'], ['homeUs', 'fjdksla;'], ['top', 'qwertzuiop'], ['bottom', 'yxcvbnm']];
  return h('div', {},
    field(t('parent.keysMode'), mode, t('parent.keysHint')),
    h('p', { class: 'hint' }, t('parent.unlocked', { keys: p.progress.unlockedKeys.map(keyLabel).join(' ') })),
    kb.el,
    h('div', { class: 'row picker-punct' }, h('b', {}, t('parent.punctuation')), ...marks),
    h('div', { class: 'row' },
      ...presets.filter(([id]) => (p.layout === 'us-qwerty' ? id !== 'home' : id !== 'homeUs')).map(([id, keys]) => button(t(`parent.preset.${id}`), () => {
        for (const c of keys) if (allKeys(lay).some((d) => d.base === c)) picked.add(c);
        s.manualKeys = [...picked];
        s.activeKeysMode = 'manual';
        mode.value = 'manual';
        kb.el.classList.remove('disabled');
        paint();
        saveProfile();
      }, 'btn small')),
      button(t('parent.preset.clear'), () => { picked.clear(); s.manualKeys = []; paint(); saveProfile(); }, 'btn small ghost')));
}

function dashboardTab(p: Profile): HTMLElement {
  const sessions = p.stats.sessions.slice(-14);
  const labels = sessions.map((s) => s.date.slice(5));
  const detail = h('div', { class: 'key-detail-host' }, h('p', { class: 'hint' }, t('stats.clickKey')));
  const heat = clickableHeatmap(p, detail);
  const levelsDone = LEVELS.filter((l) => p.progress.levels[l.id]).length;
  const totalChars = sessions.reduce((a, s) => a + s.chars, 0);
  return h('div', { class: 'dashboard' },
    h('div', { class: 'child-summary' }, tapkoElement(p.companion, 'happy', 96), summaryRow(p)),
    h('div', { class: 'cards' },
      h('div', { class: 'stat' }, h('b', {}, String(levelsDone)), h('span', {}, t('parent.levelsDone', { total: LEVELS.length }))),
      h('div', { class: 'stat' }, h('b', {}, String(p.progress.unlockedKeys.length)), h('span', {}, t('parent.keysUnlocked'))),
      h('div', { class: 'stat' }, h('b', {}, String(masteredCount(p))), h('span', {}, t('parent.keysMastered'))),
      h('div', { class: 'stat' }, h('b', {}, String(totalChars)), h('span', {}, t('parent.charsTyped')))),
    h('h3', {}, t('parent.heatmap')),
    h('div', { class: 'heat-split' }, heat, detail),
    h('div', { class: 'chart-grid' },
      h('section', {}, h('h3', {}, t('parent.accuracyTrend')),
        lineChart(sessions.map((s) => Math.round((s.chars / Math.max(1, s.chars + s.errors)) * 100)), labels, '%', '#3f8fd6')),
      h('section', {}, h('h3', {}, t('parent.rhythmTrend')),
        lineChart(sessions.map((s) => s.cpm), labels, t('parent.cpm'), '#e08a3c')),
      h('section', {}, h('h3', {}, t('parent.timePerDay')),
        barChart(sessions.map((s) => Math.round(s.seconds / 60)), labels, 'min'))),
    h('h3', {}, t('parent.worlds')),
    h('div', { class: 'level-grid' }, ...LEVELS.map((l) => h('div', { class: 'level-cell' },
      h('span', { class: 'level-name' }, levelName(l)), starRow(p.progress.levels[l.id] ?? 0, 'stars cell-stars')))));
}

function dataTab(p: Profile): HTMLElement {
  const guest = p.id === GUEST_ID;
  return h('div', { class: 'data-tab' },
    h('p', {}, t('parent.dataText')),
    h('div', { class: 'row' },
      guest ? null : button(t('parent.exportOne'), () => exportOne(p), 'btn', 'download'),
      guest ? null : button(t('move.button'), () => void moveDialog(p), 'btn', 'next'),
      button(t('parent.exportAll'), () => download('tapkotyper-profiles.json', app.store.exportJson()), 'btn', 'download'),
      button(t('parent.import'), () => importDialog(() => go('parent', { granted: true })), 'btn', 'upload'),
      button(t('parent.print'), () => printCard(p), 'btn', 'print')),
    guest ? h('p', { class: 'hint' }, t('parent.guestNote')) : h('div', { class: 'danger-zone' },
      h('h3', {}, t('parent.deleteTitle')),
      button(t('parent.delete', { name: p.name }), async () => {
        const yes = await confirmDialog({
          title: t('parent.deleteTitle'),
          text: t('parent.deleteConfirm', { name: p.name }),
          ok: t('parent.deleteOk'),
          cancel: t('common.back'),
          danger: true,
          art: tapkoElement(p.companion, 'thinking', 110),
        });
        if (!yes) return;
        app.store.remove(p.id);
        app.profile = null;
        go('start');
      }, 'btn danger', 'trash')));
}

const exportOne = (p: Profile) => download(`tapkotyper-${slug(p.name)}.json`, app.store.exportJson([p.id]));

/** The whole player as a link for another computer; a file when the link would be too long. */
async function moveDialog(p: Profile): Promise<void> {
  const prefix = linkOf('move', '');
  const code = await moveCode(p, prefix);
  modal(h('div', { class: 'move' },
    h('h2', {}, t('move.title')),
    ...(code
      ? [h('p', {}, t('move.text', { name: p.name })), linkBox(prefix + code), h('p', { class: 'hint' }, t('move.privacy'))]
      : [h('p', {}, t('move.tooLong')), button(t('parent.exportOne'), () => exportOne(p), 'btn primary', 'download')])), { cls: 'share-modal' });
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'profile';

/** Import with validation; never overwrites silently. */
export function importDialog(done: () => void): void {
  const file = h('input', { type: 'file', accept: '.json,application/json' });
  const msg = h('p', { class: 'error', role: 'alert' });
  const actions = h('div', { class: 'row' });
  const close = modal(h('div', { class: 'import' }, h('h2', {}, t('import.title')), h('p', {}, t('import.text')), file, msg, actions));
  file.addEventListener('change', async () => {
    msg.textContent = '';
    actions.replaceChildren();
    const f = file.files?.[0];
    if (!f) return;
    try {
      const profiles = parseImport(await f.text());
      const plan = planImport(app.store, profiles);
      const finish = (replace: boolean) => { applyImport(app.store, plan, replace); close(); done(); };
      msg.className = 'ok';
      msg.textContent = t('import.found', { n: profiles.length, names: profiles.map((x) => x.name).join(', ') });
      if (plan.conflicts.length) {
        msg.textContent += ` ${t('import.conflict', { names: plan.conflicts.map((x) => x.name).join(', ') })}`;
        actions.append(button(t('import.replace'), () => finish(true), 'btn'), button(t('import.keepBoth'), () => finish(false), 'btn primary'));
      } else actions.append(button(t('import.do'), () => finish(false), 'btn primary'));
    } catch (e) {
      msg.className = 'error';
      msg.textContent = t((e as Error).message);
    }
  });
}

/** Printable progress card through the browser's print dialog. */
function printCard(p: Profile): void {
  const stars = Object.values(p.progress.levels).reduce((a, b) => a + b, 0);
  const last = p.stats.sessions[p.stats.sessions.length - 1];
  const card = h('div', { class: 'print-card' },
    h('h1', {}, t('print.title')),
    h('p', { class: 'print-name' }, p.name),
    h('p', {}, t('print.keys', { n: p.progress.unlockedKeys.length, keys: p.progress.unlockedKeys.join(' ') })),
    h('p', {}, t('print.mastered', { n: masteredCount(p) })),
    h('p', {}, t('print.stars', { n: stars, total: LEVELS.length * 3 })),
    h('p', {}, t('print.worlds', { n: p.progress.worldsDone.length, total: WORLDS.length })),
    last ? h('p', {}, t('print.rhythm', { n: last.cpm })) : null,
    h('p', { class: 'print-date' }, new Date().toLocaleDateString(p.language)),
    h('p', { class: 'print-sign' }, 'TapkoTyper'));
  document.body.append(card);
  document.body.classList.add('printing');
  const cleanup = () => { card.remove(); document.body.classList.remove('printing'); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 1500);
}
