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

## Verdicts per change
(none yet)
