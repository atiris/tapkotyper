# Architecture

## What
- Static single-page app: HTML + CSS + TypeScript, built by Vite, hosted on GitHub Pages
  at `https://atiris.github.io/tapkotyper/` (base path `/tapkotyper/`).
- Deployed by GitHub Actions on every push to `main` (build + unit tests must pass).
- No backend, no external runtime services, no third-party scripts.
- Rendering: HTML5 Canvas 2D for game scenes, DOM for menus, overlays and forms. No 3D.
- Graphics: illustrated sprites, backgrounds and background music are made by the owner in
  Gemini from the prompts in [`../assets-src/PROMPTS.md`](../assets-src/PROMPTS.md). Raw
  files go to `assets-src/` (not committed); a build-time script turns them into small web
  files in `public/assets/` (committed). Every asset has a procedural fallback (Canvas
  paths, gradients, CSS), so the app is complete and polished with any subset of assets.
- Audio: sound effects are always synthesized with the Web Audio API; background music
  uses the generated tracks when present, otherwise a synthesized calm loop.
- Data: players' profiles in `localStorage`, versioned schema, export/import as `.json`;
  they are small and the game reads them synchronously everywhere.
  Tasks, results and moving a player travel as links with compressed data in the address
  hash. A teacher's collected results live in their own IndexedDB database
  (`tapkotyper-mentor`): a year of hand-ins outgrows localStorage's few shared megabytes,
  and IndexedDB writes one record at a time instead of one big blocking JSON on every scan.
  The browser is asked to keep that data persistently; where IndexedDB is blocked (some
  private windows) the results last for the visit and the page says so. Own languages made in
  the translator live the same way in a second database (`tapkotyper-translate`).
- Language data (UI texts, word lists) are separate JSON files loaded on demand per
  language, so adding a language does not grow the main bundle. The texts about the texts
  (headings, explanations, situations) and the translator's own texts are one English file,
  `public/i18n/translator/en.json`, loaded only by the translator. A catalog in code places every text in a section and group with its kind; a
  unit test fails when a text has no place or no situation, so the translator stays complete.
- Installable offline PWA (a service worker caches the app after the first visit). An update downloads only the files that changed: on a slow or metered connection (school, phone hotspot) a release with one new picture costs that picture, not the whole app again.
- Weight budget for weak school devices: music at most 1.4 MB per track (mono, 60 kbps),
  sprites at most 384 px, the install cache (everything except music) under about 10 MB,
  the settings screen and the translator loaded on first use, and the QR decoder fallback (`jsqr`, about 130 KB,
  48 KB gzip) loaded only when the teacher opens the camera scan and only in browsers without
  `BarcodeDetector`; the install cache is about 6.8 MB. A scaled copy of the current scene's background
  tiles is cached at the drawn pixel size, and the HUD is written only when a value changes.
- Adding worlds must not slow the game: memory and work at the start stay flat. A level decodes
  only its own pictures when it opens; the other worlds' pictures are just downloaded in the
  background, and only the last scene's scaled backgrounds stay in memory.

## Why
- GitHub Pages is free and needs no server, which also guarantees privacy.
- Generated art and music give a polished storybook look; procedural fallbacks keep the
  game working while assets are missing or being redone, since the implementing LLM cannot
  produce raster art or audio itself.
- Lazy language files keep the first load small on school networks.

## Quality bar
- Zero perceived input lag: a key press is checked and shown in the same frame.
- 60 fps on a mid-range school laptop or Chromebook; keeps working when the tab is hidden
  and shown again.
- Unit tests (Vitest) for logic (word engine, layouts, stats, storage, progression);
  Playwright tests for the main user flows.
