# 98 Five stars per level

## Why

Three stars (plus halves on the end card) are too coarse: a child who plays well and one who
plays almost without mistakes get the same. Levels move to **1-5 stars on a logarithmic scale of
the error rate**: every further star needs half the mistakes. Finishing with any number of
mistakes gives 1 star, 5 stars only for really good play, almost without mistakes. The scale
stays accuracy-only (speed is handled by the automatic growth), like Typing.com; the 5-star top
matches TypingClub's "5 = top accuracy".

## Decisions (taken with the owner, 2026-11-01)

- **Level steps** (`STAR_STEPS`): 5 from 98.5 %, 4 from 97 %, 3 from 94 %, 2 from 88 %, else 1.
  A flawless short level gives 5 (falls out of the steps, no special case).
- **Hero's journey** (`JOURNEY_STAR_STEPS`) is stricter by half, not double: errors x 0.75 of the
  level steps: 5 from 99 %, 4 from 97.75 %, 3 from 95.5 %, 2 from 91 %, else 1. The help text says
  this ("the journey is a bit stricter") and shows its own values.
- **No half stars**: drop `halfStarsFor`, `LevelResult.shownStars`, the halves in `starRow`, the
  half-star help placeholders (`{s2_5}`, `{s1_5}`), the `ui-star-half` asset (manifest, file,
  PROMPTS.md entry, generator scripts if they name it). One `MAX_LEVEL_STARS = 5` constant replaces
  every literal 3 meaning "most stars of a level".
- **Dragon flight is no exception**: its stars come from mistakes only. Remove `starCap()` from
  `Mode` (`src/game/mode.ts`), `dragons-flight.ts`, the runtime and `JourneyRun.cap`, and the
  `cap` parameter of `completeLevel`; adjust `idle.test.ts`.
- **World badges** (a world max is 25 = 5 levels x 5): bronze from 10, silver from 15, gold from
  20 world stars. A finished world **may have no badge** while it has fewer than 10 stars.
  `badgeTier` no longer means "world done = bronze"; it needs the world done **and** the stars.
  Tooltips and badge texts say the thresholds (the locked tip: get 10 stars in this world, not
  "finish the world"). The end card's badge news keeps working through the tier change in
  `completeLevel` (a badge can now appear on a replay of any level of a done world).
- **Badges on "My progress"** (`stats.ts` badge row): three sections, gold, silver, bronze, each
  with its heading and threshold ("from 20 ★"); a section shows the worlds that hold that tier.
  Worlds without a badge are not listed (the chest chip keeps the total). Empty section: one short
  faded line ("none yet").
- **Chest points** stay bronze 1 / silver 2 / gold 3.
- **Companion prices**: `KIND_STEP = [30, 43]`.
- **Teacher**: `MASTERED = 88` (= 2 stars), comment updated; any teacher text naming 85 % too.
- **Surprises, trigger "stars"**: the form's default count is 20 (about one world's stars); above
  the count field a hint: "One world gives at most 25 stars." (no time). The hint takes the max
  from the code, not a literal.
- **"My progress" page** (`src/screens/progress.ts`): drop the **Levels** tab entirely (its
  world cells, journey row, parrot and range cells, their CSS such as `.level-cell`,
  `.cell-stars`, `.cell-act`, `.cell-rare`, its i18n keys, its e2e steps). Only `progress` and
  `keys` stay; check `barTabLinks` / deep links for `levels`.
- **Star rows in the Olympic-rings layout**: 3 on top, 2 below in the gaps, filled in reading
  order (top 1-3, then bottom 4-5). One CSS grid (6 columns, each star spans 2, the second row
  starts at column 2, rows overlapping by about a third of a star). Used by `starRow` (end card)
  and the map's `.mini-stars` (level nodes and the journey node). Width stays as today; map nodes
  grow about 6 px in height (desktop 50 -> 56, mobile 44 -> 50). The star animation keeps `--i`
  1..5.
- **Stored data**: no migration, no data version (alpha). Old best values 1-3 stay as they are
  and show as 3/5 until replayed; `starsEarned` mixes old and new stars.
- **Super mode fill** (`src/app/super.ts`): shares of 5 stars, not 3; the service hint text says 5.

## Affected

- `src/game/levels.ts` (steps, `starsFor`), `progress.ts`, `rewards.ts` (badges, `MAX_STARS`,
  `KIND_STEP`), `mode.ts`, `modes/dragons-flight.ts`, `runtime.ts`, `own-content.ts` (default),
  `src/share/teacher.ts`, `src/app/super.ts`.
- UI: `src/ui/chrome.ts` (`starRow`), `src/ui/badge.ts`, `src/screens/map.ts`,
  `src/screens/level.ts`, `src/screens/stats.ts`, `src/screens/progress.ts`,
  `src/screens/parent.ts` (surprise form hint), `src/screens/help.ts`, `src/ui/service.ts`,
  `src/styles.css`.
- i18n: `public/i18n/sk.json`, `en.json` (and the translator's catalog if it lists the keys):
  `starsAria` "of 5", help star lines (5 steps + journey line), hero's journey text, badge tips,
  service fill texts ("3 stars" examples), surprise hint, removed Levels tab keys.
- Assets: `ui-star-half` removed.
- Specs (WHAT/WHY): `.specify/game/mechanics.md`, `.specify/game/heros-journey.md`,
  `.specify/experience/help.md`, `.specify/profiles/statistics.md`,
  `.specify/profiles/parent-controls.md`, `.specify/experience/visuals.md`, any other spec or
  README line that says three stars, half stars, bronze = world done, or the Levels tab.
- Tests: `progress.test.ts`, `levels.test.ts`, `idle.test.ts`, `super.test.ts`,
  `own-content.test.ts`, e2e (`play`, `journey`, `service`, any Levels tab step).
- DB / store: none (no new fields).

## Steps

- [ ] Scoring: `MAX_LEVEL_STARS`, new `STAR_STEPS` / `JOURNEY_STAR_STEPS`, drop half stars and
      `shownStars`, drop `starCap` everywhere; unit tests.
- [ ] Rewards: badges 10/15/20 with "done and enough stars", `MAX_STARS`, `KIND_STEP`, chest,
      teacher 88 %, super fill; unit tests.
- [ ] UI: Olympic star rows (`starRow`, `.mini-stars`, node heights), badges in three sections on
      My progress, badge tips, Levels tab removed, surprise default and hint, help texts; i18n sk
      and en; asset `ui-star-half` removed.
- [ ] Specs and README updated (WHAT and WHY).
- [ ] Verify: build, lint, unit tests, e2e. In the browser (playwright MCP, tester profile,
      `tapkoType` + `?fast`): finish a level with few and many mistakes and read the end card
      stars; the map nodes on desktop and at phone width (no overflow, two star rows); My
      progress badges in three sections and no Levels tab; the parent's surprise form with
      trigger "stars" (default 20, hint); help page star lines. Fix what is wrong.
