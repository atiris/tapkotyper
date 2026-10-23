import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/store';
import { CODEC_VERSION, checksum, codeFrom, decode, encode } from './codec';
import { OVERALL_ID, makeOverallResult, makeResult, parseResult, resultCode } from './result';
import { activeTask, addTask, parseTask, recordTaskRun, taskCode, taskOwn } from './task';
import { type SortKey, TeacherStore, childKey, childSummary, nextSort } from './teacher';
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

  it('teacher store keeps one result per child and task, groups rows, and exports CSV', async () => {
    const idb = new IDBFactory();
    const s = await teacherStore(idb);
    const r = { taskId: 't1', title: 'Zvieratá', name: 'Ema', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [['ô', 70]] as [string, number][] };
    expect(s.add(r, true)).toBe('added');
    expect(s.add(r, true)).toBe('same');
    expect(s.add({ ...r, accuracy: 95 }, true)).toBe('updated');
    s.add({ ...r, name: 'Adam, "A"' }, false);
    await s.saved();
    expect((await teacherStore(idb)).results).toHaveLength(2);
    const head = ['group', 'task', 'child', 'date', 'min', 'acc', 'cpm', 'levels', 'status', 'weak', 'broken'];
    const names = { key: (k: string) => k, status: (ok: boolean) => (ok ? 'ok' : 'practice') };
    expect(s.csv(head, names).split('\n')).toEqual([
      head.join(','),
      ',Zvieratá,"Adam, ""A""",2026-10-21,2,90,50,,ok,ô 70 %,!',
      ',Zvieratá,Ema,2026-10-21,2,95,50,,ok,ô 70 %,',
    ]);
    const ema = s.results.find((x) => x.name === 'Ema')!;
    s.assign([ema], '5.A');
    expect(s.groups()).toEqual(['5.A']);
    expect(s.sorted()[0].name).toBe('Ema');
    // A newer hand-in without a group keeps the assigned one.
    expect(s.add({ ...r, accuracy: 99 }, true)).toBe('updated');
    const kept = s.results.find((x) => x.name === 'Ema')!;
    expect(kept.group).toBe('5.A');
    expect(s.csv(head, names, [kept]).split('\n')).toHaveLength(2);
    s.removeMany([kept]);
    expect(s.results).toHaveLength(1);
    await s.saved();
    expect((await teacherStore(idb)).results.map((x) => x.name)).toEqual(['Adam, "A"']);
  });

  it('teacher store writes only the touched records and keeps a moved child under a new fingerprint', async () => {
    const idb = new IDBFactory();
    const s = await teacherStore(idb);
    const r = { taskId: 't1', title: 'Zvieratá', name: 'Ema', date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [] as [string, number][] };
    s.add(r, true);
    s.add({ ...r, name: 'Adam' }, true);
    const before = s.results[0].id;
    s.assign([s.results[0]], '5.A');
    expect(s.results[0].id).not.toBe(before);
    await s.saved();
    const back = await teacherStore(idb);
    expect(back.results).toHaveLength(2);
    expect(back.results.find((x) => x.name === 'Ema')).toEqual(s.results[0]);
    expect(back.childResults(childKey({ name: 'Ema', group: '5.A' }))).toHaveLength(1);
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
