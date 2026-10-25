# 69 - Loading: no fallback flash, and an update downloads only what changed

Source: backlog entries "Objects can flash their fallback on first spawn" and "An update
re-downloads the whole install cache".

## What and why
- A child must never see a thing drawn as its plain fallback first and then switch to its
  picture: it looks broken.
- An update currently downloads the whole offline cache again (about 6.6 MB), even when one
  picture changed. On a slow or metered connection (school, phone hotspot) that is slow and
  costly, and it happens with every release.

## Affected
- `src/gfx/assets.ts`, `src/game/runtime.ts` (`prepare`), `vite.config.ts` (service worker
  plugin), `scripts/sw-template.js`. No profile data change. Spec: `.specify/architecture.md`
  (offline and updates) and `.specify/experience/visuals.md` if it says how pictures load.

## Steps
- [ ] 1. **Check the flash first.** `prepare()` already waits for `preloadPlay()` (every `obj-*`,
      robot, fairy and astronaut picture) up to `PLAY_WAIT_S` (5 s), so the backlog entry may be
      stale. Test with playwright on a throttled network (CDP `Network.emulateNetworkConditions`,
      slow 3G, empty cache): start levels in three worlds and watch the first objects. If no
      fallback shows, note it in the Done section and drop the step. If one shows (a slow
      connection beyond 5 s, or a picture outside the `PLAY_PICTURES` pattern), make the level
      wait for the pictures its own mode draws (each mode declares its sprite names; `prepare`
      loads those fully and the rest in the background), with the existing loading screen.
- [ ] 2. **Per-file versions in the service worker.** In `vite.config.ts` give each file of the
      offline list its own short content hash (bundle files already have it in the name; public
      files hash their bytes) and pass `{ path: hash }` to the template instead of a plain list.
- [ ] 3. **Install copies what did not change.** In `scripts/sw-template.js` install: open the
      previous cache and its stored hash list (kept in the cache as one small JSON entry); copy
      every file whose hash is the same; fetch only new or changed files; store the new hash list.
      If anything is missing or broken, fall back to fetching that file. The update button and
      the waiting new version behave as today.
- [ ] 4. Verify: build twice with one changed picture in between; in playwright (or the browser
      network log) the second install fetches only that picture plus the changed bundle files;
      the game works offline after the update; `npm run build`, unit tests, e2e `service.spec`.

## Done when
No fallback flash on a slow connection (or proven stale), and an update fetches only the
changed files.
