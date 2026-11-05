import { locale, t, tn } from '../../i18n/i18n';
import { type ResultSet, type Sort, type TeacherStore, type Writer, type WriterKey, mastered, nextSort, sortWriters, writer } from '../../share/teacher';
import { lineChart } from '../../ui/charts';
import { button, closeButton, h, icon } from '../../ui/dom';
import type { Part } from './collect';
import { NEW_GROUP, askGroupName, brokenMark, choice, clock, closePlace, day, exportCsv, fold, groupName, groupTargets, isPhone, lockMark, openPlace, setStats, span, statusPill, view, weakLine } from './common';

/** The choice of a group to show: every group, each one, and "without a group" when someone has none; `count` adds how many students are without one. */
function groupFilter(store: TeacherStore, value: string | null, onChange: (g: string | null) => void, count = false, short = false) {
  const ALL = '\u0000all';
  const none = store.writers().filter((w) => !w.group).length;
  const options: [string, string][] = [[ALL, t(short ? 'teacher.allShort' : 'teacher.allGroups')], ...store.groups().map((g) => [g, g] as [string, string]),
    ...(none ? [['', count ? t('teacher.noGroupCount', { n: none }) : t('teacher.noGroup')] as [string, string]] : [])];
  const known = value === null || options.some(([v]) => v === value);
  const c = choice(t('teacher.groupLabel'), options, known && value !== null ? value : ALL, true);
  c.select.addEventListener('change', () => onChange(c.select.value === ALL ? null : c.select.value));
  if (!known) onChange(null);
  return c;
}

/** Skupiny: every set of results (a scan, links of 20 minutes, a file) with its numbers; a set opens its students inline on a computer, its own page on a phone. */
export function groupsPart(store: TeacherStore): Part {
  const body = h('div', { class: 'teacher-body' });
  const paint = () => {
    const filter = groupFilter(store, view.groups, (g) => { view.groups = g; paint(); });
    const sets = store.sets.filter((s) => store.setResults(s).length && (view.groups === null || s.group === view.groups)).sort((a, b) => b.start - a.start);
    const csv = () => exportCsv(store, sets.flatMap((s) => store.setResults(s)));
    const table = h('table', { class: 'sets-table' },
      h('thead', {}, h('tr', {}, ...['day', 'time', 'group', 'task', 'results', 'ok', 'accuracy', 'rhythm'].map((c) => h('th', { scope: 'col' }, t(`teacher.sets.${c}`))))),
      h('tbody', {}, ...sets.flatMap((s) => {
        const rs = store.setResults(s);
        const st = setStats(rs);
        const open = view.open.has(s.id);
        const toggle = () => {
          if (open) view.open.delete(s.id);
          else view.open.add(s.id);
          paint();
        };
        const row = h('tr', { class: `set-row${open ? ' open' : ''}`, onClick: toggle },
          h('td', {}, h('button', { type: 'button', class: 'set-day', 'aria-expanded': open, onClick: (e: Event) => { e.stopPropagation(); toggle(); } }, icon(open ? 'sortUp' : 'sortDown', 'icon sort-arrow'), day(s.start))),
          h('td', {}, span(s)),
          h('td', {}, groupName(s.group)),
          h('td', { class: 'set-tasks' }, st.tasks),
          h('td', {}, String(rs.length)),
          h('td', {}, t('teacher.sets.okOf', { ok: st.ok, n: rs.length })),
          h('td', {}, `${st.accuracy} %`),
          h('td', {}, t('teacher.unit.cpm', { n: st.rhythm })));
        if (!open) return [row];
        return [row, h('tr', { class: 'set-detail' }, h('td', { colspan: 8 }, h('table', { class: 'set-writers' },
          h('tbody', {}, ...store.sorted(rs).map((r) => h('tr', { class: r.intact ? '' : 'broken' },
            h('td', {}, h('button', { type: 'button', class: 'child-link', onClick: () => openPlace(`student/${r.student}`, true) }, r.name), brokenMark(r), lockMark(r)),
            h('td', {}, r.title),
            h('td', {}, t('teacher.unit.min', { n: r.minutes })),
            h('td', {}, statusPill(mastered(r))),
            h('td', {}, `${r.accuracy} %`),
            h('td', {}, t('teacher.unit.cpm', { n: r.cpm }))))))))];
      })));
    const list = h('ul', { class: 'teacher-rows' }, ...sets.map((s) => {
      const rs = store.setResults(s);
      const st = setStats(rs);
      return h('li', {}, h('button', { type: 'button', class: 'teacher-row', onClick: () => openPlace(`set/${s.id}`, true) },
        h('span', { class: 'teacher-row-main' }, h('b', {}, st.tasks), h('span', { class: 'hint' }, [`${day(s.start)} ${span(s)}`, groupName(s.group), tn('teacher.n.results', rs.length)].join(' · '))),
        h('span', { class: 'teacher-row-side' }, h('b', {}, `${st.accuracy} %`), h('span', { class: 'hint' }, t('teacher.sets.okShort', { ok: st.ok, n: rs.length }))),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')));
    }));
    body.replaceChildren(
      h('div', { class: 'teacher-toolbar' }, filter.el, h('span', { class: 'grow' }), button(t('teacher.csv'), csv, 'btn desk-only')),
      ...(sets.length ? [h('div', { class: 'teacher-table' }, table), list, button(t('teacher.csv'), csv, 'btn phone-only wide')] : [h('p', { class: 'hint' }, t('teacher.results.none'))]));
  };
  paint();
  return { nodes: [h('p', { class: 'hint teacher-intro desk-only' }, t('teacher.eval.groupsIntro')), body] };
}

/** One set on its own page (a phone's tap on a set): its numbers and its students. */
export function setPart(store: TeacherStore, set: ResultSet): Part {
  const rows = store.setResults(set);
  const st = setStats(rows);
  const sort: Sort = { key: 'child', desc: false };
  const tile = (value: string, label: string) => h('div', { class: 'child-tile' }, h('b', {}, value), h('span', {}, label));
  return {
    own: true,
    close: () => closePlace('eval/groups'),
    nodes: [
      h('div', { class: 'own-head' },
        h('div', { class: 'own-title' }, h('h1', {}, st.tasks), h('span', { class: 'hint' }, [groupName(set.group), `${day(set.start)} ${span(set)}`].join(' · '))),
        closeButton(() => closePlace('eval/groups'))),
      h('div', { class: 'child-tiles' },
        tile(String(rows.length), t('teacher.set.results')),
        tile(`${st.ok} / ${rows.length}`, t('teacher.set.ok')),
        tile(`${st.accuracy} %`, t('teacher.child.accuracy')),
        tile(String(st.rhythm), t('teacher.child.cpm'))),
      h('ul', { class: 'teacher-rows' }, ...store.sorted(rows, sort).map((r) => h('li', {}, h('button', { type: 'button', class: `teacher-row${r.intact ? '' : ' broken'}`, onClick: () => openPlace(`student/${r.student}`, true) },
        h('span', { class: 'teacher-row-main' }, h('b', {}, r.name, brokenMark(r), lockMark(r)), h('span', { class: 'hint' }, [r.title, t('teacher.unit.min', { n: r.minutes }), t('teacher.unit.cpm', { n: r.cpm })].join(' · '))),
        h('span', { class: 'teacher-row-side' }, h('b', {}, `${r.accuracy} %`), statusPill(mastered(r))),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'))))),
    ],
  };
}

/** The students' columns a teacher sorts by, in the table's order. */
const STUDENT_KEYS: WriterKey[] = ['child', 'group', 'handIns', 'date', 'accuracy', 'rhythm'];
const COL: Partial<Record<WriterKey, string>> = { child: 'col.child', group: 'col.group', handIns: 'col.handIns', date: 'col.last', accuracy: 'col.accuracy', rhythm: 'sets.rhythm' };
let studentSort: Sort<WriterKey> = { key: 'child', desc: false };

/** Študenti: a search, the group, every student with a box to pick; the picked ones move into a group together. */
export function studentsPart(store: TeacherStore): Part {
  const body = h('div', { class: 'teacher-body' });
  const search = h('input', { type: 'search', class: 'writer-search', value: view.search, placeholder: t(isPhone() ? 'teacher.students.searchShort' : 'teacher.students.search'), 'aria-label': t('teacher.students.search'),
    onInput: () => { view.search = search.value; paint(); } });
  const head = h('div', { class: 'teacher-toolbar' });
  const paintHead = () => {
    const filter = groupFilter(store, view.students, (g) => { view.students = g; view.picked.clear(); paintHead(); paint(); }, true, isPhone());
    head.replaceChildren(search, filter.el, h('span', { class: 'grow' }), button(t('teacher.csv'), () => exportCsv(store, shown().flatMap((w) => w.rows)), 'btn desk-only'));
  };
  const shown = (): Writer[] => {
    const q = fold(view.search.trim());
    return sortWriters(store.writers().filter((w) => (view.students === null || (w.group ?? '') === view.students) && (!q || fold(w.name).includes(q))), studentSort);
  };
  const pick = (key: string, on: boolean) => {
    if (on) view.picked.add(key);
    else view.picked.delete(key);
    paint();
  };
  const box = (w: Writer) => {
    const b = h('input', { type: 'checkbox', 'aria-label': t('teacher.students.pick', { name: w.name }), onChange: () => pick(w.key, b.checked) });
    b.checked = view.picked.has(w.key);
    return b;
  };
  const move = async (keys: string[], target: string) => {
    const group = target === NEW_GROUP ? await askGroupName() : target;
    if (group === null) return;
    store.moveStudents(keys, group);
    view.picked.clear();
    paintHead();
    paint();
  };
  const paint = () => {
    const list = shown();
    for (const k of [...view.picked]) if (!list.some((w) => w.key === k)) view.picked.delete(k);
    const picked = list.filter((w) => view.picked.has(w.key));
    const sortBy = (key: WriterKey) => {
      studentSort = nextSort(studentSort, key);
      paint();
    };
    const th = (k: WriterKey) => h('th', { scope: 'col', ...(studentSort.key === k && { 'aria-sort': studentSort.desc ? 'descending' : 'ascending' }) },
      h('button', { type: 'button', class: `sort-btn${studentSort.key === k ? ' on' : ''}`, onClick: () => sortBy(k) }, t(`teacher.${COL[k]}`), studentSort.key === k ? icon(studentSort.desc ? 'sortDown' : 'sortUp', 'icon sort-arrow') : null));
    const all = h('input', { type: 'checkbox', 'aria-label': t('teacher.students.pickAll'), onChange: () => {
      for (const w of list) if (all.checked) view.picked.add(w.key); else view.picked.delete(w.key);
      paint();
    } });
    all.checked = list.length > 0 && picked.length === list.length;
    all.indeterminate = picked.length > 0 && picked.length < list.length;
    const open = (w: Writer) => () => openPlace(`student/${w.key}`, true);
    const targets = groupTargets(store);
    const deskTarget = choice(t('teacher.students.moveTo'), targets, targets[0][0], true);
    const phoneTarget = h('select', { 'aria-label': t('teacher.students.moveTo') }, ...targets.map(([v, text]) => h('option', { value: v }, t('teacher.students.moveToShort', { group: text }))));
    body.replaceChildren(...(list.length ? ([
      h('div', { class: 'teacher-table' }, h('table', { class: 'writers-table' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'pick-col' }, all), ...STUDENT_KEYS.map(th), h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, t('teacher.students.open'))))),
        h('tbody', {}, ...list.map((w) => h('tr', { class: w.intact ? '' : 'broken' },
          h('td', { class: 'pick-col' }, box(w)),
          h('td', {}, h('button', { type: 'button', class: 'child-link', onClick: open(w) }, w.name), brokenMark(w), lockMark(w)),
          h('td', {}, groupName(w.group)),
          h('td', {}, String(w.rows.length)),
          h('td', {}, w.last),
          h('td', {}, `${w.accuracy} %`),
          h('td', {}, t('teacher.unit.cpm', { n: w.cpm })),
          h('td', {}, h('button', { type: 'button', class: 'chev-btn', 'aria-label': t('teacher.students.open'), onClick: open(w) }, '›'))))))),
      h('ul', { class: 'teacher-rows pickable' }, ...list.map((w) => h('li', {}, box(w),
        h('button', { type: 'button', class: `teacher-row${w.intact ? '' : ' broken'}`, onClick: open(w) },
          h('span', { class: 'teacher-row-main' }, h('b', {}, w.name, brokenMark(w), lockMark(w)), h('span', { class: 'hint' }, [tn('teacher.n.handIns', w.rows.length), `${w.accuracy} %`, w.last].join(' · '))),
          h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'))))),
      picked.length ? h('div', { class: 'move-bar' },
        h('b', { class: 'desk-only' }, t('teacher.students.picked', { n: picked.length })),
        h('span', { class: 'desk-only' }, deskTarget.el),
        h('span', { class: 'phone-only grow' }, phoneTarget),
        button(h('span', {}, h('span', { class: 'desk-only' }, t('teacher.students.move')), h('span', { class: 'phone-only' }, t('teacher.students.moveN', { n: picked.length }))),
          () => void move(picked.map((w) => w.key), isPhone() ? phoneTarget.value : deskTarget.select.value), 'btn primary')) : null,
    ] as (HTMLElement | null)[]) : [h('p', { class: 'hint' }, t(store.results.length ? 'teacher.students.none' : 'teacher.results.none'))]).filter((x): x is HTMLElement => !!x));
  };
  paintHead();
  paint();
  return { nodes: [h('p', { class: 'hint teacher-intro desk-only' }, t('teacher.eval.studentsIntro')), head, body] };
}

/** One student's card, results only: the work together, how it went over the hand-ins and every hand-in. */
export function studentPart(store: TeacherStore, key: string): Part {
  const rows = store.childResults(key);
  const w = writer(rows);
  const oldest = [...rows].reverse();
  const labels = oldest.map((r) => r.date);
  const tile = (value: string, label: string) => h('div', { class: 'child-tile' }, h('b', {}, value), h('span', {}, label));
  const toGroup = () => {
    view.students = w.group ?? '';
    openPlace('eval/students');
  };
  return {
    own: true,
    close: () => closePlace('eval/students'),
    nodes: [
      h('nav', { class: 'crumbs', 'aria-label': t('teacher.student.crumbs') },
        h('a', { href: '#/teacher/eval/students', onClick: (e: Event) => { e.preventDefault(); view.students = null; openPlace('eval/students'); } }, t('teacher.sub.students')),
        h('span', { 'aria-hidden': 'true' }, '›'),
        h('a', { href: '#/teacher/eval/students', onClick: (e: Event) => { e.preventDefault(); toGroup(); } }, groupName(w.group)),
        h('span', { 'aria-hidden': 'true' }, '›'),
        h('h2', {}, w.name, lockMark(w))),
      h('div', { class: 'own-head phone-head' },
        h('div', { class: 'own-title' }, h('h1', {}, w.name, lockMark(w)), h('span', { class: 'hint' }, groupName(w.group))),
        closeButton(() => closePlace('eval/students'))),
      h('div', { class: 'child-tiles four' },
        tile(`${w.accuracy} %`, t('teacher.child.accuracy')),
        tile(String(w.cpm), t('teacher.child.cpm')),
        tile(String(w.minutes), t('teacher.child.minutes')),
        tile(w.levels === undefined ? '-' : String(w.levels), t('teacher.child.levels'))),
      h('div', { class: 'student-body' },
        h('section', { class: 'student-trend' }, h('h3', {}, t('teacher.child.trend')),
          rows.length > 1 ? h('div', { class: 'child-charts' },
            lineChart(oldest.map((r) => r.accuracy), labels, '%', '#2f8a4f'),
            lineChart(oldest.map((r) => r.cpm), labels, t('teacher.child.cpmUnit'), '#d9661f')) : h('p', { class: 'hint' }, t('teacher.student.oneHandIn'))),
        h('section', { class: 'student-hand-ins' }, h('h3', {}, t('teacher.child.handIns')),
          h('div', { class: 'teacher-table' }, h('table', {},
            h('thead', {}, h('tr', {}, ...['task', 'date', 'minutes', 'accuracy', 'rhythm', 'weak'].map((c) => h('th', { scope: 'col' }, t(c === 'rhythm' ? 'teacher.sets.rhythm' : `teacher.col.${c}`))))),
            h('tbody', {}, ...rows.map((r) => h('tr', { class: r.intact ? '' : 'broken' },
              h('td', {}, r.title, brokenMark(r)), h('td', {}, r.date), h('td', {}, String(r.minutes)), h('td', {}, `${r.accuracy} %`), h('td', {}, String(r.cpm)), h('td', {}, weakLine(r.weak.slice(0, 3)))))))),
          h('ul', { class: 'teacher-rows' }, ...rows.map((r) => h('li', { class: `hand-in${r.intact ? '' : ' broken'}` },
            h('span', { class: 'hand-in-top' }, h('b', {}, r.title, brokenMark(r)), h('b', {}, `${r.accuracy} %`)),
            h('span', { class: 'hint' }, [r.date, t('teacher.unit.min', { n: r.minutes }), t('teacher.unit.cpm', { n: r.cpm }), r.weak.length ? t('teacher.student.weak', { keys: weakLine(r.weak.slice(0, 3)) }) : ''].filter(Boolean).join(' · '))))))),
    ],
  };
}

/** Súbory: the `.tapko` files results were loaded from here. */
export function filesPart(store: TeacherStore): Part {
  const when = (ms: number) => `${new Date(ms).toLocaleDateString(locale())} ${clock(ms)}`;
  const period = (from: string, to: string) => (from === to ? from : `${from} – ${to}`);
  const added = (n: number) => (n ? `+${n}` : t('teacher.file.nothing'));
  return {
    nodes: [
      h('p', { class: 'hint teacher-intro' }, t('teacher.eval.filesIntro')),
      ...(store.files.length ? [
        h('div', { class: 'teacher-table' }, h('table', { class: 'files-table' },
          h('thead', {}, h('tr', {}, ...['name', 'loaded', 'period', 'groups', 'results', 'added'].map((c) => h('th', { scope: 'col' }, t(`teacher.file.col.${c}`))))),
          h('tbody', {}, ...store.files.map((f) => h('tr', {},
            h('td', { class: 'file-name' }, f.name), h('td', {}, when(f.loadedAt)), h('td', {}, period(f.from, f.to)),
            h('td', {}, f.groups.map(groupName).join(', ')), h('td', {}, String(f.results)), h('td', {}, added(f.added))))))),
        h('ul', { class: 'teacher-rows' }, ...store.files.map((f) => h('li', { class: 'file-row' },
          h('span', { class: 'hand-in-top' }, h('b', { class: 'file-name' }, f.name), h('span', {}, added(f.added))),
          h('span', { class: 'hint' }, [when(f.loadedAt), period(f.from, f.to), f.groups.map(groupName).join(', '), tn('teacher.n.results', f.results)].join(' · '))))),
      ] : [h('p', { class: 'hint' }, t('teacher.file.none'))]),
    ],
  };
}

