import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { CODEC_VERSION, checksum, codeFrom, decode, encode } from './codec';
import { OVERALL_ID, makeOverallResult, makeResult, parseResult, resultCode } from './result';
import { activeTask, addTask, parseTask, recordTaskRun, taskCode, taskOwn } from './task';
import { parseTapko, tapkoFile } from './tapko-file';
import { type SortKey, TeacherStore, childKey, childSummary, dateBefore, newest, nextSort, sortWriters } from './teacher';
import { moveCode, parseMove, trimHistory } from './transfer';

const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (code: string) => Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** A loaded teacher store on a fresh database of its own. */
async function teacherStore(idb: IDBFactory | null = new IDBFactory()): Promise<TeacherStore> {
  const s = new TeacherStore(idb);
  await s.load();
  return s;
}

describe('codec', () => {
  it('round-trips with link-safe characters', async () => {
    const value = { a: 'Ťažký kôň ľúbi ďatelinu', n: [1, 2, 3], deep: { x: null } };
    const code = await encode(value);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decode(code)).toEqual(value);
  });

  it('starts with the version byte and refuses an unknown one', async () => {
    const bytes = unb64(await encode({ a: 1 }));
    expect(bytes[0]).toBe(CODEC_VERSION);
    bytes[0] = 99;
    await expect(decode(b64([...bytes]))).rejects.toThrow('share.broken');
  });

  it('refuses broken input', async () => {
    const code = await encode({ text: 'a long enough text to compress somewhat '.repeat(5) });
    await expect(decode(code.slice(0, code.length / 2))).rejects.toThrow('share.broken');
    await expect(decode('not a code!')).rejects.toThrow('share.broken');
    await expect(decode('')).rejects.toThrow('share.broken');
  });

  it('finds the code in a pasted link', () => {
    expect(codeFrom('https://x.org/tapkotyper/#/result/AbC_-123456', 'result')).toBe('AbC_-123456');
    expect(codeFrom('  AbC_-123456 ', 'result')).toBe('AbC_-123456');
    expect(codeFrom('https://x.org/#/task/AbC_-123456', 'result')).toBe(null);
  });

  it('checksum changes with the text', () => {
    expect(checksum('abc')).toMatch(/^[0-9a-f]{8}$/);
    expect(checksum('abc')).not.toBe(checksum('abd'));
  });
});

describe('tasks', () => {
  const spec = { id: 't1', title: 'Zvieratá', words: ['pes', 'mačka'], text: '', minutes: 2, kind: 'practice' as const };

  it('travel by code and come back cleaned', async () => {
    expect(await parseTask(await taskCode({ ...spec, minutes: 99, title: `  ${'x'.repeat(100)}` }))).toMatchObject({ minutes: 20, title: 'x'.repeat(60) });
    await expect(parseTask(await encode({ app: 'tapkotyper', type: 'task', id: 'x', title: 'y', words: [], text: '' }))).rejects.toThrow('share.broken');
  });

  it('finish when their time is played, and keep play when given again', () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, spec);
    expect(activeTask(p)).toBe(task);
    expect(recordTaskRun(task, { seconds: 70, chars: 50, errors: 5, cpm: 40 })).toBe(false);
    expect(addTask(p, spec).seconds).toBe(70);
    expect(p.tasks).toHaveLength(1);
    expect(recordTaskRun(p.tasks[0], { seconds: 49, chars: 50, errors: 0, cpm: 44 })).toBe(true);
    expect(p.tasks[0].doneAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(activeTask(p)).toBe(null);
    expect(taskOwn(p.tasks[0]).share).toBe(1);
  });
});

describe('results', () => {
  it('round-trip, and a changed copy is not intact', async () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, { id: 't1', title: 'Zvieratá', words: ['pes'], text: '', minutes: 1, kind: 'story' });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    const r = makeResult(p, task);
    expect(r).toMatchObject({ name: 'Ema', minutes: 1, accuracy: 90, cpm: 50 });
    const back = await parseResult(await resultCode(r));
    expect(back).toEqual({ result: r, intact: true });
    const forged = await encode({ ...(await decode(await resultCode(r)) as object), accuracy: 100 });
    expect((await parseResult(forged)).intact).toBe(false);
  });

  it('name a player without a real name by the nickname', async () => {
    const p = newProfile('', 'sk', undefined, 'fox', 'Blesk');
    const task = addTask(p, { id: 't1', title: 'Zvieratá', words: ['pes'], text: '', minutes: 1, kind: 'story' });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    expect((await parseResult(await resultCode(makeResult(p, task)))).result.name).toBe('Blesk');
    expect(makeOverallResult(p, 'x').name).toBe('Blesk');
  });

  it('carry a group, and a result without one keeps its old checksum', async () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, { id: 't1', title: 'Zvieratá', words: ['pes'], text: '', minutes: 1, kind: 'story', group: '5.A' });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    const r = makeResult(p, task);
    expect(r.group).toBe('5.A');
    expect(r.levels).toBe(0);
    expect(await parseResult(await resultCode(r))).toEqual({ result: r, intact: true });
    const spec = { id: 't1', title: 'x', words: ['a'], text: '', minutes: 1, kind: 'practice' as const };
    expect((await parseTask(await taskCode({ ...spec, group: ' 5.A ' }))).group).toBe('5.A');
    expect('group' in (await parseTask(await taskCode(spec)))).toBe(false);
    // An older link has no group field and the sum of the old field list.
    const old = { taskId: 't1', title: 'Z', name: 'Ema', date: '2026-10-21', minutes: 1, accuracy: 90, cpm: 50, weak: [] };
    const sum = checksum(JSON.stringify([old.taskId, old.title, old.name, old.date, old.minutes, old.accuracy, old.cpm, old.weak]));
    const back = await parseResult(await encode({ app: 'tapkotyper', type: 'result', ...old, sum }));
    expect(back.intact).toBe(true);
    expect(back.result.group).toBeUndefined();
    const forged = await encode({ app: 'tapkotyper', type: 'result', ...old, group: '5.B', sum });
    expect((await parseResult(forged)).intact).toBe(false);
  });

  it('teacher store keeps every hand-in once, by its fingerprint, and exports CSV', async () => {
    const idb = new IDBFactory();
    const s = await teacherStore(idb);
    const r = { taskId: 't1', title: 'Zvieratá', name: 'Ema', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [['ô', 70]] as [string, number][] };
    expect(s.add(r, true)).not.toBeNull();
    expect(s.add(r, true)).toBeNull();
    // A newer hand-in of the same task is kept beside the older one.
    expect(s.add({ ...r, accuracy: 95, date: '2026-10-22' }, true)).not.toBeNull();
    s.add({ ...r, name: 'Adam, "A"' }, false);
    await s.saved();
    expect((await teacherStore(idb)).results).toHaveLength(3);
    const head = ['group', 'task', 'child', 'date', 'min', 'acc', 'cpm', 'levels', 'status', 'weak', 'broken'];
    const names = { key: (k: string) => k, status: (ok: boolean) => (ok ? 'ok' : 'practice') };
    expect(s.csv(head, names, newest(s.results)).split('\n')).toEqual([
      head.join(','),
      ',Zvieratá,"Adam, ""A""",2026-10-21,2,90,50,,ok,ô 70 %,!',
      ',Zvieratá,Ema,2026-10-22,2,95,50,,ok,ô 70 %,',
    ]);
    const ema = s.results.filter((x) => x.name === 'Ema');
    s.assign(ema, '5.A');
    expect(s.groups()).toEqual(['5.A']);
    // A newer hand-in without a group keeps the group the teacher gave that child.
    const next = s.add({ ...r, accuracy: 99, date: '2026-10-23' }, true)!;
    expect(next.group).toBe('5.A');
    expect(s.childResults(childKey(next)).map((x) => x.accuracy)).toEqual([99, 95, 90]);
    s.removeMany(s.childResults(childKey(next)));
    expect(s.results).toHaveLength(1);
    await s.saved();
    const back = await teacherStore(idb);
    expect(back.results.map((x) => x.name)).toEqual(['Adam, "A"']);
    expect(back.sets.flatMap((x) => x.results)).toEqual([back.results[0].id]);
  });

  it('teacher store keeps a moved child under the same fingerprint, and a set moves with all its results', async () => {
    const idb = new IDBFactory();
    const s = await teacherStore(idb);
    const r = { taskId: 't1', title: 'Zvieratá', name: 'Ema', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    const ema = s.add(r, true, undefined, 1000)!;
    s.add({ ...r, name: 'Adam' }, true, undefined, 2000);
    const before = ema.id;
    s.assign([ema], '5.A');
    expect(ema.id).toBe(before);
    expect(s.sets[0].group).toBe('');
    s.assign(s.results, '5.A');
    expect(s.sets[0].group).toBe('5.A');
    await s.saved();
    const back = await teacherStore(idb);
    expect(back.results.find((x) => x.name === 'Ema')).toEqual(ema);
    expect(back.sets[0].group).toBe('5.A');
    expect(back.childResults(childKey({ name: 'Ema', group: '5.A' }))).toHaveLength(1);
  });

  it('teacher store forms sets: links of one group within 20 minutes, a scan always one', async () => {
    const s = await teacherStore();
    const r = (name: string, group?: string) => ({ taskId: 't1', title: 'T', name, ...(group && { group }), date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] });
    const min = 60_000;
    s.add(r('A', '5.A'), true, undefined, 0);
    s.add(r('B', '5.A'), true, undefined, 19 * min);
    // Another group starts its own set; 21 minutes after the first result a new one starts.
    s.add(r('C', '5.B'), true, undefined, 19 * min);
    s.add(r('D', '5.A'), true, undefined, 21 * min);
    expect(s.sets.map((x) => [x.group, x.source, x.results.length])).toEqual([['5.A', 'link', 2], ['5.B', 'link', 1], ['5.A', 'link', 1]]);
    expect(s.sets[0].end).toBe(19 * min);
    s.beginScan();
    s.add(r('E'), true, '6.C', 30 * min);
    s.add(r('F'), true, '6.C', 90 * min);
    s.endScan();
    s.add(r('G'), true, '6.C', 91 * min);
    const scan = s.sets.filter((x) => x.group === '6.C');
    expect(scan.map((x) => [x.source, x.results.length])).toEqual([['scan', 2], ['link', 1]]);
    expect(s.results.find((x) => x.name === 'E')!.group).toBe('6.C');
    s.removeMany(s.setResults(scan[0]));
    expect(s.sets.filter((x) => x.group === '6.C')).toHaveLength(1);
  });

  it('teacher store drops hand-ins older than a year after 7 days in this browser', async () => {
    const idb = new IDBFactory();
    const s = await teacherStore(idb);
    const now = new Date(2026, 9, 23).getTime();
    const day = 86_400_000;
    const r = { taskId: 't1', title: 'T', name: 'Ema', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...r, date: '2025-10-01' }, true, undefined, now - 8 * day);
    s.add({ ...r, date: '2025-10-02' }, true, undefined, now - 6 * day);
    s.add({ ...r, date: '2026-10-01' }, true, undefined, now - 30 * day);
    await s.saved();
    const back = new TeacherStore(idb);
    await back.load(now);
    expect(back.results.map((x) => x.date).sort()).toEqual(['2025-10-02', '2026-10-01']);
    await back.saved();
    const later = new TeacherStore(idb);
    await later.load(now + 2 * day);
    expect(later.results.map((x) => x.date)).toEqual(['2026-10-01']);
    expect(later.sets).toHaveLength(1);
  });

  it('a .tapko file carries sets and results; loading it twice adds nothing, old ones are counted', async () => {
    const phone = await teacherStore();
    const r = { taskId: 't1', title: 'T', name: 'Ema', group: '5.A', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [['ô', 70]] as [string, number][] };
    phone.add(r, true, undefined, 1000);
    phone.add({ ...r, name: 'Adam' }, false, undefined, 2000);
    phone.add({ ...r, name: 'Old', date: '2025-01-01' }, true, undefined, 3000);
    const text = tapkoFile(phone.sets, phone.results);
    const idb = new IDBFactory();
    const pc = await teacherStore(idb);
    const now = new Date(2026, 9, 23).getTime();
    const file = parseTapko(text);
    expect(pc.importFile('a.tapko', file.sets, file.results, now)).toEqual({ added: 3, old: 1 });
    expect(pc.sets.map((x) => [x.id, x.source, x.results.length])).toEqual([[phone.sets[0].id, 'file', 3]]);
    expect(pc.results.map((x) => [x.name, x.intact])).toEqual([['Ema', true], ['Adam', false], ['Old', true]]);
    // The same file again: nothing new.
    expect(pc.importFile('a.tapko', file.sets, file.results, now)).toEqual({ added: 0, old: 0 });
    expect(pc.results).toHaveLength(3);
    expect(pc.files.map((f) => [f.name, f.results, f.added, f.from, f.to, f.groups])).toEqual([['a.tapko', 3, 0, '2025-01-01', '2026-10-21', ['5.A']], ['a.tapko', 3, 3, '2025-01-01', '2026-10-21', ['5.A']]]);
    // A link scanned on the phone and opened again on the computer is the same hand-in.
    expect(pc.add(r, true)).toBeNull();
    // A result changed in the file shows as damaged.
    const changed = parseTapko(text.replace('"accuracy":90', '"accuracy":99'));
    const other = await teacherStore();
    other.importFile('b.tapko', changed.sets, changed.results, now);
    expect(other.results.find((x) => x.name === 'Ema')!.intact).toBe(false);
    await pc.saved();
    const back = await teacherStore(idb);
    expect([back.results.length, back.sets.length, back.files.length]).toEqual([3, 1, 2]);
    expect(() => parseTapko('{"format":"tapkotyper-mentor","version":2,"sets":[],"results":[]}')).toThrow('teacher.file.unknown');
    expect(() => parseTapko('not json')).toThrow('teacher.file.unknown');
  });

  it('teacher store counts what an age would delete, and clears everything', async () => {
    const s = await teacherStore();
    const now = new Date(2026, 9, 23).getTime();
    const r = { taskId: 't1', title: 'T', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...r, name: 'A', group: '5.A', date: '2026-03-01' }, true, undefined, 0);
    s.add({ ...r, name: 'B', group: '5.A', date: '2026-10-20' }, true, undefined, 60_000);
    s.add({ ...r, name: 'C', group: '5.B', date: '2026-03-02' }, true, undefined, 0);
    const old = s.olderThan(dateBefore(now, 6));
    expect([old.results.length, old.sets.length]).toEqual([2, 1]);
    expect(s.olderThan(dateBefore(now, 0, 1)).results).toHaveLength(3);
    s.clearAll();
    expect([s.results.length, s.sets.length, s.files.length]).toEqual([0, 0, 0]);
  });

  it('writers sum the newest hand-in per task and show the change from the first to the last', async () => {
    const s = await teacherStore();
    const r = { taskId: 't1', title: 'T', name: 'Ema', group: '5.A', minutes: 2, weak: [] as [string, number][] };
    s.add({ ...r, date: '2026-10-01', accuracy: 80, cpm: 40 }, true, undefined, 0);
    s.add({ ...r, date: '2026-10-08', accuracy: 89, cpm: 38 }, true, undefined, 1);
    s.add({ ...r, name: 'Adam', date: '2026-10-08', accuracy: 70, cpm: 60 }, true, undefined, 2);
    const [ema] = s.writers().filter((w) => w.name === 'Ema');
    expect([ema.rows.length, ema.last, ema.accuracy, ema.accuracyChange, ema.cpmChange, ema.minutes]).toEqual([2, '2026-10-08', 89, 9, -2, 2]);
    expect(sortWriters(s.writers(), { key: 'accuracy', desc: true }).map((w) => w.name)).toEqual(['Ema', 'Adam']);
    expect(sortWriters(s.writers(), { key: 'handIns', desc: true }).map((w) => w.name)).toEqual(['Ema', 'Adam']);
    expect(newest(s.results)).toHaveLength(2);
  });

  it('teacher store without IndexedDB keeps the results for the visit only', async () => {
    const s = await teacherStore(null);
    expect(s.kept).toBe(false);
    s.add({ taskId: 't1', title: 'T', name: 'Ema', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] }, true);
    await s.saved();
    expect(s.results).toHaveLength(1);
  });

  it('teacher store sorts the children inside a group and task by every key, ties by name', async () => {
    const s = await teacherStore();
    const base = { taskId: 't1', title: 'Zvieratá', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...base, name: 'Cyril', date: '2026-10-20', minutes: 5, accuracy: 70, cpm: 60, levels: 3 }, true);
    s.add({ ...base, name: 'Adam', date: '2026-10-22', minutes: 1, accuracy: 95, cpm: 40, levels: 1 }, true);
    s.add({ ...base, name: 'Bea', minutes: 3, accuracy: 70, cpm: 50 }, true);
    s.add({ ...base, name: 'Zora', taskId: 't2', title: 'Auto', accuracy: 99 }, true);
    s.add({ ...base, name: 'Ema', group: '5.A', accuracy: 10 }, true);
    const names = (key: SortKey, desc: boolean) => s.sorted(s.results, { key, desc }).map((r) => r.name);
    // The blocks stay: group 5.A first, then the tasks by title, whatever the key.
    expect(names('child', false)).toEqual(['Ema', 'Zora', 'Adam', 'Bea', 'Cyril']);
    expect(names('child', true)).toEqual(['Ema', 'Zora', 'Cyril', 'Bea', 'Adam']);
    expect(names('date', true)).toEqual(['Ema', 'Zora', 'Adam', 'Bea', 'Cyril']);
    expect(names('minutes', true)).toEqual(['Ema', 'Zora', 'Cyril', 'Bea', 'Adam']);
    // Bea and Cyril tie on accuracy: by name.
    expect(names('accuracy', true)).toEqual(['Ema', 'Zora', 'Adam', 'Bea', 'Cyril']);
    expect(names('accuracy', false)).toEqual(['Ema', 'Zora', 'Bea', 'Cyril', 'Adam']);
    expect(names('rhythm', true)).toEqual(['Ema', 'Zora', 'Cyril', 'Bea', 'Adam']);
    // No levels count as the fewest.
    expect(names('levels', true)).toEqual(['Ema', 'Zora', 'Cyril', 'Adam', 'Bea']);
    // Ascending status: "practice more" first.
    expect(names('status', false)).toEqual(['Ema', 'Zora', 'Bea', 'Cyril', 'Adam']);
    expect(names('status', true)).toEqual(['Ema', 'Zora', 'Adam', 'Bea', 'Cyril']);
    expect(nextSort({ key: 'child', desc: false }, 'accuracy')).toEqual({ key: 'accuracy', desc: true });
    expect(nextSort({ key: 'accuracy', desc: true }, 'accuracy')).toEqual({ key: 'accuracy', desc: false });
    expect(nextSort({ key: 'accuracy', desc: true }, 'status')).toEqual({ key: 'status', desc: false });
    expect(nextSort({ key: 'accuracy', desc: true }, 'child')).toEqual({ key: 'child', desc: false });
  });

  it('a child card sums one child: averages, minutes, levels of the whole statistics, weakest keys', async () => {
    const s = await teacherStore();
    const base = { title: 'T', name: 'Jakub', minutes: 2.5, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...base, taskId: 'a', date: '2026-10-06', accuracy: 80, weak: [['ď', 61], ['p', 80]] }, true);
    s.add({ ...base, taskId: OVERALL_ID, date: '2026-10-13', accuracy: 90, cpm: 60, levels: 12, weak: [['p', 72], ['ô', 68], ['ľ', 75], ['a', 90]] }, true);
    // The same name in another group is another child.
    s.add({ ...base, taskId: 'b', group: '5.B', date: '2026-10-20', accuracy: 10 }, true);
    const rows = s.childResults(childKey(base));
    expect(rows.map((r) => r.date)).toEqual(['2026-10-13', '2026-10-06']);
    expect(childSummary(rows)).toEqual({ accuracy: 85, cpm: 55, minutes: 5, levels: 12, weak: [['ď', 61], ['ô', 68], ['p', 72], ['ľ', 75]] });
    expect(childSummary(rows.slice(1)).levels).toBeUndefined();
  });
});

describe('move', () => {
  it('carries a whole profile, dropping old key history when too long', async () => {
    const p = newProfile('Ema', 'sk');
    p.stats.keys.f = { presses: 2, errors: 0, recent: [300, 300], recentWrong: [], days: [
      { date: '2026-01-01', presses: 1, errors: 0, rtSum: 300, rtCount: 1 },
      { date: '2026-10-20', presses: 1, errors: 0, rtSum: 300, rtCount: 1 },
    ] };
    expect(trimHistory(p, 30, new Date(2026, 9, 21)).stats.keys.f.days.map((d) => d.date)).toEqual(['2026-10-20']);
    const back = await parseMove((await moveCode(p, ''))!);
    expect(back.id).toBe(p.id);
    expect(back.seed).toBe(p.seed);
    expect(back.stats.keys.f.days).toHaveLength(2);
    expect(await moveCode(p, '', 50)).toBe(null);
  });
});
