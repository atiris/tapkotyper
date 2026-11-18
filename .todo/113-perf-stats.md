# 113 - Performance stats

Measured by `scripts/perf.mjs` (headless Chromium, software canvas), batch script
`.e2e/perf-batch.mjs` (git-ignored, every configuration twice), table by `.e2e/perf-table.mjs`.
Noise: p50 +-1 ms, p95 +-3 ms, load +-5 %.

## Baseline (2026-11-17, commit 7fa8e4b)

Columns: normal = `--budget` (Full, DPR 1) | slow-low = `--machine slow --low` | slow-lowres =
`--machine slow --lowres` | slow-auto = `--machine slow --auto --hiccup` (graphics it ended on) |
big = `--machine big` (Full, 1920x1080 at DPR 2) | results = `--results` (the end card's 6 s).

| scene | normal | slow-low | slow-lowres | slow-auto | big | results |
|---|---|---|---|---|---|---|
| meadow-1 | 16.7/16.8 L22 B68 | 16.7/33.4 L28 B93 | 16.7/33.4 L27 B88 | 16.7/83.3 L76 B95 simple | 66.7/83.3 L472 B99 | 16.7/16.8 L16 B68 |
| meadow-5 | 16.7/16.8 L3 B79 | 16.7/66.6 L57 B97 | 16.7/50 L47 B96 | 16.7/116.6 L98 B98 simple | 66.7/83.4 L428 B99 | - |
| space-1 | 16.7/16.7 L1 B67 | 16.7/33.4 L29 B94 | 16.7/33.4 L30 B91 | 16.7/83.2 L74 B96 simple | 66.7/83.3 L455 B99 | - |
| space-5 | 16.7/16.8 L7 B68 | 16.7/50 L35 B96 | 16.7/33.4 L29 B93 | 16.7/100 L86 B97 simple | 66.7/66.8 L468 B100 | - |
| planet-2 | 16.7/16.7 L7 B27 | 16.7/50 L41 B94 | 16.7/49.9 L31 B90 | 16.7/66.6 L58 B96 simple | 16.7/16.8 L1 B55 | - |
| planet-3 | 16.7/16.8 L12 B31 | 16.7/50 L55 B94 | 16.7/33.4 L32 B87 | 16.7/66.7 L72 B96 simple | 16.7/66.7 L111 B84 | - |
| planet-5 | 16.7/16.8 L12 B31 | 16.7/50 L45 B96 | 16.7/33.4 L37 B92 | 16.7/66.6 L60 B96 simple | 16.7/16.8 L58 B74 | - |
| valley-1 | 16.7/16.8 L10 B25 | 16.7/49.9 L34 B96 | 16.7/33.4 L35 B93 | 16.7/66.7 L67 B97 simple | 16.7/33.3 L16 B67 | - |
| valley-3 | 16.7/16.8 L9 B26 | 16.7/66.6 L58 B95 | 16.7/49.9 L27 B94 | 16.7/66.7 L69 B97 simple | 16.7/33.3 L25 B79 | 16.7/16.7 L0 B18 |
| valley-5 | 16.7/16.7 L8 B24 | 16.7/50.1 L56 B95 | 16.7/49.9 L32 B93 | 16.7/66.7 L59 B97 simple | 16.7/16.8 L7 B72 | - |
| junkyard-1 | 16.7/16.8 L15 B27 | 16.7/33.4 L37 B91 | 16.7/33.4 L33 B90 | 16.7/50 L41 B95 simple | 16.7/16.8 L1 B76 | - |
| junkyard-2 | 16.7/16.7 L0 B19 | 16.7/50.1 L41 B97 | 16.7/49.9 L21 B93 | 16.7/50.1 L39 B97 simple | 16.7/16.8 L0 B80 | - |
| junkyard-3 | 16.7/16.7 L0 B18 | 16.7/50 L38 B97 | 16.7/33.5 L24 B91 | 16.7/66.7 L60 B97 simple | 16.7/16.8 L0 B71 | - |
| junkyard-4 | 16.7/16.8 L25 B44 | 33.3/83.3 L85 B92 | 33.3/66.6 L50 B98 | 33.3/83.3 L80 B98 lowres | 16.8/33.4 L1 B98 | - |
| junkyard-5 | 16.7/16.7 L0 B37 | 16.7/66.6 L61 B93 | 16.7/50 L26 B96 | 16.7/66.7 L76 B98 simple | 33.4/50 L1 B99 | - |
| placeholder | 16.7/16.7 L0 B23 | 16.7/50 L43 B82 | 16.7/33.4 L26 B93 | 16.7/50 L47 B97 simple | 16.7/16.8 L57 B73 | - |
| range | 16.7/16.8 L7 B67 | 16.7/66.7 L65 B90 | 16.7/50 L46 B95 | 16.7/83.4 L113 B97 simple | 66.7/83.4 L405 B100 | - |
| rhythm | 16.7/16.7 L1 B2 | 16.7/16.7 L0 B20 | 16.7/16.7 L1 B21 | 16.7/16.8 L5 B28 full | 16.7/16.8 L0 B2 | - |
| map | 16.7/16.7 L0 B9 | 16.7/16.8 L1 B78 | 16.7/16.8 L0 B77 | 16.7/16.8 L15 B79 full | 16.7/16.7 L0 B8 | - |
| start | 16.7/16.7 L0 B9 | 16.7/16.8 L0 B84 | 16.7/16.7 L0 B66 | 16.7/16.8 L15 B88 full | 16.7/16.8 L1 B11 | - |

Cells: p50/p95 ms (better of two runs), L long tasks, B main thread busy %.

- Over budget already: slow-low junkyard-4 p95 83.3 (budget 80) in both runs; normal meadow-1
  run 1 p95 50 (the first scene of a cold browser; run 2 16.8).
- slow-auto is worse than slow-low everywhere: Automatic plays its first 9 s in Full before it
  steps down (by design); junkyard-4 steps on to lowres, placeholder stayed Full in one run.
- big: meadow, space and range are raster-bound (Commit 95 % of the main thread, p50 67-83 ms).
- rhythm: busy 2 %, the script does not drive that scene into play (measurement gap).
- load (Fast 3G, cold, better run): to map 7.7 s (code 407 KB, data 261, pictures 712, other
  183), level open 13.9 s (pictures 2617 KB).
- leak (ten levels): heap 4.3 -> 5.9 MB, window listeners flat 38, stored 26 -> 29 KB, live
  canvases 6 -> 31 (each level leaves its stage 1366x455 and a 815x455 canvas detached and alive).
- Chunks (gzip KB): index 15.18, app 19.90, level 29.48, draw 25.35, map 11.64, CSS 30.15; modes
  egg 4.48, meadow 5.08, space 3.77, planet 4.84, planet-crystals 4.47, planet-roads 3.69,
  dragons 6.01, dragons-flight 7.45, junkyard 3.63, junkyard-wake 4.51, aim 8.70, rhythm 7.22.
- SEO guard copies: `.e2e/seo-guard/` (index, about pages, robots, sitemap, chunk list).


## Step 2, round 1 iteration 1 (P1-P4, P6-P9a together)

One run per configuration (`.e2e/perf-113/r1a/`): the host ran out of memory (another VM held
11 GB) and the batch was stopped after run 1 of normal, slow-low and slow-lowres; big and the
range normal row were measured alone afterwards (`--only`). Compared with the baseline's
better-of-two, so the gains are conservative.

| scene | normal | slow-low | slow-lowres | big |
|---|---|---|---|---|
| meadow-1 | 16.7/16.8 L0 B55 | 16.7/33.4 L24 B94 | 16.7/33.4 L18 B85 | 16.7/33.3 L0 B91 (was 66.7/83.3) |
| meadow-5 | 16.7/16.7 L0 B66 | 16.7/50 L41 B97 (was /66.6) | 16.7/50 L32 B95 | - |
| space-1 | 16.7/16.7 L0 B62 | 16.7/33.4 L24 B93 | 16.7/33.3 L16 B88 | - |
| space-5 | 16.7/16.8 L0 B66 | 16.7/33.4 L19 B95 (was /50) | 16.7/33.4 L24 B92 | 16.7/33.3 L1 B97 (was 66.7/66.8) |
| planet-3 | 16.7/16.8 L0 B24 | 16.7/33.4 L22 B87 (was /50) | 16.7/33.4 L24 B83 | - |
| valley-3 | 16.7/16.7 L0 B19 | 16.7/50 L30 B96 (was /66.6) | 16.7/49.9 L28 B92 | 16.7/16.8 L0 B70 (was /33.3) |
| valley-5 | 16.7/16.8 L0 B18 | 16.7/50 L40 B97 | 16.7/33.4 L23 B92 (was /49.9) | - |
| junkyard-3 | 16.7/16.8 L0 B18 | 16.7/50 L35 B96 | 16.7/33.4 L25 B90 | - |
| junkyard-4 | 16.7/16.7 L0 B27 | 33.3/66.7 L48 B98 (was /83.3) | 16.7/50 L23 B97 (was 33.3/66.6) | 16.7/33.4 L0 B97 |
| junkyard-5 | 16.7/16.7 L0 B18 | 16.7/50 L32 B92 (was /66.6) | 16.7/33.4 L8 B87 (was /50) | 16.7/16.8 L0 B77 (was 33.4/50) |
| range | 16.7/16.7 L2 B41 (was B67) | 16.7/50 L48 B97 (was /66.7) | 16.7/50 L37 B94 | 16.7/33.4 L1 B97 (was 66.7/83.4) |

Verdicts (all kept; no scene worse beyond noise; slow-low junkyard-4 back under the p95 80 budget):
- P1 ribbon ends without the mask copy + P2 frame text wrapped once: junkyard-4 slow-low p95
  83 -> 67, slow-lowres p50 33 -> 16.7. Look: the ends fade into the plate colour, not to see-through.
- P3 words layer only redrawn when the labels change (Simple): slow-low p95 better in
  meadow-5, space-5, planet-3, valley-3.
- P4 bands scaled once at every height + P6 space tint baked in: big meadow, space, range p50
  67-83 -> 16.7. Cost: one scaled canvas per band at the stage's device height (at most 12 M
  pixels each, else the old scaled draw), up to 4 kept.
- P7 junkyard-5 monitors cached per content: big p50 33 -> 16.7, slow p95 -16.
- P8 copy row cached: valley-5 slow-lowres p95 50 -> 33.
- P9a range score cached: range normal busy 67 -> 41 %, slow-low p95 67 -> 50.
- A run-1 range normal row of p95 133 was the host under memory pressure; alone it measured 16.7.

## Step 2b, round 1 iterations 2-3 (A-G, I, J; H not done)

Best of two runs (`.e2e/perf-113/r1c/`, normal from run 2 only: run 1's preview did not start);
big junkyard-5 and the look-check shots re-run alone after iteration 3 (`shots-r1c/`).
Compared with the baseline's better-of-two (`node .e2e/perf-table.mjs baseline r1c`).

| scene | normal | slow-low | slow-lowres | big |
|---|---|---|---|---|
| meadow-5 | 16.7/16.8 L0 B66 | 16.7/66.7 L60 B96 | 16.7/50.1 L50 B96 | 16.7/33.4 L1 B93 (+) |
| valley-3 | 16.7/16.8 L0 B18 | 16.7/50 L44 B96 (+) | 16.7/50 L41 B93 | 16.7/16.8 L0 B70 (+) |
| valley-5 | 16.7/16.7 L0 B17 | 16.7/50 L38 B96 | 16.7/33.4 L40 B92 (+) | 16.7/16.8 L0 B74 |
| junkyard-3 | 16.7/16.7 L1 B19 | 16.7/50 L37 B96 | 16.7/49.9 L36 B90 (-, noise: GC 36 -> 4 ms/s) | 16.7/16.8 L0 B71 |
| junkyard-4 | 16.7/16.8 L0 B24 | 33.3/66.6 L45 B98 (+) | 16.7/50 L43 B92 (+) | 16.7/16.8 L1 B91 (+, was 33.4) |
| junkyard-5 | 16.7/16.8 L9 B42 | 16.7/50 L43 B96 (+) | 16.7/33.4 L16 B88 (+) | 16.7/16.8 L0 B79 (+, was 33.3 before E's bezel cache) |
| range | 16.7/16.7 L0 B41 | 16.7/66.6 L52 B97 | 16.7/33.4 L28 B84 (+, was 50) | 16.7/33.4 L1 B97 (+) |

Single re-run after iteration 3 (shots run, no trace): slow-low junkyard-4 16.7/50, junkyard-5
16.7/33.4, range 16.7/33.5; big all p95 16.8 except range 33.4.

Verdicts (all kept; slow-low within noise against iteration 1, the GC gain counts for slow-lowres):
- A backdrop copy, B label pictures, C label measuring (sizes floored to half units so a resizing
  label hits the caches), I callout filters, J per-frame garbage: slow-lowres GC 36-53 -> 3-6 ms/s.
- D ribbon plate cached: junkyard-4 big p95 33.4 -> 16.8, slow-lowres p95 better.
- E monitors: bezel and letters as two cached pictures (iteration 3): big junkyard-5 p95 33.3 -> 16.8.
- F Tapko in the scene and G range sprites and speech bubble cached: range slow-lowres p95 50 -> 33.4.
- H dragons' fire glow not done; iteration 4 found nothing more (big junkyard-5 `restore` is the
  frame raster flushed early, not extra work).
- Look: junkyard-4, junkyard-5, range in normal, slow-low and big checked against `shots-r1a/`.

## Step 3, round 2 (page and styles): iteration 1 kept, iteration 2 reverted

Six scenes, best of two runs, `.e2e/perf-113/r2a/` (before) -> `r2b/` (after); style recalcs
and main-thread ms/s from the run-1 traces (`.e2e/trace-split.mjs`, `.e2e/trace-roots.mjs`).

| scene | normal | slow-low | slow-lowres | big | SL style recalcs/s, style ms/s |
|---|---|---|---|---|---|
| meadow-1 | 16.7/16.8 L0 B58 | 16.7/33.3 L16 B90 | 16.7/33.3 L20 B81 | 16.7/33.3 L1 B93 (noise, re-run 16.8) | - |
| space-5 | 16.7/16.7 L0 B60 | 16.7/33.5 L30 B94 | 16.7/33.4 L25 B92 | 16.7/33.4 L1 B97 | 27 -> 19, 36 -> 35 |
| valley-1 | 16.7/16.8 L0 B16 | 16.7/50 L43 B97 (noise, re-runs 33.3, 33.4) | 16.7/33.4 L26 B90 | 16.7/16.8 L0 B58 | 39 -> 23, 45 -> 37 |
| range | 16.7/16.7 L0 B37 | 16.7/49.9 L30 B96 | 16.7/33.4 L25 B91 | 16.7/33.4 L0 B94 | 24 -> 17 |
| map | 16.7/16.7 L0 B8 | 16.7/16.7 L0 B25 (was B70) | 16.7/16.7 L0 B27 (was B69) | 16.7/16.8 L0 B8 | 59 -> 8.5, 186 -> 9 |
| start | 16.7/16.7 L0 B8 | 16.7/16.8 L0 B72 (was B78, Full) | 16.7/16.7 L0 B22 (was B59, Simple) | 16.7/16.7 L0 B8 | 59 -> 59, 179 -> 147 |

Verdicts:
- P9b range progress bar slides by `translate` instead of animating `width`: normal range
  document layouts 1565 -> 196 in 30 s (layout+prepaint 33 -> 15 ms/s). Kept; a short fill now
  shows the greener end of the gradient.
- P10 HUD rings compare a number before building the SVG and calling `t()` (valley-1 SL `t` 15.6
  ms/s gone); `covered` looks the cards up only after a MutationObserver saw a change. Kept.
- P11 Tapko's mood swaps only the changed `<img>` src; the hop restarts by class, no forced
  layout (3-5 ms per mood change on slow); a hop still in the air finishes. Kept.
- P12 map (Simple: islands and the map Tapko still; Full: locked islands do not float): slow
  busy 70 -> 25 %, style 186 -> 9 and PrePaint 211 -> 17 ms/s. Start page: the other look's
  sky pieces stop 3 s after a theme change, fireflies one radial gradient instead of two blurred
  shadows (looked at: same glow), Simple sky still: slow-lowres busy 59 -> 22 %. Kept.
- Breathing of `.tapko-stack` off in Simple, levels included: level style recalcs down a third. Kept.
- p95 rows of 33 -> 50 (slow-low valley-1, big meadow-1) were trace noise: alone without a
  trace they measured 33.3/33.4 and 16.8.
- Iteration 2 reverted: own layer (`will-change`) for the player card's breathing character and
  the butterflies' trip as one `transform`: start slow-low busy 72 -> 70 %, Paint 104 -> 107
  ms/s, no gain. The start page in Full on a slow device not yet marked slow stays ~70 % busy;
  Fable's reading: the harness's own rAF tick forces a main frame each vsync, so composited
  animations are restyled and pre-painted anyway in these traces (a device already marked slow
  shows the start page in Simple).
