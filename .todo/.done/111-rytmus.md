# 111 Rytmus: the beat game (world 1), and speed called speed

The owner's decisions of 2026-11-07 on the research `.research/learning/rhythm-measure.md` and
`.research/game/rhythm-game.md` (commit 700ba92); where they differ, the owner wins:

1. Rytmus is a side game in every world except the last world of each story (that one has the hero's
   journey). Icon: a metronome.
2. The rocket stays driven by typing **speed**. The story lines that say rhythm drives it are fixed, and
   they add that flying slower without errors is much better than fast with errors. Speed is called
   "Rýchlosť" wherever it shows (the top bar's gauge, end cards, statistics, the teacher's tables). The
   real rhythm measure is built where this game needs it (the beat measure); the free-typing evenness
   measure stays in the backlog.
3. A falling game: letters fall from letter clouds down lanes coloured like the on-screen keyboard's
   fingers; the next letter is clearly marked; the next one is already falling when one lands; the beat
   lands exactly when a letter lands (music generated from patterns on one clock); the catch window
   around the landing from the research; an uncaught letter splats on the ground (space worlds: falls
   over the edge - later); Tapko holds a basket and catches the letters in it.
4. Generated pictures (not composed at runtime): the basket in 5 fill levels (flat and shallow, no handles; the
   full one with about 10 letters first, the others by removing letters from it in the same chat), 3 compact
   clouds, each drawn only a little wider than its lane (also
   drawn mirrored). The falling letter is drawn in front of its cloud, readable.
5. Higher stories: a lane's letter changes once (story 1), twice (story 2), three times (story 3) per
   round: the cloud dissolves and a new cloud with the new letter comes in.
6. Built for world 1 now (meadow): unlock with 4 ready letter keys, the node after the parrot, the end
   card (accuracy, rhythm, tempo reached, letters caught), progress saved. The spec covers every world.

Open point kept: the catch window (half a beat before to a quarter after the landing; an earlier press
does nothing). Play-testing decides whether it feels bad for children; the report says so.

## Affected
- New: `src/game/beat.ts` (pure rules: lanes, tempo steps, phrase rule, catch window, letter plan, lane
  changes, the beat measure), `src/game/beat.test.ts`, `src/game/modes/rhythm.ts` (the mode),
  `src/audio/beat-music.ts` (pattern music on the shared clock), `e2e/rhythm.spec.ts`,
  `.specify/game/rhythm.md`.
- Renamed: `src/game/rhythm.ts` -> `src/game/speed.ts` (`Rhythm` -> `Speed`, it measures speed),
  its test; `LevelRuntime.rhythm` -> `speed`; `rhythmPic` -> `speedPic`, `rhythmRing` -> `fillRing`,
  `rhythmTrend` -> `speedTrend`; i18n keys `level.rhythm`, `end.rhythm`, `parent.rhythmTrend`,
  `teacher.col.rhythm`, `teacher.sets.rhythm`, `task.result.rhythm` -> `...speed`.
- Changed: `src/game/levels.ts` (kind `rhythm`, `rhythmLevel`, `rhythmLetters`, `rhythmOpen`,
  `RHYTHM_WORLDS`), `src/game/modes.ts`, `src/game/mode.ts` (hooks `waitKey`, `doneSfx`, `ownMusic`),
  `src/game/runtime.ts`, `src/game/runtime/pause.ts`, `src/screens/level.ts` (end card),
  `src/screens/map.ts` (node), `src/audio/audio.ts` (the beat's output), `src/input/input.ts` (key event
  time), `src/storage/schema.ts` + `store.ts` (progress fields), `public/i18n/{sk,en}.json`,
  `public/i18n/translator/en.json`, `src/i18n/catalog.ts`, `src/styles.css`, `scripts/assets.mjs`
  (basket set), `scripts/perf.mjs` (scene), `src/game/modes/idle.test.ts`,
  `assets-src/PROMPTS.md` (section 13), specs `.specify/game/{index,mechanics,story}.md`,
  `.specify/learning/feedback.md`, `.specify/architecture.md` (audio clock line).
- Storage (alpha, no migration, defaults): `progress.rhythm: Record<string, RhythmRecord>` (per world:
  tempo to start with, when, last round's rhythm, highest tempo held) and `progress.rhythmWon: number[]`.

## Decisions
- **Letters:** the world's letter keys (as the parrot: the lesson order up to the world's last level)
  that are ready (`isKeyReady`); the super profile takes all of them. Lanes: one per finger of those
  letters (thumbs never), keyboard order from the left little finger; a finger with more letters starts
  with the first in lesson order and its others are the lane's change letters. World 1 opens with at
  least 4 such letters (d f j k); later worlds will open with their super level, like the range.
- **Fall:** a letter leaves its cloud `F = max(1.6 s, min(3 s, 2.5 T), 1.3 T)` before its landing
  (`T` = 60 / tempo), falling at an even speed, so the next one is always in the air. Exactly one lands
  per letter beat.
- **Catch window:** from 0.5 T before the landing to 0.25 T after. The right key earlier does nothing
  (the letter blinks "počkaj"; the first time Tapko says to wait for the basket). Any other key at any
  time is an error (wobble, the right lane flashes). "V rytme" within 0.12 T. Missed: not an error.
- **Tapko** stands on the ground with the basket in front of him; the right key in the window makes him
  dash under the lane, the letter drops into the basket on the landing beat with a note of the music
  (at once when caught after it). Uncaught letters fall on, bounce off his basket if he stands there,
  and splat on the ground. The basket's picture follows the share caught of the letters a round at the
  start tempo would bring (empty, 2, 4, 6, full).
- **Tempo** (letters a minute): 30 36 42 48 54 60 70 80 90 100 110 120; start = the world's kept tempo
  (one step lower after 7 days), else the step at or below 70 % of the usual speed of the last 14 days,
  30..60, a new child 30. Phrases of 16 landings; the next phrase's tempo is decided when its first
  letter leaves the cloud, on the current phrase's letters resolved by then: up a step with accuracy
  >= 95 % and caught >= 90 %, down with accuracy < 85 % or caught < 70 %. Below 60 the music plays
  double time (a letter every second beat).
- **Letter order** per phrase: phrase 1 the two index lanes alternating, 2 mirror pairs, 3 neighbours of
  one hand, then weighted random (the lowest third by recent accuracy, at most 3, weight 1.5); no letter
  twice in a row in the first half of the round.
- **Lane change** (story tier + 1 per round, only on lanes with a spare letter of the same finger; none
  in world 1): spread evenly over the round, no letter of that lane in the air 1.2 s around it.
- **Round:** 3 minutes of song time (`fast()` in dev/e2e), pauses stop it; one count-in bar first. The
  last landing is within the 3 minutes, then a closing chord. No paws, no Enter marks, no stars; counts
  in the statistics and the lesson like the parrot (`completeStay`).
- **No time pressure** (parent switch): the song waits while the due letter sits on the basket's rim;
  no rhythm score is kept for the round.
- **Beat measure** (`beatScore`): offsets of the catches from their landings, minus their median (the
  child's lean), mean absolute / T = MAO; raw = 100 * clamp((0.25 - MAO) / 0.19) * caught/due; shown =
  min(raw, accuracy cap 100 * clamp((acc - 0.75) / 0.2)). The HUD ring takes the last 16 landings
  (a "listening" state before 8); the round's score needs 12 landings. Words: 0-39 "hľadáme rytmus",
  40-69 "pekný rytmus", 70-89 "plynulý", 90-100 "ako hodinky".
- **Clock:** one song clock, advanced by the frame time and paused with the game; key times come from the
  key event's own time stamp; notes are scheduled 0.2 s ahead, mapped to the audio clock with the
  context's output time stamp, so the sound reaches the speaker at the landing. Sound off: no audio, the
  same clock.
- **Music:** meadow style, at most 6 voices: soft kick, shaker eighths, bass on the chord root, marimba
  melody from a seeded pentatonic pattern per section (A A B A C A), a woodblock count-in, a bell note
  for each catch on its landing, a short run when the tempo steps up, a closing chord.
- **HUD:** progress bar (song time), accuracy ring, rhythm ring (number), metronome ring with the tempo.
  The speed gauge is not shown here.
- **End card:** title "Rytmus dohraný!", picture the basket at its fill, rows Presnosť, Rytmus (score and
  word), Tempo (highest tempo held for a whole phrase, letters a minute), Chytené X z Y. Green line: a
  new highest tempo in this world, else a rhythm better than the last round, else the level news.
  Buttons "Hrať znova", "Na mapu". The node's check: once a phrase at the world's target tempo
  (the smallest step at or above the story's words a minute x 5: 42, 54, 60) went at >= 95 % accuracy
  and >= 90 % caught.
- **Weak devices:** still background (midOnly + drift like the parrot), clouds with their letters and
  falling letters drawn once per look into own canvases and copied; the next letter is the runtime's
  sharp word label; Simple: no sparkle particles.

## Steps
- [x] 1. Speed is speed: rename code and texts, story lines of the rocket, slow-and-accurate line; tests
- [x] 2. `beat.ts` rules and beat measure with unit tests; backlog entry narrowed
- [x] 3. Mode, music, runtime hooks, levels/map/level screen, storage, i18n, catalog; idle test
- [x] 4. Pictures: process the Gemini set (`npm run assets`, basket set), lessons in PROMPTS.md
- [x] 5. e2e for the node and one round; perf (`node scripts/perf.mjs` normal and `--machine slow --low`)
- [x] 6. MCP play-through: Full and Simple, sound on and off; screenshots in `.playwright-mcp/`
- [x] 7. Specs: `.specify/game/rhythm.md` and the touched specs; plan to `.todo/.done/`

## Done - 2026-11-07
Shipped: speed is called speed everywhere (code, texts, specs) and the rocket's story says speed drives it,
slower without mistakes being better; `src/game/beat.ts` (rules, song, beat measure) with unit tests; the
Rytmus mode with its pattern music, the meadow's node (open with 4 ready letters), the end card, progress per
world; pictures (a handle-less tray basket in five fills made by removing letters from the full one, three
compact clouds, the metronome); e2e `e2e/rhythm.spec.ts`; perf scene `rhythm` (normal p50 16.7 / p95 16.8,
slow Simple p50 16.7 / p95 16.8, under meadow-1). Catch window kept as researched; a bot played it, no child yet.
Left for later (spec `.specify/game/rhythm.md`): the other worlds (`RHYTHM_WORLDS`; their unlock with the super
level is coded), letters falling over the edge in space worlds, the tap calibration, other themes and music
styles; the free-typing evenness measure stays in the backlog (P1 "Rhythm of the levels").
