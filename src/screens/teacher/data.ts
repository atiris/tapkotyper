import { locale, t } from '../../i18n/i18n';
import { TASK_GROUP_MAX } from '../../share/task';
import { TAPKO_TYPE, parseTapko, tapkoFile, tapkoName } from '../../share/tapko-file';
import type { TeacherStore } from '../../share/teacher';
import { button, download, h } from '../../ui/dom';
import type { Part } from './collect';
import { choice, clock, isPhone, openPlace, studentLabel, teacherDialog, twoLabels } from './common';

/** What the last load of files said, for the import page. */
let loaded: { text: string; ok: boolean }[] = [];

/** Loads `.tapko` files whole (what is here already only notes the file) and notes how each went for the import page. */
export async function loadFiles(store: TeacherStore, files: File[]): Promise<void> {
  loaded = [];
  for (const f of files) {
    try {
      const { sets, results } = parseTapko(await f.text());
      store.importFile(f.name, sets, results);
      loaded.push({ text: t('teacher.import.ok', { name: f.name }), ok: true });
    } catch (e) {
      loaded.push({ text: t('teacher.import.bad', { name: f.name, why: t((e as Error).message) }), ok: false });
    }
  }
}

/** Every result as one `.tapko` file: to another app on a phone that can share files, else saved. */
function exportAll(store: TeacherStore): void {
  const name = tapkoName();
  const text = tapkoFile(store.sets, store.results);
  const file = new File([text], name, { type: TAPKO_TYPE });
  const share = (() => { try { return isPhone() && !!navigator.canShare?.({ files: [file] }); } catch { return false; } })();
  if (share) void navigator.share({ files: [file], title: name }).catch(() => undefined);
  else download(name, text, TAPKO_TYPE);
}

/** Import výsledkov: a place to drop a file, the button to pick one, and how the last load went. */
export function importPart(store: TeacherStore): Part {
  // Said once: a later visit starts clean.
  const said = loaded;
  loaded = [];
  const input = h('input', { type: 'file', accept: `.tapko,${TAPKO_TYPE},application/json`, multiple: true, hidden: true, onChange: () => {
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length) void loadFiles(store, files).then(() => openPlace('eval/import'));
  } });
  return {
    nodes: [
      h('nav', { class: 'crumbs', 'aria-label': t('teacher.student.crumbs') },
        h('a', { href: '#/teacher/eval/data', onClick: (e: Event) => { e.preventDefault(); openPlace('eval/data'); } }, t('teacher.sub.data')),
        h('span', { 'aria-hidden': 'true' }, '›'),
        h('h2', {}, t('teacher.data.import'))),
      h('div', { class: 'drop-zone' }, h('span', { class: 'hint' }, t('teacher.import.drop')), button(t('teacher.import.pick'), () => input.click(), 'btn primary'), input),
      ...said.map((m) => h('p', { class: `teacher-note ${m.ok ? 'good' : 'bad'}`, role: 'status' }, m.text)),
    ],
  };
}

/** Dáta: moving the results to another computer, putting groups and students in order, and deleting. */
export function dataPart(store: TeacherStore): Part {
  const body = h('div', { class: 'data-grid' });
  const groupOptions = (withNone = false): [string, string][] => [...store.groups().map((g) => [g, g] as [string, string]), ...(withNone && store.results.some((r) => !r.group) ? [['', t('teacher.noGroup')] as [string, string]] : [])];
  const studentOptions = (): [string, string][] => store.writers().sort((a, b) => a.name.localeCompare(b.name)).map((w) => [w.key, studentLabel(w)]);
  const done = () => paint();

  const rename = () => {
    const group = choice(t('teacher.groupLabel'), groupOptions());
    const name = h('input', { type: 'text', maxlength: TASK_GROUP_MAX });
    teacherDialog({ title: t('teacher.data.rename'), fields: [group.el, h('label', { class: 'teacher-choice' }, h('span', {}, t('teacher.data.newName')), name)], ok: () => {
      if (!name.value.trim()) return false;
      store.renameGroup(group.select.value, name.value);
      done();
    } });
  };
  const mergeGroups = () => {
    const groups = groupOptions();
    const from = choice(t('teacher.data.source'), groups);
    const into = choice(t('teacher.data.into'), groups, groups[1]?.[0]);
    teacherDialog({ title: t('teacher.data.mergeGroups'), fields: [from.el, into.el], ok: () => {
      if (from.select.value === into.select.value) return false;
      store.renameGroup(from.select.value, into.select.value);
      done();
    } });
  };
  const mergeStudents = () => {
    const students = studentOptions();
    const old = choice(t('teacher.data.oldStudent'), students);
    const into = choice(t('teacher.data.into'), students, students[1]?.[0]);
    teacherDialog({ title: t('teacher.data.mergeStudents'), fields: [old.el, into.el], ok: () => {
      if (old.select.value === into.select.value) return false;
      store.mergeStudents(old.select.value, into.select.value);
      done();
    } });
  };
  const deleting = (title: string, fields: HTMLElement[], go: () => void) => teacherDialog({ title, fields, danger: true, ok: () => { go(); done(); } });
  const deleteGroupStudents = () => {
    const group = choice(t('teacher.groupLabel'), groupOptions(true));
    deleting(t('teacher.data.deleteGroupStudents'), [group.el], () => store.removeMany(store.results.filter((r) => (r.group ?? '') === group.select.value)));
  };
  const deleteStudent = () => {
    const student = choice(t('teacher.data.student'), studentOptions());
    deleting(t('teacher.data.deleteStudent'), [student.el], () => store.removeMany(store.childResults(student.select.value)));
  };
  const deleteGroup = () => {
    const group = choice(t('teacher.groupLabel'), groupOptions());
    deleting(t('teacher.data.deleteGroup'), [group.el, h('p', { class: 'hint' }, t('teacher.data.deleteGroupText'))], () => store.renameGroup(group.select.value, ''));
  };
  const deleteFiles = () => {
    const file = choice(t('teacher.data.file'), store.files.map((f) => [f.id, `${f.name} · ${new Date(f.loadedAt).toLocaleDateString(locale())} ${clock(f.loadedAt)}`]));
    deleting(t('teacher.data.deleteFiles'), [file.el, h('p', { class: 'hint' }, t('teacher.data.deleteFilesText'))], () => store.deleteFile(file.select.value));
  };
  const deleteAll = () => deleting(t('teacher.data.deleteAll'), [h('p', {}, t('teacher.data.deleteAllText'))], () => store.clearAll());

  const action = (label: string | Node, run: () => void, cls: string, can: boolean) => {
    const b = button(label, run, cls);
    b.disabled = !can;
    return b;
  };
  const paint = () => {
    const has = store.results.length > 0;
    const groups = store.groups().length;
    const students = store.writers().length;
    body.replaceChildren(
      h('section', { class: 'data-card' }, h('h2', {}, t('teacher.data.transfer')),
        h('div', { class: 'data-pair' },
          action(twoLabels(t('teacher.data.export'), t('teacher.data.exportShort')), () => exportAll(store), 'btn primary', has),
          action(twoLabels(t('teacher.data.import'), t('teacher.data.importShort')), () => openPlace('eval/import'), 'btn', true))),
      h('section', { class: 'data-card' }, h('h2', {}, t('teacher.data.order')),
        h('div', { class: 'data-buttons' },
          action(t('teacher.data.rename'), rename, 'btn', groups > 0),
          action(t('teacher.data.mergeGroups'), mergeGroups, 'btn', groups > 1),
          action(t('teacher.data.mergeStudents'), mergeStudents, 'btn', students > 1))),
      h('section', { class: 'data-card' }, h('h2', { class: 'danger-text' }, t('teacher.data.delete')),
        h('div', { class: 'data-buttons' },
          action(t('teacher.data.deleteGroupStudents'), deleteGroupStudents, 'btn danger-line', has),
          action(t('teacher.data.deleteStudent'), deleteStudent, 'btn danger-line', students > 0),
          action(t('teacher.data.deleteGroup'), deleteGroup, 'btn danger-line', groups > 0),
          action(t('teacher.data.deleteFiles'), deleteFiles, 'btn danger-line', store.files.length > 0),
          action(t('teacher.data.deleteAll'), deleteAll, 'btn danger-solid', has || store.files.length > 0))));
  };
  paint();
  return { nodes: [h('p', { class: 'hint teacher-intro desk-only' }, t('teacher.eval.dataIntro')), body] };
}

