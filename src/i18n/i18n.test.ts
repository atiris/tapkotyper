import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { askedLanguage, detectLanguage, language, locale, ownDict, setLanguage, t, tMap, tn, useDictionaries } from './i18n';
import { newOwnLang, ownRef, saveOwnLang } from './own-langs';

const load = (lang: string) => JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8'));

function keys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
}

/** Every string of a dictionary, lists and nested groups included. */
const values = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(values) : []);

/** Source files of the app, tests left out. */
function sources(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory() ? sources(path) : e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('i18n', () => {
  it('detects Slovak (and Czech) browsers, else English', () => {
    expect(detectLanguage(['sk-SK'])).toBe('sk');
    expect(detectLanguage(['cs'])).toBe('sk');
    expect(detectLanguage(['de', 'en-GB'])).toBe('en');
    expect(detectLanguage(['fr'])).toBe('en');
    expect(detectLanguage(['de', 'cs'])).toBe('sk');
    expect(detectLanguage(['de', 'fr'])).toBe('en');
    expect(detectLanguage(['en-GB', 'sk'])).toBe('en');
    // A supported language anywhere in the list wins over a close one before it.
    expect(detectLanguage(['cs', 'en'])).toBe('en');
  });

  it('fills placeholders and falls back to English', () => {
    useDictionaries('sk', { a: 'Ahoj {name}' }, { a: 'Hi', b: 'Only English' });
    expect(t('a', { name: 'Ema' })).toBe('Ahoj Ema');
    expect(t('b')).toBe('Only English');
    expect(t('missing.key')).toBe('missing.key');
  });

  it('closes every bold mark of the help texts, the same in both languages', () => {
    const count = (lang: string) => {
      const d = load(lang);
      const texts = values([d.help, d.about]);
      for (const s of texts) expect(s.split('**').length % 2, s).toBe(1);
      return texts.reduce((a, s) => a + s.split('**').length - 1, 0);
    };
    expect(count('sk')).toBe(count('en'));
    expect(count('sk')).toBeGreaterThan(0);
  });

  it('has the same keys in Slovak and English', () => {
    const sk = load('sk'), en = load('en');
    expect(keys(sk).sort()).toEqual(keys(en).sort());
  });

  it('has every literal key the code uses, in both languages', () => {
    const has = (d: any, key: string) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), d) !== undefined;
    const used = new Set(sources().flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?<![\w.$])(?:t|tList|pickLine)\('([^']+)'/g)].map((m) => m[1])));
    expect(used.size).toBeGreaterThan(300);
    for (const lang of ['sk', 'en']) {
      const d = load(lang);
      expect([...used].filter((k) => !has(d, k)), lang).toEqual([]);
    }
  });

  it('has at least 40 preparation tips per language', () => {
    for (const lang of ['sk', 'en']) {
      const d = load(lang);
      useDictionaries(lang as 'sk', d);
      expect(Object.keys(d.tips).length).toBeGreaterThanOrEqual(40);
    }
  });

  it('walks an own language, then its base, then English', async () => {
    (globalThis as any).indexedDB = new IDBFactory();
    (globalThis as any).document = { documentElement: {} };
    const dicts: Record<string, unknown> = {
      sk: { a: 'Ahoj', b: 'Len po slovensky', tips: { x: 'Tip x', y: 'Tip y' }, n: { one: '{n} slovo', few: '{n} slová', other: '{n} slov' } },
      en: { a: 'Hi', b: 'Only English', c: 'English only', tips: { x: 'Tip x', y: 'Tip y', z: 'Tip z' }, n: { one: '{n} word', other: '{n} words' } },
    };
    globalThis.fetch = (async (url: string) => ({ ok: true, json: async () => dicts[/(\w+)\.json$/.exec(url)![1]] })) as any;
    const de = newOwnLang({ code: 'de', name: 'Deutsch', base: 'sk', layout: 'sk-qwertz' });
    de.texts = { a: 'Hallo', b: '', 'tips.x': 'Tipp x', n: { one: '{n} Wort', other: '{n} Wörter' } };
    await saveOwnLang(de);
    await setLanguage(ownRef(de.id));
    expect(language()).toBe(ownRef(de.id));
    expect(locale()).toBe('de');
    expect(t('a')).toBe('Hallo');
    // An empty text is untranslated: the base fills it, English what the base lacks.
    expect(t('b')).toBe('Len po slovensky');
    expect(t('c')).toBe('English only');
    expect(tMap('tips')).toEqual({ x: 'Tipp x', y: 'Tip y', z: 'Tip z' });
    // German plural rules, not Slovak ones.
    expect(tn('n', 1)).toBe('1 Wort');
    expect(tn('n', 3)).toBe('3 Wörter');
  });

  it('plays a missing own language in the browser language and keeps asking for it', async () => {
    await setLanguage('own:gone');
    expect(askedLanguage()).toBe('own:gone');
    expect(['sk', 'en']).toContain(language());
  });

  it('keeps only whole ordered lists and the filled variants of a pool', () => {
    expect(ownDict({ texts: { 'start.slogan': ['a', ''], 'tapko.hint': ['', 'b'], 'x.y': { one: '', other: 'z' } } }))
      .toEqual({ tapko: { hint: ['b'] }, x: { y: { other: 'z' } } });
  });
});
