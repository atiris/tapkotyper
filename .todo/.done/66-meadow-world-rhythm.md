# 66 - World rhythm pilot in the meadow

Affected:
- `src/game/levels.ts`: the meadow level list, a new `activity` field on every level, the
  calm-step minimum length.
- `src/game/modes/meadow.ts`: the level-3 gust. New `src/game/modes/meadow-calm.ts`:
  the dew drops and the invitation (+ tests).
- `src/game/modes.ts`: the new kinds. `src/game/runtime.ts`: the minimum length per level,
  `word()` for single letters.
- `src/words/words.ts`: a single-letter pick (+ test).
- `src/screens/map.ts`, `src/styles.css`: the activity icon in the level dot.
- `public/i18n/sk.json`, `public/i18n/en.json`: start lines, Tapko lines, aria texts.
- Specs: `.specify/game/story.md`, `.specify/game/mechanics.md`,
  `.specify/learning/lesson-progression.md`, `.specify/experience/visuals.md`.
- Research: `.research/game/world-rhythm.md` gets a state line.

Contracts and data: level ids (`w1-1` to `w1-5`), stars, badges, rewards
(`src/game/rewards.ts`) and the key need per level stay as they are. No storage or profile
change, no migration.

## Why

A child plays about one world per session. In the meadow, levels 1 to 4 are the same game
with a different creature mix, so the novelty is gone after the second level. The owner
accepted the world rhythm (`.research/game/world-rhythm.md`, decisions 2026-10-22): fixed
level roles and different activities inside one world. The meadow is the pilot. It is the
world every child plays first and longest. After the owner has played it and it is stable,
a separate plan takes the rhythm to the other worlds.

## Decisions

- **Meadow levels:**

  | Id | Role | Kind | Activity icon |
  |---|---|---|---|
  | `w1-1` | Main game, gentle | `meadow`, `flyers`, 12 words, `noSpace` (as today) | `chase` |
  | `w1-2` | Calm step | new `dewdrops`: letter catch | `catch` (see icons) |
  | `w1-3` | Main game, harder | `meadow`, `mix`, 16 words, plus the gust | `chase` |
  | `w1-4` | Twist | new `invitation`: clean line | `clean` |
  | `w1-5` | Super-obstacle | `hedgehog` (as today) | `super` |

  The `bugs` and `runners` mixes are no longer used by a story level. The rescue mission
  keeps `meadow` / `mix`.
- **Level-3 surprise is a gust, not a wind turn.** Tapko stands at the left edge with the
  gloves on his right, so leaves from the left do not fit the scene. When half of the
  planned words are done, Tapko says one line ("Fúka vietor!" / "A gust of wind!"). For
  about 25 seconds the wind brings up to 3 small leaves at once: words of at most 3
  letters, 1.3 times the travel time, more than `maxActive` targets on screen. Then the
  game goes on as before. It comes once per run. A leaf that flies past is a goal, as
  always. The gust never makes the level longer.
- **Dew drops (letter catch, `w1-2`):** 5 still dew drops (`obj-dewdrop`) stand on grass
  blades across the meadow. Each drop carries one character. Typing it makes a small
  flower open in its place (a code-drawn flower is fine). After a short pause, a new drop
  appears on another free blade. There is no movement and no time pressure.
  - Characters come from the child's active letter keys (never space, Enter or digits).
    The newest group is about half of them, and the rest are weighted by `keyWeights`, so
    the weakest keys come most often.
  - No two drops on screen carry the same character, because typing locks onto the first
    letter.
  - Planned count 30. The level has a **minimum of 60 seconds** of active play, not 120:
    the calm step is a short valley.
- **Invitation (clean line, `w1-4`):** Tapko writes the invitation to the meadow party. A
  paper card (`obj-invitation`) lies in the middle of the scene with a row of 3 to 4
  single words. The words are typed from left to right, and only the leftmost open word
  can be typed.
  - A typed word turns dark ink.
  - **A slip:** the word turns red and fades out within about 0.6 s, the next word becomes
    the one to type, and the level gets 2 more words (`L.count += 2`). The extra words
    stop growing at 6 in the dragon story, from the formula (1 + story order) x 3 in the
    research. A faded word does not come back.
  - When a row is finished, the card folds into an envelope and flies to one of the
    meadow creatures, and a new card comes.
  - Planned count 14 words, with the normal 120-second minimum. Words come from
    `L.word()` with one word per target; with only 4 letters they are the usual chunks.
  - Stars come from accuracy, as everywhere.
- **Activities on the map:** every level of every world gets an `activity` (`chase`,
  `catch`, `clean`, `build`, `text`, `crossroads`, `listen`, `remember`, `rhythm`, `hide`,
  `super`), picked as follows:
  - Today's other worlds: main game `chase`, signs `crossroads`, wave, battery and storm
    `rhythm`, mole and welcome `hide`.
  - Dictation and memory levels: `listen` / `remember`.
  - Mixed levels: `listen`.
  - Every super level: `super`.

  The dot shows the icon `ui-act-<activity>` instead of the number. The number stays in
  the aria label and in a `data-tip`, and the stars stay under the icon. Without the
  image, the dot shows the number as today.
- **Catch icon:** `ui-act-catch` does not exist yet. Add the prompt row to
  `assets-src/PROMPTS.md` section 9 ("a single round shiny water drop with a tiny sparkle,
  letter catch"). Until the picture is there, the catch dot falls back to the number.
- **Left out on purpose:**
  - The key ceiling (research decision 4): it changes every world and is not needed for
    these three activities.
  - The fairy-story flip (decision 5).
  - The rescue missions using the new engines.
  - Other worlds.

## Steps

- [x] **Levels and activities:** `LevelKind` gets `dewdrops` and `invitation`.
      `LevelDef` gets `activity`, and `def()` takes it. Change the meadow row as in the
      table, and set the activity of every other level by the rule above. `hasMinLength`
      stays; add `minActiveS(l)` that returns 60 for `dewdrops` and `MIN_ACTIVE_S`
      otherwise, and use it in the runtime constructor. Tests in `levels.test.ts`: every
      level has an activity, `w1-2` / `w1-4` kinds, and the meadow ids are unchanged.
- [x] **Single letters:** `WordSource.letter(avoid: Set<string>)`: one letter key, about
      half from the focus group, the rest weighted. Never space, Enter, digits or a
      character in `avoid`. `LevelRuntime` gets `letter()`, which passes the characters on
      screen. Unit test for focus share, weights and avoid.
- [x] **Dew drops mode** (`DewdropsMode` in `meadow-calm.ts`) as decided:
      - fixed blade spots that scale with `vw`;
      - the flower opening uses particles that respect reduced motion;
      - a start line and Tapko lines in i18n.
      Register it in `modes.ts`.
- [x] **Invitation mode** (`InvitationMode`) as decided: the row, left-to-right lock
      (other words `selectable = false`), and slip handling in `onWrong` (release the
      word, fade it red, `L.count += 2` up to the ceiling). Card fold and fly-away, start
      line and Tapko lines. A slip on the first key of a word also counts. Unit test of
      the extra-word ceiling as a pure function (`extraWords(storyOrder, slips)`).
- [x] **Gust in `MeadowMode`:** a `gust` flag only for `w1-3` (variant `mix` with
      `def.index === 2`, not the rescue mission). Its start at half of `total`, its 25 s
      length, up to 3 leaves together, `maxLen` 3 and slower travel during it. One Tapko
      line. With reduced motion, the extra wind particles are left out.
- [x] **Map icons:** `level-node` shows `ui-act-<activity>` and falls back to the number.
      Super nodes use `ui-act-super` instead of `★`. Check the icon size in the dot at
      phone width and on the 1024x600 laptop. Add the `ui-act-catch` prompt row.
- [x] **Specs:**
      - `story.md`: the meadow's five levels and their roles.
      - `mechanics.md`: the level roles, letter catch, clean line, the gust and the 60 s
        calm minimum.
      - `lesson-progression.md`: letter catch trains the newest and weakest keys.
      - `visuals.md`: activity icons in the level dots.
      - `world-rhythm.md` status: the meadow pilot is in plan 66.
- [x] **Checks:** `npm run build`, `npm test`, `npm run test:e2e` (fix `play.spec.ts` if it
      expects meadow creatures in `w1-2` to `w1-4`). Then use the playwright MCP to play
      `w1-2`, `w1-3` and `w1-4` as a child, with the e2e minimum or the super profile:
      - dew drops: a letter typed opens a flower and a new drop comes;
      - gust: it comes once in `w1-3`;
      - invitation: a slip fades the word and adds 2 words, and the row flies away;
      - map: icons show in the dots;
      - no console errors.
- [x] **Hand-off:** this plan does not write the plan for the other worlds. The owner plays
      the meadow with a child first and then asks for that plan.

## Done - 2026-10-25

Shipped:
- The meadow plays the five roles: `w1-2` dew drops (letter catch, minimum 60 s), `w1-3`
  the leaf game with the gust, and `w1-4` the invitation (clean line).
- Every level dot on the map shows its activity icon.
- Specs are updated.

Changed from the plan:
- `activity` is a function (`activityOf`), not a field. It is derived from kind, style and
  super, so the level table stays as it was.
- The gust is the level variant `gust`, which also picks the mixed creatures.
- During the gust, a leaf carries one short word (two-word phrases were too long), and the
  leaves come 0.7 s apart, so their creatures do not crowd.
- In the invitation, the mouse waits on the grass. The flying creatures hover.

Left out on purpose (as decided): the key ceiling, the fairy-story flip, rescue missions
with the new activities, and the other worlds. These wait for the owner's playtest. The
`ui-act-catch` picture is still to be generated (prompt in `assets-src/PROMPTS.md` section
9); until then, the catch dot shows its number.
