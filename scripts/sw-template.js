// TapkoTyper service worker. Generated at build time by vite.config.ts.
// Build: __BUILD__
const VERSION = '__VERSION__';
const CORE = __FILES__;
const CACHE = `tapkotyper-${VERSION}`;
const MUSIC = 'tapkotyper-music';
const MAX_TRACKS = 3;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  // The new version takes over on the next start, not in the middle of a game.
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
