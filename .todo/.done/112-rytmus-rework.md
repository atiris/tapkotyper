# 112 Rytmus rework: glowing catch band, moving basket, rhythm notes

The owner played the first Rytmus (plan 111) and asked for a different feel and a reward.
Affected: `src/game/beat.ts`, `src/game/modes/rhythm.ts`, `src/game/runtime.ts` + `src/game/mode.ts`
(key hook), `src/screens/level.ts` (end card), `src/screens/stats.ts` (My progress), `src/storage`
(two new progress fields with defaults, no migration: alpha), `src/audio/audio.ts` (a note plays a
world's track), `public/i18n/{sk,en}.json` + translator, `public/assets` (baskets, notes),
`.specify/game/rhythm.md`, `.specify/profiles/statistics.md`, e2e `rhythm.spec.ts`.

## Decisions
- **Character** stands at the left like in the other hero modes and never moves; only the **basket**
  moves. The basket is smaller (its front 50 units high) and lower: its bottom at the character's
  feet.
- **Catch band**: behind the basket a soft glowing band in the space bar's colour (white glow, no
  finger uses it). Its lower edge lies at 2/3 of the basket's height from its bottom and stays there;
  it reaches up by the distance a letter falls during the catch window. The ideal moment (the beat,
  the music's landing) is a letter in the middle of the band.
- **Catch window** is symmetric around the beat: ±w beats. w starts at 0.35, grows by 0.05 (to 0.5)
  after each phrase that steps the tempo down, shrinks by 0.05 (back to 0.35) after one that steps up.
  The band grows upwards with it. A drop keeps the w of its phrase.
- **Fall**: a letter falls at an even speed from its cloud so that it is in the middle of the band on
  its beat; an uncaught letter falls on through its lane, which reaches the stage's bottom edge, and
  disappears below it (no splat). The lanes are a little more saturated; the clouds a little closer
  together.
- **Letters**: white discs with a soft blurred edge and a dark letter. The next letter, while it is in
  the band, has a ring in its lane's colour instead of the soft edge.
- **Keys**: a lane's letter moves the basket under that lane (a 0.12 s slide) where it stays until the
  next key. The next letter's key while it is in the band catches it. Any other key, and the right key
  before or after the band, is an error (accuracy, key statistics). The first early press says once to
  wait for the band.
- **Feedback** over the basket: a catch near the beat (within 0.12 beat) shows one of "Super", "Paráda",
  "Presne", "Skvelé" in half of the cases; any other catch one of "Dobre", "OK", "Áno" in 30 %. A
  missed letter flashes its lane.
- **A miss stops the round**: the other letters stand still and the keys wait (the character says
  "Počkaj…"), then the next letter glides into the band's middle ("Teraz pokračuj.") and the song waits
  for its key; that catch counts as caught but not in the rhythm measure. So nobody-types never runs on.
- **Longer when hard**: every phrase that steps the tempo down adds one phrase to the round, at most a
  third of it (one minute of three; the same share in a `?fast` round).
- **Basket picture**: one, the empty basket (`obj-rhythm-basket`, the former `-0`). The owner tried
  letters sunk into the basket five times in Gemini; it only changed colours, so the fills are dropped.
- **Top bar rings**: accuracy shows a check while it is 100 %; rhythm shows a check at 100; the tempo
  ring shows the wave (like the rocket's speed ring) and the tempo only as the ring's fill (max 120)
  and in its tooltip.
- **Start text** (the get-ready card), exactly: "V tomto písaní si precvičíš pravidelný rytmus.
  Ovládaš košík, ktorý chytá písmenká padajúce z obláčikov. Tie musíš chytiť v správnom čase, ináč
  spadnú na zem. Stále je však dôležité aby to bolo presne. Ak niečo nechytíš, nevadí. Za výborný
  rytmus získaš jednu rytmickú notu."
- **Rhythm notes**: a round with rhythm >= 80 and accuracy >= 95 % (with time pressure) gives one note.
  Notes fade: one goes for every 3 days without a Rytmus round, counted from the day after the last
  round (played Monday: Thursday still all there, Friday morning one fewer, then Monday, Thursday...).
  Kept as `progress.rhythmNotes` (count at the last round) and `progress.rhythmNotesAt` (its local
  date); the shown count is computed. The end card's green line tells a new note.
- **Note pictures**: half, quarter, eighth and two beamed eighths (`ui-note-half`, `ui-note-quarter`,
  `ui-note-eighth`, `ui-note-beamed`), each note shown turned by its own angle (-25..25 deg).
- **My progress** gets a section "Môj rytmus": one row of notes, as many as fit, and the exact number
  at the row's end; with none a line saying how to get one. A click on a note plays a world's music
  track for 20 s, then the track before comes back; the worlds' order is shuffled per profile (seeded
  by its id) and note n plays the n-th world of it.
- Ťapko is the app: the rhythm texts no longer say "Ťapkov košík"/"Ťapko ho chytí".

## Steps
- [x] Key hook: `waitKey` -> `checkKey(ch, at): 'pass' | 'wait' | 'wrong'`; runtime counts 'wrong' like a wrong key of the expected letter
- [x] beat.ts: symmetric window with per-phrase w, extension of the round, 4 basket fills, note fading + tests
- [x] rhythm.ts: left character, moving smaller basket, band, falling letters, feedback words, pause, rings
- [x] Texts (sk, en, translator): start, tips, help, feedback words, notes
- [x] Pictures: three basket variants from the owner's picture, four notes (Gemini), assets pipeline
- [x] End card news, notes storage, My progress section with melody
- [x] Specs, e2e, perf check, browser play-through

## Done - 2026-11-07
Shipped as decided above, with the owner's changes during the work: one empty basket (only its front, so a letter drops behind the rim), a full heap of letters on the end card titled "Písanie v rytme!", a white 3 px frame on the band, and a miss that stops the round until the next key. Also in the same work: Ťapko is the app on the start page (logo tip, the greeting character), only the logo stays outside the MIT license, and a kind without surprised art looks thoughtful instead of a placeholder. Not done: the other worlds' Rytmus (plan 111 leftovers), checked by a real child.
