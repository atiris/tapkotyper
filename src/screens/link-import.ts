import { app, applyProfileLook, go } from '../app/app';
import { tapkoElement } from '../gfx/tapko';
import { totalStars } from '../game/rewards';
import { t } from '../i18n/i18n';
import { parseTask } from '../share/task';
import { parseMove } from '../share/transfer';
import { applyImport, nickname, planImport } from '../storage/store';
import { button, h } from '../ui/dom';
import { cornerControls } from '../ui/chrome';
import { startScreen } from './start';

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

/** A task link: the start page with the task, where a player takes it (or a new one). */
export function taskImportScreen(root: HTMLElement, params: { code: string }): () => void {
  const panel = linkScreen(root, 'task-import');
  let off: () => void = () => undefined;
  let left = false;
  void parseTask(params.code).then((spec) => {
    if (left) return;
    root.replaceChildren();
    off = startScreen(root, { task: { spec, code: params.code } });
  }, (e) => broken(panel, e));
  return () => {
    left = true;
    off();
  };
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
