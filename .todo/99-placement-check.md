# 99 Placement check: what the student already knows

## Why

A student who already types (an older child, an adult) starts at `f j` today and is bored by
basics, and most parents cannot judge which keys to pick by hand
([research](../.research/learning/placement-check.md)). A short check finds the keys the student
really knows, so the lesson starts at the right letters. A hunt-and-peck or two-finger typist
must **not** skip the basics: for them the home row is the whole point. The check measures, it
never rewards: opened is not passed, stars still show who practised how much.

## Decisions

- **Who asks:** Turtle the teacher on the map (`src/app/teacher-tips.ts`, `src/screens/map.ts`),
  not a popup before play and not a question about age.
  - First map visit of a profile with no star yet: "Do you already know the keyboard a bit?
    Let's check, so we start where you are." Buttons: **Start from the beginning** (default,
    focused) and **Check me**. Asked once; the answer is kept (`progress.placementAsked`).
  - Later, once: while the student is still in the first world, after a level with accuracy
    >= 97 % and median reaction of correct presses <= 70 % of `reactionLimit(difficulty)`,
    the turtle offers the check again ("This goes very well...").
  - The parent area has **Check what the student knows** at any time.
- **Honest first question:** before the check the turtle asks "Do you type with all fingers
  without looking at the keys?" **No** -> no check, a kind line ("We will learn it from the
  start, it will go quickly.") and nothing changes. **Yes** -> the check.
- **The check:** a calm copy run on its own screen-less level kind (`placement`), no story, no
  time pressure, no stars, no rewards, no growth time. The on-screen keyboard and the finger
  guide are **hidden** (they would show where keys are). Stages follow `lessonGroups(layout)`:
  stage n uses the words of groups 1..n, focus on group n, about 8 targets (`copyTarget`
  sizes), min 25 presses of the stage. Diacritics, digits and capitals come as their groups
  come in the order. The check stops at the first failed stage or at the end of the order, and
  after about 4 minutes of typing at the latest.
- **Stage passes** when all hold:
  - accuracy of the stage >= 94 % (the 3-star step, `STAR_STEPS`);
  - median reaction of correct presses of the stage's new keys <= `reactionLimit(difficulty)`;
  - **the touch-typing signal** holds (below).
- **Touch-typing signal (two fingers, looking at the keys):** fingers cannot be seen, but the
  timing shows them. A hunt-and-peck typist's interval grows with the distance the hand travels
  between two keys and shows no gain on hand alternation; a touch typist's interval barely
  depends on the distance and alternating hands are faster than one hand.
  - Over the correct presses of the check so far (min 60 intervals), compute the Pearson
    correlation between the interval to the previous key and the physical distance of the two
    keys (key centres from `LAYOUTS`, intervals over 2.5 s left out as pauses), and the ratio
    median(same hand) / median(alternating hands) using the finger map of the layout.
  - The signal **fails** when correlation >= 0.35 **or** the ratio < 1.05. Both limits live in
    one exported constant next to the function, with a unit test on synthetic presses (a
    pecking pattern fails, an even touch-typing pattern passes).
  - When the signal fails, the check ends and **unlocks nothing**: the turtle says kindly
    that it looks like the eyes still help find the keys and the lessons will teach the fingers
    from the start, quickly. No "you failed" wording anywhere.
- **Result (passed stages):**
  - `progress.unlockedKeys` gets every key of the passed groups (keys only ever added; a
    repeated check never removes). Keys are unlocked, not mastered: their guide fades the normal
    way. The presses are the student's own typing and are recorded like any run (key stats,
    typing time, sessions), so keys that were typed well also count toward readiness and
    mastery as usual.
  - `progress.placementKeys` (new field, default 0): the number of unlocked keys the check
    reached, kept as the max of all checks.
  - **Levels open without stars:** a level is reached (`isLevelReached`) when the level before
    it has a star **or** its key need (`keysNeeded`) is <= `placementKeys`. Stories and worlds
    follow from the keys as today. Nothing is marked done: no stars, no world done, no badge,
    no accessory, no story scene. Scenes and rewards still come by playing, and an opened
    world's scenes play when the student plays it.
  - **Continue / next level** (`nextLevel`): the first open level without stars that the check
    did not open (its previous level has a star); if there is none, the open level without stars
    with the largest key need <= `placementKeys` (the most advanced one the student can do).
  - **Difficulty** (only when `autoDifficulty` is on): the highest difficulty up to
    `AUTO_DIFFICULTY_MAX` whose `reactionLimit` is >= 1.2 x the student's median reaction in the
    check; never lower than the current one. Word length stays.
  - The end uses the one end card ([end card](../.specify/experience/visuals.md), plan 85): the
    turtle's picture, under it the count of letters the student can already use, one action
    **Continue** to the map. The map then shows the newly opened worlds.
- **Super player:** the check works the same (needed for testing); the super password is never
  scripted in tests.
- **Stored data:** two new fields with defaults (`placementAsked: false`, `placementKeys: 0`),
  no migration, no data version (alpha).

## Affected

- `src/learning/lessons.ts` (or a new `src/learning/placement.ts`: stages, pass rule, the touch
  signal), `src/game/levels.ts` (`isLevelReached`, `nextLevel`, the `placement` kind),
  `src/game/progress.ts` (finishing a check), `src/game/runtime.ts` and a mode for the check
  (copy, hidden keyboard and guide), `src/storage/schema.ts` (two fields with defaults).
- UI: `src/screens/map.ts` and `src/app/teacher-tips.ts` (the turtle's questions),
  `src/screens/level.ts` (end card), `src/screens/parent.ts` (the parent's button),
  i18n `public/i18n/sk.json`, `en.json` (and the translator's catalog).
- Specs: `.specify/learning/lesson-progression.md` (new section: placement check, WHAT and
  WHY), `.specify/profiles/parent-controls.md` (the button), `.specify/companion` or wherever
  the turtle's lines are specified; `.research/learning/placement-check.md` points to the spec.
- DB / store: two new profile fields with defaults.

## Steps

- [ ] Placement logic: stages from `lessonGroups`, stage pass rule, touch-typing signal with its
      constant and unit tests (synthetic pecking and touch-typing presses), result applied to the
      profile (`unlockedKeys`, `placementKeys`, difficulty); unit tests.
- [ ] Levels: `isLevelReached` and `nextLevel` with `placementKeys`; unit tests (placed 15 keys
      opens the right levels, none of them done, Continue picks the most advanced one).
- [ ] The check run: level kind and mode (copy, no keyboard, no guide, stages, 4 min cap), no
      stars, no rewards, presses recorded; the end card.
- [ ] Turtle on the map: first-visit question, the honest fingers question, the later offer;
      the parent's button; i18n sk and en.
- [ ] Specs updated (WHAT and WHY).
- [ ] Verify: build, lint, unit tests, e2e for the turtle's question and a check run. In the
      browser (playwright MCP, tester profile, `tapkoType` + `?fast`): a new profile answers
      "Start from the beginning" (nothing changes); a new profile types the check evenly and
      well (worlds open, no stars, Continue goes to the most advanced open level); a check typed
      with uneven, distance-dependent timing unlocks nothing and shows the kind line; the
      parent's button runs it again and never removes keys. Fix what is wrong.
