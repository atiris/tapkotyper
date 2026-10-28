import type { Lang, LangRef, LayoutId } from '../storage/schema';
import type { Value } from './catalog';

/** The translator's database: own languages made on this device, apart from the players. */
export const TRANSLATE_DB = 'tapkotyper-translate';
const TABLE = 'languages';

/** A language made in the translator: a new one, or own texts of an official one (`correctionOf`). */
export interface OwnLang {
  id: string;
  /** BCP 47 code: `lang=`, plural rules, dates and the voice. */
  code: string;
  /** Its own name ("Deutsch"). */
  name: string;
  /** The official language whose texts fill what is not translated. */
  base: Lang;
  correctionOf: Lang | null;
  layout: LayoutId;
  author: string;
  contact: string;
  /** Texts by item key: a string, the variants, or the plural forms. */
  texts: Record<string, Value>;
  words: string[];
  /** Field ids the translator wrote, kept or imported. */
  touched: string[];
  createdAt: number;
  updatedAt: number;
}

export const isOwnRef = (ref: string): ref is `own:${string}` => ref.startsWith('own:');
export const ownRef = (id: string): LangRef => `own:${id}`;
export const ownId = (ref: string): string => ref.slice(4);

const done = <T>(req: IDBRequest<T>): Promise<T> => new Promise((ok, fail) => {
  req.onsuccess = () => ok(req.result);
  req.onerror = () => fail(req.error);
});

let db: Promise<IDBDatabase | null> | null = null;
/** Own languages of this visit when the browser blocks IndexedDB. */
const memory = new Map<string, OwnLang>();
let persistAsked = false;

function open(): Promise<IDBDatabase | null> {
  db ??= (async () => {
    try {
      const idb = globalThis.indexedDB;
      if (!idb) return null;
      const req = idb.open(TRANSLATE_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(TABLE, { keyPath: 'id' });
      return await done(req);
    } catch {
      return null;
    }
  })();
  return db;
}

/** Can own languages be kept on this device (false: they last for this visit only). */
export async function ownStoreWorks(): Promise<boolean> {
  return !!(await open());
}

/** Every own language, by name. */
export async function ownLangs(): Promise<OwnLang[]> {
  const d = await open();
  const all = d ? await done<OwnLang[]>(d.transaction(TABLE).objectStore(TABLE).getAll()).catch(() => []) : [...memory.values()];
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function ownLang(id: string): Promise<OwnLang | null> {
  const d = await open();
  if (!d) return memory.get(id) ?? null;
  return (await done<OwnLang | undefined>(d.transaction(TABLE).objectStore(TABLE).get(id)).catch(() => undefined)) ?? null;
}

export async function saveOwnLang(l: OwnLang): Promise<void> {
  l.updatedAt = Date.now();
  const d = await open();
  if (!d) return void memory.set(l.id, structuredClone(l));
  if (!persistAsked) {
    persistAsked = true;
    void navigator.storage?.persist?.().catch(() => undefined);
  }
  await done(d.transaction(TABLE, 'readwrite').objectStore(TABLE).put(structuredClone(l)));
}

export async function deleteOwnLang(id: string): Promise<void> {
  const d = await open();
  if (!d) return void memory.delete(id);
  await done(d.transaction(TABLE, 'readwrite').objectStore(TABLE).delete(id));
}

/** A new own language with nothing written yet. */
export function newOwnLang(o: { code: string; name: string; base: Lang; layout: LayoutId; correctionOf?: Lang | null }): OwnLang {
  const now = Date.now();
  return {
    id: Math.random().toString(36).slice(2, 10), code: o.code, name: o.name, base: o.base, correctionOf: o.correctionOf ?? null, layout: o.layout,
    author: '', contact: '', texts: {}, words: [], touched: [], createdAt: now, updatedAt: now,
  };
}

/** The BCP 47 code typed by the translator in its canonical form, or null when it is not one. */
export function canonicalCode(code: string): string | null {
  try {
    const [c] = Intl.getCanonicalLocales(code.trim());
    return c ?? null;
  } catch {
    return null;
  }
}
