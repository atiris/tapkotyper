# 61 - Level minimums by story, words for slow typists, the great swamp's log

## Why

- The owner played Planéta:5 and ran out of stones with the bar at about half: the great
  swamp plans its stones and shore at the start, so a quick child finishes the content
  and then waits with nothing to type until the minimum time is played. Every level must
  keep giving targets until both minimums are met.
- The minimum time is 2 minutes everywhere today (calm steps 1 minute). The owner wants
  the difficulty to grow with the story: 2 / 3 / 4 minutes in stories 1 / 2 / 3. Even
  4 minutes is well under the 10-15 minutes a day usually recommended for children, and
  the KDE course guidelines (in KTouch) put a lesson at 5-10 minutes; one level is one
  part of a session, not the whole of it.
- The planned target counts are hand-picked and not tied to any pace. Children of 7-9
  type about 5-15 words a minute (10-20 with practice); the owner chose a word minimum
  for a slow but practising child: 8 / 10 / 12 words a minute in stories 1 / 2 / 3.
- The boulder in Planéta:5 is replaced by a floating log (the owner's picture).

## Decisions (taken, nobody to ask)

### Minimum time (`src/game/levels.ts`)

- Base minimum of active play by story (`storyOf(world)`, order dragon / robot / fairy):
  120 / 180 / 240 s.
- Calm steps (`CALM_KINDS`): 0.75 x the base (the most a level is shortened is a quarter).
- Super levels (`isSuper`, the boss levels, "veľká výzva"): 1.25 x the base.
- Rescue missions: the base of the story they are played in (as today, the full minimum,
  never the calm share).
- `CALM_ACTIVE_S` and `MIN_ACTIVE_S` go; `minActiveS(def)` computes it. Tests that use
  `MIN_ACTIVE_S` use `minActiveS` of a real level instead.
- Intentional exceptions stay as they are and stay named in the spec: the valley's flights
  end at their fifth dragon even below the minimum (`endMinimum`), a crossroads path
  stretches the minimum (`stretchMin`), practice / free typing / target range / parrot
  keep their own length, staying a while has no end, `?minActive=` in e2e.

### Minimum words

- `minWords(def) = round(WPM[story] * minActiveS(def) / 60)`, WPM 8 / 10 / 12. Story 1:
  16 (calm 12, super 20); story 2: 30 (calm 23, super 38); story 3: 48 (calm 36, super 60).
- `LevelDef.count` (the planned targets) is derived from it instead of the hand numbers in
  `LEVELS`: for a mode whose target is one word, count = minWords. For a mode whose target
  bundles several words or is not a word (asteroid "bigs", hedgehog volleys, spells, the
  crossroads legs, the valley's flight / lullaby / take-off dragons, copy rows, the great
  swamp's tasks), read the mode and express its count in its own unit so that the words
  typed equal minWords (a per-kind factor next to `LEVELS`, one comment line each). The
  flight levels keep counting dragons (3, one more while the minimum is not played, at most
  five): that is the intentional exception, minWords does not apply there.
- The bar stays `shownProgress = min(mode progress, played / minActive)` (the slower of the
  two minimums: a child who waits sees the words share, a quick one the time share) and
  `grownCount` keeps adding targets while time is short. Check that every mode's
  `progress()` is done / count of the current (grown) count, never of the planned one, and
  never reaches 1 before the mode really is finished.

### Every level keeps giving targets until both minimums are met

- New test in `src/game/modes/idle.test.ts`, for every entry of `MODES`, run with the
  minimum of a real level of that kind (`minActiveS`):
  - a quick steady typist (a letter every 0.15 s): between the first target and the level's
    end there is never more than 8 s without a selectable target, except a mode's own
    scripted moments, which must be listed in the test with their reason (end animation,
    a card, the log floating away);
  - the level ends at least at the minimum and less than one target after it;
  - a slow typist at the story's WPM (one word per 60 / WPM s) ends near the minimum
    (within 25 % over it): the planned count is not too big.
- Fix every mode the test catches. Known: the great swamp (below). Suspects to check by
  the test, not by guess: modes with a fixed scene end (Planéta:1 shore, take-off,
  asteroid, hedgehog, spells, crossroads).

### Planéta:5, the great swamp

- The shore is no longer placed at the start. Stones (sets of `SET` jumps, a firm stone
  after each set) keep coming while `L.minLeft` is more than about two jumps of the child's
  pace or the words are not done (`L.share()` like the first level's `SHORE_AT`). Only then
  the shore is placed (`placeShore`-like, cliff just past the right edge, the last stone
  `LAND_GAP` before it) and he steps ashore for the sentence; the sentence, the monolith and
  the crystals stay as they are. The view never shows the shore's right end (`maxScroll`).
- The log replaces the boulder: once, at a firm stone's place when about half of the
  minimum (time and words, the bar) is done, and never while the shore is in sight or will
  be placed within the next set.
  - Picture: `assets-src/obj-swamp-log.jpg` (already there, magenta key, a mossy log with a
    white flower and a red mushroom, lying left-low to right-high). Run
    `node scripts/assets.mjs obj-swamp-log`, add its manifest entry by hand (minimal diff),
    a row in `assets-src/PROMPTS.md` ("the owner's picture, 2026-10-30").
  - It lies on the water at the swamp line, about as long as two stones, and bobs very
    gently up and down (2-3 px, a period of about 3 s; still with reduced motion).
  - When it comes, Tapko says (top-left bubble): sk "Takéto drievko ma neudrží, musím
    počkať, kým odpláva." / en "A little log like this won't hold me. I have to wait until
    it floats away." (new key replacing `story.boulderStart`; translator note).
  - It takes 6 words (`LOG = 6`, a slipped word pushes half). Each word pushes it a bit to
    the right (an eased glide); the sixth pushes it off the right edge of the stage; then a
    new stone comes up where it lay and Tapko jumps onto it at once, and the sets go on.
  - Its words count as tasks for the bar like the boulder's did.
  - Remove the boulder: `obj-boulder-1/2` (webp, manifest, PROMPTS rows, `assets-src`),
    `BOULDER*` code, `story.boulderStart` / `boulderOpen` lines in sk / en /
    translator files and `src/i18n/catalog.ts` where listed.

## Affected

- `src/game/levels.ts` (minimums, counts), `src/game/runtime.ts` (uses `minActiveS`),
  `src/game/modes/*.ts` (counts in own units, fixes found by the test),
  `src/game/modes/planet.ts` (great swamp), tests `levels.test.ts`, `idle.test.ts`,
  `public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`, `src/i18n/catalog.ts`,
  `public/assets/` (+ log, - boulders), `assets-src/PROMPTS.md`.
- Specs: `.specify/game/mechanics.md` (minimum by story, calm 0.75, super 1.25, words at
  8 / 10 / 12 wpm and why), `.specify/game/story.md` (Planéta:5 log, stones until the
  minimum; flights stay the exception).
- No store or profile change (alpha: no migrations).
- e2e: levels in e2e run with `?minActive=`; check `play.spec.ts` "a quick child plays the
  first level until its minimum length" still holds with 16 planned words.

## Steps

- [x] 1. Minimum time by story, calm and super factors; `minActiveS` everywhere; unit tests.
- [x] 2. `minWords` and derived counts per kind (own units, flights excepted); unit tests.
- [x] 3. The idle-stretch / slow-typist tests over all modes; fix every mode they catch
       (except the great swamp, step 4).
- [x] 4. Great swamp: stones until both minimums, then the shore; the log instead of the
       boulder; boulder removed; texts.
- [x] 5. Specs updated (mechanics, story).
- [ ] 6. tsc, unit, build, e2e (`npx playwright test`); Playwright MCP play-through of
       Planéta:5 (log bobbing, six pushes, new stone, shore only after the minimum, bar
       100 % at the end) and of one level each in stories 2 and 3 (time minimum shown by
       the bar). Browser rules: memory `browser-test-typing` (tester profile,
       `window.tapkoType`, `?fast`; with `?fast` the minimum is shortened, so check the
       real minimum without it on one level).
