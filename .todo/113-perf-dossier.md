# 113 - Performance dossier (for the optimizer)

Read only this file and the `file:start-end` ranges it names. Numbers are from the baseline
traces (`scripts/perf.mjs`, headless Chromium, software canvas, no GPU). "ms/s" = milliseconds of
main-thread time per wall second (1000 = the thread never rests).

## How to read the traces of this game
- **`Commit` on the main thread is the canvas raster.** With a software canvas the 2D calls are
  recorded during the frame and rasterized when the frame is committed; that time lands in the
  trace event `Commit` (main thread), not under the JS function that issued the call. So the
  pixel cost of everything drawn on the stage (bands, sprites, labels, shadows, gradients, text)
  is `Commit`; the JS-side cost (`FunctionCall`) is call overhead plus a few synchronous natives
  (`drawImage` of a canvas source, `fillText`, `measureText`, `getImageData`).
- `VizCompositorThread` composites the page layers (stage canvas, words layer, front layer, DOM).
  On normal it runs 300 ms/s in space-1 (separate thread, but it limits the frame rate on a
  machine with few cores).
- `--machine slow` throttles the renderer's CPU x6 (raster included); `--low` = Simple graphics
  (scene canvas at 0.75 of the screen, words on their own full-resolution layer); `--lowres` =
  the second Automatic step (scene canvas at 0.5).
- The perf runs block the service worker and use a fresh profile, so the background download of
  every world's play pictures (`src/gfx/assets.ts:75-85`) runs during each measurement:
  `fetch`/`blob` 10-20 ms/s on slow. Real first visits do the same; later visits do not.

## Frame split per scene (main thread ms/s; slow = slow-low unless named)
Columns: Commit (canvas raster) | FunctionCall (script) | style recalc ms/s (recalcs/s, typical
elements) | Paint+PrePaint+Layout | GC. Normal = Full graphics at DPR 1.

| scene (mode) | normal | slow-low | slow-lowres |
|---|---|---|---|
| meadow-1 (meadow catcher) | 544 / 41 / 12 (23/s) / 22 / 44 | 388 / 198 / 45 (38/s, 1-3 el) / 70 / 3 | 212 / 221 / 48 / 81 / 33 |
| meadow-5 | 571 / 72 / 71 / 26 / 12 | 425 / 225 / 51 (33/s) / 90 / 22 | |
| space-1 (space) | 673 / 37 / 10 / 28 / 1 | 413 / 256 / 31 / 83 / 4 | |
| space-5 | 663 / 41 / 10 / 38 / 4 | 415 / 256 / 36 / 95 / 5 | |
| planet-2 (planet-crystals) | 108 / 43 / 14 / 48 / 1 | 370 / 241 / 57 (42/s) / 96 / 3 | |
| planet-3 (planet-roads) | 161 / 56 / 12 / 40 / 1 | 403 / 257 / 40 / 91 / 3 | |
| planet-5 (planet) | 166 / 49 / 12 / 43 / 1 | 411 / 255 / 37 (up to 96 el) / 100 / 4 | |
| valley-1 (dragons) | 99 / 64 / 12 (50/s) / 31 / 1 | 393 / 275 / 46 / 84 / 5 | |
| valley-3 (dragons) | 117 / 50 / 15 / 36 / 1 | 370 / 254 / 57 (up to 99 el) / 101 / 6 | 309 / 236 / 57 / 98 / 5 |
| valley-5 (dragons-flight copy row) | 109 / 52 / 16 / 24 / 2 | 382 / 263 / 54 / 94 / 4 | |
| junkyard-1 (junkyard) | 136 / 53 / 14 / 26 / 1 | 403 / 268 / 33 / 77 / 4 | |
| junkyard-4 (junkyard-wake ribbon) | 220 / 126 / 19 / 40 / 2 | 293 / 289 / 44 (up to 97 el) / 65 / 5 | 284 / 380 / 38 / 89 / 5 |
| junkyard-5 (junkyard-wake screens) | 326 / 51 / 13 / 44 / 1 | 351 / 318 / 41 / 93 / 3 | |
| placeholder (egg) | 187 / 55 / 8 / 19 / 2 | 407 / 286 / 29 / 75 / 3 | |
| range (aim) | 197 / 175 / 14 / 240 (1549 layouts) / 1 | 347 / 276 / 36 / 120 / 3 | |
| map | 4 / 8 / 21 (60/s, 16 el) / 26 / 1 | 37 / 38 / 216 (58/s, 16 el) / 248 PrePaint / 2 | |
| start | 6 / 8 / 20 (60/s, 16 el) / 31 / 0 | 47 / 31 / 202 (57/s, 16 el) / 116 Paint + 105 PrePaint + 53 Layerize | |

Reading: on normal the space and meadow scenes spend 540-670 ms/s rasterizing the canvas
(Full graphics, sub-pixel moving bands, glows); on slow-low every level is 300-430 ms/s raster
plus ~250 ms/s script, and busy 87-97 %. The map and the start page are idle screens yet keep
the slow main thread 78-84 % busy with CSS animation (style + prepaint/paint every frame).

## Frame stats now (best of two runs)
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

Cells: p50/p95 ms, L long tasks, B busy %. Over budget: slow-low junkyard-4 p95 83 (<= 80).

## Top JS functions by self time (slow-low, ms/s, `<` = caller chain)
- all levels: `drawBackground` drawImage 34-42 (`src/gfx/draw.ts:268-303` -> `tiled` 212-235 ->
  `fittedTile` 188-206); `Stage.begin`/`clear` setTransform+clearRect 6-8 (`src/engine/loop.ts:96-136`).
- labels: drawImage of cached label pictures 28-77 on the Simple words layer
  (`src/game/runtime/labels.ts:71-133` -> `src/gfx/draw.ts:462-485`; layer `src/engine/loop.ts:105-122`).
  junkyard-3 77, valley-3 44, meadow-5 42, space-5 36, planet-3 38, range 31.
- junkyard-4: ribbon 165 total: `faded()` offscreen mask copy 72-98 (`src/game/modes/kit/ribbon.ts:142-168`,
  redrawn every frame), `drawRibbon` 46-55 (175-258), `drawFrame` per-letter `measureText`+`fillText`
  38-74 (270-333, `wrapLines` 59-78 runs twice a frame).
- junkyard-5: `drawSource`/`drawTarget` per-word `fillText`+`measureText` of the monitors 120
  (`src/game/modes/junkyard-wake.ts:627-660`, monitor shadowBlur 10 in Full at 608-622).
- valley-5: `drawRow` 64 (`src/game/modes/kit/copy-row.ts:112-131`, plain words with fillText each frame).
- range: aim 791 strokeText/fillText 41+7 (`src/game/modes/aim.ts:769-830`); normal range: 1549
  layouts and Paint 163 ms/s (DOM written and read inside the frame: look at aim's render/update).
- meadow-1: sprites drawImage 35 (`src/game/modes/meadow.ts:572-606` -> `src/gfx/draw.ts:24-41`,
  catcher `src/game/modes/kit/catcher.ts:57-`).
- planet-2: crystals sprites 38 (`src/game/modes/planet-crystals.ts:279-`), update 16 (170-199).
- planet-3: `planet-roads.ts:469-495` 22. planet-5: `planet.ts:310-331` log 17+37.
- junkyard-1: callouts 15 (`src/game/runtime/callouts.ts:87-129`).
- HUD every frame: `accuracyRing().set` builds the ring SVG string and calls `t()` (split + lookup)
  before `measure().paint` compares the key: 8 ms/s normal, 15 slow (`src/ui/hud.ts:88-125`,
  called from `src/game/runtime.ts:1166-1180` `paintRings`; `t` in `src/i18n/i18n.ts:180-215`).
- per key: `evenness.ts:68` 13 (`src/game/evenness.ts`, from `runtime.ts:666`); Tapko mood
  `renderTapkoInto` rebuilds the `<img>` stack 10 (`src/game/runtime/tapko.ts:45-50,99-103` ->
  `src/gfx/tapko.ts:331-347`); hands `setAttribute` 10-21 (`src/ui/hands.ts:299-387`).
- `typing.ts:77-78` 15 per frame (space-5, valley-1: `src/game/typing.ts`), `mode.ts:107` 16
  (valley-3, meadow-5), `speed.ts:88` 17 (junkyard-3): game update helpers that run each step.

## Code path of a level frame (caller -> callee)
1. `src/engine/loop.ts:20-33` Loop: up to 4 update steps, then render, per rAF.
2. `src/game/runtime.ts:1057-1100` update: core, tweens, particles, mode.update, HUD (`paintRings` 1166-).
3. `src/game/runtime.ts:1132-1152` render: Tapko size, `covered` query (querySelector each frame,
   1124-1130), FrameWatch, still-frame skip, then:
   - `Stage.begin` clears the whole scene canvas (`loop.ts:96-99,131-135`);
   - `drawBackground` (`draw.ts:268-303`): still bands from the back into one backdrop copied with
     `copy`; moving bands `tiled` (212-235), sub-pixel in Full at DPR 1, whole pixels otherwise;
     `band` 321-356 (space: an extra full-screen rgba fill over the far band, 333-336);
   - friends, mode.render (sprites `drawSprite` draw.ts:24-41, `drawCached` 63-79 for glows);
   - labels: `Labels.draw` (`labels.ts:71-133`) onto `Stage.beginWords` (Full: the scene canvas;
     Simple: a full-screen canvas at the screen's DPR, only `last` area cleared);
   - particles (`src/engine/particles.ts:41-55`), callouts, `renderFront` onto a 640-unit front
     canvas cleared every frame (`loop.ts:125-129`), bubble placement (`tapko.ts:82-96`).
4. DOM per frame: keyboard guide next key (`src/ui/keyboard-guide.ts:256-294`), hands
   (`src/ui/hands.ts:299-387`, SVG path morph + opacity), HUD rings, Tapko `.tapko-stack` with a
   `breathe` CSS animation (`src/styles.css:705`).

## Big screens (DPR 2, Full) and the bands
- big meadow-1/5, space-1/5, range: Commit 950 ms/s, p50 67-83 ms; planet, valley, junkyard on
  the same machine hold 16.7. All three share moving bands of a 768 px high picture.
- `fittedTile` (`draw.ts:188-206`) returns the picture itself when the target height is at least
  the picture's height (DPR 1 at 768 px, every DPR 2 screen): then `tiled` (215-219) draws the
  band scaled and filtered with `w + 1` each frame instead of the 1:1 whole-pixel copy.
- space band 0 adds a full-screen `rgba(24,18,60,0.35)` fill (`draw.ts:333-336`) whenever the
  far band is not in the backdrop.

## Memory
- Ten levels opened and left: live canvases 6 -> 31, among them every level's stage
  (1366x455) and a 815x455 canvas detached but alive; heap 4.3 -> 5.9 MB. `Stage.dispose`
  (`loop.ts:138-143`) removes the canvases without freeing their pixels; who keeps the old
  stage alive is not traced yet.

## Loading (Fast 3G, cold)
- To the map 7.7 s: code 407 KB, data 261 KB (language + words), pictures 712 KB, other 183 KB.
  Level open 13.9 s with 2617 KB of pictures (valley-1).

## Idle screens (map, start)
- Map: CSS `infinite` animations - `.island-art > img` float with drop-shadow filter
  (`src/styles.css:772`), `.level-node.current` pulse of box-shadow (806, repaints),
  `.tapko-stack` breathe (705), compass swing via WAAPI (`src/screens/map.ts:380-392`).
- Start: sky clouds `filter: blur(2px)` + sail, stars `blur(1px)` + twinkle (573-575), butterflies
  (595-596), fireflies with box-shadow glows (621), gate logo float with drop-shadow (544);
  `src/ui/sky.ts` builds them (Simple already drops butterflies and fireflies).
- Both are 60 style recalcs/s of 16 elements; on slow 200+ ms/s style plus 100-250 ms/s
  prepaint/paint. Frames hold 16.7 ms, but the busy thread delays input and heats a weak laptop.

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
- SEO: `index.html`, about pages, robots, sitemap keep their head, text, links, lang,
  canonical/hreflang, structured data.
- No new dependencies, no store fields, no share-link or `.tapko` contract changes.

## Gates (Opus measures)
- slow-low or slow-lowres better in one scene beyond noise (p50 +-1 ms, p95 +-3 ms), or a
  better look with no slow scene worse; normal and big no scene worse; budgets: normal p50 <= 17,
  p95 <= 20; slow-low p50 <= 34, p95 <= 80.

## Already tried and dropped (do not retry)
- Opaque canvas without the clear: no measurable gain (plan 82).
- Sprites pre-scaled per size: not worth it, all sprites and labels under 13 % (plan 82).
- Label shadow cache while labels grow: done since as per-look label pictures (now cached).
- Replacing the end card's backdrop blur by a `filter` on the still scene: no gain (plan 90).
- Simple at 0.85 resolution: only slower; 0.75 kept (plan 90).
- Sub-pixel x for still bands: keeps the whole cost; still bands and DPR 2 snap (plan 82).

## Round 1, iteration 2 (step 2b): what is left on the canvas
Iteration 1 (P1-P4, P6-P9a) is in (commit 73dbe7a); line numbers below are of that code. Fresh
single-run traces (`.e2e/perf-113/r1b/`) on the scenes still at p95 50+ on slow:

| scene | slow-low p50/p95, busy | SL main ms/s: Commit / script / style / layout+paint / GC | slow-lowres p50/p95 |
|---|---|---|---|
| meadow-5 | 16.7/50.1, 97 % | 434 / 228 / 52 (35/s) / 89 / 10 | 16.7/66.6 (GC 53) |
| valley-3 | 16.7/50, 94 % | 367 / 242 / 59 (39/s) / 93 / 7 | 16.7/83.4 (GC 41, Paint 227) |
| valley-5 | 16.7/33.4, 95 % | 397 / 266 / 49 (39/s) / 83 / 6 | 16.7/50 (GC 52) |
| junkyard-3 | 16.7/49.9, 93 % | 445 / 224 / 30 / 71 / 8 | 16.7/66.7 (GC 41, style 139) |
| junkyard-4 | 33.2/66.6, 97 % | 442 / 260 / 42 / 91 / 2 | 16.7/50 |
| junkyard-5 | 16.7/50, 94 % | 366 / 236 / 44 / 107 / 11 | 16.7/33.4 |
| range | 16.7/66.7, 97 % | 303 / 372 / 33 / 106 / 17 | 16.7/50 |

(slow-lowres runs had host hiccups, long tasks up to 19 s; trust the ms/s split, not its p95.)
Commit (raster of the scene, words and front canvases) is still the largest share everywhere.

Hot spots now, slow-low self ms/s (SR = slow-lowres), caller -> callee:
- A. Backdrop copy, every level: `drawImage` of the still backdrop 20-37
  (`src/gfx/draw.ts:291-325` `drawBackground`, copy at 318-322, plus its per-frame key: `pics`
  map/join and the template string at 305-306). Each frame in Simple: `Stage.begin` clears the
  whole scene canvas (`src/engine/loop.ts:100-103,139-143`), then this full-screen copy, then the
  moving near band, sprites, Tapko. The still backdrop is re-rastered into the scene canvas every
  frame although its pixels never change.
- B. Label pictures: `drawImage` 41 (meadow-5), 36 SR (`src/game/runtime/labels.ts:74-146`
  `Labels.draw` -> `src/gfx/draw.ts:486-510` `drawWord`). The layer is redrawn whenever `look`
  changes (P3); in meadow-5 the labels move every frame, so it is redrawn every frame.
  `labels.ts:74` itself 5-18 (string `look` of every label every frame; `Array.from` in `clear`).
- C. Label measuring thrash: `measureText` 35 SR in junkyard-3 (`src/gfx/draw.ts:446-457`
  `letterWidths`, key `${size} ${word}`, cleared at MEASURED_MAX): a label whose size changes each
  frame (magnet plates; `labels.ts` shrink at 98-100) misses the cache every frame.
- D. Ribbon (junkyard-4): `drawRibbon` self 56-58 + its `fillText` 21 + `measureText` 8
  (`src/game/modes/kit/ribbon.ts:180-218`, `drawWords` 221-270): every frame measures each word,
  builds the plate with a clip, draws every word in sight; `drawFrame` 284- and `drawRune` 379- 13.
  `junkyard-wake.ts:292-321` update 17.
- E. Code monitors (junkyard-5): `drawTarget` 25-37 (`src/game/modes/junkyard-wake.ts:664-695`)
  rebuilds `written`, `breakLines` and the joined key every frame before the cached screen.
- F. Tapko drawn in the scene (`src/gfx/tapko.ts:242-` `drawTapko` from `src/game/modes/kit/hero.ts:76`):
  `tapkoStack` (46-) -> `slotOf` (41-43) runs `accessories().find` per accessory per frame, plus
  `accessories().filter` and new arrays: 15 in junkyard-5, 4-10 elsewhere.
- G. Range (aim): sprites `drawImage` 37 + `drawSprite` 19 (`src/game/modes/aim.ts:820-855`
  `drawTarget`, `drawStand` 957-984), `setTransform` 32 in `Stage.clear` (unusual: look whether
  aim's render leaves a costly state, e.g. a huge path or shadow, that the next clear pays for);
  speech bubble `drawSpeech` 26-30 + `measureText` 12.5 (`src/game/runtime/callouts.ts:93-107` ->
  `src/gfx/draw.ts:639-` `drawSpeech`, `speechLayout` 617-632): the bubble's path, tail and text
  are drawn every frame; it could be one cached picture per text, drawn scaled during its pop.
- H. Dragons (valley-3, valley-5): fire `draw` sprites 35-40 (`src/game/modes/dragons.ts:320-345`):
  radial glow gradient created and filled each frame + pit + 5 flame sprites each rotated/scaled.
- I. Meadow-5: `callouts.ts:79-85` update 14 (two `filter` arrays per frame), sprites
  `drawSprite` (`src/gfx/draw.ts:24-41`, `src/gfx/assets.ts:125`) 9.
- J. GC 40-53 ms/s on slow-lowres (meadow-5, valley-3, valley-5, junkyard-3): per-frame garbage
  from the strings and arrays above (A key, B `look`, E, F, I).
- Per key, not per frame: `evenness.ts:68-103` 8 (`allKept` copies arrays), keyboard guide 12
  (`src/ui/keyboard-guide.ts:256-`), hands `setAttribute` 4-16 (`src/ui/hands.ts:347-373`; round 2).
- Not this round: background picture downloads `fetch` 10-30 (`src/gfx/assets.ts:75-85`, P14,
  round 3); `runtime.ts:1125` `covered` querySelector (P10, round 2); Tapko DOM (P11, round 2).

Verdicts of iteration 1 (all kept, `.todo/113-perf-stats.md`): P1+P2 ribbon junkyard-4 SL p95
83 -> 67; P3 words layer SL p95 better in 4 scenes; P4+P6 big p50 67-83 -> 16.7; P7 monitors big
p50 33 -> 16.7; P8 copy row SR p95 50 -> 33; P9a range score normal busy 67 -> 41 %.

Constraints for this iteration: labels and the word in progress stay drawn every frame where they
move, as sharp as now; every cache keys on device scale (`g.getTransform().a`) and high contrast;
nothing changes what or when the child types; Full graphics must not look different; a new layer
(canvas or DOM) costs compositor time on every machine, so it must pay for itself on normal too.
