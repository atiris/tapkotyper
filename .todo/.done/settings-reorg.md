# Settings: "Údaje a bezpečnosť", the keyboard check on request

The owner's wishes of 2026-11-08 for the profile settings (`src/screens/parent.ts`). Specs to keep
in step: `.specify/profiles/parent-controls.md`, `.specify/learning/placement-check.md`,
`.specify/experience/help.md` (the help page lists the tabs' contents). No store migration.

## Steps

- [x] **1. Tab "Údaje" becomes "Údaje a bezpečnosť"** (en "Data and security") with three columns
  (the `settings-grid` of the tab; one under the other on a phone): **Profily** (as today),
  **Preklad** (moved out of the "Zvuky a rozhranie" group: its heading, hint and the "Preložiť hru"
  button, `translateTool`) and **Rodičovský zámok** (the settings password panel, `lockGroup`,
  moved out of the "Nastavenia" tab; its legend renamed from "Heslo na nastavenia" to "Rodičovský
  zámok" / "Parental lock"). The settings without a player (`deviceTab`) keep showing the translation
  and the lock, in the same new order. The "Zvuky a rozhranie" group keeps only sound and interface.
  Help page texts naming where these live are updated (sk, en).
- [x] **2. No keyboard check button in Settings > Klávesy.** "Vyskúšať, čo hráč vie"
  (`parent.placement`) is removed there; the check starts only from My progress > Klávesy (make sure
  that way exists and works). In its place in Settings > Klávesy a checkbox **"Po najbližšom
  dokončení levelu ponúknuť skúšku ovládania klávesnice"** (en "Offer the keyboard check after the
  next finished level"), per profile `settings.offerPlacement` (default false), one hint line.
- [x] **3. The turtle asks.** With the checkbox on, after the next finished level (any level with an
  end card, not a bonus game) the map shows Pani učiteľka Korytnačka's panel (the existing
  `placementPanel` look, round X, Esc closes) with:
  "Ahoj {name}, pozerám, že sa veľmi snažíš. Môžeme preveriť, aké klávesy už ovládaš, aby si mohol
  postupovať tempom, ktoré je pre teba čo najlepšie? Pôjde o pokojnú, asi 4-minútovú skúšku písania,
  ktorá sa nepočíta do bežného príbehu, ale umožní ti odomknúť nové klávesy, ak ich dostatočne zvládaš,
  aby toto písanie nebolo pre teba nudné. Ak to nechceš, môžeš pokračovať ďalej ako doteraz."
  Buttons: **Vyskúšaj ma** (starts the check) and **Pokračovať ďalej**. Either answer (and the X / Esc)
  turns `settings.offerPlacement` off again. English text in the same spirit. `{name}` is the
  child's nickname as in the other turtle lines.
- [x] **4. PIN, only noted.** The planned profile PIN will be set in Settings > Študent; update the
  backlog entry "Profile PIN" to say so. Do not implement the PIN.
- [x] **5. Checks.** tsc, vitest, build, e2e `parent`, `placement`, `translate`, `help`; browser check
  of the three tabs' layout (wide and phone width), the lock moved, the checkbox and the turtle panel
  after a level.

## State
All steps done. Decisions: the map games (range, parrot, rhythm) and the keyboard check itself do not count as a finished level for the offer; the parent's ask comes even for the guest and the super player (the parent asked for it); "Vyskúšaj ma" is the default (focused) button, as the parent asked for the check; the help's password lines (lock, its limits, cleared data) moved with the lock to the data list; the help's keys list got a line about the switch and the check in My progress.

## Done - 2026-11-08
Shipped: tab "Údaje a bezpečnosť" with Profily, Preklad and Rodičovský zámok (also in the settings without a player); the Klávesy tab's check button replaced by the switch offerPlacement (default off); the turtle's offer after the next finished level, any answer turns it off; help, translator guide and specs updated; backlog "Profile PIN" names Settings > Študent. Checks: tsc, vitest 716, build, e2e parent, placement (new test), translate, help; headless Chrome check of the three columns wide and at 390 px (stacked, no horizontal scroll), the switch and the turtle panel after level 1. Left out: nothing.
