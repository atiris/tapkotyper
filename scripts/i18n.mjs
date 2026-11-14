// Reads game texts without opening the big language files: every official language side by side,
// with the translator's situation of each text.
//   node scripts/i18n.mjs <key or prefix>...    e.g. story.meadowStart  tips.  parent.preset
//   node scripts/i18n.mjs --find <text>          texts whose key or value contains <text> (any case)
//   node scripts/i18n.mjs --missing              keys an official language lacks against English
// Options: --lang sk,en (default: every file in public/i18n), --no-situation.
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../public/i18n/', import.meta.url);
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const [, value] = args.splice(i, 2);
  return value ?? '';
};
const langOpt = flag('--lang');
const find = flag('--find');
const missing = args.includes('--missing') && args.splice(args.indexOf('--missing'), 1);
const noSituation = args.includes('--no-situation') && args.splice(args.indexOf('--no-situation'), 1);

const PLURAL = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const isTree = (v) => v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).every((k) => PLURAL.has(k));
/** A dictionary as `key -> leaf` (a string, a list of lines or an object of plural forms). */
const flat = (o, path = '', out = new Map()) => {
  for (const [k, v] of Object.entries(o)) {
    const key = path ? `${path}.${k}` : k;
    if (isTree(v)) flat(v, key, out);
    else out.set(key, v);
  }
  return out;
};

const langs = langOpt ? langOpt.split(',') : readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
const dicts = Object.fromEntries(langs.map((l) => [l, flat(JSON.parse(readFileSync(new URL(`${l}.json`, dir), 'utf8')))]));
const situations = JSON.parse(readFileSync(new URL('translator/en.json', dir), 'utf8')).situations;
const show = (v) => (typeof v === 'string' ? v : JSON.stringify(v));

if (missing) {
  const en = dicts.en ?? flat(JSON.parse(readFileSync(new URL('en.json', dir), 'utf8')));
  for (const l of langs.filter((x) => x !== 'en')) {
    const gone = [...en.keys()].filter((k) => !dicts[l].has(k));
    console.log(`${l}: ${gone.length} missing${gone.length ? `\n  ${gone.join('\n  ')}` : ''}`);
  }
  process.exit(0);
}

const all = new Set(langs.flatMap((l) => [...dicts[l].keys()]));
const needle = find?.toLowerCase();
const keys = [...all].filter((k) =>
  needle !== undefined
    ? k.toLowerCase().includes(needle) || langs.some((l) => dicts[l].has(k) && show(dicts[l].get(k)).toLowerCase().includes(needle))
    : args.some((a) => k === a || k.startsWith(a.endsWith('.') ? a : `${a}.`)));
if (!keys.length) {
  console.log(needle !== undefined ? `no text contains "${find}"` : 'usage: node scripts/i18n.mjs <key or prefix>... | --find <text> | --missing [--lang sk,en] [--no-situation]');
  process.exit(needle !== undefined ? 0 : 1);
}
for (const k of keys) {
  console.log(k);
  const situation = situations[k] ?? situations[k.replace(/\.\d+$/, '')];
  if (situation && !noSituation) console.log(`  ? ${situation}`);
  for (const l of langs) if (dicts[l].has(k)) console.log(`  ${l}: ${show(dicts[l].get(k))}`);
}
