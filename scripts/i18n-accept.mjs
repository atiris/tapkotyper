// The owner's side of "Send for approval": takes a translation exported from the translator page
// (`.json`) and writes it into the game's files.
//   node scripts/i18n-accept.mjs <file.json>
// A new language writes public/i18n/<code>.json, public/i18n/guide/<code>.json and
// public/words/<code>.json, untranslated texts filled from its base language, and prints the line
// for LANGUAGES. A correction (meta.correctionOf) merges its texts into that language's files.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const PLURAL = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, data) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
const isTree = (v) => v && typeof v === 'object' && !Array.isArray(v);
/** A leaf of a dictionary: a string, a list or an object of plural forms. */
const isLeaf = (v) => !isTree(v) || (Object.keys(v).length > 0 && Object.keys(v).every((k) => PLURAL.has(k)));

/** `base` in its own key order, each leaf taken from `over` when it has one; counts what came from where. */
function lay(base, over, count, path = '') {
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    const key = path ? `${path}.${k}` : k;
    const o = isTree(over) ? over[k] : undefined;
    if (isLeaf(v)) {
      const take = o !== undefined && o !== '' && !(Array.isArray(o) && !o.length);
      out[k] = take ? o : v;
      count[take ? 'taken' : 'kept'].push(key);
    } else out[k] = lay(v, o, count, key);
  }
  return out;
}

/** Keys of `over` that `base` does not have (they are left out). */
function unknown(base, over, path = '') {
  if (!isTree(over)) return [];
  return Object.entries(over).flatMap(([k, v]) => {
    const key = path ? `${path}.${k}` : k;
    if (!isTree(base) || !(k in base)) return [key];
    return isLeaf(base[k]) ? [] : unknown(base[k], v, key);
  });
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/i18n-accept.mjs <translation.json>');
  process.exit(1);
}
const t = read(file);
const meta = t.meta ?? {};
const correction = meta.correctionOf;
const base = correction ?? meta.base;
if (!base || !existsSync(`public/i18n/${base}.json`)) {
  console.error(`Unknown base language "${base}": meta.base or meta.correctionOf must be an official language.`);
  process.exit(1);
}
const code = correction ?? meta.code;
if (!code || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(code)) {
  console.error(`Not a language code: "${code}".`);
  process.exit(1);
}

const report = (name, count, extra) => {
  console.log(`${name}: ${count.taken.length} from the translation, ${count.kept.length} from ${base}${extra.length ? `, ${extra.length} unknown left out: ${extra.slice(0, 10).join(', ')}${extra.length > 10 ? ' ...' : ''}` : ''}`);
};

const texts = { taken: [], kept: [] };
const baseTexts = read(`public/i18n/${base}.json`);
write(`public/i18n/${code}.json`, lay(baseTexts, t.texts ?? {}, texts));
report(`public/i18n/${code}.json`, texts, unknown(baseTexts, t.texts));

const guidePath = `public/i18n/guide/${base}.json`;
if (existsSync(guidePath)) {
  const guide = { taken: [], kept: [] };
  const baseGuide = read(guidePath);
  write(`public/i18n/guide/${code}.json`, lay(baseGuide, t.guide ?? {}, guide));
  report(`public/i18n/guide/${code}.json`, guide, unknown(baseGuide, t.guide));
}

if (Array.isArray(t.words) && t.words.length) {
  write(`public/words/${code}.json`, { words: t.words });
  console.log(`public/words/${code}.json: ${t.words.length} words`);
} else if (!correction) console.log(`No word list: public/words/${code}.json is not written; the game would use none.`);

if (!correction) {
  console.log('\nTo add the language, in src/storage/schema.ts extend Lang with');
  console.log(`  '${code}'`);
  console.log('and in src/i18n/i18n.ts add to LANGUAGES:');
  console.log(`  '${code}': '${String(meta.name ?? code).replace(/'/g, "\\'")}',`);
  console.log(`Its keyboard: ${meta.layout ?? '?'}. Author: ${meta.author || '?'} (${meta.contact || 'no contact'}).`);
}
