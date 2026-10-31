import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Install = () => Promise<void>;

/** Runs the service worker template with fake caches and fetch and returns its install handler. */
function load(files: Record<string, string>, fail: string | null) {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      match: async (path: string) => store.get(path)?.clone(),
      put: async (path: string, res: Response) => void store.set(path, res),
    };
  };
  const caches = { open, keys: async () => [...stores.keys()] };
  let active = 0;
  let most = 0;
  const fetched: string[] = [];
  const fetch = async (path: string) => {
    fetched.push(path);
    most = Math.max(most, ++active);
    await new Promise((r) => setTimeout(r, 1));
    active--;
    return new Response(path, { status: path === fail ? 404 : 200 });
  };
  const handlers: Record<string, (e: { waitUntil(p: Promise<void>): void }) => void> = {};
  const self = { addEventListener: (type: string, fn: (typeof handlers)[string]) => (handlers[type] = fn) };
  const source = readFileSync('scripts/sw-template.js', 'utf8')
    .replace('__BUILD__', 'test')
    .replace('__VERSION__', 'v2')
    .replace('__FILES__', JSON.stringify(files));
  new Function('self', 'caches', 'fetch', 'location', source)(self, caches, fetch, { origin: 'http://x' });
  const install: Install = () => {
    let done!: Promise<void>;
    handlers.install({ waitUntil: (p) => (done = p) });
    return done;
  };
  return { install, stores, fetched, most: () => most };
}

const files = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`f${i}.png`, `h${i}`]));

describe('service worker install', () => {
  it('fills the cache with every file, at most 4 downloads at once', async () => {
    const sw = load(files, null);
    await sw.install();
    const cache = sw.stores.get('tapkotyper-v2')!;
    expect([...cache.keys()].sort()).toEqual([...Object.keys(files), 'sw-versions.json'].sort());
    expect(sw.most()).toBe(4);
    expect(sw.fetched).toEqual(Object.keys(files));
  });

  it('fails on a failed download and leaves the cache incomplete', async () => {
    const sw = load(files, 'f3.png');
    await expect(sw.install()).rejects.toThrow('f3.png: 404');
    expect(sw.stores.get('tapkotyper-v2')!.has('sw-versions.json')).toBe(false);
  });
});
