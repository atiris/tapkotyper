# 99 Placement check: what the student already knows

## Why

A student who already types (an older child, an adult) starts at `f j` today and is bored by
basics, and most parents cannot judge which keys to pick by hand
([research](../.research/learning/placement-check.md)). A short check finds the keys the student
really knows, so the lesson starts at the right letters. A hunt-and-peck or two-finger typist
must **not** skip the basics: for them the home row is the whole point. The check measures, it
never rewards: opened is not passed, stars still show who practised how much.

## Decisions

- **The check is also "How am I doing on the keyboard?"**: the same run any student can start
  at any time, which measures the keys from the start of the lesson order and shows the strong
  and weak ones. Ways in:
  - **My progress popup**, keys tab (`keysTab` in `src/screens/stats.ts`): a button **How am I
    doing?** with its length in the tooltip (about 4 minutes). No limit on how often: it only
    ever adds keys and is real typing practice, so running it again does no harm.
  - **Parent area**: **Check what the student knows** (below).
  - **Turtle** on the map, for the first run (below).
- **Who asks first:** Turtle the teacher on the map (`src/app/teacher-tips.ts`, `src/screens/map.ts`),
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
- **Touch-typing signal (two fingers, looking at the keys), independent of speed.** Fingers
  cannot be seen, but the timing shows which finger model explains the student, and the student
  is compared **with themselves**, never with an absolute speed: a fast two-finger typist and a
  slow ten-finger typist must both come out right. There are no real typists to calibrate on, so
  the rule rests on two models and synthetic typists (below).
  - **Intervals used:** correct presses only, the interval to the previous correct press inside
    the same word (the first key of a word is reading time, left out), intervals over 2.5 s left
    out as pauses. Every measure below is a rank correlation or a ratio of medians, so it does
    not change when the student is twice as fast or twice as slow.
  - **Two distances per interval** (key centres and the finger map from `LAYOUTS`):
    `travel` = distance from the previous key (one pointing finger travels it, the hunt-and-peck
    model) and `reach` = distance of the key from the home key of its finger under ten fingers,
    plus a same-finger mark when the two keys share a finger (the touch model).
  - **Measure 1, which model fits:** Spearman correlation of the intervals with `travel` minus
    the one with `reach`, both over the same-hand pairs. Pecking: travel explains the times;
    touch typing: reach and same finger do, travel hardly.
  - **Measure 2, the contrast pairs:** median interval of same-hand pairs that are **near but on
    one finger** (`f r`, `j u`, `d e`, `k i`, `j m`...) divided by the median of same-hand pairs
    that are **far but on different fingers** (`a f`, `s f`, `j l`, `j ô`...). A touch typist is
    slower on the near same-finger pairs (ratio > 1); a pecker is faster on them, the finger
    is already there (ratio < 1). The check's words are picked so both groups have at least 12
    pairs once the upper row is in; before that only measure 1 counts.
  - **Decision:** the signal fails when measure 1 >= 0.2, or measure 2 < 0.95 (when it has its
    pairs). Too few intervals for a measure (under 60, or under 12 per contrast group): that
    measure does not decide; with no measure deciding the signal passes (then only the first
    groups were reached, little is skipped). The limits live in one exported constant.
  - **Synthetic typists for the unit tests:** a pecker (interval = a + b x log2(1 + travel / key
    width), Fitts' law, from the previous key) and a touch typist (interval = a + reach cost + a
    same-finger penalty), each at a fast and a slow tempo (x 0.5 and x 2), each with noise
    (lognormal, sd 0.3) and now and then a reading pause. All eight runs (2 models x 2 tempos x
    2 noise seeds) must come out right; a mixed typist (touch on the home row, pecking above)
    must fail once the upper row is in.
  - **Super mode readout:** in super mode the check's end card shows both measures and the
    decision in one small line, so the owner can type the check with two fingers and with ten
    and see the numbers; the limits are tuned from that, not guessed again.
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
    turtle's picture, under it the count of letters the student can already use. Below it the
    **strong and weak keys** of this run: every key measured in the check (at least 5 presses)
    ranked by its accuracy, then median reaction against `reactionLimit(difficulty)`; at most 5
    strong (green) and 5 weak (orange) as key caps, a key in neither list is not shown. Weak means
    accuracy under 94 % or reaction over the limit; a run with no weak key says so in one line.
    Actions: **Practise the weak keys** (when there are any: the stats' practice,
    `go('level', { id: 'practice', keys, seconds: 60 })`) and **Continue** to the map. The map
    then shows the newly opened worlds.
  - The weak and strong keys come from this run only, not from the stored statistics, so the
    card answers "how did it go now"; the presses still go into the statistics like any run.
  - When the touch-typing signal failed, the card still shows the strong and weak keys, with
    the kind line instead of new letters.
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
  `src/screens/stats.ts` (the How am I doing? button),
  i18n `public/i18n/sk.json`, `en.json` (and the translator's catalog).
- Specs: `.specify/learning/lesson-progression.md` (new section: placement check, WHAT and
  WHY), `.specify/profiles/parent-controls.md` (the button), `.specify/profiles/statistics.md`
  (the My progress button and the strong and weak keys), `.specify/companion` or wherever
  the turtle's lines are specified; `.research/learning/placement-check.md` points to the spec.
- DB / store: two new profile fields with defaults.

## Steps

- [ ] Placement logic: stages from `lessonGroups`, stage pass rule, touch-typing signal (both measures, contrast pairs in the check words, synthetic typists) with its
      constant and unit tests (synthetic pecking and touch-typing presses), result applied to the
      profile (`unlockedKeys`, `placementKeys`, difficulty); unit tests.
- [ ] Levels: `isLevelReached` and `nextLevel` with `placementKeys`; unit tests (placed 15 keys
      opens the right levels, none of them done, Continue picks the most advanced one).
- [ ] The check run: level kind and mode (copy, no keyboard, no guide, stages, 4 min cap), no
      stars, no rewards, presses recorded; the end card with the strong and weak keys and its
      two actions.
- [ ] Turtle on the map: first-visit question, the honest fingers question, the later offer;
      the parent's button; the How am I doing? button in the My progress keys tab; i18n sk and en.
- [ ] Specs updated (WHAT and WHY).
- [ ] Verify: build, lint, unit tests, e2e for the turtle's question and a check run. In the
      browser (playwright MCP, tester profile, `tapkoType` + `?fast`): a new profile answers
      "Start from the beginning" (nothing changes); a new profile types the check evenly and
      well (worlds open, no stars, Continue goes to the most advanced open level); a check typed
      with uneven, distance-dependent timing unlocks nothing and shows the kind line; the
      parent's button and the My progress button run it again, never remove keys, and the end card
      lists strong and weak keys with a working Practise the weak keys. Fix what is wrong.
