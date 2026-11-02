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

- [x] Placement logic: stages from `lessonGroups`, stage pass rule, touch-typing signal (both measures, contrast pairs in the check words, synthetic typists) with its
      constant and unit tests (synthetic pecking and touch-typing presses), result applied to the
      profile (`unlockedKeys`, `placementKeys`, difficulty); unit tests.
- [x] Levels: `isLevelReached` and `nextLevel` with `placementKeys`; unit tests (placed 15 keys
      opens the right levels, none of them done, Continue picks the most advanced one).
- [x] The check run: level kind and mode (copy, no keyboard, no guide, stages, 4 min cap), no
      stars, no rewards, presses recorded; the end card with the strong and weak keys and its
      two actions.
- [x] Turtle on the map: first-visit question, the honest fingers question, the later offer;
      the parent's button; the How am I doing? button in the My progress keys tab; i18n sk and en.
- [x] Specs updated (WHAT and WHY).
- [x] Verify: build, lint, unit tests, e2e for the turtle's question and a check run. In the
      browser (playwright MCP, tester profile, `tapkoType` + `?fast`): a new profile answers
      "Start from the beginning" (nothing changes); a new profile types the check evenly and
      well (worlds open, no stars, Continue goes to the most advanced open level); a check typed
      with uneven, distance-dependent timing unlocks nothing and shows the kind line; the
      parent's button and the My progress button run it again, never remove keys, and the end card
      lists strong and weak keys with a working Practise the weak keys. Fix what is wrong.

## Progress

- Decisions taken while implementing (runner session, 2026-11-02):
  - The pure logic lives in `src/learning/placement.ts` (`PlacementCheck`, `touchSignal`,
    `strongWeak`, `placementDifficulty`, `offersPlacement`); applying the result is
    `completePlacement` in `src/game/progress.ts`; the run is `src/game/modes/placement.ts`, which
    shares the copy panel with the placeholder worlds (`copyPanel` in `copy-loop.ts`).
  - Contrast pairs need one key off its finger's home key in both groups (near: same finger,
    at most 1.5 key widths; far: two fingers of one hand, at least 2). With far pairs on the home
    row only (`a f`, `j l`), a typist touch-typing the home row and pecking above it passed the
    contrast; with an off-home key in both groups it fails, as the plan requires.
  - Key geometry: standard row stagger (0, 1.5, 1.75, 2.25 key widths), only characters of one
    key without Shift; capitals, dead-key letters and space take no part in the signal.
  - A stage ends after a target once it has 25 presses and 5 right presses of its new keys, or
    after 8 targets; with no right press of its new keys (a Shift stage) the reaction does not decide.
  - Reaction excludes the first key of every target (reading time), for stages, strong/weak
    keys and the difficulty.
  - A check that passes only the first stage changes nothing: its keys are every new player's
    and its presses prove nothing. Found in the browser: a two-finger run that slipped in stage 2
    had set `placementKeys` to 3 (opening level 1-2 without a star) and raised the difficulty to 8.
  - Worlds after the first of a story open when the check reached their first level's keys
    (the plan's "the map shows the newly opened worlds"); the story itself still opens by keys.
  - `nextLevel` after a check: the first open unstarred level reached by play (the star before it,
    or the world before done; a story's first world counts as not played to), else the most
    advanced level the check opened (largest key need, first in map order on a tie); without a
    check the old rule stays.
  - Placed keys also count as introduced, so a placed student does not get a row of key cards.
  - The fingers question is asked only on the turtle's path; the parent's button and My
    progress's "How am I doing?" start the check at once (the parent chose; it is a measurement).
  - The later offer is kept once via `appTips.seen` (`placementOffer`) and a memory flag
    (`app.placementOffer`) set by the runtime after a qualifying first-world level, so no third
    stored field was needed; it is not offered after a check that opened keys.
  - The turtle's question shows even with the app tips switched off (it is a one-time question,
    not a tip); not for the guest or the super player.
  - The end card's main button is Continue (to the map), "Practise the weak keys" second, and no
    separate "To the map" (`showEnd` now takes `toMap: null`).
  - Leaving the check early applies nothing; its presses are recorded like any run.
  - e2e: keyboard-only.spec now answers the turtle's question on the first map; new
    e2e/placement.spec.ts.

## Done - 2026-11-02

Shipped: the placement check ("Keyboard check" / "How am I doing?") with stages along the lesson
groups, the stage rule, the speed-independent touch-typing signal (fit and contrast, limits in
`TOUCH_SIGNAL`) and synthetic-typist unit tests (ten-finger and two-finger at two tempos and two
seeds, a mixed typist), `placementAsked` / `placementKeys` with defaults, levels and worlds opened
without stars, Continue to the most advanced placed level, the auto difficulty, the end card with
strong and weak keys, Continue and Practise the weak keys, the super readout row, Ms Turtle's
first-visit question with the honest fingers question and the later offer, the parent's button,
the My progress button, i18n sk/en and translator notes, specs (`.specify/learning/placement-check.md`
and links). Verified: build, 563 unit tests, e2e 80 of 86 before the fixes (keyboard-only fixed
and passing, new placement.spec passing; the other 5 failures are old, see backlog), and in the
browser: a new player answered Start from the beginning (nothing changed, the tips follow next
visit); a ten-finger-timed run opened world 1 and the Rocket's first level without stars and
Continue pointed at it; a two-finger-timed run (no slips) ended on the kind line and opened
nothing; the parent's and My progress buttons start the check; Practise the weak keys opens the
practice; no console errors.
Left out: the super readout row was not seen in the browser (super mode needs the password,
which is never scripted); it is plain code over `check.signal`. The 5 old e2e failures are in
.todo/BACKLOG.md.
