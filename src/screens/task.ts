import { app, go } from '../app/app';
import { t, tn } from '../i18n/i18n';
import { nextLevel } from '../game/levels';
import { localDate } from '../learning/stats';
import { linkOf } from '../share/codec';
import { makeResult, resultCode } from '../share/result';
import { activeTask, taskLeft } from '../share/task';
import type { Profile, Task } from '../storage/schema';
import { nickname } from '../storage/store';
import { button, h, modal } from '../ui/dom';
import { type EndAction, endCard } from '../ui/end-card';
import { bigCode } from '../ui/big-code';
import { copyLink, fitsQr } from '../ui/link-box';

/** Plays the task: a timed practice of what is left, or the next story level. */
export function startTask(p: Profile, task: Task): void {
  if (task.kind === 'practice') go('level', { id: 'practice', seconds: taskLeft(task), task: task.id });
  else {
    const next = nextLevel(p);
    // No level open for the child's keys: practice the task's minutes instead.
    if (next) go('level', { id: next.id, task: task.id });
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

/** The finished task's end card: the result as a link for the teacher, to copy or show as a big code. */
export async function handInDialog(p: Profile, task: Task): Promise<void> {
  const link = linkOf('result', await resultCode(makeResult(p, task, app.store.data.lockRemovedAt !== undefined)));
  const title = task.title || t('task.untitled');
  const area = h('textarea', { class: 'link-text', rows: 2, readonly: true, 'aria-label': t('share.link') });
  area.value = link;
  area.addEventListener('focus', () => area.select());
  const copied = h('span', { class: 'hint', 'aria-live': 'polite' });
  const close = modal(endCard({
    cls: 'task-done',
    title: t('end.taskDone'),
    picture: 'ui-end-task',
    under: tn('end.minutes', Math.max(1, Math.round(task.seconds / 60))),
    rows: [[t('end.task'), title], [t('end.sendTeacher'), t('end.sendHow')]],
    extra: h('div', { class: 'ec-link' }, area, copied),
    actions: [
      { label: t('share.copy'), icon: 'copy', run: async () => {
        await copyLink(link, area);
        copied.textContent = t('share.copied');
      } },
      ...(fitsQr(link) ? [{ label: t('task.bigCode'), icon: 'fullscreen', run: () => bigCode(link, nickname(p), t('progress.exerciseCaption', { title }), 'exercise') } satisfies EndAction] : []),
    ],
    toMap: () => {
      close();
      go('map');
    },
  }), { cls: 'end-modal' });
}
