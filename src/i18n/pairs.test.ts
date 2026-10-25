import { describe, expect, it } from 'vitest';
import type { Dict, Section } from './catalog';
import { newOwnLang } from './own-langs';
import { escapeLine, readPairs, unescapeLine, writePairs } from './pairs';
import { type Source, exportJson, exportPairs, fieldValue, fieldsOf, planJson, planPairs, prefill, progressOf, removeVariant, setFieldValue, touch } from './translation';

const base: Dict = {
  hello: 'Ahoj {name}!',
  story: ['Prvý riadok', 'Druhý\nriadok'],
  calls: ['Hop!', 'Hej!', 'Hurá!'],
  count: { one: '{n} slovo', few: '{n} slová', other: '{n} slov' },
};
const guide = {
  'sections.s.title': 'Sekcia', 'sections.s.about': 'O sekcii',
  'groups.g.title': 'Skupina', 'groups.g.about': 'O skupine',
  'situations.hello': 'Pozdrav na začiatku.', 'situations.story': 'Príbeh.', 'situations.calls': 'Výkriky.', 'situations.count': 'Počet slov.',
};
const catalog: Section[] = [{ id: 's', groups: [{ id: 'g', guide: 'g', items: [
  { key: 'hello', kind: 'text' }, { key: 'story', kind: 'lines' }, { key: 'calls', kind: 'pool' }, { key: 'count', kind: 'plural' },
] }, { id: 'words', guide: 'words', items: [{ key: 'words', kind: 'words' }] }] }];
const sk: Source = { code: 'sk', name: 'Slovenčina', dict: base, guide, words: ['mama', 'tata'] };
const ctx = { base: sk, catalog };

const german = () => {
  const l = newOwnLang({ code: 'de', name: 'Deutsch', base: 'sk', layout: 'sk-qwertz' });
  return { l, fields: () => fieldsOf(catalog, l, base, guide) };
};

describe('pairs', () => {
  it('escapes line breaks and backslashes', () => {
    for (const s of ['a\nb', 'back\\slash', 'x\\ny', '']) expect(unescapeLine(escapeLine(s))).toBe(s);
  });

  it('lists the fields with the target plural forms', () => {
    const { fields } = german();
    const ids = fields().map((f) => f.id);
    expect(ids).toContain('hello');
    expect(ids).toContain('story.2');
    expect(ids).toContain('calls.3');
    // German has one and other, not the Slovak few.
    expect(ids.filter((i) => i.startsWith('count.'))).toEqual(['count.one', 'count.other']);
    expect(ids).toContain('guide:situations.hello');
    expect(ids).toContain('words');
  });

  it('prefills without touching and counts only touched fields', () => {
    const { l, fields } = german();
    prefill(l, fields(), sk);
    expect(fieldValue(l, fields().find((f) => f.id === 'hello')!)).toBe('Ahoj {name}!');
    expect(progressOf(l, fields())).toBe(0);
    const f = fields().find((x) => x.id === 'hello')!;
    setFieldValue(l, f, 'Hallo {name}!');
    touch(l, f.id);
    expect(progressOf(l, fields())).toBeCloseTo(1 / fields().length);
    // A second prefill keeps the touched field.
    prefill(l, fields(), sk);
    expect(fieldValue(l, f)).toBe('Hallo {name}!');
  });

  it('exports and imports back the same translation, comments and CRLF too', () => {
    const { l, fields } = german();
    const set = (id: string, v: string) => {
      const f = fields().find((x) => x.id === id)!;
      setFieldValue(l, f, v, fields().filter((x) => x.key === f.key).length);
      touch(l, id);
    };
    set('hello', 'Hallo {name}!');
    set('story.2', 'Zweite\nZeile');
    set('count.other', '{n} Wörter');
    l.author = 'Ema Nová';
    const text = exportPairs(l, fields(), ctx, 'full');
    expect(text).toContain('# == Sekcia ==');
    expect(text).toContain('# Situation: Pozdrav na začiatku.');
    expect(text).toContain('@story.2\nsk: Druhý\\nriadok\nde: Zweite\\nZeile');
    expect(text).toContain('@meta author=Ema Nová');

    const back = german();
    const plan = planPairs(back.l, back.fields(), text.replace(/\n/g, '\r\n'));
    expect(plan.meta.author).toBe('Ema Nová');
    expect(plan.skipped).toEqual([]);
    plan.apply();
    for (const id of ['hello', 'story.2', 'count.other']) expect(fieldValue(back.l, back.fields().find((x) => x.id === id)!)).toBe(fieldValue(l, fields().find((x) => x.id === id)!));
    expect(back.l.touched.sort()).toEqual(l.touched.sort());
  });

  it('adds and removes pool variants, skips extra lines and unknown ids', () => {
    const { l, fields } = german();
    const file = readPairs(exportPairs(l, fields(), ctx, 'full'));
    const entries = file.entries.filter((e) => e.id !== 'calls.2').map((e) => (e.id === 'calls.1' ? { ...e, target: 'Hopp!' } : e));
    entries.push({ comments: [], id: 'calls.4', base: '', target: 'Juhu!' }, { comments: [], id: 'story.3', base: '', target: 'x' }, { comments: [], id: 'nope', base: '', target: 'y' });
    const plan = planPairs(l, fields(), writePairs({ ...file, entries }));
    expect(plan.skipped).toEqual([{ id: 'story.3', why: 'outside' }, { id: 'nope', why: 'unknown' }]);
    plan.apply();
    // Variant 2 was left out of a full export: it is gone; 4 is new.
    expect(l.texts.calls).toEqual(['Hopp!', '', 'Juhu!']);
    expect(l.touched.filter((id) => id.startsWith('calls.')).sort()).toEqual(['calls.1', 'calls.3']);
  });

  it('keeps the touched marks with their variants when one is removed', () => {
    const { l, fields } = german();
    for (const [i, v] of ['a', 'b', 'c'].entries()) {
      setFieldValue(l, fields().find((x) => x.id === `calls.${i + 1}`)!, v, 3);
      if (i !== 1) touch(l, `calls.${i + 1}`);
    }
    removeVariant(l, 'calls', 0, base);
    expect(l.texts.calls).toEqual(['b', 'c']);
    expect(l.touched).toEqual(['calls.2']);
  });

  it('exports only untranslated fields and reads JSON back', () => {
    const { l, fields } = german();
    setFieldValue(l, fields()[0], 'Abschnitt');
    touch(l, fields()[0].id);
    const open = readPairs(exportPairs(l, fields(), ctx, 'open'));
    expect(open.mode).toBe('open');
    expect(open.entries.map((e) => e.id)).not.toContain(fields()[0].id);
    expect(open.entries).toHaveLength(fields().length - 1);

    l.words = ['Haus', 'Maus'];
    const json = JSON.parse(exportJson(l));
    expect(json.guide.sections.s.title).toBe('Abschnitt');
    const back = german();
    planJson(back.l, back.fields(), json).apply();
    expect(back.l.guide['sections.s.title']).toBe('Abschnitt');
    expect(back.l.words).toEqual(['Haus', 'Maus']);
    expect(back.l.touched).toEqual([fields()[0].id]);
  });
});
