# 88 - The dragon story's own hero's journey: down the mountain back to the rocket

Needs `.todo/86-heros-journey.md` (the journey's machinery, node after the crown, harder play,
stricter stars, star totals) and `.todo/87-egg-mountain.md` (world 5's modes, bands and the
hatched baby dragon).

## Why

Plan 86 gives every story a journey made of its worlds' first levels. For the dragon story the
owner wants a journey with its own story (2026-10-31): the egg has hatched on the summit, and
Tapko goes **back down from the Mountain of Awakening to his rocket**, through the key places
of the story, and **takes off**. Each part plays the game of the story that fits that place, in
the order of the way home, so the journey reads as one trip, not five unrelated replays.

## Decisions (taken with the owner, 2026-10-31)

- **Where and when:** as in plan 86 (the node after world 5's crown, opens with world 5 done,
  the compass picture, stars under the id `journey-dragon`). This plan only fills
  `JOURNEYS.dragon`.
- **Get-ready card** (sk, before the first part; en to match): "Dráčik sa vyliahol! Teraz ho
  musíš dostať **dolu z hory** a cez **údolie**, **lúku kryštálov** a **močiar** až k
  **rakete**, ktorá čaká na brehu. Na konci ju **odštartuješ**." followed by plan 86's line about
  the harder play. Between parts plan 86's travel cards name the next place.
- **The little dragon comes along:** the hatched baby walks and flutters right behind Tapko in
  every part (the hero kit's `friendSpot`, like Bolt in story 2), never a target, glad at a
  finished part, looking worried at a stumble. New picture `obj-dragon-little` (the same baby as
  `obj-dragon-hatched`, out of its shell, small wings open, three-quarter view facing right);
  until it exists the hatched picture is used.
- **Direction:** Tapko always goes to the right, as everywhere; nothing is turned round.
- **The parts, in this order** (one per world; world 1 is not on this planet, its meadow is home,
  so the planet comes twice, its meadow and its swamp; confirmed by the owner 2026-10-31):
  1. **Down the mountain** (world 5 bands): the boulders of world 5 level 4, now rolling down
     after him from the right; jump over typed ones, the +7 % growth applies to the part's own
     minimum (cap +70 % of it). Line: "Z hory sa valia balvany, preskakuj ich!"
  2. **Through the valley** (world 4 bands, the burning pit at the right as in flying lessons):
     the little dragon's **first flight**, world 4 level 3's game with one dragon, the hatched
     baby, over the two bushes to the pit (one more flight while the part's minimum is not
     played, at most two). Line: "Dráčik sa chce naučiť lietať ako jeho kamaráti."
  3. **The crystal meadow** (planet meadow bands): world 3 level 2's crystals, "the rocket needs
     their energy to fly home"; the end says how many he has for the rocket. The four valley
     dragons sit at the back of the meadow, as story 1 promised (they flew here at 4:5), and
     wave.
  4. **The swamp** (planet swamp bands): world 3 level 5's fragile stones (three stones and the
     firm fourth, a slip cracks one and he goes back) without the log and without the monolith;
     its end is the shore picture (`bg-planet-swamp-shore`) and on the grass **the rocket stands
     ready**. Line: "Posledný močiar! Na brehu už čaká tvoja raketa."
  5. **The take-off** (planet swamp bands with the shore, the same place): world 2 level 4's
     command game: commands on the panel to the standing rocket (`obj-rocket-standing`, nose
     up on its fins, no flame; fallback `obj-rocket-empty` turned upright). Each accepted command
     gets the rocket ready a step ("Dvere otvorené.", "Kryštály načítané.", "Motory sa
     zahrievajú.", "Odpočítavanie spustené."); a rejected one answers as in world 2
     ("Príkaz neprijatý!") and nothing happens (the rocket does not veer on the ground). The last
     command: Tapko and the little dragon climb in, a countdown "3, 2, 1, štart!", the rocket
     rises off the top of the stage with a code-drawn flame and smoke; then the end card.
- **Length and harder play:** plan 86's rules (twice the story's minimum, split evenly over the
  five parts, one difficulty step up, hard words, stars from 98 / 95 %); counted parts (the
  flight, the crystals) keep their own units scaled to the part.
- **End card:** plan 86's ("Cesta hrdinu prejdená!") with the compass picture; the green line
  for a first finish: "Raketa letí domov aj s dráčikom!".
- **Specs:** `.specify/game/heros-journey.md` (from plan 86) gets a section "The dragon story's
  journey" with the parts and why they are in this order; `story-1-scenario.md` gets
  "Cesta hrdinu" after Svet 5 in Slovak.

## Affected

- `src/game/levels.ts` (`JOURNEYS.dragon` parts: kind, variant, background world, line key),
  the five modes used (`egg-boulders`, `dragons-flight` flight with one fixed dragon picture,
  `planet-crystals`, `planet` great swamp without log and monolith, ending on the shore with
  the rocket, `space-calm`/command game on the ground with the standing rocket and its launch);
  each gets a small journey variant, not a copy of the mode.
- `src/game/modes/kit/hero.ts` and the valley/command modes: the little dragon as a companion
  figure behind Tapko.
- `src/screens/level.ts` (travel cards and lines come from plan 86; only the dragon texts here).
- `public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`, `src/i18n/catalog.ts`.
- Assets: `obj-dragon-little`, `obj-rocket-standing` (prompts in `assets-src/PROMPTS.md`
  section 4, `gemini-images`, `npm run assets`); fallbacks as above.
- DB/store: none beyond plan 86 (`journey-dragon` in `progress.levels`).

## Steps

- [ ] Spec section and scenario text, sk/en lines, translator notes.
- [ ] `JOURNEYS.dragon` with the five parts and their backgrounds; travel card names.
- [ ] Journey variants of the five modes (boulders from the right with the part's growth cap,
      one-dragon flight, crystals for the rocket with the valley dragons at the back, the swamp
      to the shore with the rocket standing, the ground command game with the launch).
- [ ] The little dragon following Tapko in every part.
- [ ] Pictures `obj-dragon-little`, `obj-rocket-standing` via `gemini-images`; the assets run;
      fallbacks until then (if Gemini is unavailable, a backlog line).
- [ ] Tests: unit test that the dragon journey's parts are in this order with these kinds and
      that the parts' minimums add up to twice the story's minimum; `idle.test.ts` for each
      journey variant at both paces; e2e: with world 5 done the journey plays through all five
      parts (`?minActive=` short) and ends on the end card after the launch, stars on the node.
- [ ] `npm run build`, `npx vitest run`, affected e2e; Playwright MCP play-through (tester
      profile, `?fast`, `tapkoType`) with screenshots of each part, the rocket on the shore and
      the launch.
