# 83 - Dragon Valley, the owner's second round: dragons waiting on the path, slips in flight, the two-line lullaby, the egg from the fire

The owner played world 4 (Údolie, plan 80) on 2026-10-30 and asked for changes in levels 2-5, a
fourth (red) dragon, sleeping dragons in every colour and an egg without a face. The new opening
texts of all five levels are already in (commit "feat(valley): the story told in each level's
opening card"); this plan does the rest.

Affected: `src/game/modes/dragons.ts` (`DRAGONS`, `DRAGON_COLOR`, thicket, `Firepit` drawing),
`src/game/modes/dragons-flight.ts` (flight, lullaby, take-off), `src/screens/story.ts` (`egg`
scene sprite), `public/i18n/{sk,en}.json` (new line lists), `src/i18n/catalog.ts` if it lists
story keys, `public/assets/` + `manifest.json` (new pictures), `assets-src/` + `assets-src/PROMPTS.md`,
unit tests next to the modes, `.specify/game/{story,story-1-scenario}.md`. No store change (alpha,
no migrations).

Not changed (owner): the valley's shooting-range thing (`aim-things.ts`, the flame) stays, although
the world gets new objects. Level 1 (flames) only got its new text.

## 1. Pictures (Gemini, skill `gemini-bridge:gemini-images`)
Same style as the existing ones, magenta key, the existing picture attached as reference (pose and
style kept, only the colour changes). Record each prompt in `assets-src/PROMPTS.md` (Dragons table)
and lessons in its "Lessons from generating" section.
- [ ] `obj-dragon-baby-4`: the chubby baby dragon of `obj-dragon-baby-1` in warm red (soft cherry,
      not orange; belly lighter), same sitting pose. The owner wants this one from Gemini, never drawn in code.
- [ ] Sleeping dragon in every colour: rename `obj-dragon-sleeping` to `obj-dragon-sleeping-1`
      (mint) and generate `-2` (sky blue, as baby 2), `-3` (sunny yellow, as baby 3), `-4` (red, as
      baby 4) from it as reference. Baby N sleeps as sleeping N.
- [ ] `obj-egg-plain`: `obj-egg` without eyes, brows and mouth (the same cream egg with turquoise
      spots, no face). Used in the valley (take-off end, `egg` scene); `obj-egg` with its face stays
      for the egg world.
- [ ] Until a picture exists the code fallback draws it (as now), so the code steps do not wait.
      If the Gemini bridge is not available, finish the code and leave these boxes open with the reason.

## 2. All levels with dragons: four colours
- [ ] `DRAGONS` gets `obj-dragon-baby-4`, `DRAGON_COLOR` its red fallback colour; a map from a baby
      to its sleeping picture (`-N` to `-N`). The thicket's waiting group shows all four; flight,
      lullaby and take-off take colours in turn as now (5 dragons: the 5th repeats the 1st).

## 3. Level 2 - Zarastená cesta: the dragons wait on the path
- [ ] The four dragons sit on the path just past the last bush (`endX()`), from the start, facing
      Tapko (left), calm (no hops; at most a slow breath). They are never faded or popped in: they
      come into sight from the right edge as the view glides on, like the bushes.
- [ ] A slip that grows two more bushes moves the path's end: if the dragons are in sight they hop
      back to the new end (~0.5 s), else they just stand there.
- [ ] When the last bush is gone they start to be glad: the current cheering hops, the cheer sound
      and `story.thicketDone`, while Tapko walks to them (the existing end walk).

## 4. Level 3 - Lietanie
- [ ] Always three bushes in the middle (`start()` picks `r.int(2, 3)` today; make it 3, all of
      `BUSHES` in random order, each sometimes mirrored).
- [ ] The pit moves further right: about 0.95 vw, kept so its picture stays wholly on the stage.
      The seats do not move with it: they stay where they are today (measured from 0.9 vw), so the
      landing dragons are no longer almost in the fire. Bushes keep their place (they depend on the
      seats).
- [ ] No shrink on landing: a seated dragon is drawn at the flying size (one height for both,
      `DRAGON_H`). Just before it touches down it turns into the sitting pose: its lean eases to 0
      during the last ~40 % of the landing hop (and of the walk-up hop), so it lands upright.
- [ ] Slips during one flight (`onWrong` while a dragon is in state `fly`; counted per dragon):
      - 2nd slip: the dragon shouts one of `story.flightOops` (sk: "Jaj!", "Pozor!", "Opatrne!",
        "Ups!", "Jej!", "Joj!"; en: "Ouch!", "Watch out!", "Careful!", "Oops!", "Whoa!", "Oh no!")
        and wobbles for ~0.8 s (a quick rock of its lean, as the bush shake), flying on.
      - 3rd slip: the flight ends at once. Before or over the bushes it glides down into them (state
        `bush`, the existing shout and climb-out; if it has not reached them yet it first glides
        forward-down onto the nearest bush); past the bushes it drops and lands hard (state `fall`).
        Same counting for the stars as today (bush: not flown; hard landing past the bushes: flown).
- [ ] Unit test: the slip counter per flight (2 -> oops, 3 -> bush or fall by position).

## 5. Level 4 - Uspávanka
- [ ] Circling dragons lean into their flight as in level 3 (forward along the way they face, with
      the gentle rock), and the one gliding down too, until it turns into the sleeper.
- [ ] Landed, a dragon becomes its own colour's sleeping picture (step 2), about 15 % smaller than
      today (`SLEEP_H` 76 -> ~65), so it is no bigger than the dragons in flight.
- [ ] The flock: a new dragon comes flying in from the right whenever one falls asleep, no other
      dragon is circling and the level still needs time (`flockFor`, at most `FLOCK_MAX`, then
      `endMinimum`), so while the minimum is not played there is always one to sing to.
- [ ] The panel moves to the left and up: left edge ~32 px from the stage's left, its bottom well
      above Tapko's head (at least 20 px), its right edge left of the dragons' circle
      (`pit.x - CIRCLE_RX - 40`); the line size shrinks to fit as now. It never overlaps Tapko or the
      circling dragons on a 1024-1920 wide stage.
- [ ] The verse's two lines show from its start, one under the other, in the panel. Only the
      current line is a target; the other is plain text (the line to come in the waiting ink, a
      typed line in the done ink, both as the app's other copy rows look). The dots go.
- [ ] A slip in a line: only that line fades red (`SLIP_INK`, as now) and that line starts again; a
      typed first line stays typed.
- [ ] Easing (owner): every 3rd slip in the same line shortens it before it comes again: about the
      last quarter goes, cut at a word boundary (at least one word goes, at least one word stays, the
      period stays at the end). Counted per line; a new verse starts at 0.
- [ ] Unit test: the shortening (3 slips -> one cut, 6 -> two cuts, never empty, period kept).

## 6. Level 5 - Odlet: the egg comes from the fire
- [ ] When the last dragon has flown off, Tapko calls after them (`L.say`, one of
      `story.takeoffBye`: sk "Ahojte!", "Dovidenia!", "Krásny let!"; en "Bye!", "Goodbye!", "Have a
      lovely flight!"), then ~1.5 s nothing happens.
- [ ] The fire flares: the flames grow (~0.8 s) while the egg (`obj-egg-plain`) is placed in the
      pit, drawn after the pit and before the flames (back flame first), so the big flames hide it.
- [ ] Then the flames blow out: a sharp burst of sparks, they shrink and vanish (~0.6 s), and the
      egg sits in front of the dead pit, with the soft glow it has today. `Firepit` gets what this
      needs (a flare and a blow-out, and a way to draw something between the pit and its flames).
- [ ] The egg greets (`L.shout` above it, one of `story.eggHello`: sk "Ahoj!", "Postaráš sa o mňa?",
      "Kde som?", "Ahoj, ty budeš môj kamarát?"; en "Hello!", "Will you look after me?", "Where am
      I?", "Hi, will you be my friend?"); then Tapko is glad and the cheer, as now; the level ends
      after it (retime `TAKEOFF_END`).
- [ ] The `egg` scene (`src/screens/story.ts`) shows `obj-egg-plain` instead of `obj-egg`.

## 7. Specs, checks
- [ ] `.specify/game/story.md` world 4 and `story-1-scenario.md` Svet 4 (Slovak): the waiting
      dragons, the flight slips, the two-line lullaby with its easing, the egg from the flared fire,
      four dragon colours; the range thing unchanged.
- [ ] i18n: new keys in sk and en, guide notes if the guide names them, `catalog.ts`, the
      unused-key test clean.
- [ ] tsc, vitest, build.
- [ ] Browser play-through (playwright MCP, `?fast`, tester profile `.e2e/tester-profile.json`,
      `tapkoType`): level 2 (dragons come into sight sitting, a slip that moves them, glad at the
      end), level 3 (three bushes every time over several starts, a flight with 2 slips, one with 3
      before and one past the bushes, upright landing at the same size, pit room), level 4 (panel
      top left clear of Tapko and the circle, a slip in line 2 only, 3 slips shorten), level 5 (the
      goodbye, the flare, the egg's greeting). Screenshots of each.
