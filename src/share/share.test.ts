import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { CODEC_VERSION, checksum, codeFrom, decode, encode } from './codec';
import { OVERALL_ID, makeOverallResult, makeResult, parseResult, playerId, resultCode } from './result';
import type { TaskSpec } from '../storage/schema';
import { type FinishedTask, activeTask, addTask, betterRun, keepTeacherTask, noteTask, parseTask, recordTaskRun, taskCode } from './task';
import { parseTapko, tapkoFile, tapkoName } from './tapko-file';
import { type SortKey, TeacherStore, childSummary, fingerprint, newest, nextSort, recentByGroup, sortWriters } from './teacher';
import { moveCode, parseMove, trimHistory } from './transfer';

const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (code: string) => Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** A loaded teacher store on a fresh database of its own, loaded at `now` (a test's own date, else the real one). */
async function teacherStore(idb: IDBFactory | null = new IDBFactory(), now = Date.now()): Promise<TeacherStore> {
  const s = new TeacherStore(idb);
  await s.load(now);
  return s;
}

const SPEC: TaskSpec = { id: 't1', title: 'Zvieratá', game: 'chase', words: ['pes', 'mačka'], text: '', limit: 'time', minutes: 2, dictionary: true, knownOnly: true, world: 'current' };

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
  const spec = SPEC;
  const run = (chars: number, errors: number, cpm: number) => ({ seconds: 120, chars, errors, cpm });

  it('travel by code and come back cleaned', async () => {
    expect(await parseTask(await taskCode({ ...spec, minutes: 99, title: `  ${'x'.repeat(100)}` }))).toMatchObject({ minutes: 30, title: 'x'.repeat(60) });
    await expect(parseTask(await encode({ app: 'tapkotyper', type: 'task', id: 'x', title: 'y', game: 'chase', words: [], text: '' }))).rejects.toThrow('share.broken');
    await expect(parseTask(await encode({ app: 'tapkotyper', type: 'task', id: 'x', title: 'y', words: ['a'], text: '' }))).rejects.toThrow('share.broken');
    expect(await parseTask(await taskCode(spec))).toEqual(spec);
  });

  it('keep only the source their game uses', async () => {
    const copy = await parseTask(await taskCode({ ...spec, game: 'copy', text: 'Pes beží.', limit: 'both', dictionary: false, knownOnly: false, world: 'random' }));
    expect(copy).toMatchObject({ game: 'copy', words: [], text: 'Pes beží.', limit: 'both', dictionary: false, knownOnly: false, world: 'random' });
    await expect(parseTask(await taskCode({ ...spec, game: 'ribbon' }))).rejects.toThrow('share.broken');
  });

  it('finish with a run, and keep their runs when given again', () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, spec);
    expect(activeTask(p)).toBe(task);
    expect(recordTaskRun(task, { seconds: 119.6, chars: 100, errors: 5, cpm: 44 })).toBe(true);
    expect(addTask(p, { ...spec, title: 'Nové' })).toMatchObject({ finished: 1, title: 'Nové' });
    expect(p.tasks).toHaveLength(1);
    expect(p.tasks[0].best).toMatchObject({ seconds: 120, chars: 100, errors: 5, cpm: 44, try: 1 });
    expect(p.tasks[0].best!.doneAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(activeTask(p)).toBe(null);
  });

  it('keep the best run: a better repeat replaces it, a worse or equal one does not', () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, spec);
    recordTaskRun(task, run(90, 10, 50));
    expect(recordTaskRun(task, run(80, 20, 90))).toBe(false);
    expect(task.best).toMatchObject({ chars: 90, try: 1 });
    expect(recordTaskRun(task, run(90, 10, 60))).toBe(true);
    expect(task.best).toMatchObject({ cpm: 60, try: 3 });
    expect(recordTaskRun(task, run(90, 10, 60))).toBe(false);
    expect(task.best).toMatchObject({ try: 3 });
    expect(task.finished).toBe(4);
    const r = (chars: number, errors: number, cpm: number) => ({ seconds: 60, chars, errors, cpm, doneAt: '', try: 1 });
    expect(betterRun(r(95, 5, 10), r(90, 10, 99))).toBe(true);
    expect(betterRun(r(90, 10, 50), r(90, 10, 50))).toBe(false);
  });

  it('are kept on the teacher page and noted on a phone, newest first', () => {
    let list = keepTeacherTask([], spec, 1);
    list = keepTeacherTask(list, { ...spec, id: 't2' }, 2);
    list = keepTeacherTask(list, { ...spec, title: 'Upravená' }, 3);
    expect(list.map((x) => [x.id, x.title, x.madeAt])).toEqual([['t2', 'Zvieratá', 2], ['t1', 'Upravená', 1]]);
    let noted = noteTask([], 'a', 'A', 1);
    noted = noteTask(noted, 'b', 'B', 2);
    noted = noteTask(noted, 'a', 'A', 3);
    expect(noted.map((x) => x.code)).toEqual(['a', 'b']);
  });
});

describe('results', () => {
  it('round-trip, and a changed copy is not intact', async () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, { ...SPEC, minutes: 1 });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    const r = makeResult(p, task as FinishedTask);
    expect(r).toMatchObject({ name: 'Ema', minutes: 1, accuracy: 90, cpm: 50 });
    const back = await parseResult(await resultCode(r));
    expect(back).toEqual({ result: r, intact: true });
    const forged = await encode({ ...(await decode(await resultCode(r)) as object), accuracy: 100 });
    expect((await parseResult(forged)).intact).toBe(false);
  });

  it('name a player without a real name by the nickname', async () => {
    const p = newProfile('', 'sk', undefined, 'fox', 'Blesk');
    const task = addTask(p, { ...SPEC, minutes: 1 });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    expect((await parseResult(await resultCode(makeResult(p, task as FinishedTask)))).result.name).toBe('Blesk');
    expect(makeOverallResult(p, 'x').name).toBe('Blesk');
  });

  it('carry a group, and a result without one keeps its old checksum', async () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, { ...SPEC, minutes: 1, group: '5.A' });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    const r = makeResult(p, task as FinishedTask);
    expect(r.group).toBe('5.A');
    expect(r.levels).toBe(0);
    expect(await parseResult(await resultCode(r))).toEqual({ result: r, intact: true });
    const spec = { ...SPEC, title: 'x', words: ['a'], minutes: 1 };
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

  it('say when the service menu removed the settings password, and the flag cannot be dropped unseen', async () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, { ...SPEC, minutes: 1 });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    const plain = makeResult(p, task as FinishedTask);
    expect('lockRemoved' in plain).toBe(false);
    const r = makeResult(p, task as FinishedTask, true);
    expect(r.lockRemoved).toBe(true);
    expect(makeOverallResult(p, 'x', true).lockRemoved).toBe(true);
    expect(await parseResult(await resultCode(r))).toEqual({ result: r, intact: true });
    const { lockRemoved: _, ...dropped } = await decode(await resultCode(r)) as any;
    expect((await parseResult(await encode(dropped))).intact).toBe(false);
    expect(fingerprint(plain)).not.toBe(fingerprint(r));
  });

  it('carry the hidden player id and the run, both in the checksum', async () => {
    const p = newProfile('Ema', 'sk');
    const task = addTask(p, { ...SPEC, minutes: 1 });
    recordTaskRun(task, { seconds: 60, chars: 90, errors: 10, cpm: 50 });
    const r = makeResult(p, task as FinishedTask);
    expect(r.pid).toBe(playerId(p.id));
    expect(r.pid).toMatch(/^[0-9a-z]{6}$/);
    expect(r.try).toBe(1);
    expect(makeOverallResult(p, 'x').pid).toBe(r.pid);
    expect(playerId(newProfile('Ema', 'sk').id)).not.toBe(r.pid);
    expect(await parseResult(await resultCode(r))).toEqual({ result: r, intact: true });
    const moved = await encode({ ...(await decode(await resultCode(r)) as object), try: 2 });
    expect((await parseResult(moved)).intact).toBe(false);
    expect(fingerprint({ ...r, try: 2 })).not.toBe(fingerprint(r));
  });

  it('teacher store keeps every hand-in once, by its fingerprint, notes each way it came, and exports CSV', async () => {
    const idb = new IDBFactory();
    const s = await teacherStore(idb);
    const r = { taskId: 't1', title: 'Zvieratá', name: 'Ema', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [['ô', 70]] as [string, number][] };
    expect(s.add(r, true, 'link')).not.toBeNull();
    expect(s.add(r, true, 'link')).toBeNull();
    expect(s.add(r, true, 'scan')).toBeNull();
    expect(s.results[0].from).toEqual(['link', 'scan']);
    // A newer hand-in of the same task is kept beside the older one.
    expect(s.add({ ...r, accuracy: 95, date: '2026-10-22' }, true, 'link')).not.toBeNull();
    s.add({ ...r, name: 'Adam, "A"' }, false, 'link');
    s.add({ ...r, name: '=HYPERLINK("x")', date: '2026-10-20' }, true, 'link');
    await s.saved();
    expect((await teacherStore(idb)).results).toHaveLength(4);
    const head = ['group', 'task', 'child', 'date', 'min', 'acc', 'cpm', 'levels', 'status', 'weak', 'broken'];
    const names = { key: (k: string) => k, status: (ok: boolean) => (ok ? 'ok' : 'practice') };
    // A name that looks like a formula stays text.
    expect(s.csv(head, names, s.results.filter((x) => x.name.startsWith('='))).split('\n')[1]).toBe(`,Zvieratá,"'=HYPERLINK(""x"")",2026-10-20,2,90,50,,ok,ô 70 %,`);
    s.removeMany(s.results.filter((x) => x.name.startsWith('=')));
    expect(s.csv(head, names, newest(s.results)).split('\n')).toEqual([
      head.join(','),
      ',Zvieratá,"Adam, ""A""",2026-10-21,2,90,50,,ok,ô 70 %,!',
      ',Zvieratá,Ema,2026-10-22,2,95,50,,ok,ô 70 %,',
    ]);
    const ema = s.results.find((x) => x.name === 'Ema')!.student;
    s.moveStudents([ema], '5.A');
    expect(s.groups()).toEqual(['5.A']);
    // A newer hand-in without a player id or a group joins the only student of that name.
    const next = s.add({ ...r, accuracy: 99, date: '2026-10-23' }, true, 'link')!;
    expect([next.group, next.student]).toEqual(['5.A', ema]);
    expect(s.childResults(ema).map((x) => x.accuracy)).toEqual([99, 95, 90]);
    s.removeMany(s.childResults(ema));
    expect(s.results).toHaveLength(1);
    await s.saved();
    const back = await teacherStore(idb);
    expect(back.results.map((x) => x.name)).toEqual(['Adam, "A"']);
    expect(back.sets.flatMap((x) => x.results)).toEqual([back.results[0].id]);
  });

  it('teacher store keeps a child together by the player id: the group stays, another copy of a run is dropped', async () => {
    const s = await teacherStore();
    const r = { taskId: 't1', title: 'Zvieratá', name: 'Ema', group: '5.A', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][], pid: 'abc123', try: 1 };
    const first = s.add(r, true, 'scan')!;
    expect(first.group).toBe('5.A');
    // Another group on the task or another name later: the same student, in the group it has.
    const renamed = s.add({ ...r, name: 'Emka', group: '6.B', taskId: 't2', try: 1 }, true, 'link')!;
    expect([renamed.student, renamed.group]).toEqual([first.student, '5.A']);
    // The same run once more with other numbers (edited or damaged): the stored one stays.
    expect(s.add({ ...r, accuracy: 99 }, false, 'link')).toBeNull();
    expect(s.results.find((x) => x.taskId === 't1')!.accuracy).toBe(90);
    // Another run of the same task is another hand-in.
    expect(s.add({ ...r, accuracy: 95, try: 2 }, true, 'link')).not.toBeNull();
    expect(s.writers()).toHaveLength(1);
    // A new student takes the task's group, spelt as one here already.
    expect(s.add({ ...r, name: 'Adam', group: '5a', pid: 'def456' }, true, 'link')!.group).toBe('5.A');
    expect(s.add({ ...r, name: 'Bea', group: undefined, pid: 'ghi789' }, true, 'link')!.group).toBeUndefined();
  });

  it('teacher store renames, merges and dissolves groups, moves and merges students; the sets follow', async () => {
    const s = await teacherStore();
    const r = (name: string, group: string, pid: string) => ({ taskId: 't1', title: 'T', name, group, date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][], pid, try: 1 });
    s.add(r('Ema', '5.A', 'aaaaa1'), true, 'link', 0);
    s.add(r('Adam', '5.A', 'aaaaa2'), true, 'link', 1);
    s.add(r('Bea', '5.B', 'aaaaa3'), true, 'link', 2);
    s.renameGroup('5.A', 'Piataci');
    expect(s.groups()).toEqual(['5.B', 'Piataci']);
    expect(s.sets.map((x) => x.group).sort()).toEqual(['5.B', 'Piataci']);
    // Renaming to a name spelt like another group merges them.
    s.renameGroup('Piataci', '5 b');
    expect(s.groups()).toEqual(['5.B']);
    expect(new Set(s.sets.map((x) => x.group))).toEqual(new Set(['5.B']));
    const [ema, adam] = ['Ema', 'Adam'].map((n) => s.results.find((x) => x.name === n)!.student);
    s.moveStudents([ema], 'Nová');
    expect(s.results.find((x) => x.name === 'Ema')!.group).toBe('Nová');
    // A merged student's results take the target and its group; a later result of the old player id follows.
    s.mergeStudents(ema, adam);
    expect(s.childResults(adam).map((x) => [x.name, x.group])).toEqual([['Adam', '5.B'], ['Ema', '5.B']]);
    expect(s.add({ ...r('Ema', '9.Z', 'aaaaa1'), try: 2 }, true, 'link')!.student).toBe(adam);
    // Dissolving a group leaves its students without one.
    s.renameGroup('5.B', '');
    expect(s.groups()).toEqual([]);
    expect(s.writers()).toHaveLength(2);
  });

  it('teacher store forms sets: links of one group within 20 minutes, a scan always one', async () => {
    const s = await teacherStore();
    const r = (name: string, group?: string) => ({ taskId: 't1', title: 'T', name, ...(group && { group }), date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] });
    const min = 60_000;
    s.add(r('A', '5.A'), true, 'link', 0);
    s.add(r('B', '5.A'), true, 'link', 19 * min);
    // Another group starts its own set; 21 minutes after the first result a new one starts.
    s.add(r('C', '5.B'), true, 'link', 19 * min);
    s.add(r('D', '5.A'), true, 'link', 21 * min);
    expect(s.sets.map((x) => [x.group, x.source, x.results.length])).toEqual([['5.A', 'link', 2], ['5.B', 'link', 1], ['5.A', 'link', 1]]);
    expect(s.sets[0].end).toBe(19 * min);
    s.beginScan();
    s.add(r('E', '6.C'), true, 'scan', 30 * min);
    s.add(r('F', '6.C'), true, 'scan', 90 * min);
    s.endScan();
    s.add(r('G', '6.C'), true, 'link', 91 * min);
    const scan = s.sets.filter((x) => x.group === '6.C');
    expect(scan.map((x) => [x.source, x.results.length])).toEqual([['scan', 2], ['link', 1]]);
    s.removeMany(s.setResults(scan[0]));
    expect(s.sets.filter((x) => x.group === '6.C')).toHaveLength(1);
  });

  it('teacher store drops hand-ins older than a year after 7 days in this browser', async () => {
    const idb = new IDBFactory();
    const s = await teacherStore(idb);
    const now = new Date(2026, 9, 23).getTime();
    const day = 86_400_000;
    const r = { taskId: 't1', title: 'T', name: 'Ema', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...r, date: '2025-10-01' }, true, 'link', now - 8 * day);
    s.add({ ...r, date: '2025-10-02' }, true, 'link', now - 6 * day);
    s.add({ ...r, date: '2026-10-01' }, true, 'link', now - 30 * day);
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

  it('a .tapko file carries sets, results and students; loading it twice adds nothing; a deleted file takes what only it brought', async () => {
    const phone = await teacherStore();
    const r = { taskId: 't1', title: 'T', name: 'Ema', group: '5.A', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [['ô', 70]] as [string, number][], pid: 'aaaaa1', try: 1 };
    phone.add(r, true, 'scan', 1000);
    phone.add({ ...r, name: 'Adam', pid: 'aaaaa2' }, false, 'scan', 2000);
    phone.add({ ...r, name: 'Old', pid: 'aaaaa3', date: '2025-01-01' }, true, 'scan', 3000);
    phone.moveStudents([phone.results[2].student], '7.C');
    const text = tapkoFile(phone.sets, phone.results);
    expect(text).not.toContain('"from"');
    const idb = new IDBFactory();
    const pc = await teacherStore(idb);
    const now = new Date(2026, 9, 23).getTime();
    const file = parseTapko(text);
    expect(pc.importFile('a.tapko', file.sets, file.results, now)).toBe(3);
    expect(pc.results.map((x) => [x.name, x.intact, x.group])).toEqual([['Ema', true, '5.A'], ['Adam', false, '5.A'], ['Old', true, '7.C']]);
    // The same file again: nothing new, the second file is noted on every hand-in.
    expect(pc.importFile('a.tapko', file.sets, file.results, now)).toBe(0);
    expect(pc.results).toHaveLength(3);
    expect(pc.files.map((f) => [f.name, f.results, f.added, f.from, f.to, f.groups])).toEqual([['a.tapko', 3, 0, '2025-01-01', '2026-10-21', ['5.A', '7.C']], ['a.tapko', 3, 3, '2025-01-01', '2026-10-21', ['5.A', '7.C']]]);
    // A link scanned on the phone and opened again on the computer is the same hand-in.
    expect(pc.add(r, true, 'link')).toBeNull();
    // Deleting both files leaves only what also came another way.
    pc.deleteFile(pc.files[0].id);
    expect(pc.results).toHaveLength(3);
    pc.deleteFile(pc.files[0].id);
    expect(pc.results.map((x) => [x.name, x.from])).toEqual([['Ema', ['link']]]);
    expect(pc.files).toEqual([]);
    // A result changed in the file shows as damaged.
    const changed = parseTapko(text.replace('"accuracy":90', '"accuracy":99'));
    const other = await teacherStore();
    other.importFile('b.tapko', changed.sets, changed.results, now);
    expect(other.results.find((x) => x.name === 'Ema')!.intact).toBe(false);
    await pc.saved();
    const back = await teacherStore(idb, now);
    expect([back.results.length, back.sets.length, back.files.length]).toEqual([1, 1, 0]);
    expect(() => parseTapko('{"format":"tapkotyper-mentor","version":2,"sets":[],"results":[]}')).toThrow('teacher.file.unknown');
    expect(() => parseTapko('not json')).toThrow('teacher.file.unknown');
    expect(tapkoName(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe('tt-20260102030405.tapko');
  });

  it('teacher store clears everything, and lists the newest additions by group', async () => {
    const s = await teacherStore();
    const r = { taskId: 't1', title: 'T', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...r, name: 'A', group: '5.A' }, true, 'link', 0);
    s.add({ ...r, name: 'B', group: '5.B' }, true, 'link', 1);
    s.add({ ...r, name: 'C', group: '5.A' }, true, 'link', 2);
    expect(recentByGroup(s.results, 10).map((g) => [g.group, g.rows.map((x) => x.name)])).toEqual([['5.A', ['C', 'A']], ['5.B', ['B']]]);
    expect(recentByGroup(s.results, 1).map((g) => g.rows.length)).toEqual([1]);
    s.clearAll();
    expect([s.results.length, s.sets.length, s.files.length]).toEqual([0, 0, 0]);
  });

  it('writers sum the newest hand-in per task and show the change from the first to the last', async () => {
    const s = await teacherStore();
    const r = { taskId: 't1', title: 'T', name: 'Ema', group: '5.A', minutes: 2, weak: [] as [string, number][] };
    s.add({ ...r, date: '2026-10-01', accuracy: 80, cpm: 40 }, true, 'link', 0);
    s.add({ ...r, date: '2026-10-08', accuracy: 89, cpm: 38 }, true, 'link', 1);
    s.add({ ...r, name: 'Adam', date: '2026-10-08', accuracy: 70, cpm: 60 }, true, 'link', 2);
    const [ema] = s.writers().filter((w) => w.name === 'Ema');
    expect([ema.rows.length, ema.last, ema.accuracy, ema.accuracyChange, ema.cpmChange, ema.minutes, ema.mastered]).toEqual([2, '2026-10-08', 89, 9, -2, 2, true]);
    expect(sortWriters(s.writers(), { key: 'accuracy', desc: true }).map((w) => w.name)).toEqual(['Ema', 'Adam']);
    expect(sortWriters(s.writers(), { key: 'handIns', desc: true }).map((w) => w.name)).toEqual(['Ema', 'Adam']);
    expect(newest(s.results)).toHaveLength(2);
  });

  it('teacher store without IndexedDB keeps the results for the visit only', async () => {
    const s = await teacherStore(null);
    expect(s.kept).toBe(false);
    s.add({ taskId: 't1', title: 'T', name: 'Ema', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] }, true, 'link');
    await s.saved();
    expect(s.results).toHaveLength(1);
  });

  it('teacher store sorts the children inside a group and task by every key, ties by name', async () => {
    const s = await teacherStore();
    const base = { taskId: 't1', title: 'Zvieratá', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...base, name: 'Cyril', date: '2026-10-20', minutes: 5, accuracy: 70, cpm: 60, levels: 3 }, true, 'link');
    s.add({ ...base, name: 'Adam', date: '2026-10-22', minutes: 1, accuracy: 95, cpm: 40, levels: 1 }, true, 'link');
    s.add({ ...base, name: 'Bea', minutes: 3, accuracy: 70, cpm: 50 }, true, 'link');
    s.add({ ...base, name: 'Zora', taskId: 't2', title: 'Auto', accuracy: 99 }, true, 'link');
    s.add({ ...base, name: 'Ema', group: '5.A', accuracy: 10 }, true, 'link');
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

  it('a child card sums one child: averages, minutes, the newest levels said, weakest keys', async () => {
    const s = await teacherStore();
    const base = { title: 'T', name: 'Jakub', minutes: 2.5, cpm: 50, weak: [] as [string, number][] };
    s.add({ ...base, taskId: 'a', date: '2026-10-06', accuracy: 80, weak: [['ď', 61], ['p', 80]] }, true, 'link');
    s.add({ ...base, taskId: OVERALL_ID, date: '2026-10-13', accuracy: 90, cpm: 60, levels: 12, weak: [['p', 72], ['ô', 68], ['ľ', 75], ['a', 90]] }, true, 'link');
    // The same name in another group is another child.
    s.add({ ...base, taskId: 'b', group: '5.B', date: '2026-10-20', accuracy: 10 }, true, 'link');
    const rows = s.childResults(s.results[0].student);
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
