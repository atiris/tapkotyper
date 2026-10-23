# 52 - Natural joy, results teaser, small hints

Affected: `src/game/modes/meadow.ts` and the other `src/game/modes/*.ts` with joy or end
animations, `src/styles.css`, `src/screens/friends.ts`, `src/ui/chrome.ts`, `src/ui/badge.ts`,
`public/i18n/{sk,en}.json`, `.specify/game/story.md`, `.specify/experience/{visuals,help}.md`
and the spec that describes badges. No storage or DB impact.

## Why

The owner played the game and found things that feel wrong:
- A happy hedgehog shrinks and spins.
- The question-and-answer block on the results card is broken.
- Some hints do not say what the child needs to know next.

## What

- [x] **Hedgehog joy.** At the end of world 1's super level (`endT >= 0` in
      `HedgehogMode.drawExtras`, `meadow.ts`), the hedgehog curls up to scale 0.75, rolls a
      circle and spins 4 turns. Replace that with gentle jumps on the spot:
      - 3-4 hops, no scaling, at most a small tilt.
      - A shout "Hurá! Hurá!", shown the way the goal cheer is (`L.sfx('cheer')` and its pop text).
      - Keep the `finished` timing about the same (about 3 s).
- [x] **Shouts in the story.** Add short cheers as a new line list `story.cheer`, picked with
      `pickLine`:
      - sk "Hurá!", "Jupí!", "Super!"; en "Hooray!", "Yippee!", "Great!".
      - Use them when a creature or Tapko is glad: a super-obstacle is beaten, a creature is
        saved or reaches home, a world is finished.
      - At most once per such moment, never on every target.
- [x] **Review other effects.** Check every mode's joy, end and celebration animation
      (`grep -n "joy\|endT\|rotate\|scale" src/game/modes/*.ts`).
      - A living creature that shrinks, grows or spins to show joy now hops, waves or tilts a little.
      - Objects (balls, leaves, stars, sparks) may keep spinning.
      - List each changed animation in a `## State` section at the end of this plan.
- [x] **Broken results teaser.** The `.teaser` rule for the friends screen (110 px circle,
      dashed border, 2.4rem, centred) is global, so it also applies to the results card's
      `.teaser.ask/.asked/.answer`. It squeezes the question and the answer into circles.
      - Rename the friends class (e.g. `.friend-teaser`), also in `src/screens/friends.ts`, so
        `.teaser` means only the results texts.
      - Check the results card after level 1 (question only) and after level 2 (the asked
        question, its answer, the next question).
- [x] **F8 on the sound button.** The tooltip of the sound corner button (`soundButton` in
      `src/ui/chrome.ts`) names the sound level and F4. Add the music switch on a line after
      it: sk "F8 pustí inú pesničku", en "F8 plays another song".
- [x] **Bronze badge tells how to get silver.** `badgeTip` in `src/ui/badge.ts` adds
      `badge.tip.toGold` after the silver tip only. For bronze, add a new key `badge.tip.toSilver`:
      - sk "Strieborný odznak: aspoň {silver} ★ v tomto svete (máš {have})."
      - en "Silver badge: at least {silver} ★ in this world (you have {have})."
      - Silver keeps the gold line.
- [x] **Specs:**
      - story.md: the cheers.
      - visuals.md: creatures show joy by hopping, not by shrinking or spinning.
      - The badge spec: bronze shows the way to silver.
- [x] **Checks:** `npm run build`, `npm test`, and the e2e specs that touch results or friends.
      Then drive the game with the playwright MCP:
      - World 1 super level end: the hedgehog hops and shouts.
      - Results card after level 2: the teaser is readable.
      - Friends screen: its teasers look as before.
      - Hover the sound button and a bronze badge: both tooltips show the new lines.

## State

Implemented (an interrupted run, committed as is; build and unit tests pass):
- The hedgehog hops 4 times and shouts twice (`meadow.ts`). The goal pop text became the
  shared `LevelRuntime.shout`, and `hooray()` picks `story.cheer` with the cheer sound.
- Cheers: the owl's riddle solved, a lake phrase sung, the city gate opened, a super-obstacle beaten.
- Melody hops with a small tilt instead of twirling (`fairy.ts`, `runtime.ts`).
- The friends teaser class is `.friend-teaser`; the sound tooltip shows the F8 line
  (`.tip` keeps line breaks); bronze badges show the way to silver.

Review of the other modes (2026-10-23): no further change needed. Creatures already show joy by
hopping with at most a small tilt (meadow critters' joy hop, egg and robohome moles' wave, robohome
helpers' hop, Tapko's `endHop`, dragons' hop). The meadow flyers' 4 % wing flap is a flight motion,
not joy. Rotations left are objects (leaves, rocks, asteroids, parts, signs, clouds, the rocket).
CSS keyframes are UI and stretch exercises, not creatures.

Checks (2026-10-23): build, 278 unit tests and e2e play/tooltip/layout specs pass. The playwright
MCP browser was locked by another session, so the game was driven with a local Playwright script
against the dev server instead: the super level ends with the hedgehog hopping upright at full
size under "Hurá!"; the results teasers after level 1 and 2 are full-width rounded boxes; the
friends teasers are still 110 px dashed circles; the sound tooltip reads "Zvuk: normálny (F4)" and
"F8 pustí inú pesničku"; a bronze meadow badge adds "Strieborný odznak: aspoň 12 ★ v tomto svete (máš 4)."

## Done - 2026-10-23

Shipped: the hedgehog's hopping end with cheers, `story.cheer` at glad story moments, Melody's
hop instead of a twirl, the readable results teaser (`.friend-teaser` for the friends screen),
the F8 line on the sound tooltip, the bronze-to-silver badge tip, and the specs. The review of
the other modes needed no change. Nothing was left out.
