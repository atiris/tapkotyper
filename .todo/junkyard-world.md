# World 6: the junkyard, Bolt found under the pile

## Why
World 6 (the first world of the robot story) still plays the placeholder (cyclic copy) on all five
levels, and its three background bands show seams: stripes where the ends were joined badly, some
joins blended by a soft cross-fade instead of a clean cut, and left-over magenta. The owner designed
the world's five levels (2026-11-15): the child sorts a big junkyard and at its end finds Bolt and
wakes him. Every level is a whole task of its own that ends in the level; Bolt is not with the child
in this world, he lies under the pile until level 4 and wakes in level 5. In the same go the
egg mountain's spell (5:5) gets the ribbon's own icon on the map, and the transcribe game gets its
first level.

## Decisions (taken with the owner 2026-11-15; everything not said here follows the rules of
`.specify/game/mechanics.md` and the egg mountain's levels)

### The world
- The story (get-ready card of 6:1, `story.world.junkyard`): you got the job of sorting a big
  junkyard, from somewhere under the piles you hear a sad beeping. Each level's own story line
  says its task (below). Narrator in the second person, sk with tykanie, cs too.
- The same three background bands in all five levels, **redrawn**: the owner likes the present
  design (rows of piles, the crane far back, springs and bolts in front), the new layers keep it
  and fix the seams. Character at his usual place on the left, feet on the path of the near band.
- **Bolt is not drawn as the walking friend in world 6** (`src/game/runtime/friends.ts`): he is
  found in 6:4 and woken in 6:5, both drawn by those modes. From world 7 on he walks with the child
  as the spec says. The world's reward scene (`friends`) stays as it is.
- Lengths: the robot story's tier (3 min, 10 words a minute; calm step a quarter less, super level
  a quarter more), keys of the world's levels as `STORIES` says (10-14 keys).
- Map icons (`activityOf`): 6:1 chase, 6:2 catch, 6:3 crossroads, 6:4 **ribbon**, 6:5
  **transcribe**; 5:5 (`spell`) changes from the copy envelope to **ribbon** too. New activities
  `ribbon` and `transcribe` use the existing pictures `ui-act-ribbon` and `ui-act-transcribe`;
  new texts `map.act.ribbon` (sk Pás, cs Pás, en Ribbon) and `map.act.transcribe` (sk Prepis, cs
  Přepis, en Transcribe). The help's line "Transcribe is listed ahead of its levels" now names
  its first level (6:5); `help.games.*` situations lose "not on the map yet".
- New level kinds: `gears` (6:1), `tires` (6:2), `magnet` (6:3), `junkpile` (6:4), `code` (6:5);
  mode files `src/game/modes/junkyard.ts` (gears, tires, magnet; split when it passes ~800 lines)
  and `src/game/modes/junkyard-wake.ts` (junkpile, code). Each step switches its levels from
  `copyloop` to the new kind in `LEVELS`; the placeholder stays only on the levels not done yet.

### 6:1 Sorting the gears (word stream, kind `gears`)
- In front of the character (to his right) stands a wooden crate with a gear sign on it (lid closed, open on its right side where the gears roll in, seen a little from the left so that side never shows); above
  the path, over the place in front of the box, a magnet hangs from a crane cable from the top
  (cable drawn, magnet `obj-magnet`).
- Gears of **four kinds** (four pictures, a longer word a little bigger) roll in from the right
  along the path toward the box, one at a time, two from the second half, the word above each.
- Typed: the magnet shakes, the gear hops up to the upper line and rolls on into the box: it
  passes behind the box (the box is drawn over it) and is gone. Not typed in time: it rolls on the
  lower line in front of the box, past the character and fades out on the left (a goal as always,
  no failure).
- A missed gear adds **2 gears** to the level's count and their time at the story's pace, at most
  10 words in the level (as the wind's push: `Detour` / `lengthen` from `kit/egg.ts`); the first
  time the narrator says why ("Koliesko ušlo, pribudnú dve ďalšie."). The level ends when the
  minimum time and the planned gears (with the added ones) are done.
- End: the last gear drops into the box, the crate gives a little shake with a glint of gears inside; the character hops.

### 6:2 The pile of tires (waiting words, calm step, kind `tires`)
- A big pile of old tires (its own picture, **three stages**: big, half, small) blocks the path to
  the right of the character; right of the pile stands a rubbish bin (its own picture).
- Waiting words: two or three tires lie at the foot of the pile with a word each, first letters
  different. A typed tire rolls off to the right and drops into the bin; a new tire rolls down
  from the pile to the free place. Nothing comes at the child, nothing is missed.
- The pile shrinks with the active time played: stage 2 at a third of the minimum, stage 3 at two
  thirds (a small dust puff at each change). End: the last stage fades away, the way is free, the
  bands glide and the character walks a few steps on.

### 6:3 The magnet over the screws (crossroads kind, kind `magnet`)
- In the middle of the stage lies a pile of screws and gears (its own picture); above it the
  magnet hangs from the crane cable. The magnet stands on one of **five places**: centre, one or
  two steps left or right (a step about a third of the pile's width).
- Around the magnet stand up to four arrow plates, each with a word: left and right beside it,
  up above it, down below it. Typing a plate's word moves the magnet one step left or right, or
  lifts it up / lowers it a little and back (up and down keep its place). After each move the
  magnet pulls from the pile: at the centre a big screw or a gear (`obj-bolt`, `obj-gear`), one
  step off a small screw (`obj-screw`), two steps off nothing (it hums empty). A pulled piece
  flies up, sticks to the magnet for a moment and fades.
- **Two steps off, the level's active clock stops** (the minimum time does not run on, the words
  still count) until the magnet is back one step or the centre; the character says to pick the
  signs that move it toward the middle, they are harder ("Vyber smer, ktorý ho vráti k stredu. Je
  ťažší, ale vytiahne viac."), the first time and then at most every third time.
- The words' hardness by place, with the crossroads' ask ladder (`tiny` < `easy` < `normal` <
  `two` < `twoLong` < `extreme`), moved from `planet-roads.ts` into `kit/` since two modes use it:
  - centre: up and down `twoLong` (hard, they keep it centred), left and right `easy`;
  - one step off: the plate away from the centre `tiny` (extremely easy), toward the centre
    `extreme` (super hard), up and down `normal`;
  - two steps off: toward the centre `twoLong`, up and down `normal`, no plate away.
- The plates' first letters differ; a slip and Backspace work as at every crossroads (two slips
  in one word bring a slightly easier word with a call to slow down, as on the mountain).
- End: the minimum time and words done; the magnet goes up with a last big gear, the character
  hops.

### 6:4 The beeping pile (ribbon, kind `junkpile`)
- In the middle stands a big pile of mixed junk (its own picture, **three stages**), a soft
  beeping sounds from it now and then (a synthesized two-note beep about every 6 s, under the
  music, none with sound off). Right of it a row of three bins (the 6:2 bin picture three times).
- At the top of the stage runs the **ribbon** (`kit/ribbon.ts`) with its written frame below it,
  over the whole width minus the margins (not the right half as on the mountain, the scene is
  below it). Ribbon rules: a slip starts the word again and adds a word (at most 10).
- Each finished word: a thing pops out at the pile's edge and rolls to one of the bins and is gone
  (one of `obj-tire`, `obj-crate`, `obj-can`, `obj-spring`, `obj-nut`). Each slip: a thing appears
  above the pile, falls onto it and vanishes into it; the pile picture does not grow. Only these few
  pictures, no extra pile pictures for the things.
- The pile shrinks with the level's progress (stage 2 at a third, stage 3 at two thirds). End:
  the last stage fades and **Bolt lies** where the pile stood (`robot-broken-lying`), beeping
  once, not moving; the character looks surprised. The level's end line says he does not react.

### 6:5 Bolt's program (super level, the first transcribe, kind `code`)
- Bolt lies right of the character as 6:4 left him. To the right two blocks: the **source**, his
  program on an old green monitor screen (drawn, monospace, a few lines), and below or beside it
  the **target**, an empty screen of a **different width**, so the lines break elsewhere: the
  child keeps track of where they are in the source (the transcribe game of the help).
- The text: sentences of the level's known words (the ribbon's sentence source of `egg-spell`
  rules: 4-6 known words, space and period when known), as many words as the minimum asks.
- Typing: the right letter is written into the target with a blinking cursor; the source greys
  the words already copied (no other mark). A wrong letter is not written, counts as a slip and
  **adds one word** at the end of the source and one word's share of the minimum time (at most 10
  words; after that a slip only counts) with "Chybička! Do programu pribudlo slovo." the first
  time. Nothing is ever erased.
- Each finished line lights one more light on Bolt (his eyes glow brighter, drawn glow).
- End (about 4 s): the last letter, Bolt's eyes light fully, he beeps, gets up and stands
  (`robot-broken`), hops with the character. Reward: the world's reward scene `friends` as now.

### Pictures (section 7 of `assets-src/PROMPTS.md`, the common prompts of sections 3 and 4)
- **Backgrounds:** all three `bg-junkyard-far|mid|near` drawn again, keeping their present design
  (attach the present raw layer from `assets-src/` and ask for the same scene redrawn clean; this
  is the one case where Gemini copying the composition is wanted), then the section 3 procedure
  (`scripts/bg-seam.mjs`: far with the seam repaint, mid and near as sheets of strips, `quilt`
  with the same strip as donor, `lift`). Check each layer: `preview` with the red ticks, no stripe
  of another tone at the joins, no cross-fade, and a node pixel check of the final webp that no
  visible pixel is near magenta (r and b over 180, g under 90, alpha over 40) in mid and near.
  Record the lessons in "Lessons from generating".
- **Objects** (on magenta, no face, no eyes, no text): `obj-gear-1..4` (four different gears:
  golden, silver, copper, blue painted), `obj-gear-box` (a wooden crate with a closed lid and a gear sign
  painted on its front, seen a little from the left so its right wall never shows; owner 2026-11-15), `obj-tire-pile-1..3` (one pile of old tires in three sizes,
  attach the first to the others), `obj-bin` (a round metal rubbish bin with a lid, open),
  `obj-screw-pile` (a low pile of screws, nuts and small gears), `obj-junk-pile-1..3` (one pile of
  mixed old things in three sizes), `robot-broken-lying` (Bolt of `robot-broken` lying on his
  back, eyes dark, attach `robot-broken`). Existing pictures reused: `obj-magnet`, `obj-bolt`,
  `obj-screw`, `obj-gear`, `obj-tire`, `obj-crate`, `obj-can`, `obj-spring`, `obj-nut`,
  `robot-broken`. Every picture keeps a drawn fallback.
- The picture work is a long visual loop: give it to a subagent (generating, judging, the seam
  procedure) that returns a short verdict and file paths.

## Affected
- `src/game/levels.ts` (kinds, `LEVELS`, `activityOf`, `CALM_KINDS`, units), `src/game/modes.ts`,
  new `src/game/modes/junkyard.ts`, `src/game/modes/junkyard-wake.ts`, `src/game/modes/kit/`
  (the ask ladder from `planet-roads.ts`), `src/game/runtime.ts` (`tapkoOnStage`, a mode-held
  clock stop for 6:3 if the runtime has none), `src/game/runtime/friends.ts`, `src/audio/` (the
  beep), `src/screens/map.ts` and `help.ts` only through the activities.
- Texts in `public/i18n/{sk,en,cs}.json`, `src/i18n/catalog.ts`, `public/i18n/translator/en.json`.
- Specs: `.specify/game/story-later.md` (world 6 rewritten, Bolt walks from world 7), `story.md`
  (only five built worlds: now six), `mechanics.md` (map icons ribbon and transcribe, the
  transcribe game, the magnet's held clock, the gears' +2), `.specify/experience/help.md`.
- Pictures: `assets-src/PROMPTS.md`, `public/assets/` + manifest.
- Tests: `src/game/modes/idle.test.ts`, `src/game/levels.test.ts`, unit tests of the magnet's
  word ladder and the transcribe's line breaking, `scripts/perf.mjs` scenes `junkyard-1..5`,
  `scripts/test-affected.mjs` `RULES` for the new modes, `e2e/play.spec.ts` if it plays world 6.
- No store change (alpha): no profile fields.

## Steps

### Step 1 - Specs, texts, map icons, Bolt out of world 6
- [x] Specs: `story-later.md` world 6 as above (WHAT and WHY), Bolt's intro paragraph (with the
  child from world 7; found and woken in the junkyard), `story.md` built worlds, `mechanics.md`
  (icons, transcribe, magnet clock, gears' +2), `help.md`.
- [x] Texts sk/en/cs with situations: world story, the five level lines, end lines, the
  narrator's lines above, `map.act.ribbon`, `map.act.transcribe`; `help.games.*` situations.
- [x] `activityOf`: `ribbon` for `spell` (and later `junkpile`), `transcribe` for `code`; help's
  games list unchanged in order; `friends.ts` without Bolt in world 6.
- [x] Checks: `npx tsc --noEmit`, `npm test`, `npm run i18n -- --missing`, map in the browser
  (5:5 shows the ribbon icon).

- Progress (2026-11-15): done. Decisions: only the texts the step reads went in (the world story,
  map.act.ribbon/transcribe, help.games situations, the transcribe help line naming Bolt's program);
  the five level lines, end lines and narrator lines land with their modes in steps 3-5, because
  unused-keys.test.ts fails on a text no code reads. activityOf maps spell to ribbon now; junkpile
  (ribbon) and code (transcribe) get theirs when the kinds exist. Bolt is left out of the junkyard in
  friends.ts by world id; robotFor keeps its broken look for the 6:4/6:5 modes. The e2e "robot
  story" spec now checks Bolt walking in the workshop's first level.

### Step 2 - Pictures and backgrounds
- [x] Prompts into section 7, generation via skill `gemini-images` in a subagent, backgrounds by
  the section 3 procedure, the magenta pixel check, `npm run assets`; lessons recorded.
- [x] Checks: `npm run assets` clean, the seams looked at in `preview`.

- Progress (2026-11-15): backgrounds and `obj-gear-1..3` done; Gemini's daily limit stopped the
  rest, which moved to step 5b (the modes draw their fallbacks until then). Decisions: the far
  seam was joined by `quilt` with the far picture as its own donor (no Gemini repaint, limit);
  mid is strip 1 of the redrawn sheet lifted 81 px, near strip 3; the near band keeps the old
  height (sand from row 675, the character's path unchanged). Seam scores far 7.1 (old 11.0),
  mid 2.5, near 0.2; magenta pixels in the final webp 0 in every layer (the old mid had 22).
  Old raw layers kept in `assets-src/bg-work/junkyard/old/`. The in-game look of the bands is
  checked with the step 3 play-through.

### Step 3 - 6:1 gears and 6:2 tires
- [x] Kinds `gears`, `tires` in `levels.ts`, modes in `junkyard.ts`, registered in `modes.ts`,
  `tapkoOnStage`; drawn fallbacks for every picture.
- [x] Tests: idle test for both, unit test of the gears' +2 cap; `npm run test:affected`; both
  played in the browser (`?fast`, `tapkoType`) to the end card.

- Progress (2026-11-15): done. Decisions: the owner changed the gear box mid-step into a wooden
  crate seen a little from the left (right wall never shows, gears roll in from the right), so
  the end is the crate shaking with a glint of gears (no flaps to close); prompt, spec and this
  plan updated, the crate regenerated by a subagent. A missed gear keeps the stream's rule (its
  word comes again) and adds two gears on top (`Detour`, at most 10 words), as the wind's rush.
  The tire pile shrinks with `L.share()` (the slower of words and time, so the last stage lines
  up with the end) rather than raw active time. On a wide stage the pile stands at most 820 units
  right of him (the bin 220 further), so the scene does not split to the far edge. Single tires
  use the existing `obj-tire` (it has a face; 5b may give it a plain one). Played headless (own
  Playwright script, the shared MCP browser was in use) to both end cards; the only page error
  came from the stale tester profile without `settings.theme` (`src/ui/sky.ts`), not the modes.

### Step 4 - 6:3 the magnet
- [x] The ask ladder moved into `kit/` (planet and mountain crossroads unchanged), the `magnet`
  mode, the held clock two steps off, the hint line.
- [x] Tests: unit test of the hardness by place and of the held clock, idle test,
  `npm run test:affected` (the planet crossroads specs too); played in the browser, magnet walked
  to both edges and back.

- Progress (2026-11-15): done. Decisions: the magnet lives in its own file
  `src/game/modes/junkyard-magnet.ts` (junkyard.ts would have passed ~800 lines); what the gears
  and the magnet share (the junkyard's feet and his place, the gear fallback, the magnet on the
  crane cable) moved to `kit/junk.ts`, the ask ladder with `EASIER_AFTER` to `kit/ask.ts`. The clock
  stop is a mode getter `clockHeld` read by the runtime (and by the idle test's play harness). A
  slip does not make a plate vanish as at the planet's crossroads (the plates are the magnet's
  only ways back): two slips in one plate's word give it a word one step easier on the ladder, with
  the mountain's `story.roadCareful` call (its situation now names the magnet too). The plates are
  arrow signs (drawn) beside the magnet with the word beyond them; the side words sit by their
  width so a long word never covers the magnet. perf.mjs got the scenes junkyard-1..3 (4 and 5
  come with step 5). Browser: played headless to the end card; a probe showed the centre's four
  plates and the left edge with only the way back, up, down and the hint line. Mid-step the owner
  replaced `obj-gear-box` with their own picture (raw in `assets-src/`, webp rebuilt).
  `npm run assets` also found six step-5b raw pictures saved by the bridge (`obj-bin`,
  `obj-gear-4`, `obj-junk-pile-1`, `obj-screw-pile`, `obj-tire-pile-1`, `robot-broken-lying`);
  they are not reviewed, so their webps were left out of this commit for 5b.

### Step 5 - 6:4 the beeping pile and 6:5 Bolt's program
- [x] `junkpile` on the ribbon kit (top placement), things rolling to the bins, slips dropping
  onto the pile, the beep, Bolt lying at the end; `code` with the two screens of different widths,
  the slip adding a word, Bolt's lights and getting up.
- [x] Tests: unit test of the transcribe line breaking and the added words cap, idle tests,
  `npm run test:affected`; both played in the browser to the reward scene.

- Progress (2026-11-15): done, both kinds in `src/game/modes/junkyard-wake.ts`. Decisions: the
  ribbon and its frame start just right of his head (`HERO_X + TAPKO_H * 0.45`, as the spell's
  never-over-Tapko rule) and run to the right margin, since the frame's bottom reaches his head's
  height; the bins, pile picture helpers and `pileStage` moved to `kit/junk.ts`, the sentence of
  known words and the slip's inner word (`knownSentence`, `innerWord`) to `kit/ribbon.ts`, shared
  with the egg's spell. The pile shrinks with `L.share()` as the tires do. The beep is a new sfx
  `robotSad` (two falling square notes; `robotHappy` rises when he wakes) with little sound waves
  drawn at the pile, so it shows with sound off too. The transcribe is monospace and breaks lines by
  letter count (`breakLines`, 0.62 em a letter at most, so it never overflows), pure and unit-tested;
  the screens stand side by side (source 44 %) on a wide stage and stacked (source 78 % wide) on a
  narrow one. A slip on the program's last word adds a word and gives that word its space. A slip
  in the transcribe keeps the typed letters (nothing erased); Backspace still restarts the word as
  in every level. Bolt's lying fallback is his standing picture turned on its back until 5b's
  picture is reviewed; his eye glow sits where the raw lying picture's face is (5b may tune
  `FACE_DX`). The e2e placeholder test moved to the workshop and a junkyard spec plays all five
  levels. Played headless (shared MCP browser in use) to both end cards: no page errors; the hero's
  speech bubble covers the top-left corner of the ribbon and the source screen while it shows.

### Step 5b - The pictures Gemini's limit left out
- [x] `obj-gear-4` (`obj-gear-box` done in step 3: the owner's closed wooden crate), `obj-tire-pile-1..3`, `obj-bin`, `obj-screw-pile`,
  `obj-junk-pile-1..3`, `robot-broken-lying` (prompts in `assets-src/PROMPTS.md` section 7,
  "World 6 rework"). Seven were queued in the bridge on 2026-11-15 (gemini_status job ids
  gmwi4xykq24a3d8, gmwi4hrjl7383c5, gmwi4htpg27fd3f, gmwi4hvz9a6f022, gmwi4hydi6accd7,
  gmwi4i0ub180d84, gmwi4i40e408266) and may already be saved unreviewed in `assets-src/`: review
  each (subject, no face, clean magenta, whole object), redo bad ones, then the piles' stages 2-3
  with stage 1 attached; `npm run assets`, PROMPTS.md status. In a subagent.
- [x] Checks: the modes pick up the pictures (a screenshot of 6:1, 6:2, 6:4 in the browser).

- Progress (2026-11-15 20:50): Gemini's limit again; the owner paused the picture work until
  22:22. Meanwhile the gemini-bridge plugin changed (claude-workflow e55ac8b): a job that hits the
  daily limit stays queued (reason `limit`) at the front of the queue instead of failing, and
  `gemini_wait` returns at once with `limit: true`; failed jobs get **Retry** in the popup. The six
  raw pictures in `assets-src/` were partly reviewed by a stopped subagent (no verdicts kept): review
  them again from the start.
- Progress (2026-11-15): done. Every picture reviewed; `obj-tire-pile-2` and `obj-junk-pile-2..3`
  redone without an attachment (with stage 1 attached Gemini returned it almost unchanged), lesson
  in PROMPTS.md. Played headless in the dev server: all five levels draw the webps (all fetched
  200), no page errors; the piles' stages and the lying Bolt sit on the path without overlaps.

### Step 6 - Full verification and done
- [ ] `npm run build`, `npm test`, `npm run test:affected -- --base <commit before step 1>`, the
  e2e specs of the map, help and levels.
- [ ] `node scripts/perf.mjs --budget --only junkyard-1,junkyard-2,junkyard-3,junkyard-4,junkyard-5`
  and the same with `--machine slow --low`.
- [ ] Playwright MCP play-through of the whole world with the tester profile, checking texts in
  sk, the icons on the map (5:5, 6:4, 6:5) and the end cards.
- [ ] Move to `.todo/.done/` with `## Done - YYYY-MM-DD`, left-out items into the backlog, queue
  line removed.
