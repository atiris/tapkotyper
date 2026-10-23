import { app, applyProfileLook, go, saveProfile, selectProfile } from '../app/app';
import { tapkoElement } from '../gfx/tapko';
import { totalStars } from '../game/rewards';
import { t } from '../i18n/i18n';
import { type TaskSpec, addTask, parseTask } from '../share/task';
import { parseMove } from '../share/transfer';
import { applyImport, nickname, planImport } from '../storage/store';
import { button, h, icon } from '../ui/dom';
import { cornerControls } from '../ui/chrome';

/** Shell of a link screen: a panel with a way back to the start. */
function linkScreen(root: HTMLElement, cls: string): HTMLElement {
  app.profile = null;
  applyProfileLook(null);
  const panel = h('main', { class: 'panel' }, h('p', { class: 'hint' }, t('share.reading')));
  root.append(h('div', { class: `screen link-screen ${cls}` },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('start'), 'btn ghost small', 'back')),
    cornerControls(),
    panel));
  return panel;
}

function broken(panel: HTMLElement, e: unknown): void {
  panel.replaceChildren(h('h1', {}, t('share.brokenTitle')), h('p', { class: 'error', role: 'alert' }, t((e as Error).message)));
}

/** A task link: which player takes it, or a new one. */
export function taskImportScreen(root: HTMLElement, params: { code: string }): void {
  const panel = linkScreen(root, 'task-import');
  void parseTask(params.code).then((spec) => {
    const take = async (pid: string) => {
      const p = app.store.get(pid)!;
      await selectProfile(p);
      addTask(p, spec);
      saveProfile();
      go('map');
    };
    panel.replaceChildren(
      h('h1', {}, t('task.importTitle')),
      taskSummary(spec),
      h('h2', {}, t('task.whoTakes')),
      h('div', { class: 'profile-list' },
        ...app.store.profiles.map((p) => h('button', { class: 'profile-card', type: 'button', onClick: () => void take(p.id) },
          tapkoElement(p.companion, 'idle', 110),
          h('span', { class: 'profile-name' }, nickname(p)),
          h('span', { class: 'profile-sub' }, t('start.stars', { n: totalStars(p) })))),
        h('button', { class: 'profile-card new', type: 'button', onClick: () => { app.pendingTask = spec; go('newProfile'); } },
          h('span', { class: 'plus' }, icon('plus')), h('span', { class: 'profile-name' }, t('start.newProfile')))));
  }, (e) => broken(panel, e));
}

/** What a task asks, in one card. */
export function taskSummary(spec: TaskSpec): HTMLElement {
  return h('div', { class: 'task-summary' },
    h('h3', {}, spec.title || t('task.untitled')),
    h('p', {}, t(`task.kind.${spec.kind}`), ' · ', t('parent.minutes', { n: spec.minutes })),
    spec.words.length ? h('p', { class: 'task-words' }, spec.words.slice(0, 20).join(', '), spec.words.length > 20 ? ' …' : '') : null,
    spec.text ? h('p', { class: 'task-text' }, spec.text.length > 160 ? `${spec.text.slice(0, 160)} …` : spec.text) : null);
}

/** A move link: the whole player from another computer; never replaces one without asking. */
export function moveImportScreen(root: HTMLElement, params: { code: string }): void {
  const panel = linkScreen(root, 'move-import');
  void parseMove(params.code).then((profile) => {
    const plan = planImport(app.store, [profile]);
    const finish = (replace: boolean) => { applyImport(app.store, plan, replace); go('start'); };
    const actions = plan.conflicts.length
      ? [button(t('import.replace'), () => finish(true), 'btn'), button(t('import.keepBoth'), () => finish(false), 'btn primary')]
      : [button(t('import.do'), () => finish(false), 'btn primary', 'upload')];
    panel.replaceChildren(
      h('h1', {}, t('move.importTitle')),
      tapkoElement(profile.companion, 'happy', 120),
      h('p', {}, t('move.importText', { name: nickname(profile), n: totalStars(profile) })),
      h('p', { class: 'error' }, plan.conflicts.length ? t('import.conflict', { names: nickname(profile) }) : ''),
      h('div', { class: 'row center' }, ...actions));
  }, (e) => broken(panel, e));
}
