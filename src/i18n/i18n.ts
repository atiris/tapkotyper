import type { Lang, LangRef } from '../storage/schema';
import { type Dict, isLines } from './catalog';
import { type OwnLang, isOwnRef, ownId, ownLang } from './own-langs';

/** The supported languages, each by its own name. A new language is its text file, one row here, its word list and layout. */
export const LANGUAGES: Record<Lang, string> = { sk: 'Slovenčina', en: 'English' };
export const LANGS = Object.keys(LANGUAGES) as Lang[];
/** The choices of a language select: every supported language by its own name. */
export function langOptions(): [Lang, string][] {
  return LANGS.map((l) => [l, LANGUAGES[l]]);
}

/** Languages whose readers read a supported one well. */
export const CLOSE: Partial<Record<string, Lang>> = { cs: 'sk' };

/** The dictionaries a text is looked up in, first wins: an own language, its base, English; an official language alone. */
let chain: Dict[] = [];
let current: LangRef = 'en';
/** The official language in use: an own language's base. */
let base: Lang = 'en';
/** The language asked for last; differs from `current` when an own language is missing on this device. */
let asked: LangRef = 'en';
let code = 'en';
/** The own name of the own language in use. */
let ownName: string | null = null;

export const isLang = (ref: string): ref is Lang => (LANGS as string[]).includes(ref);

/** The browser's first supported language, else the first close one, else English. */
export function detectLanguage(navLangs: readonly string[] = globalThis.navigator?.languages ?? []): Lang {
  const codes = navLangs.map((l) => l.toLowerCase().split('-')[0]);
  return codes.find((c): c is Lang => LANGS.includes(c as Lang)) ?? codes.map((c) => CLOSE[c]).find((l) => l) ?? 'en';
}

const fetched = new Map<Lang, Promise<Dict>>();
const fetchedStart = new Map<Lang, Promise<Dict>>();

/** A dictionary file in `i18n/`, loaded once. */
function load(files: Map<Lang, Promise<Dict>>, lang: Lang, file: string): Promise<Dict> {
  if (!files.has(lang)) {
    const p = fetch(`${import.meta.env.BASE_URL}i18n/${file}`).then((res) => {
      if (!res.ok) throw new Error(`i18n ${file}: ${res.status}`);
      return res.json() as Promise<Dict>;
    });
    p.catch(() => files.delete(lang));
    files.set(lang, p);
  }
  return files.get(lang)!;
}

/** An official dictionary (`public/i18n/<lang>.json`), loaded once. */
export function officialDict(lang: Lang): Promise<Dict> {
  return load(fetched, lang, `${lang}.json`);
}

/** Whether a language's texts are in use yet. */
export const hasTexts = (): boolean => chain.length > 0;

let whole: Promise<void> = Promise.resolve();
/** Starts loading the rest of the texts: only when asked, so it never holds up the start page's own files. */
let rest: (() => void) | null = null;
/** Settles once the language in use has every text; a screen past the start page waits for it. */
export function allTexts(): Promise<void> {
  rest?.();
  return whole;
}

/** Whether only the start part is in use, and the texts looked up that it lacks. */
let partial = false;
const late = new Set<string>();
let onLate: () => void = () => undefined;
/** Calls `fn` once every text is here after a text the start part lacks was shown as its key (the screen draws again). */
export function onLateTexts(fn: () => void): void {
  onLate = fn;
}

/** The texts of an own language as a dictionary: empty texts and variants left out, ordered lists only when whole. */
export function ownDict(l: Pick<OwnLang, 'texts'>): Dict {
  const d: Dict = {};
  for (const [key, v] of Object.entries(l.texts)) {
    let value: Dict[string] | null = null;
    if (typeof v === 'string') value = v || null;
    else if (Array.isArray(v)) value = isLines(key) ? (v.every(Boolean) ? v : null) : v.filter(Boolean).length ? v.filter(Boolean) : null;
    else if (v && typeof v === 'object') {
      const forms = Object.fromEntries(Object.entries(v).filter(([, s]) => s));
      value = Object.keys(forms).length ? forms : null;
    }
    if (value === null) continue;
    const parts = key.split('.');
    let node = d;
    for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as Dict;
    node[parts.at(-1)!] = value;
  }
  return d;
}

/**
 * Switches the texts to a language; an own language missing on this device falls back to the browser's language.
 * With `startPart` (a first visit's start page), an official language of a build shows from its start part,
 * `i18n/<lang>.start.json` (START_TEXTS); the rest comes when asked for (allTexts).
 */
export async function setLanguage(ref: LangRef, startPart = false): Promise<void> {
  asked = ref;
  const own = isOwnRef(ref) ? await ownLang(ownId(ref)).catch(() => null) : null;
  const lang: Lang = own ? own.base : isLang(ref) ? ref : detectLanguage();
  const part = startPart && !own && import.meta.env.PROD && !fetched.has(lang);
  const first = part ? load(fetchedStart, lang, `${lang}.start.json`).catch(() => officialDict(lang)) : officialDict(lang);
  // An official language has every text (a test keeps the dictionaries' keys equal), so only an own language needs English behind it.
  const [d, f] = await Promise.all([first, own && lang !== 'en' ? officialDict('en').catch(() => null) : null]);
  if (asked !== ref) return;
  chain = [...(own ? [ownDict(own)] : []), d, ...(f ? [f] : [])];
  partial = part;
  rest = null;
  whole = Promise.resolve();
  if (part) {
    let go!: () => void;
    whole = new Promise<void>((resolve) => (go = resolve)).then(() => officialDict(lang)).then((all) => {
      if (chain[0] !== d) return;
      chain = [all];
      partial = false;
      if (late.size) onLate();
    }, () => undefined);
    rest = () => { rest = null; go(); };
  }
  current = own ? ref : lang;
  base = lang;
  code = own ? own.code : lang;
  ownName = own?.name ?? null;
  document.documentElement.lang = code;
}

/** For tests: use dictionaries directly (first wins), `code` for the plural rules. */
export function useDictionaries(lang: LangRef, d: Dict, f: Dict = d, localeCode: string = lang): void {
  chain = [d, f];
  current = asked = lang;
  code = localeCode;
}

/** The language in use. */
export function language(): LangRef {
  return current;
}

/** The official language in use; for an own language, the one it is based on. */
export function baseLanguage(): Lang {
  return base;
}

/** The language asked for last (an own language missing on this device is asked but not in use). */
export function askedLanguage(): LangRef {
  return asked;
}

/** The BCP 47 code of the language in use, for `Intl`, `lang=` and the voice. */
export function locale(): string {
  return code;
}

/** The name of the language in use, by its own name. */
export function languageName(): string {
  return ownName ?? LANGUAGES[current as Lang] ?? current;
}

function lookup(d: Dict, key: string): string | string[] | Dict | undefined {
  let node: any = d;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

/** A text from the first dictionary that has it; `report`: a key the start part lacks counts as late. */
const find = (key: string, report = true) => {
  for (const d of chain) {
    const v = lookup(d, key);
    if (v !== undefined) return v;
  }
  if (report && partial && !late.has(key)) {
    // START_TEXTS lacks it: the rest comes now and the screen draws again (an e2e test watches for this).
    late.add(key);
    console.warn(`i18n: ${key} is not in the start texts`);
    rest?.();
  }
  return undefined;
};

function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

/** Translated text; `{name}` placeholders are filled from params. Missing keys show the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const v = find(key);
  if (typeof v === 'string') return fill(v, params);
  if (Array.isArray(v)) return fill(v[0] ?? key, params);
  return key;
}

/** A list of texts (message pools, story lines). */
export function tList(key: string, params?: Record<string, string | number>): string[] {
  const v = find(key);
  if (Array.isArray(v)) return v.map((s) => fill(s, params));
  if (typeof v === 'string') return [fill(v, params)];
  return [];
}

/** An object of texts, e.g. tips keyed by id; each one from the first dictionary that has it. */
export function tMap(key: string): Record<string, string> {
  const maps = chain.map((d) => lookup(d, key)).filter((v) => v && typeof v === 'object' && !Array.isArray(v));
  return Object.assign({}, ...maps.reverse()) as Record<string, string>;
}

/** A count in words: `key.one`, `key.few` or `key.other` by the language's plural rules, with `{n}` filled. */
export function tn(key: string, n: number, params: Record<string, string | number> = {}): string {
  const form = new Intl.PluralRules(code).select(n);
  // A language without this form (English has no "few") takes `other`, so a missing form is no late text.
  const v = find(`${key}.${form}`, false);
  return typeof v === 'string' ? fill(v, { n, ...params }) : t(`${key}.other`, { n, ...params });
}
