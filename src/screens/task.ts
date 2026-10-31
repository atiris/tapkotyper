import { app, go } from '../app/app';
import { t, tn } from '../i18n/i18n';
import { localDate } from '../learning/stats';
import { linkOf } from '../share/codec';
import { makeResult, resultCode } from '../share/result';
import { type FinishedTask, activeTask, isFinished } from '../share/task';
import type { Profile, Task } from '../storage/schema';
import { nickname } from '../storage/store';
import { button, h, modal } from '../ui/dom';
import { type EndAction, endCard } from '../ui/end-card';
import { bigCode } from '../ui/big-code';
import { copyLink, fitsQr } from '../ui/link-box';

/** Plays the task in its own game; a finished one once more, its best staying unless this run is better. */
export function startTask(task: Task): void {
  go('level', { id: 'task', task: task.id });
}

/** What an unfinished task asks: its whole text, or its minutes. */
export const taskAsks = (task: Task): string => (task.limit === 'text' ? t('task.textLeft') : t('task.left', { n: task.minutes }));

/** The map's first card: today's task, or the hand-in of one finished today. */
export function taskCard(p: Profile): HTMLElement | null {
  const task = activeTask(p);
  if (task) {
    return h('section', { class: 'task-card' },
      h('h2', {}, t('task.today')),
      h('p', { class: 'task-title' }, task.title || t('task.untitled')),
      h('p', { class: 'hint' }, taskAsks(task)),
      button(t('task.start'), () => startTask(task), 'btn primary', 'play'));
  }
  const done = p.tasks.filter(isFinished).find((x) => x.best.doneAt === localDate());
  if (!done) return null;
  return h('section', { class: 'task-card done' },
    h('h2', {}, t('task.doneToday')),
    h('p', { class: 'task-title' }, done.title || t('task.untitled')),
    button(t('task.handIn'), () => void handInDialog(p, done), 'btn primary', 'upload'));
}

/** The link of a finished task's result: its best run. */
export const resultLink = async (p: Profile, task: FinishedTask): Promise<string> =>
  linkOf('result', await resultCode(makeResult(p, task, app.store.data.lockRemovedAt !== undefined)));

/** The big QR code of a finished task's result. */
export async function showResultCode(p: Profile, task: FinishedTask): Promise<void> {
  bigCode(await resultLink(p, task), nickname(p), t('task.resultCaption', { title: task.title || t('task.untitled') }), 'exercise');
}

/** The finished task's end card: the best run's result as a link for the teacher, to copy or show as a big code. */
export async function handInDialog(p: Profile, task: FinishedTask): Promise<void> {
  const link = await resultLink(p, task);
  const title = task.title || t('task.untitled');
  const area = h('textarea', { class: 'link-text', rows: 2, readonly: true, 'aria-label': t('share.link') });
  area.value = link;
  area.addEventListener('focus', () => area.select());
  const copied = h('span', { class: 'hint', 'aria-live': 'polite' });
  const close = modal(endCard({
    cls: 'task-done',
    title: t('end.taskDone'),
    picture: 'ui-end-task',
    under: tn('end.minutes', Math.max(1, Math.round(task.best.seconds / 60))),
    rows: [[t('end.task'), title], [t('end.sendTeacher'), t('end.sendHow')]],
    extra: h('div', { class: 'ec-link' }, area, copied),
    actions: [
      { label: t('share.copy'), icon: 'copy', run: async () => {
        await copyLink(link, area);
        copied.textContent = t('share.copied');
      } },
      ...(fitsQr(link) ? [{ label: t('task.bigCode'), icon: 'fullscreen', run: () => bigCode(link, nickname(p), t('task.resultCaption', { title }), 'exercise') } satisfies EndAction] : []),
    ],
    toMap: () => {
      close();
      go('map');
    },
  }), { cls: 'end-modal' });
}
