import { go } from '../../app/app';
import { locale, t, tn } from '../../i18n/i18n';
import { TASK_GROUP_MAX } from '../../share/task';
import { type ResultSet, type StoredResult, TeacherStore, type Writer, mastered } from '../../share/teacher';
import { button, download, h, icon, modal } from '../../ui/dom';
import { keyLabel } from '../../ui/keyboard-guide';

/** Where the teacher is inside the page: a top part, its sub part, or one thing of it (`student/<key>`, `task/<id>`, `set/<id>`). */
export type Place = string;

/**
 * The teacher's results for the whole visit of the app: read once, then kept in memory (the
 * changes are written in the background), so moving between the parts of the page reads nothing.
 */
let ready: Promise<TeacherStore> | null = null;
export function teacherStore(): Promise<TeacherStore> {
  return (ready ??= (async () => {
    const store = new TeacherStore();
    await store.load();
    return store;
  })());
}

/** The view survives moving between the parts (memory only, never stored); a group filter of `null` is every group, the empty name "without a group". */
export const view = {
  groups: null as string | null,
  students: null as string | null,
  search: '',
  open: new Set<string>(),
  picked: new Set<string>(),
  /** The teacher came to a card or a page from a list of this page, so closing it goes back there. */
  fromList: false,
};

/** Opens a part of the teacher's page; a card or a page opened from a list closes back to it. */
export function openPlace(place: Place, fromList = false): void {
  view.fromList = fromList;
  go('teacher', { tab: place });
}

/** Closes a card or a page: back where the teacher came from, else to `fallback`. */
export function closePlace(fallback: Place): void {
  if (view.fromList) history.back();
  else openPlace(fallback);
}

export const groupName = (g: string | undefined): string => g || t('teacher.noGroup');
export const day = (ms: number): string => new Date(ms).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'numeric' });
export const clock = (ms: number): string => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
export const span = (s: ResultSet): string => (clock(s.start) === clock(s.end) ? clock(s.start) : `${clock(s.start)}–${clock(s.end)}`);
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const weakLine = (weak: [string, number][]): string => weak.map(([k]) => keyLabel(k)).join(' ');
export const isPhone = (): boolean => matchMedia('(max-width: 699px)').matches;

/** A button's label: the long text on a computer, the short one on a phone. */
export const twoLabels = (desk: string, phone: string): HTMLElement => h('span', {}, h('span', { class: 'desk-only' }, desk), h('span', { class: 'phone-only' }, phone));

export function average(rows: StoredResult[], pick: (r: StoredResult) => number | undefined): number | '-' {
  const v = rows.map(pick).filter((x): x is number => x !== undefined);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '-';
}

/** What one set's hand-ins say in numbers. */
export function setStats(rows: StoredResult[]) {
  return {
    tasks: [...new Set(rows.map((r) => r.title))].join(', '),
    ok: rows.filter(mastered).length,
    accuracy: average(rows, (r) => r.accuracy),
    rhythm: average(rows, (r) => r.cpm),
  };
}

/** The lock sign by a child whose device had its settings password removed or changed by the super player. */
export function lockMark(r: { lockRemoved?: boolean }): HTMLElement | null {
  if (!r.lockRemoved) return null;
  return h('span', { class: 'lock-mark', tip: t('teacher.lockRemoved'), 'aria-label': t('teacher.lockRemoved'), role: 'img' }, icon('lock'));
}

/** The sign by a hand-in whose checksum did not match. */
export const brokenMark = (r: { intact: boolean }): HTMLElement | null => (r.intact ? null : h('span', { class: 'error', tip: t('teacher.notIntact') }, ' !'));

export const statusPill = (ok: boolean): HTMLElement => h('span', { class: `status-pill ${ok ? 'mastered' : 'practice'}` }, t(ok ? 'teacher.status.ok' : 'teacher.status.practice'));

const csvHead = () => [t('teacher.col.group'), ...['task', 'child', 'date', 'minutes', 'accuracy', 'rhythm', 'level', 'status', 'weak'].map((c) => t(`teacher.col.${c}`)), t('teacher.col.broken')];
const csvNames = { key: keyLabel, status: (ok: boolean) => t(ok ? 'teacher.status.ok' : 'teacher.status.practice') };
export const exportCsv = (store: TeacherStore, rows: StoredResult[]): void => download('tapkotyper-results.csv', `﻿${store.csv(csvHead(), csvNames, rows)}`, 'text/csv');

/** "Meno · skupina · 3 odovzdania": a student in a list to pick from. */
export const studentLabel = (w: Writer): string => [w.name, groupName(w.group), tn('teacher.n.handIns', w.rows.length)].join(' · ');

/** A labelled choice of the dialogs and toolbars. */
export function choice(label: string, options: [string, string][], value = options[0]?.[0] ?? '', inline = false): { el: HTMLElement; select: HTMLSelectElement } {
  const select = h('select', {}, ...options.map(([v, text]) => h('option', { value: v }, text)));
  select.value = value;
  return { el: h('label', { class: inline ? 'teacher-choice inline' : 'teacher-choice' }, h('span', {}, label), select), select };
}

/**
 * The page's small dialog: a title, its fields, Zrušiť and Potvrdiť (a red Zmazať for a deletion).
 * A modal on a computer, a sheet from the bottom on a phone; the round X and Esc close it.
 * `ok` returns false to keep it open (a field left empty).
 */
export function teacherDialog(o: { title: string; fields: HTMLElement[]; ok: () => boolean | void; danger?: boolean; onClose?: () => void }): void {
  const confirm = () => { if (o.ok() !== false) close(); };
  // The first field takes the focus, not Zrušiť.
  o.fields[0]?.querySelector('select, input')?.setAttribute('autofocus', '');
  // Enter in the name field confirms too.
  const close = modal(h('form', { class: 'teacher-dialog', onSubmit: (e: Event) => { e.preventDefault(); confirm(); } },
    h('h2', { class: o.danger ? 'danger-text' : '' }, o.title),
    ...o.fields,
    h('div', { class: 'row teacher-dialog-actions' },
      button(t('teacher.dialog.cancel'), () => close(), 'btn'),
      button(t(o.danger ? 'teacher.dialog.delete' : 'teacher.dialog.confirm'), confirm, o.danger ? 'btn danger-solid' : 'btn primary'))), { cls: 'teacher-modal', onClose: o.onClose });
}

/** Asks for a new group's name; resolves with it, or null when cancelled or left empty. */
export function askGroupName(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', maxlength: TASK_GROUP_MAX, 'aria-label': t('teacher.newGroup.name') });
    let name: string | null = null;
    const field = h('label', { class: 'teacher-choice' }, h('span', {}, t('teacher.newGroup.name')), input);
    teacherDialog({ title: t('teacher.newGroup.title'), fields: [field], onClose: () => resolve(name), ok: () => {
      if (!input.value.trim()) return false;
      name = input.value.trim();
    } });
  });
}

/** The value of the "Nová skupina…" option in group choices. */
export const NEW_GROUP = '\u0000new';

/** The options of a group to put students or a task into: the groups here, a new one, none. */
export const groupTargets = (store: TeacherStore): [string, string][] => [...store.groups().map((g) => [g, g] as [string, string]), [NEW_GROUP, t('teacher.newGroup.option')], ['', t('teacher.noGroup')]];
