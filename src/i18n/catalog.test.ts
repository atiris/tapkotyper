import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLURAL_FORMS, PLURAL_KEYS, WORDS, buildCatalog, itemKeys, lookup, matches, namedKeys, situationKey, thumbs } from './catalog';
import { flatGuide, situationFinder } from './translation';

const load = (lang: string) => JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8'));
const sk = load('sk');
const en = load('en');

describe('catalog', () => {
  const catalog = buildCatalog(en);
  const items = catalog.flatMap((s) => s.groups.flatMap((g) => g.items));

  it('shows a picture for every thing of the target range', () => {
    const things = Object.keys((JSON.parse(readFileSync('public/i18n/en.json', 'utf8')) as { aim: { things: Record<string, unknown> } }).aim.things);
    for (const id of things) expect(thumbs(`aim.things.${id}.name`).some((n) => existsSync(`public/assets/${n}.webp`)), id).toBe(true);
  });

  it('places every text of both dictionaries in exactly one item', () => {
    const keys = items.map((i) => i.key).filter((k) => k !== WORDS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(itemKeys(en).sort());
    expect(itemKeys(sk).sort()).toEqual(itemKeys(en).sort());
  });

  it('names only keys that exist in both dictionaries', () => {
    for (const k of namedKeys()) {
      expect(lookup(sk, k), k).toBeDefined();
      expect(lookup(en, k), k).toBeDefined();
    }
  });

  it('gives each item the kind its value has', () => {
    for (const { key, kind } of items) {
      for (const d of [sk, en]) {
        const v = lookup(d, key);
        if (kind === 'text') expect(typeof v, key).toBe('string');
        if (kind === 'pool' || kind === 'lines') expect(Array.isArray(v), key).toBe(true);
        if (kind === 'plural') expect(Object.keys(v as object).every((f) => (PLURAL_FORMS as readonly string[]).includes(f)), key).toBe(true);
      }
    }
    expect(items.filter((i) => i.kind === 'plural').map((i) => i.key).sort()).toEqual([...PLURAL_KEYS].sort());
    expect(items.filter((i) => i.kind === 'words')).toHaveLength(1);
  });

  it('keeps ordered lists the same length in both languages', () => {
    for (const { key } of items.filter((i) => i.kind === 'lines')) expect((lookup(sk, key) as string[]).length, key).toBe((lookup(en, key) as string[]).length);
  });

  it('has groups of 1 to 40 items with unique ids', () => {
    const groups = catalog.flatMap((s) => s.groups);
    expect(new Set(groups.map((g) => g.id)).size).toBe(groups.length);
    for (const g of groups) {
      expect(g.items.length, g.id).toBeGreaterThan(0);
      expect(g.items.length, g.id).toBeLessThanOrEqual(40);
    }
  });

  it('matches keys and patterns', () => {
    expect(matches('aim.*', 'aim.things.egg.hit')).toBe(true);
    expect(matches('aim.things.*.hit', 'aim.things.egg.hit')).toBe(true);
    expect(matches('aim.things.*.hit', 'aim.things.egg.hatch')).toBe(false);
    expect(matches('names', 'names')).toBe(true);
    expect(matches('names', 'namesX')).toBe(false);
    expect(situationKey({ 'aim.*': 'a', 'aim.things.*.hit': 'b' }, 'aim.things.egg.hit')).toBe('aim.things.*.hit');
    expect(situationKey({ 'aim.things.egg.hit': 'c', 'aim.things.*.hit': 'b' }, 'aim.things.egg.hit')).toBe('aim.things.egg.hit');
  });

  it('has a guide for every section, group and item in the translator file', () => {
    const g = flatGuide(JSON.parse(readFileSync('public/i18n/translator/en.json', 'utf8')));
    for (const [k, v] of Object.entries(g)) expect(v.trim(), k).not.toBe('');
    for (const s of catalog) {
      expect(g[`sections.${s.id}.title`], s.id).toBeTruthy();
      expect(g[`sections.${s.id}.about`], s.id).toBeTruthy();
      for (const gr of s.groups) {
        expect(g[`groups.${gr.guide}.title`], gr.guide).toBeTruthy();
        expect(g[`groups.${gr.guide}.about`], gr.guide).toBeTruthy();
      }
    }
    const find = situationFinder(g);
    expect(items.filter((i) => !find(i.key)).map((i) => i.key)).toEqual([]);
    // No situation is left over from a text that is gone.
    const used = new Set(items.map((i) => find(i.key)));
    expect(Object.keys(g).filter((k) => k.startsWith('situations.') && !used.has(k))).toEqual([]);
  });
});
