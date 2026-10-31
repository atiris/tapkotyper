# 96 - Task games: how a teacher's task plays

Plan 95 gives a task its game, text source, limit, dictionary, known-letters and world options (the
owner, 2026-10-31). This plan makes a task **play** that way: one task level with five games, the
task's own intro text, its limits, and the world it is set in. Until now every task played the
practice level (`startTask` with `// TEMP: plan 96 ...` from plan 95, `.todo/.done/95-teacher-tasks.md`); that fallback goes.
**Depends on plan 95** (the `TaskSpec` fields, the Tasks page, the best run).

Affects `src/game/levels.ts` (a `task` level kind and `taskLevel(spec)`), new modes under
`src/game/modes/` (e.g. `task.ts` with the five games, sharing what fits from `kit/`), the existing
copy pieces they reuse (`dragons-flight.ts` `LullabyMode` panel, `egg-spell.ts` ribbon - reuse by
extracting shared drawing/flow into `kit/`, never copying), `src/screens/level.ts` and
`src/screens/task.ts` (launch, result), `src/game/runtime.ts` (limit end, letters taught for the
task), `src/game/words*` / the word source (dictionary fallback, known letters),
`public/i18n/{sk,en}.json` + translator notes + catalog, `.specify/game/` (a new `task-games.md`
with an index line) and `.specify/profiles/teacher-links.md`. No store change beyond plan 95
(no migration, alpha).

## Decisions (taken; do not ask)

### Common to all five games
- **Intro**: the get-ready card (the only card before play, after any new-key cards) says, sk:
  "Po stlačení medzerníka sa ti spustí úloha na písanie, ktorú si dostal. Píš pozorne a snaž sa
  písať čo najpresnejšie. Rýchlosť nie je taká dôležitá ako presnosť. Ak sa ti cvičenie nepodarí
  podľa tvojich predstáv, môžeš to potom skúsiť znova. Veľa šťastia pri písaní." (en in the same
  tone). The card's title is the task's title.
- **Scene**: Tapko always stands on the left and does not move (no walking, no scrolling); the
  world's background layers are drawn as in its levels. `world: 'current'` = the world of the
  player's next level (`nextLevel`), `'random'` = any world of the game at random, locked ones too
  (only as a background; nothing about it unlocks). No obstacles or other objects of that world.
- **Text source**: words games take `spec.words` in order, then again shuffled; text games take
  `spec.text` split into sentences (by `.`, `!`, `?`; a sentence longer than the game's line is
  split at word boundaries).
- **Known letters** (`knownOnly`): on - words with a letter the child has not learned
  (`activeKeys`, plus the shifted capitals and the space as the levels allow them) are left out of
  the task, from the word list and from the text alike; if nothing is left, the task plays the
  dictionary words (if `dictionary`) or tells the child on the get-ready card that the task needs
  letters they have not learned yet, with one button back. Off - before play, each letter of the
  task's words/text the child has not learned gets the new-key card (`showNewKey`) one after
  another, and the task may use them; they are **not** added to the child's learned keys.
- **Dictionary** (`dictionary`): on - when the task's own words/text are used up and the limit is
  not reached, the level goes on with dictionary words the child can type (the levels' usual word
  source for this player); off - the task's own words/text repeat from the start.
- **Limit**: `time` - the level runs for `minutes` of active typing (the levels' active-time clock)
  and ends then, wherever the text is. `text` - it ends when the task's own words/text are written
  once (no dictionary then). `both` - the text must be written whole; if it is done before
  `minutes`, the level goes on (dictionary or repeat, as above) until the time is up; if the time
  is up first, it goes on until the text is done. The progress bar shows the limit that is still
  open (time, else the text).
- **Slips** never send the child back: a wrong key is counted and the same place waits for the right
  key (in copy games the place is marked red as in the existing copy panels).
- **Result**: the usual end card; the run is recorded through plan 95's best-run rule.

### The five games
- **Prúd slov** (`chase`): words fly in from the right edge toward Tapko, one after another (the
  stream's pace and spacing of the levels' stream for this child), nothing but the words; a word
  typed bursts; a word reaching Tapko just passes (counted as missed, no harm).
- **Čakajúce slová** (`catch`): 3-5 words appear at free places in the right two thirds of the
  stage and wait; the child types them in any order (the first letter picks the word, as in the
  levels' waiting words); a typed word fades and a new one appears at a free place.
- **Odpis** (`copy`): the look of Údolie 4's lullaby panel (`LullabyMode`), but the purple panel
  stands on the **right** side of the stage, about 60 % of its width. It shows as many lines as fit
  (about 4); each line is filled with sentences (spaces and punctuation included) up to its width,
  never a broken word. The current line is highlighted; it is typed character by character into the
  line under it (as the lullaby does); when it is done the next line lights up; after the last line
  a new page of the text's next sentences comes.
- **Pás** (`ribbon`): the ribbon of Vajíčko 5 (`SpellRibbonMode`, as plan 93 reworks it: smooth,
  grey inactive words, soft edges), in the right half, with the frame of what is written under it;
  the hearth, egg and fire are left out. The text runs as one endless ribbon, spaces and periods too.
- **Prepis** (`transcribe`, new): two panels side by side in the right part of the stage - the left
  one (the text to copy) narrower, the right one (where it is written) a little wider (about 44 % and
  52 % of that area), so the same words wrap onto different lines and the child copies by reading,
  not by matching lines. The left panel shows the text page with the next word to copy softly
  highlighted; the right panel shows what is written, wrapping at its own width, with a caret. A
  page of the left panel turns when it is copied.

## Steps
- [x] `taskLevel(spec)` and the `task` level kind (no map place, no stars, no progress entry other
  than the task's run); launch from `startTask`, the TEMP fallback removed.
- [x] Word/text source with known letters, dictionary fallback and repeat; unit tests (filtering,
  fallback, repeat, sentence split, nothing left).
- [x] Limits time / text / both with the progress bar; unit tests for when each ends.
- [x] The intro card and the new-key cards for untaught letters (not learned).
- [x] The scene: Tapko fixed left, current/random world background.
- [x] Prúd slov and Čakajúce slová.
- [x] Odpis (shared panel drawing extracted from `LullabyMode` into `kit/`).
- [x] Pás (shared ribbon extracted from `SpellRibbonMode` into `kit/`, after plan 93).
- [x] Prepis.
- [x] Texts sk/en, translator notes, catalog; spec `.specify/game/task-games.md` (+ index) and
  `teacher-links.md`; `npx tsc --noEmit`, `npx vitest run`.
- [x] Browser check (playwright MCP, own tab, `?fast`, `window.tapkoType`): make one task of each game
  on the teacher page (time 1 min; text; both), add it on a player's Tasks page, play each to the end,
  check the scene, the limit end, a slip not sending back, knownOnly on/off (cards shown, words left
  out), dictionary on/off, current/random world, and the best run after a repeat.

## Progress
- 2026-10-31: all code steps done; `npx tsc --noEmit`, `npx vitest run` (533) and the task e2e green.
  Decisions taken while building:
  - **One sitting is one run.** The level ends only by its limit, and a task left early keeps
    nothing (as every level); so `Task` lost its in-progress fields (`seconds`, `chars`, `errors`,
    `cpm`), `taskLeft`, `restartTask`, `taskOwn` and the practice's `own` option. `recordTaskRun`
    records a finished run and says whether it became the best. No migration (alpha); old stored
    fields are ignored.
  - The regular new-key cards of the lesson path come before a task as before every level; the
    task's own untaught-letter cards follow them and do not make the letters learned.
  - Known letters: a capital needs its Shift, a text game needs the space (without it nothing is
    left); marks the child does not know are dropped from a word, a word with an unknown letter
    goes. Keys outside the lesson order get no card.
  - Nothing left + dictionary: as many dictionary words (or sentences) as the task had, so the text
    limit still means something.
  - A word let pass in Prúd slov comes again later (the text limit needs it written).
  - Copy games type word by word (Backspace restarts only the word); in Odpis a line's last word
    has no space after it, in Pás and Prepis the text's last word has none.
  - The Pás ribbon drops words of frame lines long scrolled away (`Ribbon` with `trims`), so a long
    task stays light to draw; the egg's spell does not trim.
  - Leaving a task goes back to the Tasks page; its end card has its own class (`task-run-done`),
    rows accuracy, rhythm and "best / earlier better counts".
  - A task in the e2e build keeps its own minutes (the `?minActive` override is for levels).
  - The "nothing left" card has a round X (new `close` option of `showCard`); Esc closes it too.
- 2026-10-31: browser check (playwright MCP, `?fast`, `tapkoType`): tasks put on the tester's Tasks
  page through the app's own modules (the teacher form itself is covered by the green
  `e2e/teacher-links.spec.ts`), all five games played to the end; time, text and both limits end
  right; slips count and send nothing back (Odpis marks the place red); Pás repeats the text
  without the dictionary; a random world showed another backdrop; known letters on left `les` out,
  off showed the l/e/s cards and did not make them learned; nothing left: the card with back and X,
  with the dictionary dictionary words; a better repeat replaced the best, a worse one kept it.
  Fixed on the way: Odpis's next-letter mark was the band's own colour (now a stronger yellow),
  Prepis's left panel moved a little away from Tapko. Full e2e: 82 passed; three specs fail on main
  as well (backlog), `e2e/tooltip.spec.ts` still asked for the removed Cvičenia tab (fixed).

## Done - 2026-10-31
Shipped: the `task` level (`taskLevel`, no stars or map place), the five games (`modes/task.ts`,
`modes/task-text.ts`) on the shared `TaskPlay` / `TaskFeed` (`game/task-play.ts`), limits through
the levels' minimum and `taskDone`, the intro card with the task's title, untaught-letter cards,
dictionary fallback and repeat, the world backdrop, the lullaby panel (`kit/copy-panel.ts`) and the
egg's ribbon (`kit/ribbon.ts`) extracted and shared, the task's end card with the best run, texts,
translator notes, spec `.specify/game/task-games.md`. Left out: nothing of the plan; the three e2e
specs failing on main went to `.todo/BACKLOG.md`.
