# 85 - One end card for every end

The owner (2026-10-30): the ends of a level, a practice, staying a while, the target range, the
parrot, free typing, the stretch break and a finished task each look different and say too much
at once for a child. Every end gets the same fixed card, agreed in the design canvas
**https://claude.ai/artifact/SZRSeFzmGanci4RPvdyuvz** (read it with the Artifact tool, `action:
"read"`; the boards under "Návrh" are the agreed look, the boards under "Dnes" are the old state;
the old "Dnes" boards and the first "Prehľad" table are history, not the target). Where this plan
and the canvas differ, this plan wins (it holds the owner's last words).

Owner change (2026-10-30, relayed by another session, board `new/Range.dc.html` updated): the range
shows the hits under the picture, rows Počet bodov / Presnosť / Zásahy do stredu, no Zbierka row,
and a new collection thing wins the green line.

Also in this plan (a fix outside the design the owner asked for): the parent's **surprises can be
won at the target range and with the parrot** too, through the typing time they count.

Affected: `src/screens/level.ts` (all results cards), `src/screens/break.ts` (end of the break),
`src/screens/task.ts` (hand-in), the free typing end (`src/screens/level.ts`, `src/game/runtime.ts`
leave path), `src/game/runtime.ts` + `src/game/own-content.ts` (surprises at the range and the
parrot), `src/styles.css` (the card), `public/i18n/*.json` and `src/i18n/catalog.ts` (texts),
`assets-src/` + `assets-src/PROMPTS.md` + `public/assets/` (seven new pictures), e2e specs that
read the old cards, `.specify/` (game/mechanics.md, game/target-practice.md, game/parrot.md,
game/free-typing.md, profiles/parent-controls.md, experience/ui-rules.md). No store change, no
migration (alpha).

## The card (the same for every end)

1. **Top**: only the title and the round X (peek under the card, as today: `peekable`). Nothing else.
2. **Middle, left**: a fixed square panel (210 px wide on desktop, scales down on a phone) with
   ONE picture of what happened and under it either the stars (a level) or one short value.
3. **Middle, right**: at most three rows "label - value" (label soft, value bold), then at most
   ONE green line with the most important news. No narrator bubble, no chips, no framed notes
   block, no exclamation sentences.
4. **Surprise band** (only when a surprise was unlocked in this run): a band between the middle
   and the buttons with the open golden box (`ui-surprise-open`) and "Odomkol si nové
   prekvapenie!"; the main button is then "Pozrieť prekvapenie" and opens the window of the
   surprises won today (the one the map opens, `map.ts` around line 269) over the card. The
   middle part stays as it would be without the surprise.
5. **Bottom, fixed**: one orange main button first, at most two plain ones, and always "Na mapu"
   last, pushed to the right. "Ukončiť písanie" is never on an end card.

The main button, in this order of precedence: "Prestávka" (a break is due; the usual main button
becomes plain), "Pozrieť prekvapenie", "Odovzdať" (a task finished in this run, opens the hand-in
card), then the end's own main button below.

The one green line takes the first that applies: a rescued friend, a new or better world badge
(several rewards at once: the first and "a N ďalšie odmeny"), new keys, a new medal, new things
in the wardrobe or a new companion, rhythm better than last week; the range: a thing new in the
collection (its picture in the line, "Do zbierky ti pribudol nový predmet."), then the most improved
trained letter; the parrot: faster than usual. Waiting surprises and the narrator's question are
no longer on the card (the map shows waiting surprises). A task still running shows as a row
"Úloha - zostáva N min" (it takes the third row).

## Each end (texts agreed with the owner, Slovak; English and Czech follow them)

| End | Title | Picture | Under the picture | Rows | Buttons |
|---|---|---|---|---|---|
| Level | Úroveň hotová! | the player's character (Tapko) | stars | Presnosť; Rytmus za minútu (N písmen); per style "Podľa sluchu / Z pamäti bez chyby" | Ďalšia úroveň or Pozrieť odmenu (world done) or Ďalšia misia; Hrať znova; Ešte chvíľu; Na mapu |
| Practice (free practice, own text, a task's practice) | Písanie hotové! | `ui-end-practice` typewriter | N minút | Presnosť; Rytmus za minútu; style row | Hrať znova; Na mapu |
| Staying a while in a level | Oddychové kolo hotové! | `ui-end-stay` armchair | N minút | Presnosť; Rytmus za minútu | Ďalšia úroveň (when open); Ešte chvíľu; Na mapu |
| Target range | Strelnica hotová! | `ui-end-range` target on legs with eyes | N zásahov (all hits) | Počet bodov; Presnosť; Zásahy do stredu (count) | Hrať znova; Ešte chvíľu; Na mapu |
| Target range, new record | Nový svetový rekord! | `ui-end-range-record` cup with the target peeking | N zásahov | as above | as above |
| Parrot at home | Papagáj je doma! | `ui-act-parrot` | N slov | Slová (the first three, then ", …"); Na začiatku za minútu; Pri opakovaní za minútu | Nové slová; Na mapu |
| Parrot flew off | Papagáj uletel | `ui-act-parrot-perch` | skús znova | Slová; Na začiatku za minútu; then a yellow tip line "Píš pomaly a presne a papagáj sa vráti." | Hrať znova; Na mapu |
| Free typing (new end: only when something was typed; with nothing typed leaving goes straight to the map) | Koniec voľného písania! | `ui-end-freetype` paper pinwheel | N slov | Čas; Posledná veta | Písať ďalej; Na mapu |
| Stretch break | Rozcvička hotová! | `ui-end-break` football | N cviky | Čas | Pokračovať v písaní (when started from the map's warm-up); Ešte sa rozcvičiť; Na mapu |
| Task finished, hand-in | Úloha splnená! | `ui-end-task` school backpack | N minút | Úloha (title); Pošli učiteľovi "odkaz alebo kód"; the link box | Kopírovať odkaz; Veľký kód; Na mapu |

Speeds are always "písmen za minútu" (the parrot said "znakov" before). The pause card and the
"Naozaj ukončiť?" question stay as they are: they are not ends. The free typing end counts
nothing in the statistics (free typing never does).

## Steps
- [x] Pictures: copy the owner-approved Gemini pictures from `assets-src/` (already there, raw,
      not committed: `ui-end-practice.jpg`, `ui-end-stay.jpg`, `ui-end-range.jpg`,
      `ui-end-range-record.jpg`, `ui-end-freetype.jpg`, `ui-end-break.jpg`, `ui-end-task.jpg`)
      through `npm run assets` (magenta key, trimmed, like the `ui-act-*` icons); their prompts are
      in `PROMPTS.md` section 11. If one is missing, generate it with that prompt (skill
      `gemini-bridge:gemini-images`).
- [x] The card: one builder in `level.ts` (or `src/ui/end-card.ts`) that takes title, picture,
      under-picture value, rows, the green line, the surprise flag and the buttons, and the CSS
      for its fixed parts; `showResults`, `showStayDone`, `showAimDone`, `showParrotDone` use it.
      Keep `peekable`, the break action and the Esc behaviour. Remove the narrator bubble, chips,
      the notes block, the aim before/after list, the collection grid and the CSS nothing uses
      any more.
- [x] Texts in `public/i18n/sk.json` (and en, cs) and `catalog.ts`; drop keys nothing uses
      (`unused-keys.test.ts`).
- [x] Free typing end card (leaving free typing after something was typed: words typed, minutes,
      the last sentence).
- [x] The break's end and the hand-in dialog as the same card.
- [x] Surprises at the range and with the parrot: their runs ask and tell surprises with a
      counting time trigger (`minutes`) like a practice does (get-ready card, `surpriseOutcome`
      on the end card, the map's won-today window); level-, levels- and stars-triggered surprises
      stay out. Check that their typing time already counts toward the minutes (it counts in the
      statistics). Staying a while keeps no surprises.
- [x] `.specify/`: the end card in game/mechanics.md (replace the "compact card" paragraph), the
      ends in target-practice.md, parrot.md, free-typing.md, the surprises rule in
      parent-controls.md ("Surprises ... range and parrot count by time"), ui-rules.md if it
      names the old card.
- [x] Tests: unit tests for the green-line choice and the surprise rule at the range/parrot;
      update e2e specs that read the old cards (`play`, `aim`, `parrot`, `free-type`,
      `practice-keys`, `layout`); `npm run build`, lint, unit tests, e2e.
- [x] Look at every end in the browser (playwright MCP, `?fast`, the tester profile
      `.e2e/tester-profile.json`, typing through `tapkoType`) at 1024x600 and at phone width,
      light and dark theme, and compare with the canvas boards.

## Decisions
- The card lives in `src/ui/end-card.ts` (`endCard`); the green line's choice is pure in
  `src/game/end-news.ts` (unit tested). "Na mapu" is the builder's own last button.
- A due break and the surprise go before the end's own buttons; at most two plain buttons
  follow the main one, so with a break and a surprise the third own button (A while more) drops.
  After the surprises window closes, its button leaves the row (the band stays clickable).
- "The paw did most of this level" is the yellow tip line (it is a hint, not news).
- A thing new in the range collection is not counted as a reward in "a N ďalšie odmeny" (the
  owner's sentence ends with a period, a tail would read badly).
- The parrot's "faster than usual" compares the repeating speed with the usual speed of the last
  14 days.
- A break opened from an end card (not the map's warm-up) ends with "Pokračovať" back to the
  card in place of "Pokračovať v písaní"; "Na mapu" there leaves to the map.
- "Písať ďalej" on the free typing end starts free typing again in the same place (the counts
  start over); typing a letter while peeking does the same.
- The hand-in card drops the Edupage line and the checksum note: the teacher's help already says
  the checksum finds damaged links, not cheating (teacher-links spec now points there).
- Only Slovak and English dictionaries exist in `public/i18n/`; there is no Czech file to update.
- Old texts nothing reads any more were removed (`tapko.level_done`, old `results.*`, `aim.*`,
  `parrot.*`, `task.*`, `break.done`); news texts lost their exclamation marks.

## Done - 2026-10-30
Shipped: one end card for the level, practice, staying a while, target range (with the owner's
later change: hits under the picture, rows points / accuracy / middle hits, a new collection thing
first in the green line), parrot (home and flown off), free typing (new end after typing), the
stretch break and the task hand-in; seven new pictures; surprises counting training time asked
and told at the range and with the parrot; specs, translator catalog, unit and e2e tests updated.
Checked in the browser at 1024x600 and 390 px, light and dark. Nothing left out.
