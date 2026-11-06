import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGS } from './i18n';
import { START_TEXTS } from './start-texts';

describe('start texts', () => {
  it('names only texts every official language has', () => {
    for (const lang of LANGS) {
      const all = JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8'));
      const missing = START_TEXTS.filter((key) => key.split('.').reduce((node, part) => node?.[part], all) === undefined);
      expect(missing, lang).toEqual([]);
    }
  });
});
