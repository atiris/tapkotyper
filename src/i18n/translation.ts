// The translation as fields: what the translator page shows, counts, prefills, exports and imports. No DOM.
import { type Dict, type Group, type Item, PLURAL_FORMS, type Section, type Value, WORDS, lookup, situationKey } from './catalog';
import { ownDict } from './i18n';
import type { OwnLang } from './own-langs';
import { type ExportMode, type PairEntry, readPairs, writePairs } from './pairs';

/** The texts about the texts of one language, as in `public/i18n/guide/<lang>.json`. */
export interface GuideFile {
  sections: Record<string, { title: string; about: string }>;
  groups: Record<string, { title: string; about: string }>;
  situations: Record<string, string>;
}

/** A language the page reads from: an official one or an own one, flattened. */
export interface Source {
  code: string;
  name: string;
  dict: Dict;
  /** Guide texts by guide key (`sections.aim.title`, `situations.aim.lines.*`). */
  guide: Record<string, string>;
  words: string[];
}

export type FieldKind = 'guide' | 'text' | 'variant' | 'line' | 'form' | 'words';

/** One input of the page. */
export interface Field {
  id: string;
  kind: FieldKind;
  section: string;
  /** The item key, or the guide key of a guide field. */
  key: string;
  /** 0-based variant or line. */
  index?: number;
  form?: string;
  item?: Item;
}

export const guideId = (guideKey: string): string => `guide:${guideKey}`;

/** A guide file as flat guide keys. */
export function flatGuide(g: GuideFile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of ['sections', 'groups'] as const) {
    for (const [id, v] of Object.entries(g[part] ?? {})) {
      out[`${part}.${id}.title`] = v.title;
      out[`${part}.${id}.about`] = v.about;
    }
  }
  for (const [k, v] of Object.entries(g.situations ?? {})) out[`situations.${k}`] = v;
  return out;
}

/** Flat guide keys back as a guide file (empty texts left out). */
export function guideTree(flat: Record<string, string>): GuideFile {
  const g: GuideFile = { sections: {}, groups: {}, situations: {} };
  for (const [k, v] of Object.entries(flat)) {
    if (!v) continue;
    if (k.startsWith('situations.')) g.situations[k.slice(11)] = v;
    else {
      const [part, id, field] = k.split('.') as ['sections' | 'groups', string, 'title' | 'about'];
      if (part !== 'sections' && part !== 'groups') continue;
      (g[part][id] ??= { title: '', about: '' })[field] = v;
    }
  }
  return g;
}

/** The plural forms a language needs, in the usual order. */
export function pluralForms(code: string): string[] {
  let cats: string[] = ['one', 'other'];
  try {
    cats = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
  } catch {
    // An unknown code: one and other.
  }
  return PLURAL_FORMS.filter((f) => cats.includes(f));
}

/** An example number of a plural form in a language (1 for one, 3 for few...). */
export function formExample(code: string, form: string): number | null {
  const rules = new Intl.PluralRules(code);
  for (const n of [1, 0, 2, 3, 5, 11, 21, 100, 1.5]) if (rules.select(n) === form) return n;
  return null;
}

const SITUATIONS = 'situations.';

/** Finds the situation guide key of an item in a guide (patterns allowed). */
export function situationFinder(guide: Record<string, string>): (key: string) => string | null {
  const exact: Record<string, string> = {};
  const patterns: Record<string, string> = {};
  for (const k of Object.keys(guide)) if (k.startsWith(SITUATIONS)) (k.includes('*') ? patterns : exact)[k.slice(SITUATIONS.length)] = guide[k];
  return (key) => {
    const s = key in exact ? key : situationKey(patterns, key);
    return s ? SITUATIONS + s : null;
  };
}

/** How many variants of an array item the target has: its own count, else the base's. */
export function variantCount(l: OwnLang, key: string, base: Dict): number {
  const own = l.texts[key];
  if (Array.isArray(own)) return own.length;
  const b = lookup(base, key);
  return Array.isArray(b) ? b.length : 1;
}

/** Every field of a translation in page order. */
export function fieldsOf(catalog: Section[], l: OwnLang, base: Dict, baseGuide: Record<string, string>): Field[] {
  const out: Field[] = [];
  const forms = pluralForms(l.code);
  const guides = new Set<string>();
  const situationOf = situationFinder(baseGuide);
  const guideField = (section: string, key: string) => {
    if (guides.has(key)) return;
    guides.add(key);
    out.push({ id: guideId(key), kind: 'guide', section, key });
  };
  for (const s of catalog) {
    guideField(s.id, `sections.${s.id}.title`);
    guideField(s.id, `sections.${s.id}.about`);
    for (const g of s.groups) {
      guideField(s.id, `groups.${g.guide}.title`);
      guideField(s.id, `groups.${g.guide}.about`);
      for (const item of g.items) {
        const sit = situationOf(item.key);
        if (sit) guideField(s.id, sit);
        const f = { section: s.id, key: item.key, item };
        if (item.kind === 'text') out.push({ ...f, id: item.key, kind: 'text' });
        else if (item.kind === 'words') out.push({ ...f, id: WORDS, kind: 'words' });
        else if (item.kind === 'plural') for (const form of forms) out.push({ ...f, id: `${item.key}.${form}`, kind: 'form', form });
        else {
          const n = item.kind === 'lines' ? (lookup(base, item.key) as string[] | undefined)?.length ?? 1 : variantCount(l, item.key, base);
          for (let i = 0; i < n; i++) out.push({ ...f, id: `${item.key}.${i + 1}`, kind: item.kind === 'lines' ? 'line' : 'variant', index: i });
        }
      }
    }
  }
  return out;
}

/** The text of a field in a language source (official or own, as a dictionary). */
export function sourceValue(src: Source, f: Field): string {
  if (f.kind === 'guide') return src.guide[f.key] ?? '';
  if (f.kind === 'words') return src.words.join(' ');
  const v = lookup(src.dict, f.key);
  if (f.kind === 'text') return typeof v === 'string' ? v : '';
  if (f.kind === 'form') return v && typeof v === 'object' && !Array.isArray(v) ? String(v[f.form!] ?? v.other ?? '') : '';
  return Array.isArray(v) ? v[f.index!] ?? '' : '';
}

export function fieldValue(l: OwnLang, f: Field): string {
  if (f.kind === 'guide') return l.guide[f.key] ?? '';
  if (f.kind === 'words') return l.words.join(' ');
  const v = l.texts[f.key];
  if (f.kind === 'text') return typeof v === 'string' ? v : '';
  if (f.kind === 'form') return v && typeof v === 'object' && !Array.isArray(v) ? v[f.form!] ?? '' : '';
  return Array.isArray(v) ? v[f.index!] ?? '' : '';
}

/** Words typed into the word list field: separated by spaces or new lines. */
export const splitWords = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** Writes a field; `count` is the number of variants an array item has on the page. */
export function setFieldValue(l: OwnLang, f: Field, value: string, count = 1): void {
  if (f.kind === 'guide') l.guide[f.key] = value;
  else if (f.kind === 'words') l.words = splitWords(value);
  else if (f.kind === 'text') l.texts[f.key] = value;
  else if (f.kind === 'form') {
    const v = l.texts[f.key];
    const forms = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    l.texts[f.key] = { ...forms, [f.form!]: value };
  } else {
    const v = l.texts[f.key];
    const list = Array.isArray(v) ? [...v] : [];
    while (list.length < Math.max(count, f.index! + 1)) list.push('');
    list[f.index!] = value;
    l.texts[f.key] = list;
  }
}

export function touch(l: OwnLang, id: string): void {
  if (!l.touched.includes(id)) l.touched.push(id);
}

/** The field counts as untranslated again; its text stays. */
export function untouch(l: OwnLang, id: string): void {
  l.touched = l.touched.filter((x) => x !== id);
}

/** Adds an empty variant at the end of a pool. */
export function addVariant(l: OwnLang, key: string, base: Dict): void {
  const n = variantCount(l, key, base);
  const v = l.texts[key];
  const list = Array.isArray(v) ? [...v] : [];
  while (list.length < n) list.push('');
  l.texts[key] = [...list, ''];
}

/** Removes a variant of a pool (never the last one); the touched marks of the later ones move up. */
export function removeVariant(l: OwnLang, key: string, index: number, base: Dict): void {
  const n = variantCount(l, key, base);
  if (n <= 1) return;
  const v = l.texts[key];
  const list = Array.isArray(v) ? [...v] : [];
  while (list.length < n) list.push('');
  list.splice(index, 1);
  l.texts[key] = list;
  const prefix = `${key}.`;
  const numbered = (id: string) => (id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length)) ? Number(id.slice(prefix.length)) - 1 : null);
  l.touched = l.touched.flatMap((id) => {
    const i = numbered(id);
    if (i === null || i < index) return [id];
    return i === index ? [] : [`${prefix}${i}`];
  });
}

/** Share of touched fields, 0..1. */
export function progressOf(l: OwnLang, fields: Field[]): number {
  if (!fields.length) return 1;
  const touched = new Set(l.touched);
  return fields.filter((f) => touched.has(f.id)).length / fields.length;
}

/** Fills every untouched field from a language; touched ones stay. A pool nobody touched takes the source's variants. */
export function prefill(l: OwnLang, fields: Field[], src: Source): void {
  const touched = new Set(l.touched);
  const pools = new Set<string>();
  for (const f of fields) {
    if (touched.has(f.id)) continue;
    if (f.kind === 'variant') {
      if (pools.has(f.key)) continue;
      pools.add(f.key);
      const from = lookup(src.dict, f.key);
      const mine = fields.filter((x) => x.key === f.key && x.kind === 'variant');
      if (!mine.some((x) => touched.has(x.id)) && Array.isArray(from)) {
        l.texts[f.key] = [...from];
        continue;
      }
      for (const x of mine) if (!touched.has(x.id)) setFieldValue(l, x, sourceValue(src, x), mine.length);
      continue;
    }
    setFieldValue(l, f, sourceValue(src, f), f.kind === 'line' ? fields.filter((x) => x.key === f.key).length : 1);
  }
}

/** Texts of the fields as headings and situations around them, for the comments of the pair file. */
export interface Context {
  base: Source;
  catalog: Section[];
}

/** The base text of a guide field, `{item}` filled with the name of the item's group. */
export function guideText(guide: Record<string, string>, key: string, itemName = ''): string {
  return (guide[key] ?? '').replace(/\{item\}/g, itemName);
}

/** The base text of the name that fills `{item}`, by item key: the name of the item's group. */
export function itemNames(catalog: Section[], base: Dict): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of catalog) for (const g of s.groups) if (g.name) {
    const v = lookup(base, g.name);
    for (const i of g.items) out.set(i.key, typeof v === 'string' ? v : '');
  }
  return out;
}

/** Fields that differ from the corrected official language; a pool that differs goes whole. */
export function changedFields(l: OwnLang, fields: Field[], official: Source): Field[] {
  const differs = (f: Field) => fieldValue(l, f) !== sourceValue(official, f);
  const pools = new Set(fields.filter((f) => f.kind === 'variant' && (differs(f) || variantCount(l, f.key, official.dict) !== (lookup(official.dict, f.key) as string[] | undefined)?.length)).map((f) => f.key));
  return fields.filter((f) => (f.kind === 'variant' ? pools.has(f.key) : differs(f)));
}

/** The pair file of a translation: everything, the untouched fields, or the changes against `official`. */
export function exportPairs(l: OwnLang, fields: Field[], ctx: Context, mode: ExportMode, official?: Source): string {
  const touched = new Set(l.touched);
  const shown = mode === 'open' ? fields.filter((f) => !touched.has(f.id)) : mode === 'changes' && official ? changedFields(l, fields, official) : fields;
  const g = ctx.base.guide;
  let section = '';
  /** Item key -> its group; a guide field of a group heads the group's first items. */
  const groupOf = new Map<string, Group>();
  const situationOf = situationFinder(g);
  const names = itemNames(ctx.catalog, ctx.base.dict);
  for (const s of ctx.catalog) for (const gr of s.groups) for (const i of gr.items) groupOf.set(i.key, gr);
  let group: Group | undefined;
  const entries: PairEntry[] = shown.map((f) => {
    const comments: string[] = [];
    if (f.section !== section) {
      section = f.section;
      const title = guideText(g, `sections.${f.section}.title`);
      if (title) comments.push(`== ${title} ==`);
    }
    const gr = f.item ? groupOf.get(f.key) : group;
    if (gr && gr !== group) {
      group = gr;
      const title = guideText(g, `groups.${gr.guide}.title`, names.get(f.key));
      if (title) comments.push(`-- ${title} --`);
    }
    if (f.item) {
      const sit = situationOf(f.key);
      if (sit) comments.push(`Situation: ${guideText(g, sit, names.get(f.key))}`);
    }
    return { comments, id: f.id, base: sourceValue(ctx.base, f), target: fieldValue(l, f) };
  });
  return writePairs({ meta: metaOf(l), mode, baseCode: ctx.base.code, entries });
}

function metaOf(l: OwnLang): Record<string, string> {
  return { code: l.code, name: l.name, base: l.base, ...(l.correctionOf ? { correctionOf: l.correctionOf } : {}), layout: l.layout, author: l.author, contact: l.contact };
}

export interface ImportPlan {
  applied: number;
  empty: number;
  skipped: { id: string; why: 'unknown' | 'outside' }[];
  /** Meta found in the file (author, contact, name...). */
  meta: Record<string, string>;
  apply(): void;
}

/** What an import of a pair file would do to a translation; `apply` does it. */
export function planPairs(l: OwnLang, fields: Field[], text: string): ImportPlan {
  const file = readPairs(text);
  const byId = new Map(fields.map((f) => [f.id, f]));
  const items = new Map(fields.filter((f) => f.item).map((f) => [f.key, f.item!]));
  const skipped: ImportPlan['skipped'] = [];
  const writes: { f: Field; value: string }[] = [];
  /** Pool key -> index (0-based) -> value ('' kept untouched); ids above the count add variants. */
  const pools = new Map<string, Map<number, string>>();
  let empty = 0;
  for (const e of file.entries) {
    const f = byId.get(e.id);
    const m = /^(.*)\.(\d+)$/.exec(e.id);
    const item = m ? items.get(m[1]) : undefined;
    if (item?.kind === 'pool') {
      (pools.get(m![1]) ?? pools.set(m![1], new Map()).get(m![1])!).set(Number(m![2]) - 1, e.target);
      if (!e.target) empty++;
      continue;
    }
    if (!f) {
      skipped.push({ id: e.id, why: item?.kind === 'lines' ? 'outside' : 'unknown' });
      continue;
    }
    if (!e.target) empty++;
    else writes.push({ f, value: e.target });
  }
  const applied = writes.length + [...pools.values()].reduce((a, m) => a + [...m.values()].filter(Boolean).length, 0);
  return {
    applied, empty, skipped, meta: file.meta,
    apply() {
      for (const { f, value } of writes) {
        setFieldValue(l, f, value, fields.filter((x) => x.key === f.key).length);
        touch(l, f.id);
      }
      for (const [key, got] of pools) {
        const old = fields.filter((x) => x.key === key && x.kind === 'variant');
        const touched = new Set(l.touched);
        const kept: { value: string; touched: boolean }[] = [];
        old.forEach((x, i) => {
          if (!got.has(i) && file.mode === 'full') return;
          const v = got.get(i);
          kept.push(v ? { value: v, touched: true } : { value: fieldValue(l, x), touched: touched.has(x.id) });
        });
        [...got.keys()].filter((i) => i >= old.length).sort((a, b) => a - b).forEach((i) => { if (got.get(i)) kept.push({ value: got.get(i)!, touched: true }); });
        if (!kept.length) continue;
        l.texts[key] = kept.map((k) => k.value);
        l.touched = [...l.touched.filter((id) => !(id.startsWith(`${key}.`) && /^\d+$/.test(id.slice(key.length + 1)))), ...kept.flatMap((k, i) => (k.touched ? [`${key}.${i + 1}`] : []))];
      }
    },
  };
}

/** The JSON of a translation: `texts` and `guide` shaped like the official files. */
export interface TranslationJson {
  meta: Record<string, string>;
  texts: Dict;
  guide: GuideFile;
  words: string[];
  touched: string[];
}

/** A dictionary tree back as texts by item key, only the items the fields know. */
export function flatTexts(d: Dict, fields: Field[]): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const f of fields) {
    if (!f.item || f.kind === 'words' || f.key in out) continue;
    const v = lookup(d, f.key);
    if (typeof v === 'string' || Array.isArray(v)) out[f.key] = v;
    else if (v && typeof v === 'object') out[f.key] = Object.fromEntries(Object.entries(v).filter(([, s]) => typeof s === 'string')) as Record<string, string>;
  }
  return out;
}

/** What an import of a JSON would do: every text in it, touched as the file says (else every text it has). */
export function planJson(l: OwnLang, fields: Field[], json: TranslationJson): ImportPlan {
  const texts = flatTexts(json.texts ?? {}, fields);
  const guide = flatGuide(json.guide ?? { sections: {}, groups: {}, situations: {} });
  const known = new Set(fields.map((f) => f.key));
  const skipped: ImportPlan['skipped'] = [...Object.keys(guide).filter((k) => !known.has(k)).map((k) => ({ id: guideId(k), why: 'unknown' as const }))];
  return {
    applied: Object.keys(texts).length + Object.keys(guide).length - skipped.length + (json.words?.length ? 1 : 0),
    empty: 0,
    skipped,
    meta: json.meta ?? {},
    apply() {
      Object.assign(l.texts, texts);
      for (const [k, v] of Object.entries(guide)) if (known.has(k)) l.guide[k] = v;
      if (json.words?.length) l.words = [...json.words];
      const now = withPoolCounts(fields, l);
      const ids = new Set(Array.isArray(json.touched) ? json.touched : now.filter((f) => fieldValue(l, f)).map((f) => f.id));
      for (const f of now) if (ids.has(f.id)) touch(l, f.id);
    },
  };
}

/** The fields again after an import changed the number of variants of pools. */
function withPoolCounts(fields: Field[], l: OwnLang): Field[] {
  const out: Field[] = [];
  const done = new Set<string>();
  for (const f of fields) {
    if (f.kind !== 'variant') {
      out.push(f);
      continue;
    }
    if (done.has(f.key)) continue;
    done.add(f.key);
    const v = l.texts[f.key];
    const n = Array.isArray(v) ? v.length : fields.filter((x) => x.key === f.key).length;
    for (let i = 0; i < n; i++) out.push({ ...f, id: `${f.key}.${i + 1}`, index: i });
  }
  return out;
}

export function exportJson(l: OwnLang): string {
  const json: TranslationJson = { meta: metaOf(l), texts: ownDict(l), guide: guideTree(l.guide), words: l.words, touched: l.touched };
  return `${JSON.stringify(json, null, 2)}\n`;
}
