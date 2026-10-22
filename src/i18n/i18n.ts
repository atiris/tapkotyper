import type { Lang } from '../storage/schema';

export const LANGS: Lang[] = ['sk', 'en'];

type Dict = { [key: string]: string | string[] | Dict };

let dict: Dict = {};
let fallback: Dict = {};
let current: Lang = 'en';

export function detectLanguage(navLangs: readonly string[] = globalThis.navigator?.languages ?? []): Lang {
  for (const l of navLangs) {
    const code = l.toLowerCase().slice(0, 2);
    if (code === 'sk' || code === 'cs') return 'sk';
    if (code === 'en') return 'en';
  }
  return 'en';
}

async function fetchDict(lang: Lang): Promise<Dict> {
  const res = await fetch(`${import.meta.env.BASE_URL}i18n/${lang}.json`);
  if (!res.ok) throw new Error(`i18n ${lang}: ${res.status}`);
  return res.json();
}

export async function setLanguage(lang: Lang): Promise<void> {
  const [d, f] = await Promise.all([fetchDict(lang), lang === 'en' ? Promise.resolve(null) : fetchDict('en').catch(() => null)]);
  dict = d;
  fallback = f ?? d;
  current = lang;
  document.documentElement.lang = lang;
}

/** For tests: use dictionaries directly. */
export function useDictionaries(lang: Lang, d: Dict, f: Dict = d): void {
  dict = d;
  fallback = f;
  current = lang;
}

export function language(): Lang {
  return current;
}

function lookup(d: Dict, key: string): string | string[] | Dict | undefined {
  let node: any = d;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

/** Translated text; `{name}` placeholders are filled from params. Missing keys show the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const v = lookup(dict, key) ?? lookup(fallback, key);
  if (typeof v === 'string') return fill(v, params);
  if (Array.isArray(v)) return fill(v[0] ?? key, params);
  return key;
}

/** A list of texts (message pools, story lines). */
export function tList(key: string, params?: Record<string, string | number>): string[] {
  const v = lookup(dict, key) ?? lookup(fallback, key);
  if (Array.isArray(v)) return v.map((s) => fill(s, params));
  if (typeof v === 'string') return [fill(v, params)];
  return [];
}

/** An object of texts, e.g. tips keyed by id. */
export function tMap(key: string): Record<string, string> {
  const v = lookup(dict, key) ?? lookup(fallback, key);
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};
}
