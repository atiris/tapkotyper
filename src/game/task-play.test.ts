import { describe, expect, it } from 'vitest';
import { Rng } from '../engine/rng';
import { LAYOUTS } from '../keyboard/layouts';
import { SHIFT_L, SHIFT_R, SPACE } from '../learning/lessons';
import type { TaskSpec } from '../storage/schema';
import { levelOver, minActiveS, shownProgress, taskLevel } from './levels';
import { TaskFeed, splitSentences, taskContent, taskDone } from './task-play';

const SK = LAYOUTS['sk-qwertz'];
const KEYS = ['f', 'j', SPACE, 'd', 'k', 's', 'l', 'a', 'e', 'i', 'r', 'u', 'o', 'p', 'v', 'm', 'n', 't'];
const spec = (o: Partial<TaskSpec>): TaskSpec => ({ id: 't', title: 'T', game: 'chase', words: [], text: '', limit: 'time', minutes: 2, dictionary: true, knownOnly: true, world: 'current', ...o });

describe('task content', () => {
  it('splits a text into sentences after . ! ?', () => {
    expect(splitSentences('Pes beží.  Mačka spí!Kto je tu? a ešte')).toEqual(['Pes beží.', 'Mačka spí!', 'Kto je tu?', 'a ešte']);
  });

  it('leaves out words with letters the child has not learned, and marks it does not know', () => {
    const words = taskContent(spec({ words: ['les', 'pes', 'bob', 'Mama'] }), KEYS, SK);
    expect(words).toEqual({ items: ['les', 'pes'], untaught: [] });
    const text = taskContent(spec({ game: 'copy', text: 'Pes je doma. Mama varí obed. Bob.' }), KEYS, SK);
    expect(text.items).toEqual(['je doma']);
  });

  it('keeps a capital and the period once their keys are learned', () => {
    const keys = [...KEYS, '.', SHIFT_L, SHIFT_R];
    expect(taskContent(spec({ game: 'ribbon', text: 'Pes je doma. Mama varí.' }), keys, SK).items).toEqual(['Pes je doma.', 'Mama']);
  });

  it('plays no text without the space', () => {
    expect(taskContent(spec({ game: 'copy', text: 'les' }), ['l', 'e', 's'], SK).items).toEqual([]);
  });

  it('nothing is left when no word can be typed', () => {
    expect(taskContent(spec({ words: ['bob', 'cyc'] }), KEYS, SK).items).toEqual([]);
  });

  it('without known letters lists the keys to learn first, in order, the Shift of a capital too', () => {
    const c = taskContent(spec({ game: 'copy', text: 'Bob je tu. Zima!', knownOnly: false }), KEYS, SK);
    expect(c.items).toEqual(['Bob je tu.', 'Zima!']);
    expect(c.untaught).toEqual(['b', SHIFT_R, '.', 'z', SHIFT_L, '!']);
  });
});

describe('task feed', () => {
  const rng = () => new Rng(7);

  it('gives the words in order, then again shuffled', () => {
    const f = new TaskFeed(['a', 'b', 'c'], { words: true, extras: true, dictionary: null, rng: rng() });
    const first = [f.next(), f.next(), f.next()];
    expect(first.map((x) => x!.text)).toEqual(['a', 'b', 'c']);
    expect(first.every((x) => x!.first)).toBe(true);
    const again = [f.next(), f.next(), f.next()];
    expect(again.map((x) => x!.text).sort()).toEqual(['a', 'b', 'c']);
    expect(again.some((x) => x!.first)).toBe(false);
  });

  it('repeats sentences from the start', () => {
    const f = new TaskFeed(['A.', 'B.'], { words: false, extras: true, dictionary: null, rng: rng() });
    expect([1, 2, 3, 4, 5].map(() => f.next()!.text)).toEqual(['A.', 'B.', 'A.', 'B.', 'A.']);
  });

  it('goes on with dictionary words after the first pass', () => {
    const f = new TaskFeed(['a'], { words: true, extras: true, dictionary: () => 'slovo', rng: rng() });
    expect([f.next()!.text, f.next()!.text]).toEqual(['a', 'slovo']);
  });

  it('with the text limit gives nothing after the first pass, and is done when all is written', () => {
    const f = new TaskFeed(['a', 'b'], { words: true, extras: false, dictionary: () => 'x', rng: rng() });
    const a = f.next()!, b = f.next()!;
    expect(f.next()).toBe(null);
    f.written(a);
    expect(f.ownDone).toBe(false);
    expect(f.ownShare).toBe(0.5);
    f.missed(b);
    expect(f.next()!.text).toBe('b');
    f.written(b);
    expect(f.ownDone).toBe(true);
  });
});

describe('task limits', () => {
  const time = taskLevel(spec({ limit: 'time', minutes: 2 }), 0);
  const text = taskLevel(spec({ limit: 'text' }), 0);
  const both = taskLevel(spec({ limit: 'both', minutes: 1 }), 3);

  it('time ends after its minutes of active play, wherever the text is', () => {
    expect(minActiveS(time)).toBe(120);
    expect(levelOver(taskDone('time', false), 119, 120)).toBe(false);
    expect(levelOver(taskDone('time', false), 120, 120)).toBe(true);
    expect(shownProgress(1, 60, 120)).toBe(0.5);
  });

  it('text ends when the text is written once', () => {
    expect(minActiveS(text)).toBe(0);
    expect(levelOver(taskDone('text', false), 999, 0)).toBe(false);
    expect(levelOver(taskDone('text', true), 3, 0)).toBe(true);
    expect(shownProgress(0.4, 30, 0)).toBe(0.4);
  });

  it('both needs the whole text and the whole time; the bar shows the one still open', () => {
    expect(minActiveS(both)).toBe(60);
    expect(both.world).toBe(3);
    expect(levelOver(taskDone('both', true), 30, 60)).toBe(false);
    expect(levelOver(taskDone('both', false), 90, 60)).toBe(false);
    expect(levelOver(taskDone('both', true), 60, 60)).toBe(true);
    expect(shownProgress(1, 30, 60)).toBe(0.5);
    expect(shownProgress(0.7, 90, 60)).toBe(0.7);
  });
});
