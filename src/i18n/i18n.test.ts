import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectLanguage, t, tList, useDictionaries } from './i18n';

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

  it('speaks of the typist and the mentor, never of a child or a teacher', () => {
    const banned: Record<string, RegExp> = {
      sk: /(?<!\p{L})(dieť|deti|detí|deť|učiteľ|žiak)/iu,
      en: /\b(child|children|kids?|teachers?)\b/i,
    };
    for (const lang of ['sk', 'en']) {
      for (const v of values(load(lang))) expect(v, `${lang}: ${v}`).not.toMatch(banned[lang]);
    }
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
      expect(tList('tapko.level_done').length).toBeGreaterThan(2);
    }
  });
});
