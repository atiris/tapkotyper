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

## Round 2: page and styles (step 3)
Fresh traces `.e2e/perf-113/r2a/` (run 1) on meadow-1, space-5, valley-1, range, map, start.

| scene | normal p50/p95 busy | slow-low p50/p95 busy | SL main ms/s: Commit / script / style (recalcs/s, el) / layout+prepaint+paint |
|---|---|---|---|
| meadow-1 | 16.7/16.7 56 % | 16.7/33.3 89 % | 396 / 233 / 40 (41/s, 1-24) / 74 |
| space-5 | 16.7/16.7 59 % | 16.7/33.4 95 % | 447 / 239 / 36 (27/s, 1-30) / 85 |
| valley-1 | 16.7/16.7 15 % | 16.7/33.4 96 % | 403 / 260 / 45 (39/s, 2-23) / 85 |
| range | 16.7/16.7 35 % | 16.7/50 96 % | 427 / 249 / 36 (24/s, 1-97) / 102 |
| map | 16.7/16.8 8 % | 16.7/16.7 70 % | 37 / 80 / 186 (59/s, 16 el) / 211 PrePaint |
| start | 16.7/16.8 8 % | 16.7/16.8 78 % | 48 / 76 / 179 (59/s, 16 el) / 94 PrePaint + 104 Paint + 52 Layerize |

The idle screens are the largest round-2 cost: on slow the thread is 70-78 % busy doing nothing
but CSS animation (style + prepaint + paint every frame, no JS). In levels style is 36-45 ms/s,
almost all of it from CSS animations (no JS stack), and layout+paint 74-102 ms/s.

Hot spots, caller -> callee (self ms/s, SL = slow-low, N = normal):
- K. Range progress bar (P9b, found): N 1565 document layouts + 1573 HitTests in 30 s (52/s,
  248 + 287 ms), every one without JS. The range's progress is time-based (`aim.ts:1164-1166`
  `progress()` = time / AIM_SECONDS), so `runtime.ts:1088-1095` writes
  `progressFill.style.width` about every 0.3 s and `.progress-fill` (`src/styles.css:1013`) has
  `transition: width 0.3s ease` (none in Simple, 643): in Full the width is always animating, a
  layout of the whole document plus a hover hit test each frame. Levels where progress moves by
  targets pay the same only during each 0.3 s step (meadow-1 N 133 such layouts).
- L. Idle map (P12): `src/styles.css` `.island-art > img` float + `filter: drop-shadow` (772,
  delays 773-776), `.level-node.current` pulse (806-808, scale on an element with a 4 px
  box-shadow ring), `.tapko-stack` breathe (705-706) on the map Tapko, `.surprises-box`
  jump-small (748), compass needle WAAPI rotate (`src/screens/map.ts:375-392`, a 2.6 s swing
  every 10-30 s). 59 recalcs/s of 16 elements = every animated element every frame; SL style 186
  + PrePaint 211 ms/s, Commit 37. Normal 8 % busy.
- M. Idle start page (P12): `src/ui/sky.ts:34-` builds the sky; CSS `src/styles.css:544`
  gate logo float + drop-shadow, 551-627 sky clouds `filter: blur(2px)` + sail (573, 578),
  stars `blur(1px)` + twinkle (575, 579), butterflies (595-596), fireflies with two box-shadow
  glows animated by drift + glow (621); Simple drops butterflies, fireflies and the blur
  (629-631). Profile cards' `.tapko-stack` breathe (705, one per player). SL style 179 + Paint
  104 + PrePaint 94 + Layerize 52 ms/s.
- N. HUD rings every frame (P10): `src/game/runtime.ts:1167-1178` `paintRings` ->
  `src/ui/hud.ts:107-119` `accuracyRing().set` builds `fillRing` + `roundTextSvg` strings and
  calls `t('level.accuracy')` (`src/i18n/i18n.ts:211-`) before `measure().paint` (91-104)
  compares the key; same in `rhythmRing` (122-132) and `speedRing` (135-). SL valley-1: `t` self
  15.6 ms/s from hud.ts:112.
- O. `covered` getter every frame (P10): `src/game/runtime.ts:1125-1130` runs
  `querySelector(':scope > .overlay:not(.peek)')` and reads/toggles the class, called from
  `render` 1134-1135 and `watchFrames` 1110. SL 3.6-5 ms/s. Overlays are added and removed by the
  runtime's cards (grep `overlay` in `src/game/runtime.ts` and `src/game/runtime/`).
- P. Tapko mood (P11): `src/game/runtime/tapko.ts:47-51` `setMood` -> `show` (95-99) ->
  `renderTapkoInto` (`src/gfx/tapko.ts:340-355`) replaces every `<img>` of the stack (new
  elements, decode, restyle and layout of the level); a happy mood then `replay('jump')`
  (102-105) reads `offsetWidth` = a forced style + layout: SL valley-1 8 of them cost 39 + 12
  ms, space-5 15 cost 45 ms (3-5 ms each on slow). Mood changes on right/wrong keys and words.
  `.level-tapko` has a `drop-shadow` filter in Full (`src/styles.css:1028`, none in Simple 637)
  and its `.tapko-stack` breathes (705) all the time.
- Q. Keyboard guide per key: `src/ui/keyboard-guide.ts:256-` `show` -> `paintLetter`/`draw`:
  46-58 style schedules + 54-72 layout invalidations in 30 s, cheap per key (no forced layout).
- R. Hands per key: `src/ui/hands.ts:347-373` `draw` setAttribute 4-5 ms/s SL; partial layout of
  the `svg.kb-hands` (24 layouts, 59 ms in valley-1 SL, 2.5 ms each); fade by opacity
  transitions in Full (`.kb-hands .hand-pose`, none in Simple 644).
- S. Per-frame CSS animations inside a level (no JS stack; SL style 36-45 ms/s, ~1 recalc per
  frame of 1-2 elements): `.tapko-stack` breathe on the level Tapko (705), the bubble's animation
  in Full (`.stage-wrap > .bubble`, none in Simple 638), `.kb-key.next` key-glow in Full (1074,
  none in Simple 641), `.round-btn.timer.ending` blink (274).

Ideas from the audit to check against the code (Fable decides): animate only transform/opacity
(composited) or hold still where nothing is lost, bake drop-shadows/blur into the pictures or
static layers, `transform: scaleX` for the progress bar instead of width, compare before
building HUD strings, a flag for `covered` set where overlays come and go, swap Tapko's mood by
toggling prepared layers or `src` instead of rebuilding, restart the hop without a forced layout
(e.g. Web Animations API).

## Memory (round 3)
- Ten levels opened and left: live canvases 6 -> 31, among them every level's stage
  (1366x455) and a 815x455 canvas detached but alive; heap 4.3 -> 5.9 MB. `Stage.dispose`
  (`src/engine/loop.ts`) removes the canvases without freeing their pixels; who keeps the old
  stage alive is not traced yet. P4 added up to 4 scaled band canvases (at most 12 M px each).

## Loading (round 3, Fast 3G, cold)
- To the map 7.7 s: code 407 KB, data 261 KB (language + words), pictures 712 KB, other 183 KB.
  Level open 13.9 s with 2617 KB of pictures (valley-1).
