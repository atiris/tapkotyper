# Architecture

## What
- Static single-page app: HTML + CSS + TypeScript, built by Vite, hosted on GitHub Pages
  at `https://atiris.github.io/tapkotyper/` (base path `/tapkotyper/`).
- Deployed by GitHub Actions on every push to `main` (build + unit tests must pass).
- No backend, no external runtime services, no third-party scripts.
- Rendering: HTML5 Canvas 2D for game scenes, DOM for menus, overlays and forms. No 3D.
- Graphics: illustrated sprites, backgrounds and background music are made by the owner in
  Gemini from the prompts in [`../assets-src/PROMPTS.md`](../assets-src/PROMPTS.md). Raw
  files go to `assets-src/` (not committed); a build-time script turns them into web
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
- Weak school computers are short of processor power and memory, and have no graphics card worth
  counting on (the canvas is often drawn by the processor); disk space and network speed are not
  their limit (a phone's data plan matters a little). So a file is made smaller only where that
  makes the game faster or lighter on memory without a visible or audible loss, never to fit a
  size number or just to save some download:
  - music: mono MP3 at 64 kbps (calm background music loses nothing audible);
  - pictures: WebP at high quality, each kept at about the size it is drawn on a 1440-pixel-high
    screen: smaller looks blurry on Full HD, larger only costs memory, since every picture a level
    draws is held decoded; backgrounds keep the full resolution they are made in;
  - code and data the first screens do not need load on first use: each mode's code, the settings
    screen, the translator, and the QR decoder fallback (`jsqr`), which loads only when the teacher
    opens the camera scan in a browser without `BarcodeDetector`.
- A scaled copy of the current scene's background tiles is cached at the drawn pixel size, and
  the HUD is written only when a value changes.
- Adding worlds must not slow the game: memory and work at the start stay flat. A level decodes
  only its own pictures when it opens; the other worlds' pictures are just downloaded in the
  background, and only the last scene's scaled backgrounds stay in memory.

## Performance on slow computers
- **What costs:** drawing pictures, not code. On a computer that draws the canvas without the
  graphics card (old school laptops, cheap Chromebooks, a blocklisted driver) nine tenths of a
  frame is copying and filtering pixels; game logic is a few per cent. So the rules are about
  pixels: background bands are scaled once to the screen and copied on whole pixels whenever
  they stand still (or always where a pixel is too small to see a jump, at a device pixel
  ratio of 2 and more); the layer in front of Tapko is only as wide as what he holds; big
  blurred glows are drawn once per size and then copied; a scene that does not move (cards
  before play, the pause) is not drawn again, and with Full graphics a scene under a blurring
  card (the end card) stands still, Tapko on the card too: any move there would blur the stage
  again every frame. Peeking under the end card shows it live again.
- **Simple graphics:** a teacher can set Graphics to Automatic (default), Full or Simple in the
  settings. Simple draws the scene at three quarters of the screen's resolution (scaled up; the
  words are not on the canvas and stay sharp), fewer particles, no blurred
  shadows and no blur behind cards, moving bands on whole pixels and the start page's sky
  without its butterflies and fireflies. Automatic switches to it by itself when the first seconds of play are slow
  (the slowest 5 % of frames over 25 ms) and remembers that for the device. It never changes
  the game's pace, word timing or results: a slow computer gets the same lesson.
- **A slow frame does not slow the next one:** the game takes at most four update steps per
  frame (longer steps instead of more), so the game clock stays right without piling work up.
- **Downloads:** a level's own pictures go first; the other worlds' play pictures download in
  the background two at a time and wait while a screen loads its own. Installing the offline
  copy downloads four files at a time, so on a slow school line it does not crowd out the
  pictures the open level needs.

## Performance budget
Measured by `scripts/perf.mjs` (Playwright, headless Chromium with software drawing, which stands
for a computer without canvas acceleration): `normal` is 1366 x 768 at device pixel ratio 1,
`slow` the same with the processor slowed six times.
- Every story level in play: on `normal` with Full graphics a steady 60 fps (p50 at most 17 ms,
  p95 at most 20 ms); on `slow` with Simple graphics (the automatic choice there) a steady
  30 fps (p50 at most 34 ms, p95 at most 80 ms). There the whole frame is the software drawing
  of a full screen, which is why Simple draws a smaller canvas.
- The main chunk holds only what the start page and the map need; each mode's code is its own
  chunk, loaded with its first level, and imports only `modes/kit/`, never another world's mode.
- `node scripts/perf.mjs --budget` (normal) and `node scripts/perf.mjs --machine slow --low --budget`
  fail over budget. They are slow (one to two minutes per scene), so they are not part of
  `npm test`; they run before a world plan is finished.

## How to add a world
- **Mode contract:** a level kind maps to a `Mode` subclass in `src/game/modes.ts` (loaded on
  demand). The mode draws its scene on the stage (600 units high, width follows the screen),
  asks for word labels through the runtime (`label`), lists its `pictures` (the level opens when
  they are loaded) and may draw in front of Tapko (`renderFront`, within 640 units of the left
  edge). Shared pieces used by two or more modes live in `src/game/modes/kit/` (approach,
  catcher, copy row, hero); a mode never imports another world's mode.
- **Pictures:** prompts in `assets-src/PROMPTS.md`, raw files in `assets-src/`, `npm run assets`
  makes the web files and the manifest. Background bands are `bg-<world>[ground]-far|mid|near`,
  their ends joined to repeat (`scripts/bg-seam.mjs`); every picture keeps a drawn fallback.
- **Texts:** the world's name, story and level lines in every `public/i18n/<lang>.json`, a place
  in the catalog (`src/i18n/catalog.ts`) and a situation in `public/i18n/translator/en.json`.
- **Tests:** the mode in `src/game/modes/idle.test.ts` (plays to its end, idles safely), its
  pure rules as unit tests, and a run of `scripts/perf.mjs` with the world's levels added to its
  scenes, within the budget above.

## Why
- GitHub Pages is free and needs no server, which also guarantees privacy.
- Generated art and music give a polished storybook look; procedural fallbacks keep the
  game working while assets are missing or being redone, since the implementing LLM cannot
  produce raster art or audio itself.
- Lazy language files keep the first load small on school networks.

## Quality bar
- Zero perceived input lag: a key press is checked and shown in the same frame.
- 60 fps on a mid-range school laptop or Chromebook, at least a steady 30 fps on a slow one
  (with Simple graphics); keeps working when the tab is hidden and shown again.
- Unit tests (Vitest) for logic (word engine, layouts, stats, storage, progression);
  Playwright tests for the main user flows.
