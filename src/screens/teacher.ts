import { app, applyProfileLook, go, reduceMotion, routeOf, screenVisit } from '../app/app';
import { locale, t, tn } from '../i18n/i18n';
import { codeFrom } from '../share/codec';
import { parseResult } from '../share/result';
import { TASK_GROUP_MAX } from '../share/task';
import { TAPKO_TYPE, parseTapko, tapkoFile, tapkoName } from '../share/tapko-file';
import { type ResultSet, type Sort, type SortKey, type StoredResult, TeacherStore, type Writer, type WriterKey, childKey, dateBefore, mastered, newest, nextSort, sortWriters, writer } from '../share/teacher';
import { lineChart } from '../ui/charts';
import { teacherArt, button, confirmDialog, download, h, icon, modal, richText } from '../ui/dom';
import { keyLabel } from '../ui/keyboard-guide';
import { cornerControls } from '../ui/chrome';
import { tabBar } from '../ui/tabs';
import { type ScanCard, scanCard } from './teacher-scan';

/** The lock sign by a child whose device had its settings password removed or changed by the super player. */
function lockMark(r: { lockRemoved?: boolean }): HTMLElement | null {
  if (!r.lockRemoved) return null;
  return h('span', { class: 'lock-mark', tip: t('teacher.lockRemoved'), 'aria-label': t('teacher.lockRemoved'), role: 'img' }, icon('lock'));
}

const TABS = ['groups', 'writers', 'files'] as const;
type Tab = (typeof TABS)[number];

/** The writers' columns a teacher sorts by, in the table's order; the phone list offers them as chips, the most useful first. */
const WRITER_KEYS: WriterKey[] = ['child', 'group', 'handIns', 'date', 'accuracy', 'rhythm', 'minutes', 'levels'];
const CHIP_KEYS: WriterKey[] = ['accuracy', 'rhythm', 'minutes', 'child', 'handIns', 'date', 'levels', 'status'];
const SET_CHIP_KEYS: SortKey[] = ['accuracy', 'rhythm', 'minutes', 'child', 'levels', 'status'];
const COL: Record<WriterKey, string> = { child: 'col.child', group: 'col.group', handIns: 'col.handIns', date: 'col.last', minutes: 'col.minutes', accuracy: 'col.accuracy', rhythm: 'sets.rhythm', levels: 'col.level', status: 'col.status' };

/** "Staršie ako" in the delete dialog: months and days back. */
const AGES: { key: string; months: number; days: number }[] = [
  { key: 'm6', months: 6, days: 0 }, { key: 'm3', months: 3, days: 0 }, { key: 'm1', months: 1, days: 0 },
  { key: 'w2', months: 0, days: 14 }, { key: 'w1', months: 0, days: 7 }, { key: 'd1', months: 0, days: 1 },
];

/** When the mentor last sent results from this browser (ms). */
const SENT_KEY = 'tapkotyper:mentor-sent';

/** The view survives a visit to a set or a writer (memory only, never stored); `filter` is a group, the empty name is "without a group". */
const view = {
  filter: null as string | null,
  open: new Set<string>(),
  search: '',
  writerSort: { key: 'child', desc: false } as Sort<WriterKey>,
  setSort: { key: 'child', desc: false } as Sort,
  fromList: false,
  /** The last load message of the files tab. */
  fileMsg: null as { text: string; ok: boolean } | null,
};

const statusPill = (ok: boolean) => h('span', { class: `status-pill ${ok ? 'mastered' : 'practice'}` }, t(ok ? 'teacher.status.ok' : 'teacher.status.practice'));
const weakLine = (weak: [string, number][]) => weak.map(([k, a]) => `${keyLabel(k)} ${a} %`).join(', ');
const day = (ms: number) => new Date(ms).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'numeric' });
const clock = (ms: number) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
const span = (s: ResultSet) => (clock(s.start) === clock(s.end) ? clock(s.start) : `${clock(s.start)}–${clock(s.end)}`);
const average = (rows: StoredResult[], pick: (r: StoredResult) => number | undefined): number | '-' => {
  const v = rows.map(pick).filter((x): x is number => x !== undefined);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '-';
};
/** The change from the first hand-in to the last: green up, red-brown down, nothing with one hand-in or none. */
const delta = (n: number, show: boolean) => (show && n ? h('span', { class: `delta ${n > 0 ? 'up' : 'down'}` }, n > 0 ? `+${n}` : `−${-n}`) : null);
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const tile = (value: string, label: string, change: HTMLElement | null = null) => h('div', { class: 'child-tile' }, h('b', {}, value, change ? ' ' : '', change), h('span', {}, label));
const groupName = (g: string | undefined) => g || t('teacher.noGroup');

/** What one set's hand-ins say in numbers. */
function setStats(rows: StoredResult[]) {
  return {
    tasks: [...new Set(rows.map((r) => r.title))].join(', '),
    ok: rows.filter(mastered).length,
    accuracy: average(rows, (r) => r.accuracy),
    rhythm: average(rows, (r) => r.cpm),
  };
}

const csvHead = () => [t('teacher.col.group'), ...['task', 'child', 'date', 'minutes', 'accuracy', 'rhythm', 'level', 'status', 'weak'].map((c) => t(`teacher.col.${c}`)), t('teacher.col.broken')];
const csvNames = { key: keyLabel, status: (ok: boolean) => t(ok ? 'teacher.status.ok' : 'teacher.status.practice') };
const exportCsv = (store: TeacherStore, rows: StoredResult[]) => download('tapkotyper-results.csv', `﻿${store.csv(csvHead(), csvNames, rows)}`, 'text/csv');

/**
 * The teacher's page of handed-in results, kept in this browser only: the sets of each group,
 * the writers and the loaded files, in tabs. Opened from the start page or by a result link,
 * whose result is added on the way in; results also come from pasted links, QR codes read with
 * the camera and `.tapko` files. With `child` it shows one writer, with `set` one set.
 * Returns the cleanup that stops the camera.
 */
export function teacherScreen(root: HTMLElement, params: { code?: string; child?: string; set?: string; tab?: string }): () => void {
  app.profile = null;
  applyProfileLook(null);
  const store = new TeacherStore();
  const visit = screenVisit();
  let stop: () => void = () => undefined;
  // The page paints once the results are read; a teacher who left meanwhile gets nothing.
  void store.load().then(() => {
    if (visit !== screenVisit()) return;
    const set = params.set ? store.sets.find((s) => s.id === params.set) : undefined;
    if (params.child && store.childResults(params.child).length) childCard(root, store, params.child);
    else if (set) setPage(root, store, set);
    else stop = teacherPage(root, store, TABS.find((x) => x === params.tab) ?? 'groups', params.code);
  });
  return () => stop();
}

/** Back from a set or a writer the way the teacher came, so the browser's Back and this one agree. */
const backTo = (tab: Tab) => () => (view.fromList ? history.back() : go('teacher', { tab }));
const openChild = (key: string) => {
  view.fromList = true;
  go('teacher', { child: key });
};
const openSet = (set: ResultSet) => {
  view.fromList = true;
  go('teacher', { set: set.id });
};

/** The page with the tabs; `code` is a result link's code to add on the way in. Returns the cleanup that stops the camera. */
function teacherPage(root: HTMLElement, store: TeacherStore, first: Tab, code: string | undefined): () => void {
  view.fromList = false;
  let tab: Tab = first;
  const msg = h('p', { role: 'status', 'aria-live': 'polite' });
  const panel = h('div', { class: 'tab-panel teacher-panel' });
  const scanSlot = h('div', {});
  const paste = h('input', { type: 'text', placeholder: t('teacher.pastePlaceholder'), 'aria-label': t('teacher.paste') });
  const scanGroup = h('input', { type: 'text', list: 'teacher-groups', maxlength: TASK_GROUP_MAX, placeholder: t('teacher.scan.groupPlaceholder'), 'aria-label': t('teacher.scan.group') });
  const groupNames = h('datalist', { id: 'teacher-groups' });
  const fileInput = h('input', { type: 'file', accept: `.tapko,${TAPKO_TYPE},application/json`, multiple: true, hidden: true, onChange: () => { void loadFiles([...(fileInput.files ?? [])]); fileInput.value = ''; } });
  const picked = new Set<string>();
  let scan: ScanCard | null = null;
  /** Results this scan collected. */
  let session: StoredResult[] = [];
  let lastUnknown = -Infinity;

  const showTab = (x: Tab) => {
    tab = x;
    const route = routeOf('teacher', { tab: x });
    if (route !== location.hash) history.pushState(null, '', route);
    paint();
  };

  const addCode = async (code: string | null, fromScan = false) => {
    msg.className = '';
    msg.textContent = '';
    try {
      if (!code) throw new Error('share.broken');
      const { result, intact } = await parseResult(code);
      // A scan writes every new result into the group being scanned.
      const added = store.add(result, intact, fromScan ? scanGroup.value.trim() || undefined : undefined);
      if (added && fromScan) {
        session.push(added);
        scan?.hit();
      }
      if (!fromScan) {
        msg.className = intact ? 'ok' : 'error';
        msg.textContent = `${t(added ? 'teacher.added' : 'teacher.already', { name: result.name, title: result.title })}${intact ? '' : ` ${t('teacher.notIntact')}`}`;
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

  /** Loads `.tapko` files whole; what is here already is skipped without a word. */
  const loadFiles = async (files: File[]) => {
    const lines: string[] = [];
    let ok = true;
    for (const f of files) {
      try {
        const { sets, results } = parseTapko(await f.text());
        const { added, old } = store.importFile(f.name, sets, results);
        lines.push(`${f.name}: ${tn('teacher.file.added', added)}`);
        if (old) lines.push(tn('teacher.file.old', old));
      } catch (e) {
        ok = false;
        lines.push(`${f.name}: ${t((e as Error).message)}`);
      }
    }
    if (!files.length) return;
    view.fileMsg = { text: lines.join(' '), ok };
    if (tab === 'files') paint();
    else showTab('files');
  };

  /** Every group in use, the empty name last when something has none. */
  const allGroups = (): string[] => {
    const named = [...new Set([...store.groups(), ...store.sets.map((s) => s.group).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
    return store.results.some((r) => !r.group) || store.sets.some((s) => !s.group) ? [...named, ''] : named;
  };

  const groupChips = () => {
    const groups = allGroups();
    if (view.filter !== null && !groups.includes(view.filter)) view.filter = null;
    groupNames.replaceChildren(...store.groups().map((g) => h('option', { value: g })));
    const chip = (label: string, group: string | null) => {
      const on = view.filter === group;
      return h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': on, onClick: () => { view.filter = group; paint(); } }, label);
    };
    return h('div', { class: 'chips', role: 'group', 'aria-label': t('teacher.groupFilter') },
      ...(groups.length > 1 ? [chip(t('teacher.all'), null), ...groups.map((g) => chip(groupName(g), g))] : []));
  };

  const empty = () => h('div', { class: 'hint teacher-empty' }, teacherArt(), h('p', {}, ...richText(t('teacher.empty'))));

  /** Skupiny: per group a heading line, then its sets; a set opens inline on a computer, as its own page on a phone. */
  const groupsTab = (): Node[] => {
    for (const id of picked) if (!store.sets.some((s) => s.id === id)) picked.delete(id);
    if (!store.results.length) return [empty()];
    const groups = allGroups().filter((g) => view.filter === null || g === view.filter);
    const shownSets = (g: string) => store.sets.filter((s) => s.group === g && store.setResults(s).length).sort((a, b) => b.start - a.start);
    const shownRows = groups.flatMap((g) => shownSets(g).flatMap((s) => store.setResults(s)));
    const actions = h('div', { class: 'row teacher-actions' });
    const paintActions = () => {
      const sets = store.sets.filter((s) => picked.has(s.id));
      const rows = sets.flatMap((s) => store.setResults(s));
      actions.replaceChildren(...[
        button(t('teacher.csv'), () => exportCsv(store, shownRows), 'btn', 'download'),
        view.filter !== null ? button(t('teacher.csvAll'), () => exportCsv(store, store.results), 'btn ghost', 'download') : null,
        sets.length ? button(t('teacher.assign', { n: sets.length }), () => { if (assignGroup(store, rows) !== null) paint(); }, 'btn desk-only', 'edit') : null,
        sets.length ? button(t('teacher.removePicked', { n: sets.length }), () => void removeSets(sets), 'btn ghost desk-only', 'trash') : null,
      ].filter((x): x is HTMLButtonElement => !!x));
    };
    const removeSets = async (sets: ResultSet[]) => {
      const rows = sets.flatMap((s) => store.setResults(s));
      const yes = await confirmDialog({ title: t('teacher.removeManyTitle'), text: t('teacher.removeManyText', { sets: tn('teacher.n.sets', sets.length), results: tn('teacher.n.results', rows.length) }), ok: t('teacher.remove'), cancel: t('common.back'), danger: true });
      if (!yes) return;
      store.removeMany(rows);
      paint();
    };
    const blocks = groups.flatMap((g) => {
      const sets = shownSets(g);
      if (!sets.length) return [];
      const rows = sets.flatMap((s) => store.setResults(s));
      const latest = newest(rows);
      const head = h('h3', { class: 'group-head' }, h('span', {}, groupName(g)),
        h('span', { class: 'group-line' }, [tn('teacher.n.sets', sets.length), tn('teacher.n.writers', new Set(rows.map(childKey)).size),
          t('teacher.groups.accuracy', { n: average(latest, (r) => r.accuracy) }), t('teacher.groups.rhythm', { n: average(latest, (r) => r.cpm) })].join(' · ')));
      const table = h('table', { class: 'sets-table' },
        h('thead', {}, h('tr', {}, h('th', {}, ''), ...['day', 'time', 'task', 'results', 'ok', 'accuracy', 'rhythm'].map((c) => h('th', { scope: 'col' }, t(`teacher.sets.${c}`))))),
        h('tbody', {}, ...sets.flatMap((s) => {
          const rs = store.setResults(s);
          const st = setStats(rs);
          const open = view.open.has(s.id);
          const box = h('input', { type: 'checkbox', 'aria-label': t('teacher.pickSet', { day: day(s.start), time: span(s) }), onChange: (e: Event) => { if ((e.target as HTMLInputElement).checked) picked.add(s.id); else picked.delete(s.id); paintActions(); } });
          box.checked = picked.has(s.id);
          const toggle = () => { if (open) view.open.delete(s.id); else view.open.add(s.id); paint(); };
          const row = h('tr', { class: `set-row${open ? ' open' : ''}` },
            h('td', {}, box),
            h('td', {}, h('button', { type: 'button', class: 'set-day', 'aria-expanded': open, onClick: toggle }, icon(open ? 'sortUp' : 'sortDown', 'icon sort-arrow'), day(s.start))),
            h('td', {}, span(s)),
            h('td', { class: 'set-tasks' }, st.tasks),
            h('td', {}, String(rs.length)),
            h('td', {}, t('teacher.sets.okOf', { ok: st.ok, n: rs.length })),
            h('td', {}, `${st.accuracy} %`),
            h('td', {}, String(st.rhythm)));
          if (!open) return [row];
          return [row, h('tr', { class: 'set-detail' }, h('td', { colspan: 8 }, h('table', { class: 'set-writers' },
            h('tbody', {}, ...store.sorted(rs).map((r) => h('tr', { class: r.intact ? '' : 'broken' },
              h('td', {}, h('button', { type: 'button', class: 'child-link', onClick: () => openChild(childKey(r)) }, r.name), r.intact ? null : h('span', { class: 'error', tip: t('teacher.notIntact') }, ' !'), lockMark(r)),
              h('td', {}, r.title),
              h('td', {}, t('teacher.unit.min', { n: r.minutes })),
              h('td', {}, statusPill(mastered(r))),
              h('td', {}, `${r.accuracy} %`),
              h('td', {}, t('teacher.unit.cpm', { n: r.cpm }))))))))];
        })));
      const list = h('div', { class: 'teacher-list' }, ...sets.map((s) => {
        const rs = store.setResults(s);
        const st = setStats(rs);
        return h('button', { type: 'button', class: 'child-row', onClick: () => openSet(s) },
          h('span', { class: 'child-row-main' },
            h('span', { class: 'child-row-name' }, `${day(s.start)} · ${span(s)}`),
            h('span', { class: 'child-row-sub' }, [st.tasks, tn('teacher.n.results', rs.length), t('teacher.sets.okOf', { ok: st.ok, n: rs.length })].join(' · '))),
          h('span', { class: 'child-row-big' }, `${st.accuracy} %`));
      }));
      return [h('section', { class: 'group-block' }, head, h('div', { class: 'teacher-table' }, table), list)];
    });
    paintActions();
    return [groupChips(), ...blocks, actions];
  };

  /** Pisatelia: a search, the group chips and every writer with the change from the first hand-in to the last. */
  const writersTab = (): Node[] => {
    if (!store.results.length) return [empty()];
    const body = h('div', {});
    const search = h('input', { type: 'search', class: 'writer-search', value: view.search, placeholder: t('teacher.writers.search'), 'aria-label': t('teacher.writers.search'),
      onInput: (e: Event) => { view.search = (e.target as HTMLInputElement).value; paintBody(); } });
    const sortBy = (key: WriterKey) => {
      view.writerSort = nextSort(view.writerSort, key);
      paintBody();
    };
    const arrow = (key: WriterKey) => (view.writerSort.key === key ? icon(view.writerSort.desc ? 'sortDown' : 'sortUp', 'icon sort-arrow') : null);
    const bigValue = (w: Writer): string => {
      switch (view.writerSort.key) {
        case 'minutes': return t('teacher.unit.min', { n: w.minutes });
        case 'rhythm': return String(w.cpm);
        case 'levels': return w.levels === undefined ? '-' : String(w.levels);
        case 'handIns': return String(w.rows.length);
        default: return `${w.accuracy} %`;
      }
    };
    const paintBody = () => {
      const q = fold(view.search.trim());
      const list = sortWriters(store.writers().filter((w) => (view.filter === null || (w.group ?? '') === view.filter) && (!q || fold(w.name).includes(q))), view.writerSort);
      const sortChips = h('div', { class: 'sort-chips', role: 'group', 'aria-label': t('teacher.sortBy') }, h('span', { class: 'hint' }, t('teacher.sortBy')),
        ...CHIP_KEYS.map((k) => h('button', { type: 'button', class: `chip${view.writerSort.key === k ? ' on' : ''}`, 'aria-pressed': view.writerSort.key === k, onClick: () => sortBy(k) }, t(`teacher.sort.${k}`), arrow(k))));
      if (!list.length) return void body.replaceChildren(h('p', { class: 'hint' }, t('teacher.writers.none')));
      const th = (k: WriterKey) => h('th', { scope: 'col', ...(view.writerSort.key === k && { 'aria-sort': view.writerSort.desc ? 'descending' : 'ascending' }) },
        h('button', { type: 'button', class: `sort-btn${view.writerSort.key === k ? ' on' : ''}`, onClick: () => sortBy(k) }, t(`teacher.${COL[k]}`), arrow(k)));
      body.replaceChildren(
        h('p', { class: 'hint teacher-count' }, tn('teacher.n.writers', list.length)),
        sortChips,
        h('div', { class: 'teacher-table' }, h('table', { class: 'writers-table' },
          h('thead', {}, h('tr', {}, ...WRITER_KEYS.map(th), h('th', { scope: 'col' }, t('teacher.col.weak')), th('status'))),
          h('tbody', {}, ...list.map((w) => {
            const more = w.rows.length > 1;
            return h('tr', { class: w.intact ? '' : 'broken' },
              h('td', {}, h('button', { type: 'button', class: 'child-link', onClick: () => openChild(w.key) }, w.name), w.intact ? null : h('span', { class: 'error', tip: t('teacher.notIntact') }, ' !'), lockMark(w)),
              h('td', {}, groupName(w.group)),
              h('td', {}, String(w.rows.length)),
              h('td', {}, w.last),
              h('td', {}, `${w.accuracy} %`, ' ', delta(w.accuracyChange, more)),
              h('td', {}, String(w.cpm), ' ', delta(w.cpmChange, more)),
              h('td', {}, String(w.minutes)),
              h('td', {}, w.levels === undefined ? '' : String(w.levels)),
              h('td', {}, weakLine(w.weak)),
              h('td', {}, statusPill(w.mastered)));
          })))),
        h('div', { class: 'teacher-list' }, ...list.map((w) => h('button', { type: 'button', class: `child-row${w.intact ? '' : ' broken'}`, onClick: () => openChild(w.key) },
          h('span', { class: 'child-row-main' },
            h('span', { class: 'child-row-name' }, w.name, w.intact ? '' : ' !', lockMark(w)),
            h('span', { class: 'child-row-sub' }, [groupName(w.group), tn('teacher.n.handIns', w.rows.length), w.last, t('teacher.unit.cpm', { n: w.cpm })].join(' · '), ' ', statusPill(w.mastered))),
          h('span', { class: 'child-row-big' }, bigValue(w))))));
    };
    paintBody();
    return [search, groupChips(), body];
  };

  /** Súbory: load, save, send, delete, and the files loaded so far. */
  const filesTab = (): (Node | null)[] => {
    const status = view.fileMsg ? h('p', { class: view.fileMsg.ok ? 'ok' : 'error', role: 'status' }, view.fileMsg.text) : null;
    const has = store.results.length > 0;
    const when = (ms: number) => `${new Date(ms).toLocaleDateString(locale())} ${clock(ms)}`;
    return [
      status,
      h('p', { class: 'hint' }, ...richText(t('teacher.file.intro'))),
      h('div', { class: 'row teacher-actions' },
        button(t('teacher.file.load'), () => fileInput.click(), 'btn primary', 'upload'),
        has ? button(t('teacher.file.saveAll'), () => download(tapkoName(), tapkoFile(store.sets, store.results), TAPKO_TYPE), 'btn desk-only', 'download') : null,
        has ? button(t('teacher.send.button'), () => sendDialog(store, null), 'btn phone-only', 'share') : null,
        has ? button(t('teacher.wipe.button'), () => wipeDialog(store, paint), 'btn ghost danger-text', 'trash') : null),
      fileInput,
      store.files.length ? h('div', { class: 'files-table' }, h('table', {},
        h('thead', {}, h('tr', {}, ...['name', 'loaded', 'period', 'groups', 'results', 'added'].map((c) => h('th', { scope: 'col' }, t(`teacher.file.col.${c}`))))),
        h('tbody', {}, ...store.files.map((f) => h('tr', {},
          h('td', { class: 'file-name' }, f.name),
          h('td', {}, when(f.loadedAt)),
          h('td', {}, f.from === f.to ? f.from : `${f.from} – ${f.to}`),
          h('td', {}, f.groups.map(groupName).join(', ')),
          h('td', {}, String(f.results)),
          h('td', {}, f.added ? `+${f.added}` : t('teacher.file.nothing'))))))) : h('p', { class: 'hint' }, t('teacher.file.none')),
    ];
  };

  const paintScanList = () => scan?.setList(session.filter((r) => store.results.includes(r)).map((r) => {
    const undo = button('', () => { store.remove(r); session = session.filter((x) => x !== r); paint(); }, 'btn small ghost', 'trash');
    undo.setAttribute('aria-label', t('teacher.scan.undo'));
    return h('li', {},
      h('span', { class: 'scan-name' }, r.name, lockMark(r)),
      h('span', { class: 'hint' }, `${r.title} · ${r.accuracy} % · ${r.cpm}${r.intact ? '' : ' !'}`),
      undo);
  }).reverse());

  const paint = () => {
    paintScanList();
    panel.replaceChildren(...(tab === 'groups' ? groupsTab() : tab === 'writers' ? writersTab() : filesTab()).filter((x): x is Node => !!x));
  };

  const scanButton = button(t('teacher.scan.start'), () => startScanning(), 'btn primary', 'camera');
  const stopScan = () => {
    scan?.stop();
    scan = null;
    store.endScan();
    scanSlot.replaceChildren();
    scanButton.hidden = false;
  };
  /** Hotovo: the camera off, and the scanned group with this scan's set open. */
  const finishScan = () => {
    const group = scanGroup.value.trim();
    const set = session.length ? store.setOf(session[session.length - 1]) : undefined;
    stopScan();
    if (set) {
      view.filter = group && store.sets.some((s) => s.group === group) ? group : null;
      view.open.add(set.id);
    }
    if (tab !== 'groups') showTab('groups');
    else paint();
    nav.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };
  const startScanning = () => {
    session = [];
    store.beginScan();
    scan = scanCard(scanGroup.value.trim(), (text) => void addCode(codeFrom(text, 'result'), true), finishScan);
    scanSlot.replaceChildren(scan.el);
    scanButton.hidden = true;
    paintScanList();
    // On a phone the preview and the done bar fill the screen.
    scan.el.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  const nav = tabBar(TABS.map((x) => [x, t(`teacher.tab.${x}`)] as const), tab, (x) => (x === tab ? paint() : showTab(x)));
  const screen = h('div', { class: 'screen teacher-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('start'), 'btn ghost small', 'back'), h('h1', {}, t('teacher.title'))),
    cornerControls(),
    h('main', { class: 'panel' },
      h('p', {}, ...richText(t('teacher.intro'))),
      h('div', { class: 'row scan-start' }, scanGroup, groupNames, scanButton),
      scanSlot,
      h('form', { class: 'row', onSubmit: (e: Event) => { e.preventDefault(); void addCode(codeFrom(paste.value, 'result')).then(() => (paste.value = '')); } },
        paste, h('button', { class: 'btn primary', type: 'submit' }, icon('plus'), h('span', {}, t('teacher.add')))),
      msg,
      h('div', { class: 'teacher-tabs' }, nav, panel),
      h('p', { class: 'hint' }, ...richText(t('teacher.privacy')))));
  // A `.tapko` file dropped anywhere on the page loads.
  screen.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  screen.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault();
    void loadFiles([...e.dataTransfer.files]);
  });
  root.append(screen);
  const opened = app.openedFiles.splice(0);
  if (opened.length) void loadFiles(opened);
  const added = code ? addCode(code) : Promise.resolve();
  if (!store.kept) void added.then(() => { msg.textContent = [msg.textContent, t('teacher.notKept')].filter(Boolean).join(' '); });
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

const lastSent = (): number => {
  try { return Number(localStorage.getItem(SENT_KEY)) || 0; } catch { return 0; }
};

/**
 * Poslať do počítača: the whole history or only what came since the last send (or one set), as a
 * `.tapko` file shared to another app when the phone can, or saved to the phone.
 */
function sendDialog(store: TeacherStore, only: ResultSet | null): void {
  const since = lastSent();
  const fresh = store.results.filter((r) => r.addedAt > since);
  let part: 'all' | 'new' = 'all';
  const pick = () => {
    if (only) return { sets: [only], results: store.setResults(only) };
    const results = part === 'all' ? store.results : fresh;
    const ids = new Set(results.map((r) => r.id));
    return { sets: store.sets.filter((s) => s.results.some((id) => ids.has(id))), results };
  };
  const name = tapkoName();
  const file = () => {
    const { sets, results } = pick();
    return new File([tapkoFile(sets, results)], name, { type: TAPKO_TYPE });
  };
  const sent = () => {
    if (only) return;
    try { localStorage.setItem(SENT_KEY, String(Date.now())); } catch { /* blocked storage */ }
  };
  const radio = (value: 'all' | 'new', label: string, n: number) => {
    const input = h('input', { type: 'radio', name: 'send-part', value, onChange: () => { part = value; } });
    input.checked = part === value;
    input.disabled = !n;
    return h('label', { class: 'radio-card' }, input, h('span', { class: 'radio-text' }, h('b', {}, label), h('span', { class: 'hint' }, tn('teacher.n.results', n))));
  };
  const canShare = (() => { try { return !!navigator.canShare?.({ files: [new File([''], name, { type: TAPKO_TYPE })] }); } catch { return false; } })();
  const close = modal(h('div', { class: 'send-dialog' },
    h('h2', {}, t(only ? 'teacher.send.setTitle' : 'teacher.send.title')),
    only ? h('p', {}, `${groupName(only.group)} · ${day(only.start)} · ${span(only)} · ${tn('teacher.n.results', store.setResults(only).length)}`)
      : h('div', { class: 'radio-cards', role: 'radiogroup' }, radio('all', t('teacher.send.all'), store.results.length), radio('new', t('teacher.send.new'), since ? fresh.length : store.results.length)),
    h('p', { class: 'hint' }, ...richText(t('teacher.send.file', { name }))),
    h('div', { class: 'row' },
      canShare ? button(t('teacher.send.share'), () => {
        void navigator.share({ files: [file()], title: name }).then(() => { sent(); close(); }, () => undefined);
      }, 'btn primary', 'share') : null,
      button(t('teacher.send.save'), () => {
        const f = file();
        void f.text().then((text) => { download(name, text, TAPKO_TYPE); sent(); close(); });
      }, canShare ? 'btn' : 'btn primary', 'download'))), { cls: 'confirm-modal' });
}

/** Vymazať…: what each age would delete, the danger button naming it, and a reminder to save first. */
function wipeDialog(store: TeacherStore, done: () => void): void {
  const now = Date.now();
  const choices = [...AGES.map((a) => ({ key: a.key, ...store.olderThan(dateBefore(now, a.months, a.days)) })), { key: 'all', results: store.results, sets: store.sets }];
  // The first age that deletes something is picked, so the button never starts at nothing.
  let chosen = choices.find((c) => c.results.length) ?? choices[choices.length - 1];
  const what = (c: typeof chosen) => (c.results.length ? [c.sets.length ? tn('teacher.n.sets', c.sets.length) : '', tn('teacher.n.results', c.results.length)].filter(Boolean).join(' · ') : t('teacher.wipe.nothing'));
  const ok = h('button', { type: 'button', class: 'btn danger' });
  const paintOk = () => {
    ok.textContent = chosen.key === 'all' ? t('teacher.wipe.all') : chosen.sets.length ? tn('teacher.wipe.goSets', chosen.sets.length) : tn('teacher.wipe.goResults', chosen.results.length);
    ok.disabled = !chosen.results.length && chosen.key !== 'all';
  };
  const cards = choices.map((c) => {
    const input = h('input', { type: 'radio', name: 'wipe-age', value: c.key, onChange: () => { chosen = c; paintOk(); } });
    input.checked = c === chosen;
    return h('label', { class: `radio-card${c.key === 'all' ? ' danger-card' : ''}` }, input,
      h('span', { class: 'radio-text' }, h('b', {}, t(`teacher.wipe.age.${c.key}`)), h('span', { class: 'hint' }, what(c))));
  });
  paintOk();
  const close = modal(h('div', { class: 'wipe-dialog' },
    h('h2', {}, t('teacher.wipe.title')),
    h('p', { class: 'hint' }, ...richText(t('teacher.wipe.first'))),
    h('p', { class: 'wipe-label' }, t('teacher.wipe.older')),
    h('div', { class: 'radio-cards', role: 'radiogroup' }, ...cards),
    h('div', { class: 'row' },
      button(t('teacher.file.saveAll'), () => download(tapkoName(), tapkoFile(store.sets, store.results), TAPKO_TYPE), 'btn', 'download'),
      button(t('common.back'), () => close(), 'btn ghost'),
      ok)), { cls: 'confirm-modal' });
  ok.addEventListener('click', () => {
    if (chosen.key === 'all') store.clearAll();
    else store.removeMany(chosen.results);
    close();
    done();
  });
}

/** One set on its own page (a phone's tap on a set): the numbers, sending, removing, and its writers. */
function setPage(root: HTMLElement, store: TeacherStore, set: ResultSet): void {
  const back = backTo('groups');
  const list = h('div', { class: 'set-list' });
  const chips = h('div', { class: 'sort-chips', role: 'group', 'aria-label': t('teacher.sortBy') });
  const remove = async () => {
    const rows = store.setResults(set);
    const yes = await confirmDialog({ title: t('teacher.set.removeTitle'), text: t('teacher.set.removeText', { n: tn('teacher.n.results', rows.length) }), ok: t('teacher.remove'), cancel: t('common.back'), danger: true });
    if (!yes) return;
    store.removeMany(rows);
    back();
  };
  const paint = () => {
    const rows = store.setResults(set);
    const st = setStats(rows);
    const sort = view.setSort;
    const arrow = (key: SortKey) => (sort.key === key ? icon(sort.desc ? 'sortDown' : 'sortUp', 'icon sort-arrow') : null);
    chips.replaceChildren(h('span', { class: 'hint' }, t('teacher.sortBy')),
      ...SET_CHIP_KEYS.map((k) => h('button', { type: 'button', class: `chip${sort.key === k ? ' on' : ''}`, 'aria-pressed': sort.key === k, onClick: () => { view.setSort = nextSort(sort, k); paint(); } }, t(`teacher.sort.${k}`), arrow(k))));
    const big = (r: StoredResult) => (sort.key === 'minutes' ? t('teacher.unit.min', { n: r.minutes }) : sort.key === 'rhythm' ? String(r.cpm) : sort.key === 'levels' ? String(r.levels ?? '-') : `${r.accuracy} %`);
    list.replaceChildren(
      h('div', { class: 'child-tiles' },
        tile(String(rows.length), t('teacher.set.results')),
        tile(`${st.ok} / ${rows.length}`, t('teacher.set.ok')),
        tile(`${st.accuracy} %`, t('teacher.child.accuracy')),
        tile(String(st.rhythm), t('teacher.child.cpm'))),
      h('div', { class: 'row' },
        button(t('teacher.send.setButton'), () => sendDialog(store, set), 'btn primary', 'share'),
        button(t('teacher.set.remove'), () => void remove(), 'btn ghost danger-text', 'trash')),
      h('h2', {}, t('teacher.set.writers')),
      chips,
      h('div', { class: 'teacher-list set-writer-list' }, ...store.sorted(rows, sort).map((r) => h('button', { type: 'button', class: `child-row${r.intact ? '' : ' broken'}`, onClick: () => openChild(childKey(r)) },
        h('span', { class: 'child-row-main' },
          h('span', { class: 'child-row-name' }, r.name, r.intact ? '' : ' !', lockMark(r)),
          h('span', { class: 'child-row-sub' }, [r.title, t('teacher.unit.min', { n: r.minutes }), t('teacher.unit.cpm', { n: r.cpm })].join(' · '), ' ', statusPill(mastered(r)))),
        h('span', { class: 'child-row-big' }, big(r))))));
  };
  paint();
  root.append(h('div', { class: 'screen teacher-screen child-screen set-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), back, 'btn ghost small', 'back'),
      h('div', { class: 'child-head' }, h('h1', {}, groupName(set.group)),
        h('span', { class: 'hint' }, `${day(set.start)} · ${span(set)}`))),
    cornerControls(),
    h('main', { class: 'panel' }, list)));
}

/** One writer: the work together with its change, the weakest keys, how it went over the hand-ins, every hand-in, and moving or removing the writer. */
function childCard(root: HTMLElement, store: TeacherStore, key: string): void {
  const rows = store.childResults(key);
  const w = writer(rows);
  const more = rows.length > 1;
  const back = backTo('writers');
  const move = () => {
    const group = assignGroup(store, rows);
    if (group !== null) go('teacher', { child: childKey({ name: w.name, group: group || undefined }) }, false);
  };
  const removeChild = async () => {
    const yes = await confirmDialog({ title: t('teacher.child.removeTitle', { name: w.name }), text: t('teacher.child.removeText', { name: w.name, n: rows.length }), ok: t('teacher.remove'), cancel: t('common.back'), danger: true });
    if (!yes) return;
    store.removeMany(rows);
    back();
  };
  const oldest = [...rows].reverse();
  const labels = oldest.map((r) => r.date);
  root.append(h('div', { class: 'screen teacher-screen child-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), back, 'btn ghost small', 'back'),
      h('div', { class: 'child-head' }, h('h1', {}, w.name, lockMark(w)),
        h('span', { class: 'hint' }, [groupName(w.group), tn('teacher.n.handIns', rows.length)].join(' · ')))),
    cornerControls(),
    h('main', { class: 'panel' },
      h('div', { class: 'child-tiles' },
        tile(`${w.accuracy} %`, t('teacher.child.accuracy'), delta(w.accuracyChange, more)),
        tile(String(w.cpm), t('teacher.child.cpm'), delta(w.cpmChange, more)),
        tile(String(w.minutes), t('teacher.child.minutes')),
        w.levels === undefined ? null : tile(String(w.levels), t('teacher.child.levels'))),
      w.weak.length ? h('section', {}, h('h2', {}, t('teacher.col.weak')),
        h('div', { class: 'child-keys' }, ...w.weak.map(([k, a]) => h('span', { class: 'kbd child-key' }, `${keyLabel(k)} ${a} %`)))) : null,
      more ? h('section', {}, h('h2', {}, t('teacher.child.trend')),
        h('div', { class: 'child-charts' },
          h('div', {}, h('h3', {}, t('teacher.col.accuracy')), lineChart(oldest.map((r) => r.accuracy), labels, '%', '#2f8a4f')),
          h('div', {}, h('h3', {}, t('teacher.child.cpm')), lineChart(oldest.map((r) => r.cpm), labels, t('teacher.child.cpmUnit'), '#d9661f')))) : null,
      h('section', {}, h('h2', {}, t('teacher.child.handIns')),
        h('ul', { class: 'child-tasks' }, ...rows.map((r) => {
          const set = store.setOf(r);
          return h('li', { class: r.intact ? '' : 'broken' },
            h('span', { class: 'child-task-main' }, h('b', {}, r.title, r.intact ? '' : ' !'),
              h('span', { class: 'hint' }, [r.date, clock(r.addedAt), t('teacher.unit.min', { n: r.minutes }), t('teacher.unit.cpm', { n: r.cpm }), r.levels === undefined ? '' : t('teacher.unit.levels', { n: r.levels })].filter(Boolean).join(' · '),
                set ? ' · ' : '', set ? h('button', { type: 'button', class: 'child-link set-link', onClick: () => openSet(set) }, t('teacher.child.set', { day: day(set.start), time: clock(set.start) })) : null)),
            statusPill(mastered(r)),
            h('b', { class: 'child-task-acc' }, `${r.accuracy} %`));
        }))),
      h('div', { class: 'row' },
        button(t('teacher.child.move'), move, 'btn', 'edit'),
        button(t('teacher.child.remove'), () => void removeChild(), 'btn ghost danger-text', 'trash')))));
}
