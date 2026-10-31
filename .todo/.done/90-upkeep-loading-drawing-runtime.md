# 90 - Upkeep: gentler first download, cheaper results card, smaller Simple canvas, runtime split

## Why

Four backlog findings left after plan 82 (performance and upkeep), all about weak school
computers and slow lines, and one about code size. Gathered here so the backlog keeps only what
cannot be done now (2026-10-31).

- The service worker's install fetches all ~6.8 MB at once (`scripts/sw-template.js`,
  `install()` with one `Promise.all`), competing on a slow school line with the pictures the
  open level needs.
- The results card's `backdrop-filter: blur(3px)` (`.overlay` in `src/styles.css`) sits over a
  scene that keeps animating, so Full graphics re-blur the whole stage every frame (placeholder
  and hedgehog results: p50 33 ms on the normal profile).
- Simple graphics hold p50 33 ms on the slow profile (CPU x6, software drawing) but p95 stays
  50-100 ms, almost all of it the full-screen raster (`scripts/perf.mjs`).
- `src/game/runtime.ts` is ~1450 lines: the pause card with stretches, the paws' help and the
  super helper live on its private state.

## Decisions

- **Install in small batches:** at most 4 downloads at once (a small worker pool over the file
  list), same order as now; the rule "any failed download fails the install" and copying
  unchanged files from the newest complete cache stay. No other change of caching or versions.
- **The scene under a blurred card stands still:** while a card that blurs the stage is open
  (the results/end card, the pause card, "Really end it?", any `.overlay` that is not a peek),
  the canvas keeps its last drawn frame and does not redraw; the game logic (tweens, end hops)
  may run on but is not drawn. Peeking (`.overlay.results.peek`, no blur) draws live again as
  now, and closing the card resumes drawing. Simple graphics already drop the blur and are not
  changed by this. Target: results card p50 under 17 ms on the normal profile with Full
  graphics (`scripts/perf.mjs`, the placeholder and hedgehog results it already measures).
- **Simple graphics draw at 0.75 resolution:** with Simple graphics (chosen or `auto` measured
  slow) the canvas backing store is 0.75 of the stage's device pixels, scaled up by CSS; Full
  graphics keep full resolution. Word labels are DOM, so text stays sharp. Target: slow profile
  p95 under 50 ms with Simple graphics. If the picture looks clearly worse in a screenshot of
  the meadow and the valley (text on the canvas, thin lines), use 0.85 instead and note it.
- **Runtime split without behaviour change:** move the pause card with its stretches and quick
  exercise, the paws' help (button, timers, paw typing) and the super helper into their own
  files under `src/game/runtime/` (next to `labels.ts`, `callouts.ts`), sharing one small state
  object the runtime owns (paused, elapsed, idle time, the core, the guide, the stage element)
  instead of reaching into its private fields. `runtime.ts` ends under about 1000 lines. Do it
  after `.todo/89-typing-time.md` is done (it changes the runtime's time keeping).

## Affected

- `scripts/sw-template.js`; `src/engine/loop.ts` / `src/game/runtime.ts` (skip drawing under a
  blurred card), `src/ui/` card helpers that open overlays (a flag the loop reads, e.g. a class on
  the stage or a counter of open blurring cards); `src/engine/graphics.ts` and the stage's canvas
  sizing (`src/engine/` stage/resize code) for the 0.75 scale; `src/game/runtime.ts` and new
  `src/game/runtime/pause.ts`, `paws.ts`, `super-helper.ts` (names as fits).
- Specs: `.specify/experience/devices.md` (Simple graphics draw at a lower resolution; the scene
  under a card stands still), `.specify/experience/offline.md` (the install downloads a few files
  at a time) if they describe these.
- DB/store: none.

## Progress notes

- Install pool: unit test `src/app/sw-install.test.ts` runs the template with fake caches and
  fetch (vitest only covers `src/`).
- `scripts/perf.mjs` did not measure results cards: it waited for the old `.results-card` class
  (the end card is `.end-card` since plan 85) and levels never ended within its time. New
  `--results` flag: levels open with `minActive=0` and a `<scene>-results` row measures 6 s
  under the card.
- Results card (normal, Full): before meadow-1 p50 33.3 (busy 30 %), placeholder p50 16.7 /
  p95 33.4 (busy 11 %). Skipping the canvas alone cut busy to 2 % but frames stayed at 33 ms:
  the software compositor re-blurs whenever anything under or in the card moves. Decided: under
  a blurring card in a level (Full graphics) the stage's CSS animations pause and Tapko on the
  end card stands still too (`src/styles.css`); with that both p50 16.7. Replacing the
  backdrop blur with a `filter` on the still scene did not help and was dropped.
- Simple at 0.75 (slow profile, `--low`): meadow-1 p50 33.3 -> 16.7, p95 50.1 -> 33.4;
  valley-1 p50 33.3 -> 16.7, p95 66.7 -> 50; space-5 p50 33.4 -> 33.3, p95 66.7 -> 50.1.
  Valley and space-5 p95 land on the 50 ms frame step rather than under it; kept 0.75 (0.85
  would only be slower). Screenshots at 1024x600 (`.e2e/plan90-meadow-simple.png`,
  `.e2e/plan90-valley-simple.png`, git-ignored) look fine: painted bands are soft anyway and the
  words are DOM, so 0.85 was not needed.
- Runtime split: `runtime.ts` 1586 -> 1048 lines. Pause, paws and super help alone gave only
  ~1270, so also moved out: the story friends (`friends.ts`), reading aloud and dictation
  (`reading.ts`), the key cards before play (`key-cards.ts`), Tapko on the stage with the
  narrator's bubble (`tapko.ts`) and `wordSource` with `RuntimeOptions` (`options.ts`). The
  shared state is `runtime/state.ts` (`LevelState`: paused, started, finished, elapsed, keyAt,
  core, guide, element); each part gets it plus a small host interface, never the runtime's
  private fields (friends take the runtime's public API like labels and callouts do).

## Steps

- [x] Service worker: pooled install (4 at once); unit or e2e check that an install still fills
      the cache completely and a failed file still fails it.
- [x] No redraw under a blurred card; peek and close resume drawing; perf numbers before/after
      in the commit message.
- [x] Simple graphics at 0.75 resolution; perf numbers before/after; screenshots meadow and
      valley with Simple graphics at 1024x600.
- [x] Runtime split into pause, paws and super-helper files with a shared state object; no
      behaviour change; `runtime.ts` under about 1000 lines.
- [x] `npm run build`, `npx vitest run`, the full e2e suite (the split touches every level);
      Playwright MCP: a level to its end card, peek and back, pause with a stretch and a quick
      exercise, the paw help, with Full and with Simple graphics; console clean.

## Done - 2026-10-31

- The offline install downloads four files at a time (`scripts/sw-template.js`), unit-tested
  with fake caches and fetch (`src/app/sw-install.test.ts`): complete cache, at most 4 at once,
  a failed file fails the install.
- With Full graphics the scene under a blurring card stands still (canvas, the stage's CSS
  animations and Tapko on the end card); peeking draws live again. Results p50 33.3 -> 16.7 ms
  (meadow-1), busy 30 % -> 3 %. `scripts/perf.mjs --results` measures it (and now finds the end
  card at all).
- Simple graphics draw at 0.75 resolution: slow profile p50 33 -> 17 ms in meadow and valley,
  p95 66.7 -> 50 ms in valley-1 and space-5.
- `runtime.ts` 1586 -> 1048 lines: pause card, paws, super help, friends, reading, key cards,
  stage Tapko and options in `src/game/runtime/`, sharing `LevelState`.
- Verified: build, 496 unit tests, 86 e2e tests, Playwright MCP play-through with Full and
  Simple graphics (paws, pause with a stretch, end card, peek and back), console clean.
- Left out: valley-1 and space-5 p95 on the slow profile stay at the 50 ms frame step instead
  of under it (backlog).
