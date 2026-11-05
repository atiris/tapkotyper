import { app, applyProfileLook, go, screenVisit } from '../app/app';
import { t } from '../i18n/i18n';
import { cornerControls } from '../ui/chrome';
import { button, h } from '../ui/dom';
import { type Part, linkPart, resultsPart, scanPart } from './teacher/collect';
import { type Place, openPlace, teacherStore, twoLabels } from './teacher/common';
import { dataPart, importPart, loadFiles } from './teacher/data';
import { filesPart, groupsPart, setPart, studentPart, studentsPart } from './teacher/evaluate';
import { newTaskPart, readyPart } from './teacher/tasks';
import type { TeacherStore } from '../share/teacher';

type Top = 'results' | 'eval' | 'tasks';
const TOPS: [Top, Place][] = [['results', ''], ['eval', 'eval/groups'], ['tasks', 'tasks/new']];
const SUBS: Record<Exclude<Top, 'results'>, string[]> = { eval: ['groups', 'students', 'files', 'data'], tasks: ['new', 'ready'] };

/** The tabs' addresses from before the three parts, kept working. */
const OLD: Record<string, Place> = { groups: 'eval/groups', writers: 'eval/students', files: 'eval/files', newTask: 'tasks/new', tasks: 'tasks/ready', eval: 'eval/groups' };

/** Where an address points: its part, the top tab and the sub tab it belongs to (none for a card or a page of its own). */
function partOf(store: TeacherStore, place: Place, code?: string): { top: Top; sub?: string; part: Part } {
  const [head, ...rest] = place.split('/');
  const arg = rest.join('/');
  if (head === 'scan') return { top: 'results', part: scanPart(store) };
  if (head === 'link') return { top: 'results', part: linkPart(store) };
  if (head === 'eval') {
    if (arg === 'import') return { top: 'eval', part: importPart(store) };
    const sub = SUBS.eval.includes(arg) ? arg : 'groups';
    return { top: 'eval', sub, part: sub === 'students' ? studentsPart(store) : sub === 'files' ? filesPart(store) : sub === 'data' ? dataPart(store) : groupsPart(store) };
  }
  if (head === 'student' && store.childResults(arg).length) return { top: 'eval', part: studentPart(store, arg) };
  if (head === 'student') return { top: 'eval', sub: 'students', part: studentsPart(store) };
  if (head === 'set') {
    const set = store.sets.find((s) => s.id === arg && store.setResults(s).length);
    return set ? { top: 'eval', part: setPart(store, set) } : { top: 'eval', sub: 'groups', part: groupsPart(store) };
  }
  if (head === 'tasks') return arg === 'ready' ? { top: 'tasks', sub: 'ready', part: readyPart(store) } : { top: 'tasks', sub: 'new', part: newTaskPart(store) };
  if (head === 'task') return { top: 'tasks', sub: 'ready', part: readyPart(store, arg) };
  return { top: 'results', part: resultsPart(store, code) };
}

/** A row of tabs that open their parts; the open one is marked. */
function tabRow(cls: string, label: string, tabs: [string, Node | string, Place][], on: string): HTMLElement {
  return h('nav', { class: cls, 'aria-label': label }, ...tabs.map(([id, text, place]) =>
    h('button', { type: 'button', class: id === on ? 'on' : '', ...(id === on && { 'aria-current': 'page' }), onClick: () => openPlace(place) }, text)));
}

/**
 * The teacher's page, kept in this browser only, in three parts: Výsledky (the camera, links and
 * the results added last), Hodnotenie (groups, students, loaded files and the data tools) and
 * Úlohy (making tasks and the prepared ones). Each part, card and page has its own address
 * (`tab`, or the old `child` and `set`); a result link (`code`) is added on the way in, and
 * `.tapko` files the app was opened with load. Returns the cleanup that stops the camera.
 */
export function teacherScreen(root: HTMLElement, params: { code?: string; child?: string; set?: string; tab?: string }): () => void {
  app.profile = null;
  applyProfileLook(null);
  const visit = screenVisit();
  let stop: () => void = () => undefined;
  const place = params.child ? `student/${params.child}` : params.set ? `set/${params.set}` : OLD[params.tab ?? ''] ?? params.tab ?? '';
  // The page paints once the results are read; a teacher who left meanwhile gets nothing.
  void teacherStore().then(async (store) => {
    const opened = app.openedFiles.splice(0);
    if (opened.length) await loadFiles(store, opened);
    if (visit !== screenVisit()) return;
    const { top, sub, part } = partOf(store, place, params.code);
    // Esc closes a card or a page of its own, unless a dialog over it takes the key.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && part.close && !document.querySelector('.modal-back')) part.close();
    };
    document.addEventListener('keydown', onKey);
    stop = () => {
      document.removeEventListener('keydown', onKey);
      part.stop?.();
    };
    const ready = app.store.data.teacherTasks.length;
    const screen = h('div', { class: `screen teacher-screen${part.own ? ' own-page' : ''}`, 'data-place': place.split('/')[0] || 'results' },
      h('header', { class: 'bar' }, button(t('common.back'), () => go('start'), 'btn ghost small', 'back'), h('h1', {}, t('teacher.title'))),
      cornerControls(),
      h('main', { class: 'panel teacher-main' },
        tabRow('teacher-top', t('teacher.parts'), TOPS.map(([id, to]) => [id, t(`teacher.top.${id}`), to]), top),
        top !== 'results' && sub ? tabRow('teacher-sub', t(`teacher.top.${top}`), SUBS[top].map((s) => [s, s === 'ready' ? twoLabels(t('teacher.sub.ready', { n: ready }), t('teacher.sub.readyShort', { n: ready })) : t(`teacher.sub.${s}`), `${top}/${s}`]), sub) : null,
        ...part.nodes));
    // A `.tapko` file dropped anywhere on the page loads.
    screen.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
    screen.addEventListener('drop', (e) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      void loadFiles(store, [...e.dataTransfer.files]).then(() => openPlace('eval/import'));
    });
    root.append(screen);
  });
  return () => stop();
}
