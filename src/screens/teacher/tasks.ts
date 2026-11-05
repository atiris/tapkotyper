import { app } from '../../app/app';
import { locale, t } from '../../i18n/i18n';
import { linkOf } from '../../share/codec';
import { keepTeacherTask, taskCode } from '../../share/task';
import type { TeacherStore } from '../../share/teacher';
import type { TaskSpec } from '../../storage/schema';
import { bigCode } from '../../ui/big-code';
import { button, closeButton, confirmDialog, h, icon } from '../../ui/dom';
import { copyLink, fitsQr, qr } from '../../ui/link-box';
import { type TaskForm, taskForm } from '../../ui/task-form';
import { taskSummary } from '../../ui/task-panel';
import type { Part } from './collect';
import { askGroupName, closePlace, openPlace } from './common';

/** The form lives for the whole visit of the app, so what is typed into it stays while the teacher looks elsewhere; a new language builds it again. */
let form: { el: TaskForm; lang: string } | null = null;

const taskLine = (x: TaskSpec) => [taskSummary(x), x.group].filter(Boolean).join(' · ');

function theForm(store: TeacherStore): TaskForm {
  if (form?.lang !== locale()) {
    form = {
      lang: locale(),
      el: taskForm((spec) => {
        app.store.data.teacherTasks = keepTeacherTask(app.store.data.teacherTasks, spec);
        app.store.save();
        openPlace(`task/${spec.id}`);
      }, {
        // The groups of the results and of the tasks made here.
        list: () => [...new Set([...store.groups(), ...app.store.data.teacherTasks.flatMap((x) => (x.group ? [x.group] : []))])],
        ask: askGroupName,
      }),
    };
  }
  return form.el;
}

/** Nová úloha: the form; a saved task opens among the prepared ones. */
export function newTaskPart(store: TeacherStore): Part {
  const f = theForm(store);
  f.refresh();
  if (f.editing()) requestAnimationFrame(() => f.focus());
  return { nodes: [h('p', { class: 'hint teacher-intro desk-only' }, t('teacher.tasks.intro')), h('section', { class: 'task-make' }, f.el)] };
}

/** One task to hand out: its QR code, copying (or sharing) its link, the big code, changing and removing it. */
function openTask(spec: TaskSpec, store: TeacherStore): HTMLElement {
  const title = spec.title || t('task.untitled');
  const code = h('div', { class: 'task-open-code' });
  const done = h('span', { class: 'hint', 'aria-live': 'polite' });
  const area = h('textarea', { class: 'sr-only', readonly: true, tabindex: -1, 'aria-hidden': 'true' });
  const actions = h('div', { class: 'task-open-actions' });
  const remove = async () => {
    const yes = await confirmDialog({ title: t('teacher.tasks.removeTitle'), text: t('teacher.tasks.removeText', { title }), ok: t('teacher.tasks.remove'), cancel: t('common.back'), danger: true });
    if (!yes) return;
    app.store.data.teacherTasks = app.store.data.teacherTasks.filter((x) => x.id !== spec.id);
    app.store.save();
    openPlace('tasks/ready');
  };
  void taskCode(spec).then((c) => {
    const link = linkOf('task', c);
    area.value = link;
    code.replaceChildren(fitsQr(link) ? qr(link) : h('p', { class: 'hint' }, t('share.noQr')));
    const share = !!navigator.share;
    const copy = (cls: string) => button(t('teacher.tasks.copy'), async () => {
      await copyLink(link, area);
      done.textContent = t('share.copied');
    }, cls);
    actions.replaceChildren(
      h('div', { class: 'task-open-pair' },
        share ? button(t('teacher.tasks.share'), () => void navigator.share({ url: link, title }).catch(() => undefined), 'btn primary phone-only') : null,
        // With a share sheet the phone's main button shares; a computer copies.
        ...(share ? [copy('btn primary desk-only'), copy('btn phone-only')] : [copy('btn primary')]),
        fitsQr(link) ? button(t('task.bigCode'), () => bigCode(link, '', title, 'task'), 'btn desk-only') : null),
      h('div', { class: 'task-open-pair' },
        button(t('teacher.tasks.edit'), () => {
          theForm(store).edit(spec);
          openPlace('tasks/new');
        }, 'btn'),
        button(t('teacher.tasks.remove'), () => void remove(), 'btn danger-line')),
      done, area);
  });
  return h('section', { class: 'task-open', 'aria-labelledby': 'task-open-title' },
    h('div', { class: 'own-head' },
      h('div', { class: 'own-title' }, h('h2', { id: 'task-open-title' }, title), h('span', { class: 'hint' }, taskLine(spec))),
      closeButton(() => closePlace('tasks/ready'))),
    code,
    actions);
}

/** Pripravené úlohy: the tasks made here, newest first; one opens beside the list on a computer, as its own page on a phone. */
export function readyPart(store: TeacherStore, id?: string): Part {
  const tasks = app.store.data.teacherTasks;
  const open = tasks.find((x) => x.id === id);
  const show = (x: TaskSpec) => () => openPlace(`task/${x.id}`, true);
  const qrButton = (x: TaskSpec) => h('button', { type: 'button', class: 'qr-btn', 'aria-label': t('teacher.tasks.show'), tip: t('teacher.tasks.show'), onClick: show(x) }, icon('qr'));
  if (!tasks.length) return { nodes: [h('p', { class: 'hint' }, t('teacher.tasks.empty'))] };
  return {
    own: !!open,
    ...(open && { close: () => closePlace('tasks/ready') }),
    nodes: [h('div', { class: `ready${open ? ' has-open' : ''}` },
      h('div', { class: 'ready-list' },
        h('div', { class: 'teacher-table' }, h('table', { class: 'ready-table' },
          h('thead', {}, h('tr', {}, ...['task', 'game', 'group', 'made'].map((c) => h('th', { scope: 'col' }, t(`teacher.tasks.col.${c}`))), h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, t('teacher.tasks.col.actions'))))),
          h('tbody', {}, ...tasks.map((x) => h('tr', { class: x === open ? 'on' : '' },
            h('td', {}, h('b', {}, x.title || t('task.untitled'))), h('td', {}, taskSummary(x)), h('td', {}, x.group || '—'),
            h('td', {}, new Date(x.madeAt).toLocaleDateString(locale())), h('td', {}, qrButton(x))))))),
        h('ul', { class: 'teacher-rows' }, ...tasks.map((x) => h('li', { class: 'ready-row' },
          h('span', { class: 'teacher-row-main' }, h('b', {}, x.title || t('task.untitled')), h('span', { class: 'hint' }, taskLine(x))),
          qrButton(x))))),
      open ? openTask(open, store) : null)],
  };
}
