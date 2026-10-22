import { app, applyProfileLook, go } from '../app/app';
import { t } from '../i18n/i18n';
import { codeFrom } from '../share/codec';
import { parseResult } from '../share/result';
import { TASK_GROUP_MAX } from '../share/task';
import { type StoredResult, TeacherStore } from '../share/teacher';
import { button, confirmDialog, download, h } from '../ui/dom';
import { keyLabel } from '../ui/keyboard-guide';
import { cornerControls } from '../ui/chrome';
import { type ScanCard, scanCard } from './teacher-scan';

/** Accuracy in percent from which a child has mastered the task (two stars in the game). */
const MASTERED = 85;

/** Which rows the table shows: all, or one group (the empty name is "without a group"). */
type Filter = { group: string } | null;

/**
 * The teacher's table of handed-in results, kept in this browser only. Opened from the start
 * page or by a result link, whose result is added on the way in; results also come from pasted
 * links and from QR codes read with the camera. Returns the cleanup that stops the camera.
 */
export function teacherScreen(root: HTMLElement, params: { code?: string }): () => void {
  app.profile = null;
  applyProfileLook(null);
  const store = new TeacherStore();
  const msg = h('p', { role: 'status', 'aria-live': 'polite' });
  const table = h('div', { class: 'teacher-table' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': t('teacher.groupFilter') });
  const count = h('p', { class: 'hint teacher-count' });
  const actions = h('div', { class: 'row teacher-actions' });
  const scanSlot = h('div', {});
  const paste = h('input', { type: 'text', placeholder: t('teacher.pastePlaceholder'), 'aria-label': t('teacher.paste') });
  const scanGroup = h('input', { type: 'text', list: 'teacher-groups', maxlength: TASK_GROUP_MAX, placeholder: t('teacher.scan.groupPlaceholder'), 'aria-label': t('teacher.scan.group') });
  const groupNames = h('datalist', { id: 'teacher-groups' });
  let filter: Filter = null;
  const picked = new Set<StoredResult>();
  let scan: ScanCard | null = null;
  /** Results this scan collected; `updated` when a child's older result was replaced. */
  let session: { taskId: string; name: string; updated: boolean }[] = [];
  let lastUnknown = -Infinity;

  const shown = () => store.sorted(store.results.filter((r) => !filter || (r.group ?? '') === filter.group));

  const addCode = async (code: string | null, fromScan = false) => {
    msg.className = '';
    msg.textContent = '';
    try {
      if (!code) throw new Error('share.broken');
      const parsed = await parseResult(code);
      const { intact } = parsed;
      // A scan writes every new result into the group being scanned.
      const result = fromScan && scanGroup.value.trim() ? { ...parsed.result, group: scanGroup.value.trim() } : parsed.result;
      const status = store.add(result, intact);
      if (status !== 'same') {
        session = session.filter((s) => !(s.taskId === result.taskId && s.name === result.name));
        session.push({ taskId: result.taskId, name: result.name, updated: status === 'updated' });
        scan?.hit();
      }
      if (!fromScan) {
        msg.className = intact ? 'ok' : 'error';
        msg.textContent = `${t(status === 'same' ? 'teacher.already' : 'teacher.added', { name: result.name, title: result.title })}${intact ? '' : ` ${t('teacher.notIntact')}`}`;
      }
      paint();
    } catch (e) {
      if (fromScan) {
        // Not a TapkoTyper code: one hint a second at most.
        if (performance.now() - lastUnknown > 1000) scan?.hint(t('teacher.scan.unknown'));
        lastUnknown = performance.now();
        return;
      }
      msg.className = 'error';
      msg.textContent = t((e as Error).message);
    }
  };

  const remove = async (r: StoredResult) => {
    const yes = await confirmDialog({ title: t('teacher.removeTitle'), text: t('teacher.removeText', { name: r.name, title: r.title }), ok: t('teacher.remove'), cancel: t('common.back'), danger: true });
    if (!yes) return;
    store.remove(r);
    paint();
  };

  const removePicked = async () => {
    const rows = [...picked];
    const yes = await confirmDialog({ title: t('teacher.removeManyTitle'), text: t('teacher.removeManyText', { n: rows.length }), ok: t('teacher.remove'), cancel: t('common.back'), danger: true });
    if (!yes) return;
    store.removeMany(rows);
    paint();
  };

  const assignPicked = () => {
    const name = window.prompt(t('teacher.assignPrompt', { groups: store.groups().join(', ') || '-' }), store.groups()[0] ?? '');
    if (name === null) return;
    store.assign([...picked], name.trim().slice(0, TASK_GROUP_MAX));
    paint();
  };

  const head = ['task', 'child', 'date', 'minutes', 'accuracy', 'rhythm', 'level', 'status', 'weak'].map((c) => t(`teacher.col.${c}`));
  const csvHead = [t('teacher.col.group'), ...head, t('teacher.col.broken')];
  const exportCsv = (rows: StoredResult[]) => download('tapkotyper-results.csv', `﻿${store.csv(csvHead, keyLabel, rows)}`, 'text/csv');

  const average = (rows: StoredResult[], pick: (r: StoredResult) => number | undefined) => {
    const v = rows.map(pick).filter((x): x is number => x !== undefined);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '-';
  };
  /** The work of a set of children in one line: how many handed in, how well, how far. */
  const summary = (rows: StoredResult[]) => t('teacher.summary', {
    n: rows.length,
    ok: rows.filter((r) => r.accuracy >= MASTERED).length,
    accuracy: average(rows, (r) => r.accuracy),
    rhythm: average(rows, (r) => r.cpm),
    levels: average(rows, (r) => r.levels),
  });

  const paintChips = () => {
    const groups = store.groups();
    groupNames.replaceChildren(...groups.map((g) => h('option', { value: g })));
    const chip = (label: string, group: string | null) => {
      const on = group === null ? !filter : filter?.group === group;
      return h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': on, onClick: () => { filter = group === null ? null : { group }; paint(); } }, label);
    };
    chips.replaceChildren(...(groups.length ? [chip(t('teacher.all'), null), ...groups.map((g) => chip(g, g)), store.results.some((r) => !r.group) ? chip(t('teacher.noGroup'), '') : null] : []).filter((x): x is HTMLButtonElement => !!x));
  };

  const paintScanList = () => scan?.setList(session.flatMap((s) => {
    const r = store.results.find((x) => x.taskId === s.taskId && x.name === s.name);
    if (!r) return [];
    const undo = button('', () => { store.remove(r); session = session.filter((x) => x !== s); paint(); }, 'btn small ghost', 'trash');
    undo.setAttribute('aria-label', t('teacher.scan.undo'));
    return [h('li', {},
      h('span', { class: 'scan-name' }, r.name),
      h('span', { class: 'hint' }, `${r.title} · ${r.accuracy} % · ${r.cpm}${s.updated ? ` · ${t('teacher.scan.updated')}` : ''}${r.intact ? '' : ' !'}`),
      undo)];
  }).reverse());

  const paintActions = () => {
    const rows = shown();
    const all = store.results;
    actions.replaceChildren(...(all.length ? [
      button(t('teacher.csv'), () => exportCsv(rows), 'btn', 'download'),
      filter ? button(t('teacher.csvAll'), () => exportCsv(all), 'btn ghost', 'download') : null,
      picked.size ? button(t('teacher.assign', { n: picked.size }), assignPicked, 'btn', 'edit') : null,
      picked.size ? button(t('teacher.removePicked', { n: picked.size }), () => void removePicked(), 'btn ghost', 'trash') : null,
    ] : []).filter((x): x is HTMLButtonElement => !!x));
  };

  const paint = () => {
    // A filter on a group that no longer exists falls back to all; gone rows are unpicked.
    if (filter && !store.results.some((r) => (r.group ?? '') === filter!.group)) filter = null;
    for (const r of picked) if (!store.results.includes(r)) picked.delete(r);
    const rows = shown();
    paintChips();
    paintScanList();
    paintActions();
    count.textContent = store.results.length ? `${t('teacher.count', { n: rows.length })} · ${summary(rows)}` : '';
    if (!rows.length) return void table.replaceChildren(h('div', { class: 'hint teacher-empty' }, h('p', {}, t('teacher.empty')), h('ul', {}, ...['scan', 'paste', 'open'].map((w) => h('li', {}, t(`teacher.way.${w}`))))));
    const grouped = store.groups().length > 0;
    const cols = head.length + 1;
    let lastGroup: string | undefined | null = null;
    let lastTask = '';
    table.replaceChildren(h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, ''), ...head.slice(1).map((c) => h('th', { scope: 'col' }, c)), h('th', {}, ''))),
      h('tbody', {}, ...rows.flatMap((r) => {
        const out: HTMLElement[] = [];
        // Group > task > child: a row for each change of group and of task.
        if (grouped && r.group !== lastGroup) out.push(h('tr', { class: 'group-row' }, h('th', { colspan: cols, scope: 'rowgroup' }, `${r.group ?? t('teacher.noGroup')} - ${summary(rows.filter((x) => x.group === r.group))}`)));
        if (r.group !== lastGroup || r.taskId !== lastTask) out.push(h('tr', { class: 'task-row' }, h('th', { colspan: cols, scope: 'rowgroup' }, r.title)));
        lastGroup = r.group;
        lastTask = r.taskId;
        const box = h('input', { type: 'checkbox', 'aria-label': t('teacher.pick', { name: r.name }), onChange: (e: Event) => { if ((e.target as HTMLInputElement).checked) picked.add(r); else picked.delete(r); paintActions(); } });
        box.checked = picked.has(r);
        const trash = button('', () => void remove(r), 'btn small ghost', 'trash');
        trash.setAttribute('aria-label', t('teacher.remove'));
        out.push(h('tr', { class: r.intact ? '' : 'broken' },
          h('td', {}, box),
          h('td', {}, r.name, r.intact ? null : h('span', { class: 'error', title: t('teacher.notIntact') }, ' !')),
          h('td', {}, r.date),
          h('td', {}, String(r.minutes)),
          h('td', {}, `${r.accuracy} %`),
          h('td', {}, String(r.cpm)),
          h('td', {}, r.levels === undefined ? '' : String(r.levels)),
          h('td', { class: r.accuracy >= MASTERED ? 'mastered' : 'practice' }, t(r.accuracy >= MASTERED ? 'teacher.status.ok' : 'teacher.status.practice')),
          h('td', {}, r.weak.map(([k, a]) => `${keyLabel(k)} ${a} %`).join(', ')),
          h('td', {}, trash)));
        return out;
      }))));
  };

  const scanButton = button(t('teacher.scan.start'), () => startScanning(), 'btn primary', 'camera');
  const stopScan = () => {
    scan?.stop();
    scan = null;
    scanSlot.replaceChildren();
    scanButton.hidden = false;
  };
  const startScanning = () => {
    session = [];
    scan = scanCard((text) => void addCode(codeFrom(text, 'result'), true), stopScan);
    scanSlot.replaceChildren(scan.el);
    scanButton.hidden = true;
    paintScanList();
  };

  root.append(h('div', { class: 'screen teacher-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('start'), 'btn ghost small', 'back'), h('h1', {}, t('teacher.title'))),
    cornerControls(),
    h('main', { class: 'panel' },
      h('p', {}, t('teacher.intro')),
      h('div', { class: 'row scan-start' }, scanGroup, groupNames, scanButton, h('span', { class: 'hint' }, t('teacher.scan.privacy'))),
      scanSlot,
      h('form', { class: 'row', onSubmit: (e: Event) => { e.preventDefault(); void addCode(codeFrom(paste.value, 'result')).then(() => (paste.value = '')); } },
        paste, h('button', { class: 'btn primary', type: 'submit' }, t('teacher.add'))),
      msg,
      chips,
      count,
      table,
      actions,
      h('p', { class: 'hint' }, t('teacher.privacy')))));
  paint();
  if (params.code) void addCode(params.code);
  return stopScan;
}
