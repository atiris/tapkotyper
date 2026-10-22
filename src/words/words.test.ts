import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../keyboard/layouts';
import { WordSource, filterWords, isBlocked, parseOwnWords, textPhrases, typableText, untypableWords } from './words';

const WORDS = ['sad', 'lak', 'las', 'les', 'kde', 'ide', 'šaty', 'ruka', 'noha', 'dom', 'kôň', 'ja', 'aha', 'jeseň', 'slnko'];

describe('word filter', () => {
  it('gives one chunk per target when one word is asked, even with the space known', () => {
    const src = new WordSource(WORDS, { keys: ['f', 'j', ' '], len: [2, 6], noDiacritics: false, seed: 9, focus: [' '] });
    for (let i = 0; i < 40; i++) expect(src.next(new Set(), undefined, 1)).not.toContain(' ');
  });

  it('keeps only words made of allowed keys and in the length range', () => {
    expect(filterWords(WORDS, new Set([...'asdfjkl']), [2, 5])).toEqual(['sad', 'lak', 'las', 'ja']);
  });
});

describe('WordSource', () => {
  it('uses letter drills for tiny key sets', () => {
    const src = new WordSource(WORDS, { keys: ['f', 'j'], len: [2, 6], noDiacritics: false, seed: 1 });
    for (let i = 0; i < 50; i++) expect(src.next()).toMatch(/^[fj]+$/);
  });

  it('never uses keys outside the set', () => {
    const keys = [...'fjdksla'];
    const src = new WordSource(WORDS, { keys, len: [2, 5], noDiacritics: false, seed: 2 });
    for (let i = 0; i < 200; i++) expect([...src.next()].every((c) => keys.includes(c))).toBe(true);
  });

  it('respects the length range', () => {
    const src = new WordSource(WORDS, { keys: [...'fjdkslaeiruotnhô'], len: [3, 4], noDiacritics: false, seed: 3 });
    for (let i = 0; i < 200; i++) {
      const w = src.next();
      expect(w.length).toBeGreaterThanOrEqual(1);
      expect(w.length).toBeLessThanOrEqual(4);
    }
  });

  it('drops diacritics when asked', () => {
    const src = new WordSource(WORDS, { keys: [...'fjdkslaeiruotnhôšň'], len: [2, 6], noDiacritics: true, seed: 4 });
    for (let i = 0; i < 200; i++) expect(src.next()).not.toMatch(/[ôšň]/);
  });

  it('makes pronounceable pseudo-words when few real words match', () => {
    const src = new WordSource([], { keys: [...'fjdkslae'], len: [3, 5], noDiacritics: false, seed: 5 });
    const w = src.next();
    expect(w).toMatch(/^[fjdkslae]+$/);
  });

  it('avoids first letters already on screen when it can', () => {
    const src = new WordSource(WORDS, { keys: [...'fjdkslaeiruotnh'], len: [2, 6], noDiacritics: false, seed: 6 });
    let clashes = 0;
    for (let i = 0; i < 100; i++) if (src.next(new Set(['s', 'l']))[0].match(/[sl]/)) clashes++;
    expect(clashes).toBeLessThan(5);
  });

  it('drops capitals and punctuation from pseudo-word letters', () => {
    const src = new WordSource([], { keys: [...'fjdkslae', '.', ',', 'ShiftL'], len: [3, 5], noDiacritics: false, seed: 8 });
    for (let i = 0; i < 100; i++) expect(src.next()).toMatch(/^[fjdkslae]+$/);
  });
});

const SK = LAYOUTS['sk-qwertz'];
const KNOWN = [...'fjdkslaôgheiruotnh', ' ', '.', ','];
const sample = (src: WordSource, n: number, words: number) => Array.from({ length: n }, () => src.next(new Set(), undefined, words));
const wordCount = (s: string) => s.split(/[ -]/).length;

describe('phrases', () => {
  it('make sentences of the asked number of words, never digit groups', () => {
    const src = new WordSource(WORDS, { keys: [...KNOWN, '1', '2'], len: [2, 6], noDiacritics: false, seed: 12 });
    const counts = Array.from({ length: 100 }, () => src.next(new Set(), undefined, 6, 3).split(' ').length);
    expect(Math.min(...counts)).toBe(3);
    expect(Math.max(...counts)).toBe(6);
  });

  it('stay single words until space is known', () => {
    const src = new WordSource(WORDS, { keys: [...'fjdkslaeiruotnh'], len: [2, 6], noDiacritics: false, seed: 9 });
    for (const w of sample(src, 200, 4)) expect(w).not.toMatch(/[ .,]/);
  });

  it('start with chunk pairs on the first keys', () => {
    const src = new WordSource(WORDS, { keys: ['f', 'j', ' '], len: [2, 6], noDiacritics: false, focus: ['f', 'j', ' '], seed: 10 });
    for (const w of sample(src, 100, 2)) expect(w).toMatch(/^[fj]{1,2} [fj]{1,2}$/);
  });

  it('never use a key that is not known', () => {
    const keys = [...KNOWN, 'ShiftL', '?'];
    const src = new WordSource(WORDS, { keys, len: [2, 6], noDiacritics: false, layout: SK, names: ['Ema', 'Jano', 'Ola'], seed: 11 });
    for (const w of [...sample(src, 300, 2), ...sample(src, 300, 4)]) {
      for (const c of w) expect(keys.includes(c) || (c !== c.toLowerCase() && keys.includes(c.toLowerCase()))).toBe(true);
      // Left Shift only: capitals only of right-hand letters.
      expect(w).not.toMatch(/[QWERTASDFGYXCVB]/);
    }
  });

  it('hold at most two words in story targets and two to four in calm modes', () => {
    const src = new WordSource(WORDS, { keys: KNOWN, len: [2, 6], noDiacritics: false, seed: 12 });
    const story = sample(src, 300, 2);
    for (const w of story) expect(wordCount(w)).toBeLessThanOrEqual(2);
    expect(story.some((w) => wordCount(w) === 2)).toBe(true);
    const calm = sample(src, 300, 4).map(wordCount);
    expect(Math.min(...calm)).toBe(2);
    expect(Math.max(...calm)).toBe(4);
  });

  it('end about one phrase in three with a period and put a comma in about one in five', () => {
    const src = new WordSource(WORDS, { keys: KNOWN, len: [2, 6], noDiacritics: false, seed: 13 });
    const calm = sample(src, 2000, 4);
    const period = calm.filter((w) => w.endsWith('.')).length / calm.length;
    const comma = calm.filter((w) => w.includes(', ')).length / calm.length;
    expect(period).toBeGreaterThan(0.27);
    expect(period).toBeLessThan(0.4);
    expect(comma).toBeGreaterThan(0.15);
    expect(comma).toBeLessThan(0.25);
  });

  it('asks a question in about one phrase in eight once ? is known', () => {
    const src = new WordSource(WORDS, { keys: [...KNOWN, '?'], len: [2, 6], noDiacritics: false, seed: 14 });
    const calm = sample(src, 2000, 4);
    const q = calm.filter((w) => w.endsWith('?')).length / calm.length;
    expect(q).toBeGreaterThan(0.09);
    expect(q).toBeLessThan(0.16);
  });

  it('starts about one target in six with a capital, every one once the Shifts are mastered', () => {
    const keys = [...KNOWN, 'ShiftL', 'ShiftR'];
    const caps = (mastery: number) => {
      const src = new WordSource(WORDS, { keys, len: [2, 6], noDiacritics: false, layout: SK, shiftMastery: { ShiftL: mastery, ShiftR: mastery }, seed: 15 });
      const list = sample(src, 2000, 4);
      for (const w of list) expect(w.slice(1)).toBe(w.slice(1).toLowerCase());
      return list.filter((w) => w[0] !== w[0].toLowerCase()).length / list.length;
    };
    const start = caps(0);
    expect(start).toBeGreaterThan(0.12);
    expect(start).toBeLessThan(0.22);
    expect(caps(1)).toBeGreaterThan(0.95);
  });

  it('uses names and the learned Shift while it is new', () => {
    const src = new WordSource(WORDS, { keys: [...KNOWN, 'ShiftL'], len: [2, 6], noDiacritics: false, layout: SK, names: ['Jano', 'Ola'], focus: ['ShiftL'], seed: 16 });
    const list = sample(src, 500, 2);
    const caps = list.filter((w) => w[0] !== w[0].toLowerCase());
    expect(caps.length / list.length).toBeGreaterThan(0.4);
    expect(list.some((w) => w.startsWith('Jano') || w.startsWith('Ola'))).toBe(true);
  });
});

describe('block list', () => {
  it('blocks rude fragments', () => {
    expect(isBlocked('kokot')).toBe(true);
    expect(isBlocked('lesik')).toBe(false);
  });
});

describe('own words and text', () => {
  const lay = LAYOUTS['sk-qwertz'];

  it('parses words from lines, commas and spaces, each once, as typed', () => {
    expect(parseOwnWords('mama, tata\n  Bratislava  mama;pes')).toEqual(['mama', 'tata', 'Bratislava', 'pes']);
  });

  it('finds words and characters the layout cannot type', () => {
    expect(untypableWords(['mama', 'naïve'], LAYOUTS['us-qwerty'])).toEqual(['naïve']);
    expect(typableText('Ahoj  „mami“!\nAko?', lay)).toEqual({ text: 'Ahoj mami! Ako?', dropped: ['„', '“'] });
  });

  it('cuts text by sentence and comma into pieces of a few words', () => {
    expect(textPhrases('Ahoj, ako sa dnes máš? Ja dobre.', 2)).toEqual(['Ahoj,', 'ako sa', 'dnes máš?', 'Ja dobre.']);
    expect(textPhrases('ja mam velmi rad', 4, 8)).toEqual(['ja mam', 'velmi', 'rad']);
  });

  it('mixes own words in by the share, even with keys not unlocked', () => {
    const keys = [...'fjdkslaeiruo'];
    const src = new WordSource(WORDS, { keys, len: [2, 5], noDiacritics: false, layout: lay, own: { words: ['zebra', 'pes'], text: '', share: 0.8 }, seed: 9 });
    const out = Array.from({ length: 200 }, () => src.next());
    const own = out.filter((w) => w === 'zebra' || w === 'pes').length;
    expect(own).toBeGreaterThan(130);
    expect(own).toBeLessThan(190);
  });

  it('takes own text in reading order', () => {
    const src = new WordSource(WORDS, { keys: [...'fjdkslaeiruo '], len: [2, 5], noDiacritics: false, layout: lay, own: { words: [], text: 'Raz dva. Tri styri.', share: 1 }, seed: 3 });
    expect(Array.from({ length: 5 }, () => src.next(new Set(), undefined, 2))).toEqual(['Raz dva.', 'Tri styri.', 'Raz dva.', 'Tri styri.', 'Raz dva.']);
  });

  it('keeps own words out of objects too small for them', () => {
    const src = new WordSource(WORDS, { keys: [...'fjdkslaeiruo'], len: [2, 5], noDiacritics: false, layout: lay, own: { words: ['zebra'], text: '', share: 1 }, seed: 4 });
    for (let i = 0; i < 50; i++) expect(src.next(new Set(), 3, 1)).not.toBe('zebra');
  });
});
