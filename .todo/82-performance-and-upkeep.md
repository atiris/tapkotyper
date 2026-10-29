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
- [ ] A repeatable measurement script `scripts/perf.mjs` (Playwright, already a dev dependency): opens
      the built app (`vite preview`) with the tester profile `.e2e/tester-profile.json` and `?fast`,
      plays a fixed 30 s of chosen levels by typing with `tapkoType`, and records per level: frame
      times (p50, p95, p99, frames over 33 ms), long tasks, JS heap at start and end, and a Chrome
      performance trace kept under `test-results/perf/` (not committed).
- [ ] Two machine profiles: normal, and slow = CDP CPU throttling x 6 with a 1366 x 768 window at
      device pixel ratio 1; plus a run at 1920 x 1080 with DPR 2 (the largest canvas we allow).
- [ ] Levels measured: meadow 1 and 5, space 1 and 5, planet 2, 3 and 5, valley 1, 3 and 5, one
      placeholder level, the target range, the map screen and the start page (its animated sky).
- [ ] Load: first load and a level open on a cold cache with network throttling "Fast 3G": time
      to the map, to the first frame of a level, bytes per world (pictures, music, code chunks).
- [ ] Write the baseline table into `## Findings`.

## 2. Analysis (read the code with the traces in hand)
Check at least these, note each as a finding with its measured cost or "no cost":
- [ ] **Frame loop** (`Loop`, `LevelRuntime.update/render`): work per frame that could happen per
      event; allocations per frame (arrays from `filter`/`map`, closures, objects in `update`) that
      feed the garbage collector; the 1/60 s sub-steps under a slow frame (spiral of death).
- [ ] **Canvas drawing**: big pictures drawn scaled down every frame (1024 px sprites, full-width
      background bands); `save`/`restore` and `globalAlpha` per sprite; `shadowBlur`, gradients and
      `measureText` created per frame (`draw.ts` word boxes, glows); the two stacked canvases
      (stage and front) both cleared and redrawn at full size each frame; what can be cached in
      offscreen canvases (backgrounds per world and scale, text of a word label, glows).
- [ ] **Still frames**: does the game redraw at 60 fps when nothing moves (pause, cards, results,
      map)? `Stage.dirty` exists; extend it to skip frames while nothing changed.
- [ ] **DOM work during play**: DOM Tapko, the keyboard, finger guide, progress bar, bubbles: style
      writes and layout reads in the same frame (layout thrashing), class changes every frame.
- [ ] **Particles** and shouts: counts, per-particle cost, pooling.
- [ ] **Audio**: WebAudio nodes created per key press and never released; music files (1.2 MB each)
      loaded before they are needed.
- [ ] **Assets**: picture sizes against their largest drawn size at DPR 2; webp quality; pictures
      loaded per world only (plan "load each world's mode code on demand" did code, check pictures);
      unused files in `public/assets/`.
- [ ] **Bundle**: main chunk size and what is in it, i18n JSON size per language, dead exports.
- [ ] **Memory leaks**: listeners, `ResizeObserver`s, timers and intervals left after a level, the
      map or a screen closes (heap after playing ten levels in a row against after one).
- [ ] **Code health**: `runtime.ts` and other files over ~600 lines, duplicated logic between modes
      (approach, catch, copy row, panels), mode base class hooks no longer used, tests that are slow
      or flaky, `tsc` strictness gaps.

## 3. Fixes that are clearly worth it
Do every fix from step 2 that is small, safe and measured, each as its own commit with its before/
after numbers in `## Findings`. Expected candidates (do them only if the analysis confirms them):
- [ ] Pre-scaled sprite cache: each picture drawn at its on-screen size from an offscreen canvas made
      once per size bucket and scale, rebuilt on resize.
- [ ] Background bands cached at the stage scale; tiling from the cache.
- [ ] Word label cache (text, box, glow) per word and style, kept while the word is on screen.
- [ ] No per-frame allocations in the hot paths of the frame loop and the modes measured.
- [ ] Skip render while nothing changed (cards, pause, results, still map), keeping the game clock
      right.
- [ ] Batched DOM writes once per frame, no layout reads after writes.
- [ ] Music loaded when its world opens, audio nodes released.
- [ ] A cap on the update sub-steps per frame, so a slow frame does not make the next one slower.

## 4. Low-power tier for slow computers
- [ ] An automatic tier from the measured frame times of the first seconds of play (and kept per
      device in `localStorage`, wrapped in try/catch): when p95 is over ~25 ms, switch on low power:
      canvas DPR 1, fewer particles, no blur or glow filters (flat glow sprites instead), slower or
      no drift of the far band, the start page sky without its extra layers.
- [ ] It changes only how it is drawn, never the game's pace, word timing or results.
- [ ] A setting in the parent controls: Graphics - Automatic (default) / Full / Simple, so a teacher
      can force it; a new settings field with its default only (no migration, alpha).
- [ ] Measure the slow profile again with the tier on.

## 5. Gentle architecture changes
- [ ] Split `runtime.ts` along what it already does (e.g. pacing and targets, drawing of bubbles and
      labels, speech and shouts, help and pause, results) into files under `src/game/runtime/`, with
      the same public surface for the modes; no behaviour change, tests green between each move.
- [ ] Shared pieces the world plans keep re-making (a catcher, a word panel, a copy row, a flight
      path, a walking hero on a path) as small helpers in `src/game/modes/kit/` where at least two
      modes use them; the modes keep their own story code.
- [ ] A short "how to add a world" section in `.specify/architecture.md`: the mode contract, the
      pictures list, background sets, i18n keys, tests to add, the performance budget (step 6).
- [ ] Remove dead code found by the analysis (unused exports, CSS classes, i18n keys, files).

## 6. Budget and guard
- [ ] Performance budget in `.specify/architecture.md`: on the slow profile p95 frame time at most
      33 ms (30 fps steady) in every story level, at most 20 ms on the normal profile; main chunk
      size; per-world download size.
- [ ] `scripts/perf.mjs` can run in budget mode and fails over budget; documented, not part of the
      normal `npm test` (it is slow), run before finishing any world plan (add the line to the
      "how to add a world" section).

## 7. Checks
- [ ] tsc, vitest, build, e2e `play.spec.ts`.
- [ ] Browser play-through (`?fast`, tester profile, `tapkoType`) of one level per built world and a
      placeholder level on the normal profile and with CPU throttling x 6 and the low-power tier:
      the game looks and plays the same, motion is smooth, nothing is missing.
- [ ] Final table before/after for every measured level in `## Findings`.

## Findings
(filled in while the plan runs)
