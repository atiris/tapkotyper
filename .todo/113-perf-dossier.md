# 113 - Performance dossier (for the optimizer)

Read only this file and the `file:start-end` ranges it names. Numbers are from `scripts/perf.mjs`
traces (headless Chromium, software canvas, no GPU). "ms/s" = milliseconds of main-thread time per
wall second (1000 = the thread never rests).

## How to read the traces of this game
- **`Commit` on the main thread is the canvas raster.** With a software canvas the 2D calls are
  recorded during the frame and rasterized when the frame is committed; that time lands in the
  trace event `Commit` (main thread), not under the JS function that issued the call.
- `VizCompositorThread` composites the page layers (stage canvas, words layer, front layer, DOM).
- `--machine slow` throttles the renderer's CPU x6 (raster included); `--low` = Simple graphics
  (scene canvas at 0.75 of the screen, words on their own full-resolution layer); `--lowres` =
  the second Automatic step (scene canvas at 0.5). Simple sets `body.gfx-simple`
  (`src/engine/graphics.ts:52,64`).
- The perf runs block the service worker and use a fresh profile, so the background download of
  every world's play pictures (`src/gfx/assets.ts:75-85`) runs during each measurement:
  `fetch`/`blob` 10-20 ms/s on slow (round 3, P14).
- Style and layout without a JS stack in a trace are CSS animations and transitions: Chrome
  restyles the animated element every frame (`UpdateLayoutTree`), and an animated layout
  property (width, left, box-shadow size...) also lays out the document and repaints.

## Rules you must keep
- A slow computer gets the same lesson: never change pace, word timing, results, stars, lessons;
  only how it is drawn. Every mode must still pass `src/game/modes/idle.test.ts`.
- Word labels are the task: as sharp as in Full at every step, soft shadow kept, on whole pixels.
- Every picture keeps its drawn fallback (`src/gfx/assets.ts`); pictures resolve through it.
- Never read the canvas size or layout while drawing a frame (forces layout); change only the DOM
  elements a change concerns, never a value every key inherits (restyles ~200 keyboard elements).
- A mode imports only `modes/kit/`, never another world's mode; the main chunk holds only what the
  start page and the map need (+2 KB gzip at most without a measured gain).
- Simple graphics: no blurred shadows except labels, no backdrop blur, still bands, fewer
  particles, no next-key pulse, hands change pose at once; Automatic steps down only on frames
  slow all the time (`src/engine/graphics.ts`).
- Reduced motion (`body.reduce-motion`, `.start-sky.calm`) keeps working as now.
- SEO: `index.html`, about pages, robots, sitemap keep their head, text, links, lang,
  canonical/hreflang, structured data.
- No new dependencies, no store fields, no share-link or `.tapko` contract changes.

## Gates (Opus measures)
- slow-low or slow-lowres (or big, DPR 2 without GPU) better in one scene beyond noise (p50 +-1
  ms, p95 +-3 ms, busy % counts for the idle screens), or a better look with no slow scene worse;
  normal and big no scene worse; budgets: normal p50 <= 17, p95 <= 20; slow-low p50 <= 34, p95 <= 80.

## Already tried and dropped (do not retry)
- Opaque canvas without the clear: no measurable gain (plan 82).
- Sprites pre-scaled per size: not worth it, all sprites and labels under 13 % (plan 82).
- Replacing the end card's backdrop blur by a `filter` on the still scene: no gain (plan 90).
- Simple at 0.85 resolution: only slower; 0.75 kept (plan 90).
- Sub-pixel x for still bands: keeps the whole cost; still bands and DPR 2 snap (plan 82).
- P5 snapping fast-moving bands at DPR 1 in Full: dropped, changes the motion look (plan 113).
- Start page in Full: `will-change: transform` on the player card's breathing character and the
  butterflies' trip as one `transform`: no gain (slow busy 72 -> 70 %, Paint 104 -> 107 ms/s);
  the harness's own rAF tick forces a main frame each vsync (step 3).

## Round 1 (done, steps 2 and 2b)
Kept: ribbon ends without mask copy and plate cached, frame text wrapped once, words layer only
redrawn on change, bands scaled once at every height with the space tint baked in, monitors /
copy row / range score / speech bubbles / Tapko-in-scene cached, still backdrop copy, label
sizes floored to half units, per-frame garbage removed (slow-lowres GC 36-53 -> 3-6 ms/s).
Left: H, the dragons' fire glow (`src/game/modes/dragons.ts:320-345`, a radial gradient and 5
rotated flame sprites per frame; valley-1 slow-low 6 + 6 + 5 + 5 ms/s self in it).

## Round 2 (done, step 3)
Kept: range progress bar slides by `translate` (no width transition), HUD rings compare a number
before building strings, `covered` from a MutationObserver flag, Tapko's mood swaps only changed
`src` and hops by class, idle map/start page held still in Simple (map slow busy 70 -> 25 %),
fireflies one radial gradient, breathing off in Simple. Reverted: `will-change` on the start
page's breathing character and butterflies (no gain; the harness's rAF tick forces main frames).
Left as they are: keyboard guide and hands per key (cheap).

## Round 3: loading, memory, Automatic, looks (step 4)
Fresh numbers `.e2e/perf-113/r3a/` (build of commit e9307e2).

### T. Memory: a left level stays alive (P13) - root cause found
`--leak` (ten levels opened and left, normal): heap 4.3 -> 6.0 MB, live canvases 6 -> 36; at
the end alive: 10 detached `stage` 1366x455, 3 `stage-front` 486x455, 4 815x455, 10 0x0 and
small ones (label/cache canvases). Every detached stage canvas has the same retainer path in a
heap snapshot (after two forced GCs):
`audio` (`src/audio/audio.ts:44` `listeners`, `onChange` 154-157) -> closure of
`soundButton()` (`src/ui/chrome.ts:28-56`) -> its function Context holds `b` strongly (the
`roundButton` click arrow and the `contextmenu` handler capture `b`, and V8 gives all closures of
one function a single shared Context) -> the detached sound button -> its siblings and the whole
detached level DOM -> click handlers -> `LevelRuntime` (`this`) -> `stage.canvas` / `front`.
So the `WeakRef` in `soundButton` does not help: the listener closure's Context still holds
`b`. The listener drops itself only on the next `audio` change (`!btn?.isConnected`), which
during plain play never comes. `fullscreenButton()` (chrome.ts:59-88) has the same shape
(`b` captured by `paint`/`roundButton` in the same scope as `onChange`) but its listener sits on
`document`, check it too. Other module-level subscriber lists: `src/app/theme.ts:10,71`
(`onThemeChange`), `src/audio/speech.ts:13,28`, `src/app/keyboard-gate.ts:7,55`.
Also: `Stage.dispose` (`src/engine/loop.ts:145-150`) removes the canvases but keeps their pixels
(1366x455x4 = 2.5 MB each, DPR 2 four times that) until GC; mode caches made by kit pieces
(scaled bands, label/picture caches in `src/gfx/draw.ts`, `releaseLevelPictures` 351-357) are
module level by design and released per level only partly.
Leak tool (local): preview `.e2e/dist` on 4176, then `node .e2e/leak-retainers.mjs`
(`LEVELS=meadow:0,...`, `MAX=`) prints each canvas's retainer path.

### U. Automatic on a slow device now stays in Full in half the scenes (P15)
`--machine slow --auto --hiccup` (one run; gfx = where it ended; the baseline ended `simple`
everywhere, junkyard-4 `lowres`):

| scene | p50/p95 L busy gfx | slow-low (Simple) p50/p95 for comparison |
|---|---|---|
| meadow-1 | 16.7/66.7 L79 86 % simple | 16.7/33.3 |
| meadow-5 | 16.7/99.9 L86 97 % simple | 16.7/66.7 |
| space-1 / space-5 | 16.7/83.3, 16.7/66.7 simple | 16.7/33.4, 16.7/33.5 |
| planet-2 / -3 / -5 | 16.7/49.9, 16.7/83.3 (L97), 16.7/66.6 full | 16.7/50, 16.7/33.4, 16.7/50 (baseline) |
| valley-1 / -3 | 16.7/50, 16.7/66.6 full | 16.7/33.3, 16.7/50 |
| valley-5 | 16.7/50 simple | 16.7/50 |
| junkyard-1 / -3 / -5 | 16.7/50.1, 16.7/66.6, 33.2/66.7 full | 16.7/33.4, 16.7/50, 16.7/50 |
| junkyard-2 / -4 | 16.7/50, 16.8/66.6 simple (junkyard-4 no longer steps to lowres) | 16.7/50, 33.3/66.6 |
| placeholder | 16.7/66.7 L105 full | 16.7/50 |
| range | 16.7/66.7 L110 simple | 16.7/49.9 |
| map / start / rhythm | 16.8 full, busy 68 / 64 / 20 % | - |

Reading: rounds 1-2 made Full cheap enough that the median frame on slow is 16.7 ms, so the
watch (`src/engine/graphics.ts:73-102` `FrameWatch.frame`: after `WARM_UP_S` 3 s, `WATCH_S` 6 s
split in `PARTS` 3, every part's median > `SLOW_MS` 24) no longer sees a slow device. But in
Full the thread is 94-98 % busy and 4-7 % of frames take over 33 ms (`>33` 82-149 of ~1800),
p95 50-83 (planet-3 83.3 over the slow p95 budget of 80). A median-only test cannot see this
jank. The watch is called from `src/game/runtime.ts:1109-1118` `watchFrames` (resets with a new
`FrameWatch` after the first step) in `render` 1140-. Its unit tests:
`src/engine/graphics.test.ts`. Rule: never step down for one hiccup or a short burst (tests
31-); the step is stored for 7 days (`SLOW_KEY`, 4-8, `markSlowDevice` 56-65).
P15 (the scene at 30 Hz with words every frame) was for scenes still over budget; slow-low is
within its budget in every scene now (worst p95 66.7).

### V. Loading on Fast 3G, cold (P14)
`--load`: to the map 7.3 s (code 410 KB, data 261, pictures 679, other 183 KB); first card of
valley-1 14.4 s, 2651 KB of pictures in the level phase (opened 5 s after the map appeared).
Path: `src/main.ts:102-108` starts after `PRELOAD_AFTER_MS` the texts, the map and level code
and `preloadPlay` (`src/gfx/assets.ts:71-86`: every `obj|robot|fairy|tapko-astronaut` picture
of every world, 2 at a time, `fetch` priority low, waiting only while a screen's own `load` is
in flight, `ownIdle` 89-103). The level's `prepare` (`src/game/runtime.ts:347-354`) waits for
`preload(own)`: its 4 band pictures (valley 308 KB), the mode's `pictures`, every Tapko mood of
the companion (`tapkoPictures`, `src/gfx/tapko.ts:68-70`) and `friendPictures()` (Bolt and
Melody in every look and mood, 13 files, 420 KB, `assets.ts:104-107`) before the first card,
at most `PICTURES_WAIT_S` 30 s (runtime.ts:71). Picture decode: `load` (assets.ts:109-122)
decodes each before its first draw. On slow (CPU x6) `fetch`/`blob` of the background downloads
cost 10-20 ms/s during measured play (perf runs block the service worker, so every run is a first
visit). Constraint: the level opens with every picture it draws so none shows its fallback first;
a picture that is not needed before the first card may still come later only if it is not
visible until then (a friend who joins later, an object that comes later).

### W. Looks the budget now allows (normal / big only, never slow)
Normal Full busy 16-60 % with p95 16.8 everywhere, big p95 16.8 except range/meadow 33.4. Ideas
must be gated on `!graphics.simple` and cost nothing in Simple; they must not move the labels or
change pace. Candidates are yours to pick (e.g. H, the dragons' fire glow
`src/game/modes/dragons.ts:320-345`, could be cached and so made richer at no frame cost).

### Gates of this round (in addition to the general ones)
- `--leak`: canvases after ten levels flat (no growth per level), heap not growing per level.
- `--load`: to the map and to the level not slower beyond 5 %; SEO files unchanged.
- `--auto --hiccup` on slow: every scene within the slow budget (p50 <= 34, p95 <= 80); a strong
  machine (normal, big) must never step down: `--machine normal --auto --hiccup` stays `full`.
