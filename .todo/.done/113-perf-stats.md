# 113 - Performance stats

Measured by `scripts/perf.mjs` (headless Chromium, software canvas), batch script
`.e2e/perf-batch.mjs` (git-ignored, every configuration twice), table by `.e2e/perf-table.mjs`.
Noise: p50 +-1 ms, p95 +-3 ms, load +-5 %.

Columns: normal = `--budget` (Full, DPR 1) | slow-low = `--machine slow --low` | slow-lowres =
`--machine slow --lowres` | slow-auto = `--machine slow --auto --hiccup` (graphics it ended on) |
big = `--machine big` (Full, 1920x1080 at DPR 2) | results = `--results` (the end card's 6 s).
Cells: p50/p95 ms, L long tasks, B main thread busy %; **+** better / **-** worse than the baseline
beyond noise.

## Final (2026-11-18, commit b834f71) against the baseline

`.e2e/perf-113/final/` (`node .e2e/perf-table.mjs baseline final`). Run 1 of every configuration;
run 2 only of normal and slow-auto: the host ran low on memory (two other agents' WSL VM held
11 GB) and the batch was stopped. Single runs against the baseline's better-of-two are
conservative.

| scene | normal | slow-low | slow-lowres | slow-auto | big | results |
|---|---|---|---|---|---|---|
| meadow-1 | 16.7/16.7 L0 B55 | 16.7/33.3 L9 B84 | 16.7/33.3 L17 B81 | 16.7/66.6 L69 B87 simple **+** | 16.7/33.3 L1 B93 **+** | 16.7/16.7 L0 B57 |
| meadow-5 | 16.7/16.7 L0 B63 | 16.7/50 L24 B97 **+** | 16.7/33.4 L12 B89 **+** | 16.7/83.3 L79 B95 simple **+** | 16.7/33.4 L1 B98 **+** | - |
| space-1 | 16.7/16.7 L0 B57 | 16.7/33.3 L7 B89 | 16.7/33.3 L5 B79 | 16.7/66.7 L89 B85 simple **+** | 16.7/16.8 L0 B96 **+** | - |
| space-5 | 16.7/16.8 L0 B61 | 16.7/33.4 L19 B95 **+** | 16.7/33.3 L7 B81 | 16.7/66.7 L56 B96 simple **+** | 16.7/33.3 L0 B97 **+** | - |
| planet-2 | 16.7/16.7 L0 B15 | 16.7/33.3 L11 B84 **+** | 16.7/33.3 L10 B76 **+** | 16.7/49.9 L33 B90 simple **+** | 16.7/16.8 L0 B57 | - |
| planet-3 | 16.7/16.7 L0 B23 | 16.7/33.4 L16 B85 **+** | 16.7/33.2 L10 B70 | 16.7/33.5 L29 B87 simple **+** | 16.7/16.8 L0 B70 **+** | - |
| planet-5 | 16.7/16.7 L0 B20 | 16.7/33.4 L16 B90 **+** | 16.7/33.3 L13 B77 | 16.7/50 L36 B91 simple **+** | 16.7/16.8 L0 B70 | - |
| valley-1 | 16.7/16.7 L0 B17 | 16.7/33.3 L8 B91 **+** | 16.7/33.3 L6 B81 | 16.7/49.9 L36 B96 simple **+** | 16.7/16.8 L0 B59 **+** | - |
| valley-3 | 16.7/16.8 L0 B19 | 16.7/33.4 L18 B93 **+** | 16.7/33.3 L7 B86 **+** | 16.7/50 L36 B93 simple **+** | 16.7/16.7 L0 B65 **+** | 16.7/16.8 L0 B18 |
| valley-5 | 16.7/16.7 L0 B17 | 16.7/33.3 L5 B85 **+** | 16.7/33.3 L9 B83 **+** | 16.7/50 L32 B93 simple **+** | 16.7/16.7 L0 B69 | - |
| junkyard-1 | 16.7/16.7 L0 B17 | 16.7/33.4 L14 B93 | 16.7/33.3 L9 B80 | 16.7/33.4 L22 B90 simple **+** | 16.7/16.8 L0 B67 | - |
| junkyard-2 | 16.7/16.7 L0 B19 | 16.7/33.4 L11 B94 **+** | 16.7/33.3 L10 B77 **+** | 16.7/50 L31 B94 simple | 16.7/16.8 L0 B78 | - |
| junkyard-3 | 16.7/16.7 L0 B18 | 16.7/33.4 L14 B87 **+** | 16.7/33.3 L18 B81 | 16.7/49.9 L35 B92 simple **+** | 16.7/16.7 L0 B68 | - |
| junkyard-4 | 16.7/16.7 L0 B23 | 16.7/50 L20 B97 **+** | 16.7/33.4 L15 B95 **+** | 16.7/50.1 L44 B95 simple **+** | 16.7/16.8 L0 B87 **+** | - |
| junkyard-5 | 16.7/16.7 L0 B19 | 16.7/33.4 L7 B92 **+** | 16.7/33.2 L1 B75 **+** | 16.7/33.4 L25 B92 simple **+** | 16.7/16.8 L0 B80 **+** | - |
| placeholder | 16.7/16.7 L0 B25 | 16.7/33.4 L9 B94 **+** | 16.7/33.3 L13 B84 | 16.7/33.4 L25 B92 simple **+** | 16.7/16.8 L0 B74 | - |
| range | 16.7/16.7 L0 B38 | 16.7/33.4 L24 B93 **+** | 16.7/33.4 L19 B85 **+** | 16.7/83.2 L106 B97 simple | 16.7/33.4 L1 B97 **+** | - |
| rhythm | 16.7/16.7 L0 B2 | 16.7/16.8 L0 B16 | 16.7/16.7 L0 B13 | 16.7/16.8 L4 B27 full | 16.7/16.8 L0 B2 | - |
| map | 16.7/16.7 L0 B8 | 16.7/16.7 L0 B21 | 16.7/16.8 L0 B20 | 16.7/16.8 L18 B69 full | 16.7/16.7 L0 B9 | - |
| start | 16.7/16.7 L0 B9 | 16.7/16.8 L0 B68 | 16.7/16.7 L0 B16 | 16.7/16.8 L18 B62 full | 16.7/16.8 L0 B9 | - |

- No cell worse beyond noise. slow-low p95 at most 50 everywhere (baseline 33-83, junkyard-4 over
  the 80 budget); big p50 16.7 everywhere (baseline 67-83 in meadow, space, range); long tasks on
  slow a third to a half of the baseline.
- slow-auto run 1 space-1 p95 99.9 was noise: run 2 measured 66.7. meadow-5 83.3 and range 83.2
  stay just over 80 in slow-auto only (Automatic plays its first 9 s in Full by design; baseline
  116.6 and 83.4).
- Load (Fast 3G, cold): to map 7.29 s (baseline 7.7), level 14.43 s (13.9 baseline single best,
  14.41 before round 3; level pictures 2677 KB vs 2617): unchanged within noise.
- Leak (ten levels): heap 4.3 -> 5.8 MB, listeners flat 38, stored 26 -> 29 KB, live canvases
  4 -> 14, all bounded caches (baseline 6 -> 31 with every left stage alive).
- Chunks (gzip KB): index 15.18 -> 15.19, app 19.90 -> 20.07, level 29.48 -> 29.80, draw 25.35 ->
  25.88, map 11.64 -> 11.61, CSS 30.15 -> 30.26. SEO guard: index, about pages, robots, sitemap unchanged except the
  build stamp.
- Budget numbers in `.specify/architecture.md` kept: slow-low p95 sits at 33 or 50 (two or three
  frames) per run, so a 50 ms budget would flap on noise.

## Baseline (2026-11-17, commit 7fa8e4b)

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

- rhythm: busy 2 %, the script does not drive that scene into play (measurement gap).
- SEO guard copies: `.e2e/seo-guard/` (index, about pages, robots, sitemap, chunk list).

## Verdicts per round (round tables in `.e2e/perf-113/r1a` ... `r3c`)

Round 1, canvas and pixels (all kept):
- P1 ribbon ends without the mask copy + P2 frame text wrapped once: junkyard-4 slow-low p95 83 -> 67.
  Look: the ends fade into the plate colour, not to see-through.
- P3 words layer only redrawn when the labels change (Simple): slow-low p95 better in calm scenes.
- P4 bands scaled once at every height + P6 space tint baked in: big meadow, space, range p50
  67-83 -> 16.7. Cost: one scaled canvas per band (at most 12 M pixels, else the old draw), 4 kept.
- P7 junkyard-5 monitors cached per content, P8 copy row cached, P9a range score cached.
- A backdrop copy, B label pictures, C label measuring (sizes floored to half units), I callout
  filters, J per-frame garbage: slow-lowres GC 36-53 -> 3-6 ms/s.
- D ribbon plate cached, E monitor bezel and letters as two cached pictures, F Tapko in the scene
  and G range sprites and speech bubble cached: big junkyard-4/-5 p95 33 -> 16.8, range SR p95 50 -> 33.

Round 2, page and styles (iteration 1 kept, iteration 2 reverted):
- P9b range progress bar slides by `translate`: normal range layouts 1565 -> 196 in 30 s; a short
  fill now shows the greener end of the gradient.
- P10 HUD rings compare before building the SVG and calling `t()`; `covered` after a MutationObserver.
- P11 Tapko's mood swaps only the changed `<img>` src, the hop restarts by class without a forced layout.
- P12 map (Simple: islands and map Tapko still; Full: locked islands do not float): slow busy
  70 -> 25 %. Start page: other look's sky stops 3 s after a theme change, fireflies one radial
  gradient, Simple sky still: slow-lowres busy 59 -> 22 %. `.tapko-stack` breathing off in Simple.
- Reverted: own layer (`will-change`) for the player card's character and the butterflies' trip
  as one `transform`: no gain (the harness's rAF tick forces a main frame each vsync).

Round 3, loading, memory, Automatic (iteration 1 kept, iteration 2 reverted):
- P13 the sound and fullscreen buttons share one module listener (the per-button closure kept
  every left level alive); `Stage.dispose` sets its canvases to 0x0. `--leak` releases its
  `queryObjects` lists (they inflated the canvas count).
- U (replaces P15): Automatic also steps down from Full when every watched part has at least
  2.5 % of frames over 42 ms; every slow level scene now ends in Simple, normal and big never step down.
- P14 not done: background downloads already wait for a level's pictures at low priority;
  pausing them in play would slow the next cold level.
- Reverted: H, dragons' fire glow as a cached picture and upright flames in Simple: no gain
  beyond noise and a look change in Simple.
