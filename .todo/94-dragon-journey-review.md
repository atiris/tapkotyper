# 94 - The dragon story's hero's journey: owner's review

The owner played the dragon story's hero's journey on 2026-10-31: the whole way took about
3 minutes (too short), the progress bar filled after the first part, the travel card between
parts was too thin, and several parts need changes. No DB/store impact (alpha: no store
migrations; a journey still keeps only its best stars). Affects `src/game/levels.ts` (journey
steps, `JOURNEY_SHARE`, progress), `src/game/runtime.ts` (journey flow, progress bar, leaving),
`src/game/cards.ts` (`showTravel` is replaced), `src/ui/end-card.ts` (reused for the new panel),
`src/game/runtime/pause.ts` (the give-up dialog), the part modes `src/game/modes/egg.ts`
(`BouldersMode`, journey variant), `src/game/modes/dragons-flight.ts`, `src/game/modes/planet-crystals.ts`,
`src/game/modes/planet.ts` (great swamp), `src/game/modes/launch.ts`, `public/i18n/{sk,en}.json`
(+ translator notes, `src/i18n/catalog.ts`), `.specify/game/heros-journey.md`, tests in
`src/game/modes/idle.test.ts` and `src/game/levels.test.ts`.

## Decisions (taken; do not ask)

### Whole journey
- **Length**: `JOURNEY_SHARE` 2 -> 3 (the dragon journey becomes 6 minutes of active play). Check
  that every part keeps playing until its share of the minimum is played (as a level does with
  `levelOver`); a part whose own count runs out early (the swamp ended after about 8 stones) gets
  more of its units instead of ending. Find and fix the cause of the 3 minutes, not only the share.
- **Progress bar**: the bar shows the whole journey. Part `i` of `n` fills only its own slice,
  from `i / n` to `(i + 1) / n` (so after the first of five parts it stands at a fifth, never at
  the end). The level's progress inside a part maps into its slice.
- **Get-ready text** (`journey.dragon.down`, sk; en in the same tone):
  "**Dráčik sa vyliahol** a chce zostať s tebou! Teraz sa musíte **dostať dolu z Hory prebudenia**
  spoločne. Musíte zostúpiť z hôr a **cez Údolie drakov, Lúku kryštálov a močiar** sa dostať až k
  rakete, ktorá čaká na brehu, pripravená na odlet hneď, ako dostane kryštálové palivo. Z hory sa
  kotúľajú kamienky, ktorým je potrebné sa vyhnúť, tak to skúste spolu!"
  (Names capitalized as decided on 2026-10-31: Planéta drakov, Údolie drakov, Lúka kryštálov.)

### The panel between parts (replaces the travel card)
- Same card as every end card (`src/ui/end-card.ts`, the look agreed in plan 85 and the design
  canvas named in it): title **"Cesta hrdinu pokračuje!"** with the round X (the X = "Ideme
  ďalej"; Esc too); on the left the **map picture of the world the next part goes to**
  (`ui-map-<world>`); on the right, instead of stats, the **next part's text** (with `**bold**`);
  buttons: **"Ideme ďalej"** (main, focused, Space/Enter), **"Krátke cvičenie"** (the pause card's
  short stretch exercise, `level.stretch`; after it the panel comes back), **"Vzdať to"** (last).
- The picture: valley part -> world 4's (`dragons`) picture, crystals and swamp -> the planet's,
  **the take-off -> the rocket world's** (`space`) picture, though its background stays the
  planet shore. Add a `picture` world to `JourneyStep` where it differs from `world`.
- Part texts (sk; en in the same tone; they replace `journey.dragon.valley`, `crystals`, `swamp`,
  `launch`; drop `journey.next` and the `*Place` keys if nothing uses them any more):
  - valley: "Ďalej nás čaká **Údolie drakov**, v ktorom sa môžeš naučiť lietať. Na to, aby sa
    dráčik **naučil lietať** ako jeho kamaráti, musí **úspešne preletieť k ohnisku a späť!**"
  - crystals: "Na Lúke kryštálov nájdeš **energetické drahokamy**, ktoré **potrebuje tvoja raketa**
    na odlet. Nazbieraj ich čo najviac! Dráčiky z údolia ťa už na lúke čakajú."
  - swamp: "Na brehu močiara je už **zaparkovaná raketa.** Palivo už máme, stačí sa dostať na druhú
    stranu. Dráčik sa má, ten môže letieť! Ale ja to zvládnem tiež!"
  - take-off: "Raketa čaká na brehu. Napíš **príkazy do palubného počítača** a naštartuj ju, aby ste
    mohli **s dráčikom odletieť** zažívať nové dobrodružstvá na rôznych iných svetoch."
- **"Vzdať to"** opens a confirm dialog like "Ukončiť písanie" on the pause card, but with the
  title **"Hrdina, vydrž to!"**, the text "Táto cesta hrdinu môže byť ťažký oriešok aj pre
  **najlepších hrdinov, ako si ty!** Skús cestu dokončiť, ak to skutočne nejde, môžeš preskupiť
  svoje sily a vrátiť sa neskôr. Ak teraz ukončíš písanie, Cesta hrdinu sa nezapočíta a nabudúce
  začne od začiatku." and the buttons **"Pokračovať v ceste"** (default, focused, Esc) and
  **"Ukončiť písanie"**. The pause card's own "Ukončiť písanie" during a journey uses the same
  dialog (one dialog for leaving a journey).

### Part 1, down the mountain (`BouldersMode` journey variant)
- Stones as in egg 4 since 2026-10-31 (small, 58-64 px; a typed one slides off the path, a missed
  one bounces off Tapko and falls, he wobbles) - the journey variant must use exactly that code.
- **A slip** (a wrong key inside a stone's word) adds one more stone and a bit of time (the
  part's minimum grows by one planned word's seconds), at most 7 times in the part.

### Part 2, the valley flight (`dragons-flight.ts` journey variant)
- A failed flight does not count. The little dragon must make **two successful flights**.
- It always flies between Tapko and the hearth: from Tapko to the hearth, then from the hearth
  back to Tapko, alternating; a failed flight is flown again in the same direction until it
  succeeds. The part ends after the second success (and its minimum).

### Part 3, the crystal meadow (`planet-crystals.ts` journey variant)
- **Two slips in one crystal's word**: the crystal cracks and vanishes (no second chance on it).
- The rocket needs **at least 7 crystals**: the part goes on until 7 are collected (and its
  minimum is played); the end line says how many the rocket got.

### Part 4, the swamp (`planet.ts` great swamp journey variant)
- The little dragon flies above Tapko (a gentle hover over his head, following him), not on the
  stones behind him.
- Longer: at least **4 rounds** (three fragile stones and the firm fourth each, so 16 stones)
  before the shore, plus whatever its share of the minimum needs.

### Part 5, the take-off (`launch.ts` journey variant)
- The rocket stands further from the water's edge, and Tapko stands right next to it (now both
  are almost at the shore's edge).
- At least **7 accepted commands** before the countdown.
- The rocket confirms an accepted command with one of (sk): "Potvrdzujem!", "Ok!", "Dobre!",
  "Rozumiem!", "V poriadku!", "Správne!"; it rejects a wrong one with one of: "Chyba!",
  "Nerozumiem!", "Zopakujte!", "Prosím, znova!", "Preklep!", "Neznámy príkaz!" (en in the same
  tone). Reuse the rocket world's reply keys if they fit, else add `journey.dragon.launchOk` /
  `launchNo` lists.

## Steps
- [x] `JOURNEY_SHARE` 3 and every part honours its minimum (find why it took 3 minutes); tests.
- [x] Progress bar over the whole journey (slice per part); test of the mapping.
- [x] Panel between parts on the end card (picture of the next world, its text, three buttons, X/Esc); `showTravel` and its texts removed; `picture` on `JourneyStep`.
- [x] Give-up dialog "Hrdina, vydrž to!" from the panel and from the pause card during a journey.
- [x] Texts: get-ready, four part texts, give-up dialog, rocket replies (sk, en, translator notes, catalog).
- [x] Part 1: egg 4 stones; a slip adds a stone and time, at most 7.
- [x] Part 2: two successful flights, alternating Tapko -> hearth -> Tapko, failed ones repeated.
- [x] Part 3: two slips crack a crystal; at least 7 crystals.
- [x] Part 4: dragon hovers above Tapko; at least 4 rounds.
- [x] Part 5: rocket off the shore edge, Tapko beside it; at least 7 commands; the reply lines.
- [x] `.specify/game/heros-journey.md` updated (what and why).
- [ ] tsc, vitest, build; play the whole journey in the browser with the Playwright MCP (tester profile, `?fast`, `window.tapkoType`): the panel between each part, the give-up dialog, the bar after each part, each part's change, total active time about 6 minutes at the tester's pace.

## State
- Cause of the 3 minutes: the share was 2 (4 minutes of active play in all) and the valley flight
  ended at its last flight below its minimum (`endMinimum`); the journey's flight no longer calls it.
- Decisions taken while implementing:
  - A failed valley flight walks back and is flown again; each failed try in a row adds a quarter
    of full lift (`RETRY_HELP`), so a child below the rhythm goal is never stuck in the valley.
    After two good flights more come while more than half a flight of the minimum is left.
  - A slip on the mountain adds a stone once per stone's word (not per wrong key), at most 7.
  - The take-off answers accepted commands from `journey.dragon.launchOk`, the last one with
    `story.launchCountdown` ("Odpočítavanie spustené."); the old `story.launchSteps` list is gone.
  - The panel's stretch offers the longer break too, as on the pause card.
  - The slow-typist test bound (1.3x the minimum) does not hold for the journey's flight, swamp and
    take-off: their own least counts (2 flights, 16 stones, 7 commands) are longer for a slow child.
- Open: the browser play-through.
