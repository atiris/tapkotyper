import { app, applyProfileLook, go, reduceMotion } from '../app/app';
import { t } from '../i18n/i18n';
import { codeFrom } from '../share/codec';
import { parseResult } from '../share/result';
import { TASK_GROUP_MAX } from '../share/task';
import { type Sort, type SortKey, type StoredResult, TeacherStore, childKey, childSummary, mastered, nextSort } from '../share/teacher';
import { teacherArt, button, confirmDialog, download, h, icon } from '../ui/dom';
import { keyLabel } from '../ui/keyboard-guide';
import { cornerControls } from '../ui/chrome';
import { type ScanCard, scanCard } from './teacher-scan';

/** Which rows the table shows: all, or one group (the empty name is "without a group"). */
type Filter = { group: string } | null;

/** The columns a teacher sorts by, in the table's order; the phone list offers them as chips, the most useful first. */
const SORT_KEYS: SortKey[] = ['child', 'date', 'minutes', 'accuracy', 'rhythm', 'levels', 'status'];
const CHIP_KEYS: SortKey[] = ['accuracy', 'rhythm', 'minutes', 'child', 'date', 'levels', 'status'];
const COL: Record<SortKey, string> = { child: 'child', date: 'date', minutes: 'minutes', accuracy: 'accuracy', rhythm: 'rhythm', levels: 'level', status: 'status' };

/** The view survives a visit to a child's card (memory only, never stored). */
const view: { filter: Filter; task: string | null; sort: Sort; fromList: boolean } = { filter: null, task: null, sort: { key: 'child', desc: false }, fromList: false };

const statusPill = (r: StoredResult) => h('span', { class: `status-pill ${mastered(r) ? 'mastered' : 'practice'}` }, t(mastered(r) ? 'teacher.status.ok' : 'teacher.status.practice'));
const weakLine = (weak: [string, number][]) => weak.map(([k, a]) => `${keyLabel(k)} ${a} %`).join(', ');

/**
 * The teacher's table of handed-in results, kept in this browser only. Opened from the start
 * page or by a result link, whose result is added on the way in; results also come from pasted
 * links and from QR codes read with the camera. With `child` it shows one child's card.
 * Returns the cleanup that stops the camera.
 */
export function teacherScreen(root: HTMLElement, params: { code?: string; child?: string }): () => void {
  app.profile = null;
  applyProfileLook(null);
  const store = new TeacherStore();
  if (params.child && store.childResults(params.child).length) {
    childCard(root, store, params.child);
    return () => undefined;
  }
  view.fromList = false;
  const msg = h('p', { role: 'status', 'aria-live': 'polite' });
  const table = h('div', { class: 'teacher-table' });
  const list = h('div', { class: 'teacher-list' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': t('teacher.groupFilter') });
  const taskPick = h('select', { 'aria-label': t('teacher.taskFilter'), onChange: (e: Event) => { view.task = (e.target as HTMLSelectElement).value || null; paint(); } });
  const sortChips = h('div', { class: 'sort-chips', role: 'group', 'aria-label': t('teacher.sortBy') });
  const count = h('p', { class: 'hint teacher-count' });
  const actions = h('div', { class: 'row teacher-actions' });
  const scanSlot = h('div', {});
  const paste = h('input', { type: 'text', placeholder: t('teacher.pastePlaceholder'), 'aria-label': t('teacher.paste') });
  const scanGroup = h('input', { type: 'text', list: 'teacher-groups', maxlength: TASK_GROUP_MAX, placeholder: t('teacher.scan.groupPlaceholder'), 'aria-label': t('teacher.scan.group') });
  const groupNames = h('datalist', { id: 'teacher-groups' });
  const picked = new Set<StoredResult>();
  let scan: ScanCard | null = null;
  /** Results this scan collected; `updated` when a child's older result was replaced. */
  let session: { taskId: string; name: string; updated: boolean }[] = [];
  let lastUnknown = -Infinity;

  const inGroup = () => store.results.filter((r) => !view.filter || (r.group ?? '') === view.filter.group);
  const shown = () => store.sorted(inGroup().filter((r) => !view.task || r.taskId === view.task), view.sort);

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
    if (assignGroup(store, [...picked]) !== null) paint();
  };

  const head = ['task', 'child', 'date', 'minutes', 'accuracy', 'rhythm', 'level', 'status', 'weak'].map((c) => t(`teacher.col.${c}`));
  const csvHead = [t('teacher.col.group'), ...head, t('teacher.col.broken')];
  const csvNames = { key: keyLabel, status: (ok: boolean) => t(ok ? 'teacher.status.ok' : 'teacher.status.practice') };
  const exportCsv = (rows: StoredResult[]) => download('tapkotyper-results.csv', `﻿${store.csv(csvHead, csvNames, rows, view.sort)}`, 'text/csv');

  const average = (rows: StoredResult[], pick: (r: StoredResult) => number | undefined) => {
    const v = rows.map(pick).filter((x): x is number => x !== undefined);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '-';
  };
  /** The work of a set of children in one line: how many handed in, how well, how far. */
  const summary = (rows: StoredResult[]) => t('teacher.summary', {
    n: rows.length,
    ok: rows.filter(mastered).length,
    accuracy: average(rows, (r) => r.accuracy),
    rhythm: average(rows, (r) => r.cpm),
    levels: average(rows, (r) => r.levels),
  });

  const paintChips = () => {
    const groups = store.groups();
    groupNames.replaceChildren(...groups.map((g) => h('option', { value: g })));
    const chip = (label: string, group: string | null) => {
      const on = group === null ? !view.filter : view.filter?.group === group;
      return h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': on, onClick: () => { view.filter = group === null ? null : { group }; paint(); } }, label);
    };
    chips.replaceChildren(...(groups.length ? [chip(t('teacher.all'), null), ...groups.map((g) => chip(g, g)), store.results.some((r) => !r.group) ? chip(t('teacher.noGroup'), '') : null] : []).filter((x): x is HTMLButtonElement => !!x));
  };

  /** The tasks of the chosen group, each with its number of results. */
  const paintTasks = () => {
    const tasks = new Map<string, { title: string; n: number }>();
    for (const r of inGroup()) tasks.set(r.taskId, { title: r.title, n: (tasks.get(r.taskId)?.n ?? 0) + 1 });
    if (view.task && !tasks.has(view.task)) view.task = null;
    taskPick.replaceChildren(h('option', { value: '' }, t('teacher.allTasks')),
      ...[...tasks].sort((a, b) => a[1].title.localeCompare(b[1].title)).map(([id, x]) => h('option', { value: id }, `${x.title} (${x.n})`)));
    taskPick.value = view.task ?? '';
    taskPick.closest('label')!.hidden = tasks.size < 2;
  };

  const sortBy = (key: SortKey) => {
    view.sort = nextSort(view.sort, key);
    paint();
  };
  const arrow = (key: SortKey) => (view.sort.key === key ? icon(view.sort.desc ? 'sortDown' : 'sortUp', 'icon sort-arrow') : null);

  const paintSortChips = () => sortChips.replaceChildren(h('span', { class: 'hint' }, t('teacher.sortBy')),
    ...CHIP_KEYS.map((k) => h('button', { type: 'button', class: `chip${view.sort.key === k ? ' on' : ''}`, 'aria-pressed': view.sort.key === k, onClick: () => sortBy(k) }, t(`teacher.sort.${k}`), arrow(k))));

  const paintScanList = () => scan?.setList(session.flatMap((s) => {
    const r = store.results.find((x) => x.taskId === s.taskId && x.name === s.name);
    if (!r) return [];
    const undo = button('', () => { store.remove(r); session = session.filter((x) => x !== s); paint(); }, 'btn small ghost', 'trash');
    undo.setAttribute('aria-label', t('teacher.scan.undo'));
    return [h('li', {},
      h('span', { class: 'scan-name' }, r.name),
      h('span', { class: 'hint' }, `${r.title} · ${r.accuracy} % · ${r.cpm}${s.updated ? ` · ${t('teacher.scan.updated')}` : ''}${r.intact ? '' : ' !'}`),
      undo)];
  }).reverse(), session.filter((s) => !s.updated).length, session.filter((s) => s.updated).length);

  const paintActions = () => {
    const rows = shown();
    const all = store.results;
    actions.replaceChildren(...(all.length ? [
      button(t('teacher.csv'), () => exportCsv(rows), 'btn', 'download'),
      view.filter || view.task ? button(t('teacher.csvAll'), () => exportCsv(all), 'btn ghost', 'download') : null,
      picked.size ? button(t('teacher.assign', { n: picked.size }), assignPicked, 'btn', 'edit') : null,
      picked.size ? button(t('teacher.removePicked', { n: picked.size }), () => void removePicked(), 'btn ghost', 'trash') : null,
    ] : []).filter((x): x is HTMLButtonElement => !!x));
  };

  const openChild = (r: StoredResult) => {
    view.fromList = true;
    go('teacher', { child: childKey(r) });
  };

  /** The value a phone card shows big: the sorted one, accuracy for the keys that are no number. */
  const bigValue = (r: StoredResult): string => {
    switch (view.sort.key) {
      case 'minutes': return t('teacher.unit.min', { n: r.minutes });
      case 'rhythm': return String(r.cpm);
      case 'levels': return r.levels === undefined ? '-' : String(r.levels);
      default: return `${r.accuracy} %`;
    }
  };
  const subLine = (r: StoredResult): string[] => {
    const big = view.sort.key === 'minutes' || view.sort.key === 'rhythm' || view.sort.key === 'levels' ? view.sort.key : 'accuracy';
    return [
      r.date,
      big !== 'rhythm' ? t('teacher.unit.cpm', { n: r.cpm }) : null,
      big !== 'minutes' ? t('teacher.unit.min', { n: r.minutes }) : null,
      big !== 'accuracy' ? `${r.accuracy} %` : null,
      big !== 'levels' && r.levels !== undefined ? t('teacher.unit.levels', { n: r.levels }) : null,
    ].filter((x): x is string => !!x);
  };

  const paint = () => {
    // A filter on a group that no longer exists falls back to all; gone rows are unpicked.
    if (view.filter && !store.results.some((r) => (r.group ?? '') === view.filter!.group)) view.filter = null;
    for (const r of picked) if (!store.results.includes(r)) picked.delete(r);
    paintChips();
    paintTasks();
    paintSortChips();
    paintScanList();
    paintActions();
    const rows = shown();
    count.textContent = store.results.length ? `${t('teacher.count', { n: rows.length })} · ${summary(rows)}` : '';
    sortChips.hidden = !rows.length;
    if (!rows.length) {
      list.replaceChildren();
      return void table.replaceChildren(h('div', { class: 'hint teacher-empty' }, teacherArt(),
        h('div', {}, h('p', {}, t('teacher.empty')), h('ul', {}, ...['scan', 'paste', 'open'].map((w) => h('li', {}, t(`teacher.way.${w}`)))))));
    }
    const grouped = store.groups().length > 0;
    const cols = head.length + 1;
    // Group > task > child: a heading for each change of group and of task, in the table and in the phone list.
    const blocks = (row: (r: StoredResult) => HTMLElement, groupHead: (text: string) => HTMLElement, taskHead: (text: string) => HTMLElement) => {
      let lastGroup: string | undefined | null = null;
      let lastTask = '';
      return rows.flatMap((r) => {
        const out: HTMLElement[] = [];
        if (grouped && r.group !== lastGroup) out.push(groupHead(`${r.group ?? t('teacher.noGroup')} - ${summary(rows.filter((x) => x.group === r.group))}`));
        if (r.group !== lastGroup || r.taskId !== lastTask) out.push(taskHead(r.title));
        lastGroup = r.group;
        lastTask = r.taskId;
        out.push(row(r));
        return out;
      });
    };
    table.replaceChildren(h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, ''),
        ...SORT_KEYS.map((k) => h('th', { scope: 'col', ...(view.sort.key === k && { 'aria-sort': view.sort.desc ? 'descending' : 'ascending' }) },
          h('button', { type: 'button', class: `sort-btn${view.sort.key === k ? ' on' : ''}`, onClick: () => sortBy(k) }, t(`teacher.col.${COL[k]}`), arrow(k)))),
        h('th', { scope: 'col' }, t('teacher.col.weak')), h('th', {}, ''))),
      h('tbody', {}, ...blocks((r) => {
        const box = h('input', { type: 'checkbox', 'aria-label': t('teacher.pick', { name: r.name }), onChange: (e: Event) => { if ((e.target as HTMLInputElement).checked) picked.add(r); else picked.delete(r); paintActions(); } });
        box.checked = picked.has(r);
        const trash = button('', () => void remove(r), 'btn small ghost', 'trash');
        trash.setAttribute('aria-label', t('teacher.remove'));
        return h('tr', { class: r.intact ? '' : 'broken' },
          h('td', {}, box),
          h('td', {}, h('button', { type: 'button', class: 'child-link', onClick: () => openChild(r) }, r.name), r.intact ? null : h('span', { class: 'error', tip: t('teacher.notIntact') }, ' !')),
          h('td', {}, r.date),
          h('td', {}, String(r.minutes)),
          h('td', {}, `${r.accuracy} %`),
          h('td', {}, String(r.cpm)),
          h('td', {}, r.levels === undefined ? '' : String(r.levels)),
          h('td', {}, statusPill(r)),
          h('td', {}, weakLine(r.weak)),
          h('td', {}, trash));
      },
      (text) => h('tr', { class: 'group-row' }, h('th', { colspan: cols, scope: 'rowgroup' }, text)),
      (text) => h('tr', { class: 'task-row' }, h('th', { colspan: cols, scope: 'rowgroup' }, text))))));
    list.replaceChildren(...blocks(
      (r) => h('button', { type: 'button', class: `child-row${r.intact ? '' : ' broken'}`, onClick: () => openChild(r) },
        h('span', { class: 'child-row-main' },
          h('span', { class: 'child-row-name' }, r.name, r.intact ? '' : ' !'),
          h('span', { class: 'child-row-sub' }, subLine(r).join(' · '), ' ', statusPill(r))),
        h('span', { class: 'child-row-big' }, bigValue(r))),
      (text) => h('h3', { class: 'list-group' }, text),
      (text) => h('h4', { class: 'list-task' }, text)));
  };

  const scanButton = button(t('teacher.scan.start'), () => startScanning(), 'btn primary', 'camera');
  const results = h('div', { class: 'teacher-results' });
  const stopScan = () => {
    scan?.stop();
    scan = null;
    scanSlot.replaceChildren();
    scanButton.hidden = false;
  };
  /** Hotovo: the camera off, and the results of the scanned group in view. */
  const finishScan = () => {
    const group = scanGroup.value.trim();
    stopScan();
    if (group && store.results.some((r) => r.group === group)) view.filter = { group };
    paint();
    results.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };
  const startScanning = () => {
    session = [];
    scan = scanCard(scanGroup.value.trim(), (text) => void addCode(codeFrom(text, 'result'), true), finishScan);
    scanSlot.replaceChildren(scan.el);
    scanButton.hidden = true;
    paintScanList();
    // On a phone the preview and the done bar fill the screen.
    scan.el.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  results.append(
    h('div', { class: 'teacher-filters' }, chips, h('label', { class: 'task-pick' }, h('span', {}, t('teacher.taskFilter')), taskPick)),
    count,
    sortChips,
    table,
    list,
    actions);
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
      results,
      h('p', { class: 'hint' }, t('teacher.privacy')))));
  paint();
  if (params.code) void addCode(params.code);
  return stopScan;
}

/** Asks for a group name and puts `rows` into it; returns the name, or null when cancelled. */
function assignGroup(store: TeacherStore, rows: StoredResult[]): string | null {
  const name = window.prompt(t('teacher.assignPrompt', { groups: store.groups().join(', ') || '-' }), store.groups()[0] ?? '');
  if (name === null) return null;
  const group = name.trim().slice(0, TASK_GROUP_MAX);
  store.assign(rows, group);
  return group;
}

/** One child's card: the work together, the weakest keys, every task, and moving or removing the child. */
function childCard(root: HTMLElement, store: TeacherStore, key: string): void {
  const rows = store.childResults(key);
  const first = rows[0];
  const sum = childSummary(rows);
  // Back to the list the way the teacher came, so the browser's Back and this one agree.
  const back = () => (view.fromList ? history.back() : go('teacher'));
  const tile = (value: string, label: string) => h('div', { class: 'child-tile' }, h('b', {}, value), h('span', {}, label));
  const move = () => {
    const group = assignGroup(store, rows);
    if (group !== null) go('teacher', { child: childKey({ name: first.name, group: group || undefined }) }, false);
  };
  const removeChild = async () => {
    const yes = await confirmDialog({ title: t('teacher.child.removeTitle', { name: first.name }), text: t('teacher.child.removeText', { name: first.name, n: rows.length }), ok: t('teacher.remove'), cancel: t('common.back'), danger: true });
    if (!yes) return;
    store.removeMany(rows);
    back();
  };
  root.append(h('div', { class: 'screen teacher-screen child-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), back, 'btn ghost small', 'back'),
      h('div', { class: 'child-head' }, h('h1', {}, first.name),
        h('span', { class: 'hint' }, [first.group ?? t('teacher.noGroup'), t('teacher.child.tasks', { n: rows.length })].join(' · ')))),
    cornerControls(),
    h('main', { class: 'panel' },
      h('div', { class: 'child-tiles' },
        tile(`${sum.accuracy} %`, t('teacher.child.accuracy')),
        tile(String(sum.cpm), t('teacher.child.cpm')),
        tile(String(sum.minutes), t('teacher.child.minutes')),
        sum.levels === undefined ? null : tile(String(sum.levels), t('teacher.child.levels'))),
      sum.weak.length ? h('section', {}, h('h2', {}, t('teacher.col.weak')),
        h('div', { class: 'child-keys' }, ...sum.weak.map(([k, a]) => h('span', { class: 'kbd child-key' }, `${keyLabel(k)} ${a} %`)))) : null,
      h('section', {}, h('h2', {}, t('teacher.child.taskList')),
        h('ul', { class: 'child-tasks' }, ...rows.map((r) => h('li', { class: r.intact ? '' : 'broken' },
          h('span', { class: 'child-task-main' }, h('b', {}, r.title, r.intact ? '' : ' !'),
            h('span', { class: 'hint' }, [r.date, t('teacher.unit.min', { n: r.minutes }), t('teacher.unit.cpm', { n: r.cpm })].join(' · '))),
          statusPill(r),
          h('b', { class: 'child-task-acc' }, `${r.accuracy} %`))))),
      h('div', { class: 'row' },
        button(t('teacher.child.move'), move, 'btn', 'edit'),
        button(t('teacher.child.remove'), () => void removeChild(), 'btn ghost danger-text', 'trash')))));
}
