import { go } from '../app/app';
import { tapkoElement } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { nextLevel } from '../game/levels';
import { localDate } from '../learning/stats';
import { linkOf } from '../share/codec';
import { makeResult, resultCode } from '../share/result';
import { activeTask, taskLeft } from '../share/task';
import type { Profile, Task } from '../storage/schema';
import { nickname } from '../storage/store';
import { button, h, modal } from '../ui/dom';
import { bigCode } from '../ui/big-code';
import { fitsQr, linkBox } from '../ui/link-box';
import { playLevel } from './map';

/** Plays the task: a timed practice of what is left, or the next story level. */
export function startTask(p: Profile, task: Task): void {
  if (task.kind === 'practice') go('level', { id: 'practice', seconds: taskLeft(task), task: task.id });
  else {
    const next = nextLevel(p);
    // No level open for the child's keys: practice the task's minutes instead.
    if (next) playLevel(next.id, task.id);
    else go('level', { id: 'practice', seconds: taskLeft(task), task: task.id });
  }
}

/** Minutes of a task still to play, rounded up. */
export const minutesLeft = (task: Task) => Math.max(1, Math.ceil(taskLeft(task) / 60));

/** The map's first card: today's task, or the hand-in of one finished today. */
export function taskCard(p: Profile): HTMLElement | null {
  const task = activeTask(p);
  if (task) {
    return h('section', { class: 'task-card' },
      h('h2', {}, t('task.today')),
      h('p', { class: 'task-title' }, task.title || t('task.untitled')),
      h('p', { class: 'hint' }, t('task.left', { n: minutesLeft(task) })),
      button(t('task.start'), () => startTask(p, task), 'btn primary', 'play'));
  }
  const done = p.tasks.find((x) => x.doneAt === localDate());
  if (!done) return null;
  return h('section', { class: 'task-card done' },
    h('h2', {}, t('task.doneToday')),
    h('p', { class: 'task-title' }, done.title || t('task.untitled')),
    button(t('task.handIn'), () => void handInDialog(p, done), 'btn primary', 'upload'));
}

/** The result as a link for the teacher, with a short how-to. */
export async function handInDialog(p: Profile, task: Task): Promise<void> {
  const link = linkOf('result', await resultCode(makeResult(p, task)));
  modal(h('div', { class: 'hand-in' },
    tapkoElement(p.companion, 'happy', 100),
    h('h2', {}, t('task.handInTitle')),
    h('p', {}, t('task.handInText')),
    fitsQr(link) ? button(t('task.bigCode'), () => bigCode(link, nickname(p), t('progress.exerciseCaption', { title: task.title || t('task.untitled') }), 'exercise'), 'btn', 'fullscreen') : null,
    linkBox(link),
    h('p', { class: 'hint' }, t('task.checksumNote'))), { cls: 'share-modal' });
}
