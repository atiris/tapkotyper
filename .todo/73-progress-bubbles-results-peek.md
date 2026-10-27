# 73 - Fair progress bar, one-piece speech bubbles, peek under the results, drifting near band

Global fixes the owner asked for on 2026-10-27 while playing the rocket world. Plans 74 (rocket
world) and 75 (meadow) build on them: 74 moves its rocket by the same fair share, and both use
the background drift.

Affected: `src/game/levels.ts` (`shownProgress`), `src/game/runtime.ts`, `src/game/mode.ts`,
`src/gfx/draw.ts` (`drawSpeech`, `drawBackground`), `src/screens/level.ts` (every results card),
`src/styles.css`, `.specify/`. No store or data changes.

## 1. The progress bar never runs ahead of the words

**What is wrong:** in calm levels that need a number of words (rocket hop, rocket commands, the
meadow's dew drops) and in the boss level, the bar ran almost to the end on time alone and then
stood still, waiting for the last words. Or the quota was met fast and the bar waited for the
time. The cause is `shownProgress` in `src/game/levels.ts`: `max(min(mode, time), time * TIME_SHARE)`.
Its time floor alone fills 95 % of the bar.

**What it must do:** the bar shows the smaller of the two shares, the words done and the minimum
time played. It never moves faster than the slower of them. It ends exactly when the level ends
(`levelOver`: the mode is finished and the minimum time is reached).

- [ ] `shownProgress(mode, active, min)` = `min(mode, active / min)`, with `min <= 0` -> `mode`.
      Drop `TIME_SHARE`. Update the doc comment and `levels.test.ts` / `progress.test.ts`
      (cases: quota met early -> bar follows time; time met early -> bar follows words; both ->
      1).
- [ ] The runtime keeps the bar from going back (it already does with `progressPct`). When the
      level grows (`grownCount`, slips in `CopyRow`), the mode's share drops and the bar holds
      still for a moment. That is fine, because it never runs ahead. Check that no mode's
      `progress()` returns 1 before its `finished` (AsteroidMode counts bigs: it may only reach 1
      when the last big rock is gone).
- [ ] Expose the same share to modes as `L.share()` (a getter on `LevelRuntime` returning
      `shownProgress(...)` of now, unclamped by `progressPct`), so plan 74's rocket can approach
      by it. Use it for the super help host too (it already calls `shownProgress`).
- [ ] Every place that combines a time and a count share uses this one function. Search
      `minActive`, `played /`, `TIME_SHARE` and `progress()`.

## 2. Speech bubbles: the tail is one piece with the plate

**What is wrong:** `drawSpeech` in `src/gfx/draw.ts` fills and strokes the rounded plate, then
fills and strokes the tail triangle on its own, then paints a plate-colored line over the seam.
A thin line between the tail and the plate stays visible (the rocket's and the meteors' bubbles,
every `L.speak`).

**What it must do:** the plate and the tail are one outline: one path, filled once and stroked
once, with no seam and no cover line.

- [ ] Build one path: walk the rounded rectangle and, on the edge where the tail starts
      (top, bottom, left or right, as now), leave the edge at `base - half`, go to the tip, come
      back at `base + half` and continue. Fill it, then stroke it. Remove the separate triangle
      and the "cover the edge line" stroke.
- [ ] Keep the tail's base clamped away from the corners (as now), so the path never cuts a corner arc.
- [ ] A unit-free check in the browser: a bubble with its tail down, up, left and right, at
      zoom 2x, shows no line across the tail's base.

## 3. Peek under the results

**What it must do (everywhere a level ends with a card):** Esc, or a round X in the card's top
right, hides the results card and its dimming. The last frame of the game stays visible under
it, with Tapko, the scene and the targets as they were. Any other key, or a click on the stage,
brings the card back exactly as it was, with the same focus. A second Esc while peeking does what Esc did on the
card before (back to the map), so a keyboard-only child is never stuck.

- [ ] One helper in `src/screens/level.ts`, e.g. `peekable(overlay, card)`, used by every
      results card (level, practice, aim, parrot, stay; search `class: 'overlay results'` and
      `results-top`). It adds the round X (the shared `closeButton` from `src/ui/dom.ts`, as every
      popup has) and the key handling. It replaces the current Escape -> `toMap()` handler in
      each card.
- [ ] Peeking: the overlay gets a `peek` class (`visibility: hidden` on the card, no backdrop).
      The canvas keeps rendering the last state. Check that the runtime still draws after
      `finish()`, and that end animations do not restart.
- [ ] Any key but Esc and the modifier keys (Shift, Alt, Control, Meta) during peek: remove
      `peek`, refocus the button that had focus. The key is swallowed (no typing, no second
      action).
- [ ] e2e: extend the results test (search `e2e/` for the results overlay): Esc hides the card,
      the canvas is visible, a letter key shows it again, Esc twice goes to the map.

## 4. The near band drifts gently while the scene stands still

**What it must do:** in calm scenes that stand still (rocket hop while he stands, rocket
commands, the meadow's still levels), the background is not frozen. One band moves slowly
on its own, so the scene feels alive. In space it is the nearest belt of rocks. On the meadow it
is the middle band. With reduced motion nothing drifts.

- [ ] `Mode` gets `drift: { layer: 'mid' | 'near'; speed: number } | null = null` (px per second
      at that layer). The runtime adds `elapsed * speed` to that layer's offset only
      (`drawBackground` gets the extra offset). It works also where `midOnly` freezes the other
      layers. Nothing changes with `reduceMotion`.
- [ ] Plans 74 and 75 set it on their modes. Here, only the mechanism and a test that the offset
      grows with time and stays 0 with reduced motion (if `drawBackground` is testable; otherwise
      verify in the browser).

## 5. Specs and checks

- [ ] `.specify/`: the progress rule (the bar shows the slower of words and time) and the results peek
      (Esc shows the last game frame, any key brings the card back), in the feature files that
      describe the level screen and the results. Search `.specify/` for "progress" and "results".
- [ ] `tsc`, vitest, `npm run build`, the e2e results test. In the browser (playwright MCP,
      `?fast`, super mode): a calm rocket level shows the bar following the slower share, and the
      results peek works with Esc, X, a letter key and a double Esc.
