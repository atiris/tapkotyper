import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every text of the dictionaries is still read by the code, so a feature that goes takes its texts
 * with it. A key counts as read when the code names it (or a key above it, read as a whole: a list,
 * plural forms, a group), or when a template or a concatenation in the code can build it
 * (`story.path.${kind}.names`, 'tips.' + id). The translator's catalog names every key by pattern
 * and does not count. The translator's own texts are read by name on its page.
 */

const load = (lang: string) => JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8'));

/** The leaf keys: a string, a list or an object of plural forms each end a key. */
function leaves(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v) ? leaves(v, key) : [key];
  });
}

function sources(dir = 'src'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) && e.name !== 'catalog.ts' ? [path] : [];
  });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What the code may read: plain keys and key prefixes from string literals, and patterns from templates. */
function readers(): { names: Set<string>; patterns: RegExp[] } {
  const names = new Set<string>();
  const patterns: RegExp[] = [];
  const looksLikeKey = (s: string) => /^[a-zA-Z][\w-]*(\.[\w*-]+)*\.?$/.test(s) && s.includes('.');
  for (const file of sources()) {
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) {
      const s = m[1] ?? m[2];
      if (looksLikeKey(s)) names.add(s);
    }
    // A key without a dot is read only by name: t('names').
    for (const m of code.matchAll(/(?<![\w.$])(?:t|tList|tn|tMap|pickLine)\('([\w-]+)'/g)) names.add(m[1]);
    // Templates, also one inside another (`${t(`common.sound_${level}`)}`): each from its backtick to the next.
    for (const m of [...code.matchAll(/`([^`]*)`/g), ...code.matchAll(/\(`([^`]*)`/g)]) {
      const s = m[1];
      if (!s.includes('${')) {
        if (looksLikeKey(s)) names.add(s);
        continue;
      }
      // `story.path.${kind}.names` -> story.path.<one part>.names, `${kind}Names` -> <one part>Names.
      const parts = s.split(/\$\{[^}]*\}/);
      const text = parts.join('');
      if (!/^[\w.-]+$/.test(text) || !/[a-zA-Z]/.test(text)) continue;
      const body = parts.map(escape).join('[^.]*');
      // The key itself, or a key below it read as a whole.
      patterns.push(new RegExp(`^${body}($|\\.)`));
    }
  }
  return { names, patterns };
}

describe('dictionaries', () => {
  it('have no text the code no longer reads', () => {
    const { names, patterns } = readers();
    const read = (key: string) => {
      for (const n of names) {
        if (key === n || key.startsWith(n.endsWith('.') ? n : `${n}.`)) return true;
      }
      return patterns.some((p) => p.test(key));
    };
    const unused = leaves(load('sk')).filter((k) => !read(k));
    expect(unused).toEqual([]);
  });

  it('have no translator text the translator page no longer reads', () => {
    const code = readFileSync('src/screens/translate.ts', 'utf8');
    const named = new Set([...code.matchAll(/'([\w.]+)'/g)].map((m) => m[1]));
    const ui = JSON.parse(readFileSync('public/i18n/translator/en.json', 'utf8')).ui;
    expect(leaves(ui).filter((k) => !named.has(k))).toEqual([]);
  });
});
