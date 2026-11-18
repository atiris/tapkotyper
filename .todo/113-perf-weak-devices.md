# 113 - Smooth play on weak devices (Fable optimizes, Opus measures)

Goal: every part of the game that costs frame time, load time or memory is gone through by an
optimization expert; slow devices play noticeably smoother, the graphics and effects look at least
as good (better where the budget allows), and nothing gets worse on fast devices or for crawlers.

Affected: `src/engine/`, `src/gfx/`, `src/game/runtime*`, `src/game/modes/**`, `src/ui/` (keyboard
guide, hands, HUD), `src/styles.css`, `src/app/` (start, about pages), `vite.config.ts`,
`scripts/perf.mjs`, `.specify/architecture.md` (Performance sections). No store fields, no contracts
of share links or `.tapko` files, no DB.

## Roles (fixed, no deviation)
Fable is expensive: it spends its tokens only on optimization thinking and edits. Everything else
(finding code, reading traces, measuring, testing, reverting, committing, docs) is Opus's work.
- **This session (Opus) is the orchestrator.** It measures, analyses the traces, prepares the
  dossier, runs every check, decides keep/revert by the gates, reverts, commits, updates specs. It
  does not design optimizations itself.
- **The dossier** `.todo/113-perf-dossier.md` (Opus writes it before Fable's first call of a
  step, under 250 lines), so Fable never has to search the repo:
  - per scene and machine the frame split from the traces: scripting / style recalc (count,
    elements) / layout / paint / raster-composite, the top 10 functions by self time with
    `file:line`, GC time, long tasks;
  - for each hot spot the code path in order (caller -> callee) as `file:start-end` ranges of the
    exact functions involved, with one line on what each does per frame;
  - the rules it must keep (architecture "Performance on slow computers", modes rules, gates
    below) condensed to bullets, and the list of earlier reverted ideas with their reasons;
  - the stats table of the current state.
- **The optimizer is a subagent on Fable:** `Agent({ model: "fable", subagent_type: "general-purpose" })`,
  one per step, continued with `SendMessage` inside the step (not relaunched). Its brief:
  - role: "expert in browser rendering performance (Canvas 2D software drawing, style recalcs,
    layout, GC, loading); improve smoothness on weak devices, keep or improve the look";
  - read only `.todo/113-perf-dossier.md` and the `file:start-end` ranges it names; open other
    code only when a change needs it, never search the tree broadly;
  - edit the files; no test runs, no `perf.mjs`, no builds (Opus runs them and reports back);
  - return per change: files, what it saves (which part of the frame), expected effect per
    machine, visual effect, risk; at most ~300 words, no code echoed back;
  - never commit, never add dependencies, never add `Co-Authored-By`, `Claude-Session` or other
    trailers anywhere.
- After each Fable batch Opus runs `npx tsc --noEmit` and `npm test` (type errors and red tests
  go back to Fable with the exact message, at most twice, then the change is reverted), measures,
  updates the stats, and sends Fable a short verdict per change (kept / reverted + numbers) for the
  next iteration. At most 4 iterations per step; stop earlier when an iteration gains less than
  noise.

## Measurement protocol (Opus)
- Build once per measurement batch, then `--no-build`. Run each configuration twice, take the
  better p50/p95 of the two as the row (headless noise); report a change only beyond noise:
  p50 +-1 ms, p95 +-3 ms, load +-5 %.
- Configurations (scenes: all of `SCENES` in `scripts/perf.mjs` unless the step narrows them):
  `--budget` (normal, Full) | `--machine slow --low --budget` | `--machine slow --lowres` |
  `--machine slow --auto --hiccup` (which step Automatic ends on) | `--machine big` (DPR 2) |
  `--load` | `--leak` | `--results` on meadow-1, valley-3.
- Also record: main chunk and each mode chunk size (gzip) from `vite build`, long tasks per scene,
  JS heap.
- SEO guard: after `npm run build`, keep a copy of `dist/index.html`, `dist/about/**/index.html`,
  `dist/robots.txt`, `dist/sitemap.xml`; a change that alters their `<head>`, visible text,
  links, `lang`, canonical/hreflang or structured data is reverted, unless it only reorders
  resource hints with equal content. `--load` first paint of the start page must not get worse.
- `.todo/113-perf-stats.md` holds: the baseline table, then one table per kept batch (scene x
  configuration: p50, p95, long tasks; load; chunk sizes) and a one-line verdict per change.
  Keep it under 200 lines: older batches collapse into one "after step N" table.

## Gates (a change is kept only if all hold)
- slow-low or slow-lowres improves in at least one scene beyond noise, or the look improves
  without any slow scene getting worse;
- normal and big: no scene worse beyond noise; budgets of `.specify/architecture.md` still met;
- SEO guard unchanged; main chunk not larger by more than 2 KB gzip without a measured gain;
- the game's pace, word timing, results, stars and lessons unchanged (architecture: "a slow
  computer gets the same lesson"); every mode still passes `src/game/modes/idle.test.ts`;
- every picture keeps its drawn fallback; labels stay as sharp as in Full.
A reverted change is listed in the stats file with its reason, so a later round does not retry it.

## Known leads (start here, not limits)
- Simple, slow: p95 50-80 ms in valley-1 and space-5 from style recalcs of ~207 level elements
  each time Tapko changes (`src/game/runtime/tapko.ts`) and the SVG hands' opacity transitions.
- Simple, slow: the sharp word-label layer (`src/engine/loop.ts` beginWords) costs 8-12 % main
  thread (meadow-1 at the 0.5 step 54 % busy vs 46 % with blurry labels); dirty-rect redraw of the
  scene canvas or labels as composited DOM may win it back.

## Proposals
From Fable's audit of the baseline dossier (estimates, not measurements; N normal, SL slow-low,
SR slow-lowres, B big).
- Decision: `big` (DPR 2, no GPU) stands for a high-DPI school Chromebook drawing in software, a
  weak device too, so a gain on big beyond noise counts for the first gate like a slow gain.
- Round 1 (canvas and pixels):
  - P1 ribbon ends without the per-frame mask copy (`kit/ribbon.ts` `faded`): SL/SR -80 ms/s, junkyard-4 under budget.
  - P2 ribbon frame text wrapped once per change, one `fillText` per line: SL/SR -30..60 ms/s.
  - P3 words layer redrawn only when the labels' look or place changes: SL/SR -30..70 ms/s in calm scenes.
  - P4 bands scaled once also when the screen is taller than the picture (DPR 2, 768 px stages): B p50 67-83 -> 17-33.
  - P6 space tint baked into the far band's copy: N/B -30..60 ms/s Commit (with P4).
  - P7 junkyard-5 monitors drawn once per content change (`drawCached`): SL/SR -80..100 ms/s.
  - P8 copy row (valley-5) cached per state: SL/SR -40..50 ms/s.
  - P9a range score text cached (`aim.ts`): SL -40 ms/s.
- Round 2 (page and styles):
  - P9b range: find the DOM read after write behind 1549 layouts and Paint 163 ms/s on N.
  - P10 HUD rings compare before building the SVG and calling `t()`; `covered` from a flag, not a per-frame query: -10..18 ms/s slow, all levels.
  - P11 Tapko mood without rebuilding the `<img>` stack, hop without a forced layout: SL/SR p95 -10..20 ms in valley-1, space-5.
  - P12 idle screens: blur and drop-shadow baked or held still, the current node's pulse without box-shadow repaint, Simple floats less: slow busy 78-84 % -> ~45 %.
- Round 3 (loading, memory, Automatic, looks):
  - P13 free canvas pixels on leaving a level and find who keeps old stages alive (canvases 6 -> 31 over ten levels).
  - P14 background picture downloads wait while a level is in play: slow first visit -10..20 ms/s.
  - P15 Automatic third step, scene at 30 Hz with words every frame: SL Commit about halved; look slightly less fluid, pace unchanged; only if rounds 1-2 leave slow scenes over budget.
- Dropped: P5 snapping fast-moving bands at DPR 1 in Full - gains only on normal and changes the
  motion look; the sub-pixel steps at DPR 1 are a deliberate look choice (architecture).

### Step 1 - Baseline and audit
- [x] Opus: full measurement batch (all configurations), SEO guard copies, write the
      baseline into `.todo/113-perf-stats.md`.
- [x] Opus maps every performance-relevant part (frame loop, stage and scaling, background bands,
      particles, tweens, glows, labels, each mode's draw, HUD/keyboard/hands DOM and CSS, cards and
      blur, start page and map, asset loading and the service worker, memory over levels) to its
      cost in the traces and writes the dossier, all areas, ranked by measured cost.
- [x] Fable (audit only, no edits, one call): from the dossier, a ranked list of proposals: cost
      now, expected gain per machine, risk, visual effect, which round.
- [x] Opus writes the list (one line each) under `## Proposals` in this plan, grouped into rounds
      1-3 below; proposals that break a gate are dropped with the reason.
- Checks: none beyond the measurement. Commit plan, stats, dossier.
- Notes: tools (git-ignored, local) `.e2e/perf-batch.mjs <label> [configs]` runs every
  configuration twice into `.e2e/perf-113/<label>/` (a full batch takes about 2.5 h; pass config
  names to narrow it); `.e2e/perf-table.mjs <label> [compare]` prints the best-of-two table;
  `MAPDIR=.e2e/dist-map/assets node .e2e/trace-split.mjs <trace>` splits a trace and maps the top
  functions to `src/` lines (rebuild `.e2e/dist-map` with `npx vite build --mode e2e --outDir
  .e2e/dist-map --sourcemap` after code changes); `.e2e/trace-threads.mjs` shows per-thread time.
  SEO guard copies and the chunk list are in `.e2e/seo-guard/`. In these traces the main
  thread's `Commit` event is the software canvas raster (the dossier explains it).

### Step 2 - Round 1: canvas and pixels (scenes, bands, labels, particles, glows)
- [x] Opus refreshes the dossier for the round (only its hot spots and ranges, current numbers).
- [x] Fable implements the round-1 proposals in iterations; Opus checks and measures slow-low,
      slow-lowres, normal, big on the scenes they touch; keep/revert per gate.
- Checks per iteration: `npx tsc --noEmit`, `npm test`; at the end `npm run test:affected`.
  Commit kept changes with the stats update.
- Progress: iteration 1 landed all of P1-P4, P6-P9a in one batch, all kept (stats file, "Step 2,
  round 1 iteration 1"); tsc, unit suite and test:affected (36 e2e) green; screenshots of the
  changed scenes (normal, slow-low, big) judged clean. Decisions: the host ran low on memory
  (another VM held 11 GB) and stopped the batch after run 1 of normal/slow-low/slow-lowres, so
  big and the range normal row were measured alone with `--only`; single runs against the
  baseline's better-of-two are conservative. P4 accepted with its memory cost (one scaled canvas
  per band, at most 12 M pixels, 4 kept) for big p50 67-83 -> 16.7. `scripts/perf.mjs --shot`
  added (a picture of each scene at its end) for look checks; `.e2e/perf-batch.mjs` takes
  `ONLY=<scenes>`. The further iterations went to step 2b, as this session was long.

### Step 2b - Round 1, iteration 2: what is left on the canvas
- [x] Opus traces slow-low and slow-lowres again on the scenes still at p95 50 (meadow-5,
      valley-3, valley-5, junkyard-3, junkyard-4, junkyard-5, range; `.e2e/trace-split.mjs`),
      refreshes the dossier's round-1 section with the new top functions and Commit share, and
      gives Fable (new agent) the verdicts of iteration 1 for a second batch of canvas changes;
      up to 3 iterations, stop when one gains less than noise. Same checks and commit as step 2.
- Progress (2026-11-18): traces in `.e2e/perf-113/r1b/`, dossier section "Round 1, iteration 2"
  written; Fable iteration 2 (A, B, C, D, E, F, G, I, J; H not done) and iteration 3 (E monitor
  bezel and letters as two cached pictures, fixing big junkyard-5 p95 33.3 -> 16.8) are in the
  working tree; iteration 4 found nothing more (big junkyard-5 `restore` 544 ms/s is the frame
  raster flushed early, not extra work). Measured `.e2e/perf-113/r1c/` (2 runs; normal run 1
  failed to start the preview, its stale json deleted): GC on slow-lowres 36-53 -> 3-6 ms/s,
  slow-lowres p95 better in 5 scenes (range 50 -> 33.4), slow-low within noise, normal same,
  big junkyard-4 33.4 -> 16.8. tsc and unit suite green. Decision: C floors label sizes to
  half units (a resizing label stopped missing the measure and picture caches).
  `npm run test:affected` green (30 e2e). Look check of junkyard-4, junkyard-5, range in normal,
  slow-low and big (`.e2e/perf-113/shots-r1c/` against `shots-r1a/`, subagent verdict): no defects;
  a re-run confirmed big junkyard-5 p95 16.8. Stats table "Step 2b" written. H (dragons fire glow)
  left for a later round if valley-3/valley-5 stay over budget.

### Step 3 - Round 2: page and styles (HUD, keyboard guide, hands, Tapko, cards, map, start)
- [x] Same loop (dossier refresh first) for round-2 proposals; include style recalc counts from
      the traces in the table.
- Checks as step 2. Commit.
- Progress (2026-11-18): dossier rewritten under 250 lines (round 1 collapsed, round-2 hot spots
  K-S). Traces of six scenes (meadow-1, space-5, valley-1, range, map, start) in four
  configurations: `.e2e/perf-r2.mjs <label>` (git-ignored, ONLY=, RUNS=, NOBUILD=) into
  `.e2e/perf-113/r2a` (before), `r2b` (iteration 1), `r2c` (iteration 2); new local tools
  `.e2e/trace-layouts.mjs` (who schedules style/layout) and `.e2e/trace-roots.mjs` (layout roots).
  Iteration 1 (P9b, P10, P11, P12 + breathe off in Simple) kept: map slow busy 70 -> 25 %, start
  in Simple 59 -> 22 %, range normal layouts 1565 -> 196. Iteration 2 (start page in Full) gained
  nothing and was reverted, which ends the loop. Decisions: the progress bar's gradient now
  belongs to the whole bar (a short fill shows its greener end); a Tapko hop in the air finishes
  instead of restarting; locked islands on the map do not float in Full; Q/R (keyboard guide,
  hands) left as they are (cheap per key). Browser check: fireflies (dark start), map, a meadow
  level (hop, mood pictures, bar) fine, no console errors.

### Step 4 - Round 3: loading, memory, Automatic graphics, looks
- [ ] Same loop (dossier refresh first) for round-3 proposals: first load and level open (`--load`), heap (`--leak`),
      whether Automatic picks the right step on each machine (`--auto --hiccup`), and visual
      improvements (effects, glows, motion) that the budget now allows on normal/big, never at
      the cost of slow.
- Checks as step 2, plus the SEO guard. Commit.

### Step 5 - Full verification and close
- [ ] Full measurement batch, final table vs baseline at the top of the stats file.
- [ ] `npm run build`, `npm test`, the whole e2e suite (`npx playwright test`), SEO guard.
- [ ] Browser check with the Playwright MCP: start page, map, meadow-1, valley-3 in Full and
      Simple; screenshots only for scenes whose drawing changed (subagent returns a verdict).
- [ ] Update `.specify/architecture.md` "Performance on slow computers" with what is now true
      (WHAT/WHY); adjust the budget numbers only if they got stricter.
- [ ] Move plan, stats and dossier to `.todo/.done/`, `## Done - <date>`, leftovers to `BACKLOG.md`,
      remove the `QUEUE.md` line.
