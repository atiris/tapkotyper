import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectLanguage, t, tList, useDictionaries } from './i18n';

const load = (lang: string) => JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8'));

function keys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
}

describe('i18n', () => {
  it('detects Slovak (and Czech) browsers, else English', () => {
    expect(detectLanguage(['sk-SK'])).toBe('sk');
    expect(detectLanguage(['cs'])).toBe('sk');
    expect(detectLanguage(['de', 'en-GB'])).toBe('en');
    expect(detectLanguage(['fr'])).toBe('en');
  });

  it('fills placeholders and falls back to English', () => {
    useDictionaries('sk', { a: 'Ahoj {name}' }, { a: 'Hi', b: 'Only English' });
    expect(t('a', { name: 'Ema' })).toBe('Ahoj Ema');
    expect(t('b')).toBe('Only English');
    expect(t('missing.key')).toBe('missing.key');
  });

  it('closes every bold mark of the help texts, the same in both languages', () => {
    const marked = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(marked) : []);
    const count = (lang: string) => {
      const d = load(lang);
      const texts = marked([d.help, d.about]);
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

  it('has at least 40 preparation tips per language', () => {
    for (const lang of ['sk', 'en']) {
      const d = load(lang);
      useDictionaries(lang as 'sk', d);
      expect(Object.keys(d.tips).length).toBeGreaterThanOrEqual(40);
      expect(tList('tapko.level_done').length).toBeGreaterThan(2);
    }
  });
});
