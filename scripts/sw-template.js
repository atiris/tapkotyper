// TapkoTyper service worker. Generated at build time by vite.config.ts.
// Build: __BUILD__
const VERSION = '__VERSION__';
/** Every offline file and its own version: an update fetches only the files whose version changed. */
const FILES = __FILES__;
const CACHE = `tapkotyper-${VERSION}`;
const MUSIC = 'tapkotyper-music';
/** Where a cache keeps the versions of its files; written last, so a cache without it is incomplete. */
const VERSIONS = 'sw-versions.json';
const MAX_TRACKS = 3;
/** Downloads at once during an install: a slow school line still has room for the pictures the open level needs. */
const POOL = 4;

self.addEventListener('install', (event) => {
  event.waitUntil(install());
  // The new version waits: the player installs it with the red update button.
});

/** Copies the unchanged files from the newest complete cache and downloads the rest; any failed download fails the install. */
async function install() {
  const cache = await caches.open(CACHE);
  const old = await previous();
  const files = Object.entries(FILES);
  let next = 0;
  let failed = false;
  // A few workers take the files in order; after the first failure none starts another download.
  const take = async () => {
    while (!failed && next < files.length) {
      const [path, version] = files[next++];
      const hit = old && old.versions[path] === version ? await old.cache.match(path, { ignoreVary: true }) : null;
      if (hit && hit.ok) {
        await cache.put(path, hit);
        continue;
      }
      // Revalidated: the HTTP cache may still hold the old bytes of a file that keeps its name.
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${path}: ${res.status}`);
      await cache.put(path, res);
    }
  };
  const worker = () => take().catch((e) => {
    failed = true;
    throw e;
  });
  await Promise.all(Array.from({ length: POOL }, worker));
  await cache.put(VERSIONS, new Response(JSON.stringify(FILES)));
}

/** The newest other app cache with its file versions, or null. */
async function previous() {
  const keys = (await caches.keys()).filter((k) => k.startsWith('tapkotyper-') && k !== CACHE && k !== MUSIC);
  for (const key of keys.reverse()) {
    const cache = await caches.open(key);
    const res = await cache.match(VERSIONS);
    if (res) return { cache, versions: await res.json() };
  }
  return null;
}

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MUSIC).map((k) => caches.delete(k)))));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.url.endsWith('.mp3')) {
    event.respondWith(music(req));
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: req.mode === 'navigate', ignoreVary: true }).then((hit) => hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./', { ignoreVary: true }) : Response.error()))),
  );
});

/** Music is cached as it plays; only the last few tracks are kept (the current world). */
async function music(req) {
  const cache = await caches.open(MUSIC);
  const hit = await cache.match(req.url, { ignoreVary: true });
  if (hit) return hit;
  // Range requests from the audio element are answered from a full download.
  const res = await fetch(req.url);
  if (res.ok) {
    await cache.put(req.url, res.clone());
    const keys = await cache.keys();
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TRACKS))) await cache.delete(k);
  }
  return res;
}
