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
const CLOSE: Partial<Record<string, Lang>> = { cs: 'sk' };

/** The dictionaries a text is looked up in, first wins: an own language, its base, English. */
let chain: Dict[] = [];
let current: LangRef = 'en';
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

/** An official dictionary (`public/i18n/<lang>.json`), loaded once. */
export function officialDict(lang: Lang): Promise<Dict> {
  if (!fetched.has(lang)) {
    const p = fetch(`${import.meta.env.BASE_URL}i18n/${lang}.json`).then((res) => {
      if (!res.ok) throw new Error(`i18n ${lang}: ${res.status}`);
      return res.json() as Promise<Dict>;
    });
    p.catch(() => fetched.delete(lang));
    fetched.set(lang, p);
  }
  return fetched.get(lang)!;
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

/** Switches the texts to a language; an own language missing on this device falls back to the browser's language. */
export async function setLanguage(ref: LangRef): Promise<void> {
  asked = ref;
  const own = isOwnRef(ref) ? await ownLang(ownId(ref)).catch(() => null) : null;
  const lang: Lang = own ? own.base : isLang(ref) ? ref : detectLanguage();
  const [d, f] = await Promise.all([officialDict(lang), lang === 'en' ? Promise.resolve(null) : officialDict('en').catch(() => null)]);
  if (asked !== ref) return;
  chain = [...(own ? [ownDict(own)] : []), d, ...(f ? [f] : [])];
  current = own ? ref : lang;
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

const find = (key: string) => {
  for (const d of chain) {
    const v = lookup(d, key);
    if (v !== undefined) return v;
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
  const v = find(`${key}.${form}`);
  return typeof v === 'string' ? fill(v, { n, ...params }) : t(`${key}.other`, { n, ...params });
}
