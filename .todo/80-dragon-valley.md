# 80 - Dragon Valley redone: flames, the overgrown path, flying, the lullaby, the take-off

World 4 (Údolie, `dragons`) is redone on the owner's design of 2026-10-29
([proposal](../.research/game/valley.md), section Decisions). Today it is four times the same game
(space rocks fall onto baby dragons, a shield bubble) and a rhythm wave; the owner wants no rocks
falling on the dragons, the world rhythm of worlds 1-3, and an ending that leaves the egg for world 5.

Depends on plan 81 (placeholder levels): world 4 then plays the placeholder, and this plan
replaces its five defs with its own kinds.

Affected: `src/game/modes/dragons.ts` (new; plan 81 deleted the old one), `src/game/modes/meadow.ts` (the catcher shared
with the torch), `src/game/levels.ts` (kinds, counts, calm kinds, activities, rescue kinds),
`src/game/modes.ts`, `src/game/runtime.ts` (an early end at the last dragon),
`src/game/modes/idle.test.ts`, `src/game/levels.test.ts`, `e2e/play.spec.ts` if it names the old
kinds, `src/screens/story.ts` (the `egg` scene), `public/i18n/{sk,en}.json`,
`public/i18n/guide/{sk,en}.json`, `src/i18n/catalog.ts`, `public/assets/` + `manifest.json`,
`.specify/game/{story,story-1-scenario,super-obstacles,mechanics}.md`. No store change (alpha, no
migrations; `w4-*` ids and stars stay).

## Story
The baby dragons' home is a big fire pit at the valley's entrance. Its fire went out when the crystal
of life lost its light; the little flames scattered, the path into the valley grew over and the babies
hid deep in it. They never learned to fly, and their place is the crystal meadow (the planet's
level 2). Tapko lights the fire (1), clears the path (2), teaches them to fly home to the fire (3),
sings them to sleep (4) and in the morning helps them fly off to the crystal meadow (5). The fire
burns out and an egg is left behind it. The babies are never targets: words sit on flames, bushes,
a panel or the top bubble.

## 1. Pictures (Gemini, prompts already in `assets-src/PROMPTS.md` section 4, Dragons)
- [ ] `obj-flame-1..3`, `obj-flame-out`, `obj-torch`, `obj-firepit`, `obj-firepit-burning-1..3`,
      `obj-bush-1..4`; generate with the `gemini-images` skill, cut out as the other sprites
      (magenta/green key, `scripts/defringe.mjs` where a fringe shows), webp in `public/assets/`,
      entries in `manifest.json`. Record any prompt lesson in PROMPTS.md "Lessons from generating".
- [x] Until a picture exists the mode draws a code fallback (as `glovesFallback`), so the code steps
      do not wait for the art.
- [x] Drop `obj-rock-falling-1/2` (and its PROMPTS.md row) once nothing draws them. -2 dropped;
      -1 and its row stay: the rocket world (`space.ts`) still draws it as an asteroid.
- Reused: `obj-dragon-baby-1..3`, `obj-dragon-sleeping`, `obj-egg`, `bg-dragons-*`.

## 2. Common rules
- Tapko at the DOM Tapko's size on the left (`TAPKO_X`), as in the other worlds. The fire pit stands
  on the ground on the right (about 0.8 vw) in levels 3-5 and burns there; in level 1 it is just
  right of Tapko under the torch (see 3).
- Level kinds (replace the world's `copyloop` defs): `flames`, `thicket`, `flight`, `lullaby`, `takeoff`.
  `LEVELS` world 3: `def(3,0,'flames',12)`, `def(3,1,'thicket',12)`, `def(3,2,'flight',3)`,
  `def(3,3,'lullaby',3)`, `def(3,4,'takeoff',3)`; for `flight`, `lullaby` and `takeoff` the count is
  the number of dragons at start (see the dragon count rule).
- `thicket` is a calm kind (60 s) but its map icon is `clean` (growing copy): make `activityOf`
  check the copy kinds before `CALM_KINDS`. `lullaby` is `clean`, `flight` is `chase`.
- Rescue kinds: add `{ kind: 'flames', world: 3, variant: '' }`.
- **Dragon count rule (flight, lullaby, takeoff):** 3 dragons at start; whenever one is done while
  the level's minimum time is not played, one more comes, at most 5. When the 5th is done the level
  ends even below the minimum: add a runtime call that ends the minimum now (e.g. `endMinimum()`
  setting `minActive` to the time played; `stretchMin` is the model), used only by these modes.

## 3. Level 1 - Ohníky (word stream)
- [x] Generalise the meadow's `Gloves` into a catcher that takes its sprite, size and lean (gloves
      stay as they are); the torch is one held upright just right of Tapko, above the fire pit.
- [x] Flames (one of three, sometimes mirrored, size by word length) come from the right in soft
      arcs with the stream rules of the meadow (`ApproachMode`, `L.travelTime`, `L.maxActive`,
      `L.spawnGap`); the word shows once the flame is wholly in sight.
- [x] Typed: the flame speeds into the torch, which rises to meet it and always catches it (meadow
      rule); the torch flame does not grow (owner); the torch dips to the pit, which catches more.
- [x] Not typed: the flame flies past the torch, turns into `obj-flame-out` and fades. No sound of
      failure, no line.
- [x] The pit: dead at start; the first three catches cross-fade it into the burning pictures, which
      then take turns every ~0.2 s as a flicker; its glow (code-drawn, warm radial) and a soft
      sparkle grow with the share of the level done.
- [x] End line (`story.flamesDone`): the fire burns, the dragons will see it from the valley.

## 4. Level 2 - Zarastená cesta (growing copy, calm)
- [x] Bushes (`obj-bush-1..4` in random order, some mirrored) stand on the path one after another;
      the nearest one has its spell (one word, `L.word`) above it. Tapko walks to it; the view glides.
- [x] Typed without a slip: the bush shrinks and fades, Tapko walks on to the next.
- [x] A slip: the word turns red and fades (CopyRow's slip look); while `slipWords(1, added)` allows,
      two more bushes grow on the path ahead (`L.count += 2`), which happens at most three times
      (6 words). The same bush then shows its spell again. After the ceiling a slip only shows the
      spell again.
- [x] End (`story.thicketDone`): the path is open, the dragons peek out at its end.

## 5. Level 3 - Lietanie (word stream with rhythm)
- [x] A dragon (colours take turns) waits on the ground just right of Tapko; 2-3 bushes stand
      together in the middle (about 0.45-0.6 vw); the burning pit on the right.
- [x] Words come one at a time in a bubble high in the middle (`L.word`, never on the dragon). The
      first typed word starts the flight; call `L.rhythm.ready(now)` before it so the wait between
      flights is not measured.
- [x] The flight moves right at a fixed slow speed (`FLIGHT_S` about 22 s from start to the pit,
      tuned so 5 flights take about the 120 s minimum); its height is
      `maxAlt * lift * sin(pi * progress)`, `lift` easing toward `min(1, ratio / LIFT_RATIO)` with
      `ratio = L.rhythm.ratio(L.difficulty)` and `LIFT_RATIO = 0.6`. Wings flap while lift rises,
      the dragon glides while it sinks.
- [x] Over the bushes: if its foot is below the bushes' top it lands in them, shakes, shouts one of
      `story.flightBush` ("Júj, to šteklí!", "Šteklivé!", "Chrumkavé!", "Kríčky!"), climbs out and
      walks on the ground to the pit; else it glides on and lands by the pit with a hop.
- [x] Words typed while the dragon walks still count; the next dragon starts after it reaches the pit.
- [x] End (`story.flightDone`): "{n} z {m} dráčikov sa naučilo lietať." (plural forms per language).

## 6. Level 4 - Uspávanka (copy)
- [x] The dragons circle slowly above the burning pit (wide ellipses, each its own phase). A panel in
      the middle (SpellMode's panel look, without the mushrooms) shows one lullaby line: a sentence
      of the level's keys ending with a period (`L.word(undefined, 5, 3)` gives a punctuated
      sentence; keep it at most about 30 characters).
- [x] A line typed without a slip: one circling dragon glides down by the pit and is drawn as
      `obj-dragon-sleeping`, with a small "z z" float. A line with a slip is written again (the same
      line, a new start); slips only count in the accuracy.
- [x] Dragon count rule; the end (`story.lullabyDone`): all sleep by the fire.

## 7. Level 5 - Odlet (super-obstacle)
- [x] Morning light. The dragons sit by the pit on the right; one by one each flies to the left.
- [x] A flight is sets of 2-3 short words shown as a row (CopyRow look) above the middle: 3 sets for
      the first dragon, 4 for the others. Each word has `L.travelTime(word)` to be finished from the
      moment it becomes current (a thin bar under the row shows it); the dragon flaps and slowly
      sinks while a word waits.
- [x] A set typed without a slip, every word in time: the dragon rises a step and moves a step left.
      A late word or a slip: the dragon glides back to the pit and the flight starts again with new
      sets (`story.takeoffBack`, gentle: "Skúsime to znova!").
- [x] Safety (owner): after the 3rd return of the same dragon its next tries have one set less and
      word time x 1.25; after the 6th return the sets have 2 words and a slip only restarts that
      word, so every child finishes.
- [x] After its last set the dragon flies off to the left out of the stage (`story.takeoffGone`).
      Dragon count rule.
- [x] When the last is gone: the pit cross-fades back to `obj-firepit` over ~2 s, then `obj-egg` fades
      in behind it with a soft glow; Tapko is glad, a cheer (`Cheers`), then the level ends.
- [x] The paws: off, as in the city gate (they would type the sets).

## 8. Texts, scene, specs, checks
- [x] Start lines per level and the world story (first card of level 1) from the proposal's
      "Scenario in Slovak", English versions; remove the shield and wave lines and the old world
      story. Guide notes, `catalog.ts`, unused-key test clean.
- [x] Scene `egg` (`src/screens/story.ts`, i18n `scenes.egg`): the three lines of the proposal's
      reward scene; its sprites `obj-egg` with the dead pit, no baby dragon.
- [x] The valley's own range thing (`aim-things.ts`): a flame.
- [x] Specs: `story.md` world 4 (and the Why), `story-1-scenario.md` Svet 4 in Slovak,
      `super-obstacles.md` (the take-off instead of the energy wave), `mechanics.md` where it names
      the shield or the wave, `game/index.md` line.
- [x] Tests: `levels.test.ts` (kinds, `activityOf`, `minActiveS` of `thicket`), `idle.test.ts` with
      the new modes, unit tests for the catcher, the slip growth ceiling, the dragon count rule and
      the take-off safety. tsc, vitest, build.
- [ ] Browser play-through (`?fast`, tester profile `.e2e/tester-profile.json`, `tapkoType`): all
      five levels to the end, with a missed flame, slips on a bush beyond the ceiling, a dragon that
      lands in the bushes, a lullaby line with a slip, three returns in the take-off, the egg shown.

## State
Code, texts, scene, specs and tests are in (commit "feat(valley): ..."). Open: the pictures (step 1)
and the browser play-through (step 8). Decisions taken while implementing:
- Two files, as the planet has: `modes/dragons.ts` (shared pit, flock rule, fallbacks, flames,
  thicket) and `modes/dragons-flight.ts` (flight, lullaby, take-off).
- Meadow's `Gloves` became an exported `Catcher` with a `CatcherLook` (picture, height, lean,
  catch point); the gloves keep their look as the default. Flames is its own `ApproachMode`
  with the catcher, not a `MeadowMode` subclass (no critters, kicks or gusts to switch off).
- Dragon count rule read as "one more comes when the last one is done while the minimum is not
  played" (`flockAfter`), not "one more per dragon done": a slow typist keeps 3 lullaby lines.
  The modes keep their own dragon count; `L.count` is not used for it, since the runtime grows
  it toward the minimum. "Stay a while" always gets one more (`flockFor`).
- `LevelRuntime.endMinimum()` sets the minimum to the time played; called when the 5th is done.
- Flight: the arc runs from the start to just left of the pit, the bushes stand in the middle
  of that way (12 % spread each side, 0.46-0.59 vw on a 1280 stage), so the arc's height over
  them is the same on any width. MAX_ALT 240, bushes' top 140: clearing needs lift >= ~0.76,
  i.e. about 46 % of the rhythm goal. The landed dragon hops to its seat by the pit.
- Lullaby line: `L.word(5, 4, 3)` (3-4 words of at most 5 letters, punctuated) keeps it under
  30 characters without retries. A slip restarts the line at once (red fade, same line).
- Take-off: after the 6th return a late word also only restarts that word (not only a slip),
  so a slow child surely finishes; `CopyRow`'s drawing moved to an exported `drawRow` reused
  by the take-off row.
- The range's valley thing: the chili became `flame` (texts renamed, `obj-aim-chili` dropped).
