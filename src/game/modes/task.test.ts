import { describe, expect, it, vi } from 'vitest';
import type { TaskSpec } from '../../storage/schema';
import { taskLevel } from '../levels';
import type { Mode } from '../mode';
import type { LevelRuntime } from '../runtime';
import { TypingCore } from '../typing';

// Pages are laid out with measured letters: every letter is half its size wide.
vi.stubGlobal('document', { body: {}, createElement: () => ({ getContext: () => ({ font: '30px x', measureText: (s: string) => ({ width: s.length * 15 }) }) }) });
vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => 'x' }));
vi.mock('../../app/app', async () => {
  const { newProfile } = await import('../../storage/store');
  return { app: { profile: newProfile('Test', 'sk') }, pickLine: () => '' };
});

const { TaskCatchMode, TaskChaseMode } = await import('./task');
const { TaskCopyMode, TaskRibbonMode, TaskTranscribeMode } = await import('./task-text');

const spec = (o: Partial<TaskSpec>): TaskSpec => ({ id: 't', title: 'T', game: 'chase', words: [], text: '', limit: 'text', minutes: 1, dictionary: false, knownOnly: true, world: 'current', ...o });

/** A runtime with just enough for a task's mode: its pieces, a dictionary word, a calm stream. */
function runtime(s: TaskSpec, items: string[]): LevelRuntime {
  const base: Record<string, unknown> = {
    core: new TypingCore(),
    def: taskLevel(s, 2),
    taskItems: items,
    vw: 1280,
    maxActive: 3,
    spawnGap: 0.5,
    noPressure: false,
    travelTime: () => 3,
    rng: { pick: <T>(a: T[]) => a[0], range: (a: number) => a, shuffle: <T>(a: T[]) => [...a] },
    word: () => 'slovo',
    particles: { emit: () => {} },
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k as string] : () => {}) }) as unknown as LevelRuntime;
}

/** Types the focused target to its end. */
function typeWord(L: LevelRuntime, m: Mode): void {
  const f = L.core.focus()!;
  for (const ch of f.word.slice(f.typed)) {
    const res = L.core.type(ch);
    if (res.kind === 'done') m.onDone(res.target);
  }
}

function tick(L: LevelRuntime, m: Mode, seconds: number): void {
  for (let i = 0; i < seconds / 0.05; i++) {
    L.core.update(0.05);
    m.t += 0.05;
    m.update(0.05);
  }
}

describe('task games', () => {
  it('Prúd slov: a word reaching Tapko passes and comes again; the text limit ends when every word is typed', () => {
    const s = spec({ words: ['pes', 'les'] });
    const L = runtime(s, s.words);
    const m = new TaskChaseMode(L);
    m.start();
    tick(L, m, 0.7);
    expect(L.core.active.map((t) => t.word)).toEqual(['pes']);
    // The first word flies by untyped.
    tick(L, m, 4);
    expect(m.finished).toBe(false);
    while (!m.finished) {
      if (L.core.focus()) typeWord(L, m);
      tick(L, m, 0.6);
    }
    expect(m.progress()).toBe(1);
  });

  it('Čakajúce slová: three to five words wait, a typed one is replaced, and dictionary words come after the task\'s own', () => {
    const s = spec({ game: 'catch', words: ['a', 'b'], limit: 'time', dictionary: true });
    const L = runtime(s, s.words);
    const m = new TaskCatchMode(L);
    m.start();
    expect(L.core.active.map((t) => t.word)).toEqual(['a', 'b', 'slovo', 'slovo', 'slovo']);
    typeWord(L, m);
    tick(L, m, 1);
    expect(L.core.active).toHaveLength(5);
    expect(m.finished).toBe(true);
    expect(m.progress()).toBe(1);
  });

  it('Odpis: lines filled at whole words, a slip waits at its place, a page of the next sentences after the last line', () => {
    const s = spec({ game: 'copy', text: 'x' });
    const items = ['Pes beží domov.', 'Mačka spí.'];
    const L = runtime(s, items);
    const m = new TaskCopyMode(L);
    m.start();
    expect(L.core.focus()!.word).toBe('Pes ');
    L.core.type('P');
    const res = L.core.type('#');
    expect(res.kind).toBe('wrong');
    m.onWrong(res.kind === 'wrong' ? res.target : null);
    // The slip sends nothing back: the same place waits.
    expect(L.core.focus()!.typed).toBe(1);
    typeWord(L, m);
    expect(L.core.focus()!.word).toBe('beží ');
    for (let i = 0; i < 3; i++) typeWord(L, m);
    // The text's last word ends its line: no space after it.
    expect(L.core.focus()!.word).toBe('spí.');
    typeWord(L, m);
    expect(m.finished).toBe(true);
  });

  it('Odpis: a sentence longer than a line goes on the next line at a word boundary', () => {
    const s = spec({ game: 'copy', text: 'x' });
    const long = Array.from({ length: 12 }, (_, i) => `slovo${i}`).join(' ') + '.';
    const L = runtime(s, [long]);
    const m = new TaskCopyMode(L) as unknown as { page: { text: string }[][]; start(): void };
    m.start();
    expect(m.page.length).toBeGreaterThan(1);
    expect(m.page.flat().map((w) => w.text).join(' ')).toBe(long);
  });

  it('Pás: one endless ribbon, spaces too; the text repeats from the start without the dictionary', () => {
    const s = spec({ game: 'ribbon', text: 'x', limit: 'time' });
    const L = runtime(s, ['Ja som.']);
    const m = new TaskRibbonMode(L);
    m.start();
    const typed: string[] = [];
    for (let i = 0; i < 4; i++) {
      typed.push(L.core.focus()!.word);
      typeWord(L, m);
    }
    expect(typed).toEqual(['Ja ', 'som. ', 'Ja ', 'som. ']);
  });

  it('Prepis: the left page turns when it is copied, and the text limit ends with its last word', () => {
    const s = spec({ game: 'transcribe', text: 'x' });
    const items = Array.from({ length: 30 }, (_, i) => `Veta cislo ${i}.`);
    const L = runtime(s, items);
    const m = new TaskTranscribeMode(L);
    const page = () => (m as unknown as { page: { text: string }[] }).page;
    m.start();
    const first = page();
    expect(first.length).toBeLessThan(90);
    for (let i = 0; i < first.length; i++) typeWord(L, m);
    expect(page()).not.toBe(first);
    while (L.core.focus()) typeWord(L, m);
    expect(m.finished).toBe(true);
  });
});
