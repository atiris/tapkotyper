# Rytmus: one shared tempo, fairer tempo steps, the treble clef and livelier notes

The owner's requests of 2026-11-08. Specs to keep in step: `.specify/game/rhythm.md` (tempo, notes,
clef), `.specify/profiles/statistics.md` (My rhythm row, the chest), `.specify/profiles/profiles.md`
(super fill), `.specify/companion/` or wherever the map character is described (the whistle).
No store migrations (alpha): new fields get defaults, dropped fields are just removed.

Affected: `src/game/beat.ts` (tempo rules), `src/game/modes/rhythm.ts`, `src/screens/level.ts`
(saving a round), `src/storage/schema.ts` + `store.ts`, `src/game/rhythm-notes.ts`,
`src/game/rewards.ts` (chest), `src/ui/notes.ts`, `src/screens/stats.ts` (My rhythm row),
`src/screens/map.ts` (the character's line, the whistle), `src/app/super.ts` + `src/ui/service.ts`
(fill), `public/i18n/*`, `src/styles.css`, tests. No server, no DB.

## Steps

- [x] **1. One tempo for the whole platform.** Replace the per-world `progress.rhythm[world].tempo`
  with one `progress.rhythmTempo: number | null` (null: never played) and its date
  `progress.rhythmTempoAt`. Every Rytmus round of every world starts from it and saves its next base
  into it; a better round in one world is where the next round in any world starts. The first round
  ever: 70 % of the usual speed, at most the played world's target tempo (as today). Drop the cap of
  1.5 x the world's target (`BASE_MAX`): the shared tempo follows the child, only `TEMPO_MIN`/`TEMPO_MAX`
  bound it. Keep per world only what is still per world: the last score `rhythm`, the highest tempo
  held `top`, and `rhythmWon` (the node's check). Drop `RhythmRecord.tempo`/`at` and the
  "one step lower after a week without Rytmus" rule (`KEPT_DAYS`): the tempo never drops by itself.
- [x] **2. Tempo steps of 10 % and judged by timing, not typos.** `TEMPO_STEP` 0.10 (a round's base to
  the next). The phrase step (`phraseStep`) takes the phrase's caught letters' timing and its misses,
  not wrong keys:
  - **up** (+1): at least 90 % of the due letters caught and at least 70 % of the catches "in time"
    (the middle half of the window, `timing() === 'inTime'`);
  - **keep** (0): caught at least 90 % and in time 40-70 % (shaky but still in rhythm);
  - **gently down** (-0.5, half the usual drift speed): caught at least 90 % but in time under 40 %
    (very shaky);
  - **down** (-1): fewer than 90 % caught (misses).
  Wrong keys (typos) do not enter the step at all; they still count in accuracy, stats and the score as
  today. `drift` and `stepWindow` accept the half step (the window widens only on a full step down).
  Update the unit tests in `beat.test.ts` / `rhythm.test.ts` for the new rules (a child on the beat
  climbs, typos alone never lower it, misses do, very shaky catches lower it gently).
- [x] **3. Super player sets the tempo.** The service fill dialog gets a field "Tempo Rytmu" (letters a
  minute, `TEMPO_MIN`-`TEMPO_MAX`, one line hint), opening on the current tempo (or a random 40-80 for
  a new super player); `fillProgress` writes `rhythmTempo`. The fill also gives rhythm notes: one note
  for every filled finished world, all of them or all but one at random (like the parrots, a new
  checkbox "Všetky noty" with its hint), each dated today so none fades at once; `rhythmWon` for those
  worlds.
- [x] **4. The treble clef.** Held while every **open** world (`isWorldUnlocked`) has at least one note
  in `rhythmNoteList` and there is at least one note. Picture `ui-treble-clef` (made 2026-11-08,
  already in `public/assets`, prompt in `assets-src/PROMPTS.md`). In My rhythm it stands before the
  notes' row while held (tooltip "Husľový kľúč: máš notu z každého otvoreného sveta." / en). It is in
  the treasure chest for **5 points**: `CLEF_POINTS = 5` next to `PARROT_POINTS`, in `MAX_CHEST` and
  `chestPoints`, and the chest's tooltip text (`progress.chest`, sk/en/translator) names it: "...,
  odznak Papagáj 7 bodov a husľový kľúč 5 bodov."
- [x] **5. Notes fly away like parrots, and the character says so.** Keep the fading rule (a random note
  every `NOTE_FADE_DAYS` days without Rytmus). New: the map tells it once, in the character's map
  bubble (the narrator line on the map, like the lines that already appear there): "Bez Rytmu ti uletela
  nota." / with the clef lost by it: "Bez Rytmu ti uletela nota a s ňou aj husľový kľúč. Zahraj si
  Rytmus a získaš ho späť." (en likewise). A new field `rhythmNotesTold` (the faded count already told)
  keeps it to once. Update the old count tooltip text (`progress.rhythmNotes`) so it says notes fly
  away, not disappear.
- [x] **6. Livelier note colours.** The four note pictures each have one fixed colour, so a row can show
  three blue ones in a row. `notePic` gets a colour of its own per note: a CSS `filter: hue-rotate()`
  (plus a small `saturate`) picked from a palette of 8 well-spread hues by the note's own random
  source (stable for that note), never the same hue or the same kind as the note before it in the row
  (pass the previous note's choice). Check the result stays readable on the light and the dark look
  and in high contrast (there: no filter).
- [x] **7. The tempo in My rhythm.** After the notes' count, the child's tempo as a chip like the
  others: the small Rytmus drum `ui-act-rhythm` and the number (`rhythmTempo`), tooltip "Tvoje tempo v
  Rytme: {n} písmen za minútu." / en; hidden before the first round.
- [x] **8. The character whistles.** With the clef held, the child's character on the World map (the
  map figure) whistles now and then: at a random moment every 10-30 s, 3-5 small note pictures
  (`ui-note-*`, with the step 6 colours) leave its mouth one after another (about 0.25 s apart),
  each growing from about 40 % to 100 % of a small size, rising up and to the right on a gentle wavy
  path (a sine sideways sway, a slightly different angle and speed each), and fading out over about
  1.6 s. Pure CSS/WAAPI on DOM elements over the figure, no sound, pointer events off; nothing with
  reduced motion or simple graphics; timers stop when the map is left.
- [ ] **9. Checks.** `npx tsc --noEmit`, `npx vitest run`, `npm run build`, the e2e specs touching
  Rytmus, the progress popup, the service fill and the map (`rhythm`, `play`, `service`, `parrot`,
  `layout`). Browser check with the Playwright MCP: a round in one world then another starts from the
  saved tempo; My rhythm with the clef, coloured notes, the tempo chip; the chest tooltip; the map line
  after notes faded (set `rhythmNotesAt` back in the page's live store); the whistle on the map
  (a screenshot sequence); the super fill's tempo and notes.

## State
- Step 1: no `rhythmTempoAt`: nothing reads a tempo date once the week rule is gone, and `rhythmNotesAt` already keeps the last round's day.
- Step 2: catches while the song waited (after a miss or a pause, without time pressure) count as caught but not in the in-time share; a phrase with no timed catch counts as in time. A gentle step down keeps the round's length too (only a full step down adds a phrase).
- Step 3: `rhythmWon` goes to the worlds with a filled note (the same all-or-all-but-one pick); the tempo field takes whole numbers and is clamped to the range on fill.
- Step 4: `CLEF_POINTS` and `hasClef` live in `src/game/rhythm-notes.ts` with the notes (not in parrots.ts); the clef is judged on the notes kept, and My progress takes the due fades before its chips so the chest and the shelf agree.
- Step 5: plural lines for more notes at once (`map.notesFlown`, `map.notesFlownClef`) beside the plan's singular ones; the clef counts as lost when it was held as the map opened and is not after the fades (fades already taken on another screen tell no clef); `rhythmNotesTold` resets with `rhythmNotesFaded` at each round. The line shares the bubble with the flown parrots' line.
- Step 6: the eight hues are target hues (15, 60, ... 330 degrees); each picture is turned from its own colour to it, so "never the same hue" holds for what the child sees. A note the same kind or hue as the one before takes the next one; the end card's single note has no note before it.
- Step 7: the tempo chip shows also while no note is kept (after the line on how to earn one), as the tempo is kept without notes.
- Step 8: the mouth is one fixed point of the figure's box (53 %, 38 %) for every companion kind; whether the clef is held is decided as the map opens.
