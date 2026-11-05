import { t, tn } from '../../i18n/i18n';
import { codeFrom } from '../../share/codec';
import { parseResult } from '../../share/result';
import { type StoredResult, type TeacherStore, recentByGroup } from '../../share/teacher';
import { cameraView } from '../../ui/camera';
import { button, confirmDialog, h, icon } from '../../ui/dom';
import { groupName, lockMark, openPlace, twoLabels, view } from './common';

/** What a part of the page shows; `own` parts fill a phone without the page's bar and tabs; `close` (Esc) leaves a card; `stop` runs when the teacher leaves. */
export interface Part {
  nodes: Node[];
  own?: boolean;
  close?: () => void;
  stop?: () => void;
}

/** How many of the newest results the first page lists. */
const RECENT = 30;

const resultLine = (r: StoredResult) => `${r.title} · ${r.accuracy} % · ${t('teacher.unit.cpm', { n: r.cpm })}${r.intact ? '' : ' !'}`;

/**
 * Výsledky: the ways in (the camera, a link) and the results added last, by group. A result link
 * that opened the page (`code`) is added on the way in and says how it went.
 */
export function resultsPart(store: TeacherStore, code?: string): Part {
  const msg = h('p', { class: 'teacher-msg', role: 'status', 'aria-live': 'polite' });
  const say = (text: string, cls: string) => {
    msg.className = `teacher-msg ${cls}`;
    msg.textContent = text;
  };
  const list = h('div', { class: 'recent' });
  const paint = () => {
    const groups = recentByGroup(store.results, RECENT);
    list.replaceChildren(...(groups.length ? groups.flatMap(({ group, rows }) => [
      h('button', { type: 'button', class: 'recent-group', onClick: () => { view.groups = group; openPlace('eval/groups'); } },
        h('b', {}, group ? t('teacher.results.group', { group }) : groupName(group)),
        h('span', { class: 'recent-count' }, tn('teacher.scan.count', rows.length)),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')),
      ...rows.map((r) => h('button', { type: 'button', class: 'recent-row', onClick: () => openPlace(`student/${r.student}`, true) },
        h('span', { class: 'recent-main' }, h('b', {}, r.name, lockMark(r)), h('span', { class: 'hint' }, resultLine(r))),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'))),
    ]) : [h('p', { class: 'hint recent-none' }, t('teacher.results.none'))]));
  };
  paint();
  if (code) {
    void parseResult(code).then(({ result, intact }) => {
      const added = store.add(result, intact, 'link');
      say(`${t(added ? 'teacher.added' : 'teacher.already', { name: result.name, title: result.title })}${intact ? '' : ` ${t('teacher.notIntact')}`}`, intact ? 'ok' : 'error');
      paint();
    }, () => say(t('share.broken'), 'error'));
  }
  return {
    nodes: [
      h('div', { class: 'teacher-lead' },
        h('p', { class: 'desk-only' }, t('teacher.results.intro')),
        h('div', { class: 'teacher-lead-actions' },
          button(twoLabels(t('teacher.results.scan'), t('teacher.results.scanShort')), () => openPlace('scan'), 'btn primary'),
          button(t('teacher.results.link'), () => openPlace('link'), 'btn desk-only'))),
      msg,
      store.kept ? null : h('p', { class: 'hint' }, t('teacher.notKept')),
      h('section', { class: 'recent-section', 'aria-labelledby': 'recent-title' }, h('h2', { id: 'recent-title' }, t('teacher.results.recent')), list),
    ].filter((x): x is HTMLElement => !!x),
  };
}

/**
 * The right column of the scan and link pages: what came in this time, newest first, each with a
 * way to take it back, and Zrušiť (takes them all back) and Hotovo (to the students).
 */
function collected(store: TeacherStore, head: Node, rows: StoredResult[]) {
  const list = h('ul', { class: 'scan-list', 'aria-label': t('teacher.scan.collected') });
  const count = h('span', { class: 'scan-count', 'aria-live': 'polite' });
  const paint = () => {
    count.textContent = tn('teacher.scan.count', rows.length);
    list.replaceChildren(...[...rows].reverse().map((r) => h('li', {},
      h('span', { class: 'scan-main' }, h('b', {}, r.name, lockMark(r)), h('span', { class: 'hint' }, resultLine(r))),
      h('button', { type: 'button', class: 'round-btn', 'aria-label': t('teacher.scan.undo'), tip: t('teacher.scan.undo'), onClick: () => {
        store.removeMany([r]);
        rows.splice(rows.indexOf(r), 1);
        paint();
      } }, icon('trash')))));
  };
  const cancel = async () => {
    if (rows.length && !(await confirmDialog({ title: t('teacher.scan.cancelTitle'), text: tn('teacher.scan.cancelText', rows.length), ok: t('teacher.scan.cancelOk'), cancel: t('common.back'), danger: true }))) return;
    store.removeMany(rows);
    openPlace('');
  };
  // The students of this time in view: their group when they share one.
  const done = () => {
    const groups = new Set(rows.map((r) => r.group ?? ''));
    view.students = groups.size === 1 ? [...groups][0] : null;
    view.search = '';
    openPlace('eval/students');
  };
  paint();
  return {
    el: h('div', { class: 'scan-side' },
      h('div', { class: 'scan-head' }, head, count),
      list,
      h('div', { class: 'scan-actions' }, button(t('teacher.scan.cancel'), () => void cancel(), 'btn'), button(t('teacher.scan.done'), done, 'btn primary'))),
    paint,
  };
}

/** Skenovanie: the camera reads result codes one after another; each new one beeps and joins the list. */
export function scanPart(store: TeacherStore): Part {
  const rows: StoredResult[] = [];
  store.beginScan();
  const add = async (text: string) => {
    const code = codeFrom(text, 'result');
    if (!code) return camera.unknown(t('teacher.scan.unknown'));
    try {
      const { result, intact } = await parseResult(code);
      const row = store.add(result, intact, 'scan');
      if (!row) return camera.again();
      rows.push(row);
      camera.hit();
      side.paint();
    } catch {
      camera.unknown(t('teacher.scan.unknown'));
    }
  };
  const camera = cameraView((text) => void add(text), (multi) => t(multi ? 'teacher.scan.many' : 'teacher.scan.one'));
  const side = collected(store, h('h2', {}, h('span', { class: 'desk-only' }, t('teacher.scan.collected')), h('span', { class: 'phone-only' }, t('teacher.scan.title'))), rows);
  return {
    own: true,
    stop: () => {
      camera.stop();
      store.endScan();
    },
    nodes: [h('section', { class: 'scan-page', 'aria-label': t('teacher.scan.title') },
      h('div', { class: 'scan-main-col' }, h('h2', { class: 'desk-only' }, t('teacher.scan.title')), camera.frame, camera.status),
      side.el)],
  };
}

/** Načítanie odkazu: a pasted result link joins the list; a bad one says so and the field empties for the next. */
export function linkPart(store: TeacherStore): Part {
  const rows: StoredResult[] = [];
  const area = h('textarea', { id: 'link-input', rows: 6, placeholder: t('teacher.link.placeholder'), 'aria-describedby': 'link-msg' });
  const msg = h('p', { id: 'link-msg', class: 'teacher-msg', role: 'status', 'aria-live': 'polite' });
  const say = (text: string, cls = '') => {
    msg.className = `teacher-msg ${cls}`;
    msg.textContent = text;
    area.toggleAttribute('aria-invalid', cls === 'bad');
  };
  const side = collected(store, h('h2', {}, t('teacher.scan.collected')), rows);
  const process = async () => {
    const code = codeFrom(area.value, 'result');
    area.value = '';
    try {
      if (!code) throw new Error('share.broken');
      const { result, intact } = await parseResult(code);
      const row = store.add(result, intact, 'link');
      if (row) {
        rows.push(row);
        side.paint();
      }
      say(row ? (intact ? '' : t('teacher.notIntact')) : t('teacher.already', { name: result.name, title: result.title }), intact ? '' : 'bad');
    } catch {
      say(t('teacher.link.bad'), 'bad');
    }
    area.focus();
  };
  return {
    nodes: [h('section', { class: 'scan-page link-page', 'aria-label': t('teacher.link.title') },
      h('form', { class: 'scan-main-col link-col', onSubmit: (e: Event) => { e.preventDefault(); void process(); } },
        h('h2', {}, t('teacher.link.title')),
        h('label', { for: 'link-input', class: 'field-label' }, t('teacher.link.label')),
        area,
        h('button', { type: 'submit', class: 'btn primary' }, t('teacher.link.process')),
        msg),
      side.el)],
  };
}
