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
- Data: `localStorage` only, versioned schema, export/import as `.json`.
  Tasks, results and moving a player travel as links with compressed data in the address
  hash; a teacher's collected results have their own `localStorage` key.
- Language data (UI texts, word lists) are separate JSON files loaded on demand per
  language, so adding a language does not grow the main bundle.
- Installable offline PWA (a service worker caches the app after the first visit).
- Weight budget for weak school devices: music at most 1.4 MB per track (mono, 60 kbps),
  sprites at most 384 px, the install cache (everything except music) under about 10 MB,
  the settings screen loaded on first use, and the QR decoder fallback (`jsqr`, about 130 KB,
  48 KB gzip) loaded only when the teacher opens the camera scan and only in browsers without
  `BarcodeDetector`; the install cache is about 6.8 MB. A scaled copy of each background tile is cached
  at the drawn pixel size, and the HUD is written only when a value changes.

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
