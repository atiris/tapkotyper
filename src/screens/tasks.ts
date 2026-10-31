import { app, go, saveProfile } from '../app/app';
import { locale, t } from '../i18n/i18n';
import { codeFrom } from '../share/codec';
import { type FinishedTask, addTask, isFinished, parseTask, runAccuracy } from '../share/task';
import type { Task, TaskSpec } from '../storage/schema';
import { HIT_MS, cameraView } from '../ui/camera';
import { cornerControls } from '../ui/chrome';
import { button, confirmDialog, h, icon, modal } from '../ui/dom';
import { taskSummary } from '../ui/task-panel';
import { handInDialog, minutesLeft, replayTask, showResultCode, startTask } from './task';

/** Milliseconds a task just added stays marked new in the list. */
const FRESH_MS = 2500;

const dateOf = (d: string) => new Date(d).toLocaleDateString(locale());

/** A task code read from a scan or a paste, or null when it is none. */
async function specOf(text: string): Promise<TaskSpec | null> {
  const code = codeFrom(text, 'task');
  if (!code) return null;
  try {
    return await parseTask(code);
  } catch {
    return null;
  }
}

/** The best run in one line: the date, the minutes, the accuracy and the rhythm. */
const bestLine = (task: FinishedTask) => t('task.bestLine', {
  date: dateOf(task.best.doneAt),
  min: Math.max(1, Math.round(task.best.seconds / 60)),
  acc: runAccuracy(task.best),
  cpm: task.best.cpm,
});

/** The best run's result in a small window, and whether a repeat improved it. */
function resultDialog(task: FinishedTask): void {
  const b = task.best;
  modal(h('div', { class: 'task-result' },
    h('h2', {}, task.title || t('task.untitled')),
    h('dl', {},
      h('dt', {}, t('task.result.date')), h('dd', {}, dateOf(b.doneAt)),
      h('dt', {}, t('task.result.minutes')), h('dd', {}, t('parent.minutes', { n: Math.max(1, Math.round(b.seconds / 60)) })),
      h('dt', {}, t('task.result.accuracy')), h('dd', {}, `${runAccuracy(b)} %`),
      h('dt', {}, t('task.result.rhythm')), h('dd', {}, String(b.cpm))),
    task.finished > 1 ? h('p', { class: 'hint' }, t(b.try > 1 ? 'task.result.improved' : 'task.result.kept')) : null));
}

/**
 * The camera in a window: a task code read flashes green, beeps, stops the camera and closes the
 * window after the flash; `onTask` gets the task. Anything else says so, at most once a second.
 */
function scanDialog(onTask: (spec: TaskSpec) => void): void {
  let got = false;
  const camera = cameraView((text) => void specOf(text).then((spec) => {
    if (got) return;
    if (!spec) return camera.unknown(t('task.notTask'));
    got = true;
    camera.hit();
    camera.stop();
    onTask(spec);
    setTimeout(close, HIT_MS);
  }), () => t('task.scanHint'));
  const close = modal(h('div', { class: 'task-scan' }, camera.frame, camera.picker, camera.status), { cls: 'task-scan-modal', onClose: () => camera.stop() });
}

/**
 * The player's Tasks page: a task is added by the camera or by a pasted link or code, then
 * played, played again (the better run counts), handed in, shown as a code or looked at.
 */
export function tasksScreen(root: HTMLElement): void {
  const p = app.profile!;
  let fresh: string | null = null;
  let freshTimer = 0;
  const list = h('ul', { class: 'my-tasks' });
  const msg = h('p', { class: 'error', role: 'alert' });
  const paste = h('input', { type: 'text', placeholder: t('task.pastePlaceholder'), 'aria-label': t('task.paste') });

  const take = (spec: TaskSpec) => {
    addTask(p, spec);
    saveProfile();
    fresh = spec.id;
    clearTimeout(freshTimer);
    freshTimer = window.setTimeout(() => {
      fresh = null;
      list.querySelector('.fresh')?.classList.remove('fresh');
    }, FRESH_MS);
    paint();
  };
  const remove = async (task: Task) => {
    const yes = await confirmDialog({ title: t('task.removeTitle'), text: t('task.removeText', { title: task.title || t('task.untitled') }), ok: t('task.remove'), cancel: t('common.back'), danger: true });
    if (!yes) return;
    p.tasks = p.tasks.filter((x) => x !== task);
    saveProfile();
    paint();
  };
  const row = (task: Task) => {
    const done = isFinished(task) ? task : null;
    const state = done ? bestLine(done) : task.limit === 'text' ? t('task.textLeft') : t('task.left', { n: minutesLeft(task) });
    return h('li', { class: `my-task${done ? ' done' : ''}${task.id === fresh ? ' fresh' : ''}` },
      h('div', { class: 'my-task-text' },
        h('b', {}, task.title || t('task.untitled')), task.group ? h('span', { class: 'chip' }, task.group) : null,
        h('p', { class: 'hint' }, taskSummary(task)),
        h('p', { class: 'my-task-state' }, done ? icon('check') : null, state)),
      h('div', { class: 'row my-task-actions' },
        done
          ? button(t('task.replay'), () => replayTask(task), 'btn small', 'replay')
          : button(t('task.play'), () => startTask(task), 'btn small primary', 'play'),
        done ? button(t('task.handIn'), () => void handInDialog(p, done), 'btn small primary', 'upload') : null,
        done ? button(t('task.qr'), () => void showResultCode(p, done), 'btn small', 'code') : null,
        done ? button(t('task.result.button'), () => resultDialog(done), 'btn small', 'chart') : null,
        button(t('task.remove'), () => void remove(task), 'btn small ghost', 'trash')));
  };
  // Unfinished first, each part newest first.
  const paint = () => list.replaceChildren(...(p.tasks.length
    ? [...p.tasks.filter((x) => !x.best), ...p.tasks.filter((x) => x.best)].map(row)
    : [h('li', { class: 'hint' }, t('task.noneYet'))]));
  const add = async () => {
    msg.textContent = '';
    const spec = await specOf(paste.value);
    if (!spec) return void (msg.textContent = t('task.notTask'));
    paste.value = '';
    take(spec);
  };
  paint();
  root.append(h('div', { class: 'screen tasks-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('task.pageTitle'))),
    cornerControls(),
    h('main', { class: 'panel' },
      h('section', { class: 'task-add' },
        button(t('task.scan'), () => scanDialog(take), 'btn primary', 'camera'),
        h('form', { class: 'row', onSubmit: (e: Event) => { e.preventDefault(); void add(); } },
          paste, h('button', { class: 'btn', type: 'submit' }, icon('plus'), h('span', {}, t('task.add')))),
        msg),
      h('h2', {}, t('task.mine')),
      list)));
}
