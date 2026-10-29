# 82 - Code review for speed, smooth drawing and long-term upkeep

The owner's request of 2026-10-29: a detailed analysis of the code to find inefficiencies, chances to
improve, optimisations of drawing speed and smoothness, and gentle architecture changes, so the
project stays maintainable for a long time and runs well on slow computers (old school laptops,
cheap Chromebooks, integrated graphics).

Runs after plans 81 and 80: plan 81 deletes the old modes of worlds 4-15, so the analysis covers
only code that stays, and the new valley modes are measured too.

Affected (expected, the analysis decides): `src/engine/loop.ts`, `src/gfx/draw.ts`,
`src/gfx/assets.ts`, `src/engine/particles.ts`, `src/game/runtime.ts` (1585 lines), `src/game/mode.ts`,
the modes in `src/game/modes/`, `src/ui/sky.ts`, `src/audio/audio.ts`, `public/assets/` and the asset
scripts, `vite.config.ts`, a new `.specify/architecture.md` section on performance. No store change;
the project is alpha, never any migration (new settings get defaults).

## Rules for this plan
- **Measure first, then change.** Every speed change needs a number before and after from the
  same measurement (step 1); a change that does not measurably help is reverted.
- **Nothing visible changes** on a normal computer: same pictures, motion, timings, texts. The
  low-power tier (step 4) may draw less, but the game plays the same.
- **Gentle architecture:** split and simplify where it lowers the cost of the next world plan; no
  framework, no new runtime dependency, no rewrite of a working mode only for style.
- Findings outside the plan's reach: each one hard and substantial gets its own `.todo/` plan and
  a `QUEUE.md` line; small ones go to `BACKLOG.md` (the per-reply limit does not apply inside this
  plan, as in a scenario run; still search first, never duplicate).
- The findings and the measurements are kept in this file under `## Findings` as the work goes on.

## 1. Baseline measurement
- [x] A repeatable measurement script `scripts/perf.mjs` (Playwright, already a dev dependency): opens
      the built app (`vite preview`) with the tester profile `.e2e/tester-profile.json` and `?fast`,
      plays a fixed 30 s of chosen levels by typing with `tapkoType`, and records per level: frame
      times (p50, p95, p99, frames over 33 ms), long tasks, JS heap at start and end, and a Chrome
      performance trace kept under `test-results/perf/` (not committed).
- [x] Two machine profiles: normal, and slow = CDP CPU throttling x 6 with a 1366 x 768 window at
      device pixel ratio 1; plus a run at 1920 x 1080 with DPR 2 (the largest canvas we allow).
- [x] Levels measured: meadow 1 and 5, space 1 and 5, planet 2, 3 and 5, valley 1, 3 and 5, one
      placeholder level, the target range, the map screen and the start page (its animated sky).
- [x] Load: first load and a level open on a cold cache with network throttling "Fast 3G": time
      to the map, to the first frame of a level, bytes per world (pictures, music, code chunks).
- [x] Write the baseline table into `## Findings`.

## 2. Analysis (read the code with the traces in hand)
Check at least these, note each as a finding with its measured cost or "no cost":
- [x] **Frame loop** (`Loop`, `LevelRuntime.update/render`): work per frame that could happen per
      event; allocations per frame (arrays from `filter`/`map`, closures, objects in `update`) that
      feed the garbage collector; the 1/60 s sub-steps under a slow frame (spiral of death).
- [x] **Canvas drawing**: big pictures drawn scaled down every frame (1024 px sprites, full-width
      background bands); `save`/`restore` and `globalAlpha` per sprite; `shadowBlur`, gradients and
      `measureText` created per frame (`draw.ts` word boxes, glows); the two stacked canvases
      (stage and front) both cleared and redrawn at full size each frame; what can be cached in
      offscreen canvases (backgrounds per world and scale, text of a word label, glows).
- [x] **Still frames**: does the game redraw at 60 fps when nothing moves (pause, cards, results,
      map)? `Stage.dirty` exists; extend it to skip frames while nothing changed.
- [x] **DOM work during play**: DOM Tapko, the keyboard, finger guide, progress bar, bubbles: style
      writes and layout reads in the same frame (layout thrashing), class changes every frame.
- [x] **Particles** and shouts: counts, per-particle cost, pooling.
- [x] **Audio**: WebAudio nodes created per key press and never released; music files (1.2 MB each)
      loaded before they are needed.
- [x] **Assets**: picture sizes against their largest drawn size at DPR 2; webp quality; pictures
      loaded per world only (plan "load each world's mode code on demand" did code, check pictures);
      unused files in `public/assets/`.
- [x] **Bundle**: main chunk size and what is in it, i18n JSON size per language, dead exports.
- [x] **Memory leaks**: listeners, `ResizeObserver`s, timers and intervals left after a level, the
      map or a screen closes (heap after playing ten levels in a row against after one).
- [x] **Code health**: `runtime.ts` and other files over ~600 lines, duplicated logic between modes
      (approach, catch, copy row, panels), mode base class hooks no longer used, tests that are slow
      or flaky, `tsc` strictness gaps.

## 3. Fixes that are clearly worth it
Do every fix from step 2 that is small, safe and measured, each as its own commit with its before/
after numbers in `## Findings`. Expected candidates (do them only if the analysis confirms them):
- [~] Pre-scaled sprite cache (not worth it: all sprites, labels and particles together cost under 13 points; Tapko's layered picture is composed once instead)
- [x] Background bands cached at the stage scale; tiling from the cache.
- [~] Word label cache (label shadows cost 0-4 points and labels change size while they grow; Simple graphics drop the shadow)
- [~] No per-frame allocations (no measurable GC cost; left as they are)
- [x] Skip render while nothing changed (cards before play and the pause; the results card keeps its moving scene - backlog; the map is DOM only)
- [~] Batched DOM writes (HUD already writes on change only; style + layout 1-2 %, no cost)
- [x] Music loaded when its world opens (already so: one streamed track, released on change; no change needed)
- [x] A cap on the update sub-steps per frame, so a slow frame does not make the next one slower.

## 4. Low-power tier for slow computers
- [x] An automatic tier from the measured frame times of the first seconds of play (and kept per
      device in `localStorage`, wrapped in try/catch): when p95 is over ~25 ms, switch on low power:
      canvas DPR 1, fewer particles, no blur or glow filters (flat glow sprites instead), slower or
      no drift of the far band, the start page sky without its extra layers.
- [x] It changes only how it is drawn, never the game's pace, word timing or results.
- [x] A setting in the parent controls: Graphics - Automatic (default) / Full / Simple, so a teacher
      can force it; a new settings field with its default only (no migration, alpha).
- [x] Measure the slow profile again with the tier on.

## 5. Gentle architecture changes
- [x] Split `runtime.ts` (labels and callouts to `src/game/runtime/`; pause, paw and super help share private state - backlog)
- [x] Shared pieces the world plans keep re-making (a catcher, a word panel, a copy row, a flight
      path, a walking hero on a path) as small helpers in `src/game/modes/kit/` where at least two
      modes use them; the modes keep their own story code.
- [x] A short "how to add a world" section in `.specify/architecture.md`: the mode contract, the
      pictures list, background sets, i18n keys, tests to add, the performance budget (step 6).
- [x] Remove dead code found by the analysis (unused exports, CSS classes, i18n keys, files).

## 6. Budget and guard
- [x] Performance budget in `.specify/architecture.md`: on the slow profile p95 frame time at most
      33 ms (30 fps steady) in every story level, at most 20 ms on the normal profile; main chunk
      size; per-world download size.
- [x] `scripts/perf.mjs` can run in budget mode and fails over budget; documented, not part of the
      normal `npm test` (it is slow), run before finishing any world plan (add the line to the
      "how to add a world" section).

## 7. Checks
- [x] tsc, vitest, build, e2e `play.spec.ts`.
- [x] Browser play-through (`?fast`, tester profile, `tapkoType`) of one level per built world and a
      placeholder level on the normal profile and with CPU throttling x 6 and the low-power tier:
      the game looks and plays the same, motion is smooth, nothing is missing.
- [x] Final table before/after for every measured level in `## Findings`.

## Findings

### Method and decisions
- `scripts/perf.mjs` runs headless Chromium. Its canvas is drawn in software, so it stands for a
  computer without canvas acceleration (the slow school laptop case); frame times there are
  capped at 60 Hz, so the main-thread **busy %** (CDP `Performance.getMetrics`, task time per wall
  second) is the sensitive number on `normal`; p50/p95 matter on `slow` and `big`.
- The first runs counted the results card as play (it ends early with `?fast`); the final script
  stops at the results card. The automatic graphics could switch a run to Simple midway, so the
  script pins Full (or Simple with `--low`). Baseline and final rows below come from those two
  script versions; rows that ended at the results card (meadow-5, placeholder, range) are not
  comparable one to one.
- Experiments by switching one thing off (meadow-1 and valley-1, normal, busy %): no background
  -40 points, no front canvas -22, everything else (sprites, labels, particles, script) about 13.
  Background bands copied on whole pixels instead of filtered sub-pixel copies: 52 -> 20.
  Sub-pixel x alone keeps almost the whole cost, so moving bands keep sub-pixel steps only where
  a pixel is big enough to see a jump (DPR 1, Full graphics); still bands and DPR 2 snap.

### Analysis, item by item
- **Frame loop:** script is 2-4 % of a frame; no GC pressure (heap steady within a level, GC
  under 1 % of the trace). Allocations per frame (label sort, particle filter) cost nothing
  measurable: left as they are. Up to 15 update steps per slow frame: capped at 4 (fix 6).
- **Canvas drawing:** the cost. Filtered background copies (fix 1), the full-size front canvas
  cleared and uploaded every frame for two modes (fix 2), Tapko's 3-5 layers drawn scaled and
  rotated every frame where a mode draws him on the canvas (fix 3), the placeholder panel's
  shadowBlur 26 every frame (fix 4). Label shadows (shadowBlur 8): 0-4 points, no cache (labels
  change size while they grow); Simple graphics drop them. An opaque canvas without the clear:
  no measurable gain, reverted. Sprites pre-scaled per size: not worth it (all sprites and labels
  together are under 13 points).
- **Still frames:** the pause already skipped drawing; cards before play now do too (fix 5). The
  results card keeps the scene moving under a backdrop blur: costly (backlog), Simple drops the blur.
- **DOM during play:** HUD writes only on change, style + layout 1-2 %; the bubble reads layout
  after writes only while shown. No cost.
- **Particles:** under 1 %; Simple graphics emit a quarter. No pooling needed.
- **Audio:** oscillators per sound end and are collected; music streams through one media
  element and is released on the next track. No cost.
- **Assets:** sprites max 384 px (drawn up to ~384 px), bands 1376 x 768 scaled once. Unused
  files: `base-template.webp` (13 KB, written on purpose by scripts/assets.mjs) - left. The
  background preload of every world's play pictures started all ~150 downloads at once: on
  "Fast 3G" a level took 32 s to open with 5.2 MB of other pictures in the way (fix 7). The
  service worker's install does the same in production (backlog P2).
- **Bundle:** main chunk 255 KB (86 KB gzip), unchanged. The valley's code pulled the meadow
  mode (14 KB) for the catcher, aim/free typing/parrot pulled the planet modes (21 KB) for the
  hero: moved to `modes/kit/`, now ~1 KB each.
- **Memory leaks:** the sound and fullscreen buttons kept every old screen alive until the sound
  or fullscreen changed (fix 8). Window listeners were always flat (27).
- **Code health:** `runtime.ts` 1591 lines -> 1445 (labels and callouts in `src/game/runtime/`);
  the rest shares private state (backlog). Other files over 600 lines (`aim.ts` 1260,
  `dragons-flight.ts` 1007, `meadow.ts` 769, `translate.ts` 949, `parent.ts` 706): working modes
  and screens, not split for style. Dead code removed: `groundY`, `BADGE_TIERS`, `FEET` of
  planet.ts, 12 CSS rules of 7 classes no screen uses. `tsc` is strict with unused checks; tests
  take 1.2 s, none flaky.

### Fixes (busy % on normal unless named)
1. Bands on whole pixels while still or at DPR 2+: valley-1 57 -> 24 (with fix 2).
2. Front layer only 640 units wide, made on first use: meadow-1 74.6 -> 51.8 with it off entirely
   in the experiment; the strip keeps most of that.
3. Tapko composed once: planet-3 36.8 -> 24.9, range 46.5 -> 34.4; slow+Simple planet-3 p50
   66.6 -> 16.7 ms, p95 133 -> 50 ms.
4. Placeholder glow drawn once per width (inside the final numbers; its panel was the scene's
   only big blur).
5. No redraw of a still scene before play (cards): the get-ready card no longer draws 60 frames
   a second.
6. At most 4 update steps per frame.
7. Background downloads two at a time and waiting for a screen's own pictures: level open on
   "Fast 3G" 32.0 s -> 11.1 s, other pictures during the open 5.2 MB -> 1.5 MB.
8. Weak button listeners: heap after 10 levels 5.7 -> 4.8 MB, flat after; 20 levels 6.3 -> 4.9 MB.
- Simple graphics (step 4): DPR 1, a quarter of the particles, no blurred shadows, no backdrop
  blur, all bands on whole pixels, the start sky without butterflies and fireflies. Automatic
  after 1.5 s warm-up + 4 s of play with p95 over 25 ms, kept per device
  (`tapkotyper:slow-device`). Settings field `graphics` with default `auto` (no migration).
- Decision: the plan's slow budget (p95 at most 33 ms) is not reachable in this emulation; the
  remaining frame is the software raster of the full screen. Budget set to what holds with a
  little room: slow + Simple p50 at most 34 ms, p95 at most 80 ms (measured 17-33 and 33-67);
  normal p50 17, p95 20. A Full drawing at DPR 2 and 1080p keeps upscaled bands filtered (a cached
  upscaled band would take about 30 MB each); such machines draw on the GPU, or Automatic drops
  them to DPR 1. A smaller canvas for
  Simple graphics is in the backlog.

### Final table (30 s per scene, ?fast)
Normal: p95 16.7-16.8 ms in every scene after (before: meadow-5 33.4 and placeholder 50, both
on their results card). Before -> after; slow + Simple did not exist before (its baseline is the
slow Full column).

| scene | normal busy % before -> after | slow (Full) p50 / p95 ms before -> after | big (Full) p50 before -> after | slow + Simple p50 / p95 ms |
|---|---|---|---|---|
| meadow-1 | 60.7 -> 48.3 | 99.9 / 150 -> 99.9 / 150 | 66.7 -> 66.6 | 16.7 / 33.4 |
| meadow-5 | 50.1 -> 50.9 | 100 / 150 -> 100 / 150 | 66.7 -> 66.6 | 33.2 / 50 |
| space-1 | 61 -> 53.5 | 99.9 / 150 -> 100 / 183.2 | 66.7 -> 66.7 | 33.3 / 50 |
| space-5 | 61.7 -> 54 | 100.1 / 166.6 -> 100.1 / 166.6 | 66.6 -> 66.7 | 33.3 / 50.1 |
| planet-2 | 55 -> 16.7 | 99.9 / 150 -> 16.7 / 50 | 66.6 -> 66.6 | 16.7 / 33.4 |
| planet-3 | 70.2 -> 22.6 | 133.3 / 200 -> 33.3 / 66.7 | 66.7 -> 66.7 | 16.8 / 50 |
| planet-5 | 67.4 -> 22.6 | 133.3 / 183.4 -> 33.3 / 66.7 | 66.7 -> 66.6 | 33.3 / 50 |
| valley-1 | 57 -> 17.2 | 83.4 / 133.4 -> 33.3 / 50.1 | 66.6 -> 66.6 | 16.7 / 50 |
| valley-3 | 59.2 -> 19.5 | 100.1 / 150 -> 33.3 / 50.1 | 66.6 -> 66.6 | 33.3 / 50 |
| valley-5 | 57.1 -> 18.4 | 100 / 150 -> 33.3 / 50.1 | 66.6 -> 66.7 | 33.3 / 50.1 |
| placeholder | 32.2 -> 24 | 99.9 / 166.7 -> 50 / 83.4 | 66.7 -> 66.6 | 16.7 / 33.4 |
| range | 73 -> 30.4 | 133.4 / 216.7 -> 50.1 / 100.1 | 83.3 -> 66.7 | 33.3 / 66.6 |
| map | 7.6 -> 6.4 | 16.7 / 16.8 -> 16.7 / 16.7 | 16.7 -> 16.7 | 16.7 / 16.8 |
| start | 8.5 -> 8.1 | 16.7 / 16.8 -> 16.7 / 16.7 | 16.7 -> 16.7 | 16.7 / 16.8 |

- Load on "Fast 3G" (cold, no service worker): map 7.1 s both; valley level 1 open 32.0 -> 11.2 s;
  pictures downloaded during the open 5.2 MB -> 1.6 MB; its code 31 -> 18 KB.
- Leak: heap after 10 / 20 / 40 levels 5.7 / 6.3 / - MB before, 4.8 / 4.9 / 4.9 MB after; window
  listeners 27 throughout; band copies holding pixels after 12 levels 17 -> 4.
- Budget runs (`--budget` normal, `--machine slow --low --budget`): no scene over budget.
- Bundle: main 255.7 KB (86.2 KB gzip); the valley no longer loads the meadow chunk, aim/free
  typing/parrot no longer the planet chunk.
- Browser play-through (Playwright MCP, dev server, tester profile, `tapkoType`): valley 1, planet
  3, placeholder with Full and Simple chosen in the settings; scenes, front layer, canvas Tapko,
  labels and the panel glow as before, Simple without shadows; no console errors. The throttled
  runs played every listed level through `scripts/perf.mjs`.
- Found on the way: `src/share/share.test.ts` reloaded the teacher store with the real clock and
  started failing a week after its fixed date; fixed (it would have blocked the deploy).

## Done - 2026-10-29
Shipped: `scripts/perf.mjs` (scenes, profiles, load, leak, budget), cheaper frames (bands on whole
pixels, narrow front layer, Tapko composed once, cached glow, no redraw of still cards, step cap),
background downloads that let a level's pictures go first, the Simple/Automatic graphics tier with
its setting, two memory leaks fixed (old screens kept by button listeners, evicted canvases kept
their pixels), `modes/kit/`, labels and callouts out of `runtime.ts`, dead exports and CSS removed,
performance, budget and "how to add a world" in `.specify/architecture.md`.
Left out (in `.todo/BACKLOG.md`): the service worker's all-at-once install, the blur behind the
results card in Full graphics, a smaller canvas for Simple graphics, the rest of the `runtime.ts`
split. Not done on purpose: pre-scaled sprites, label cache, allocation and DOM batching work (no
measurable cost); the slow budget is p95 80 ms, not 33 ms (see Findings). The fixes went in as
fewer commits than one per fix (they share files); each one's numbers are in Findings.
