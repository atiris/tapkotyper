# 53 - Paw only on Enter, a little Enter practice, practice styles explained

Affected:
- `src/game/runtime.ts`, `src/game/paw.ts`, `src/game/typing.ts` (+ tests).
- `src/storage/{schema,store}.ts`: drop `progress.pawAuto`.
- The word picker for Enter targets.
- `src/ui/keyboard-guide.ts`: Enter with the right little finger.
- `src/learning/lessons.ts`: Enter never blocks lesson progress.
- `src/screens/practice-keys.ts`, `public/i18n/{sk,en}.json`.
- `.specify/companion/tapko.md`, `.specify/learning/{lesson-progression,finger-guide}.md`,
  `.specify/game/mechanics.md`, `.specify/experience/help.md`.

Storage: `pawAuto` leaves the stored profile and old saved values are ignored. No backward
compatibility is needed: it is browser storage, not a DB.

## Why

- Backspace switches the automatic paw on for good (also a backlog line). A child who fixes a
  typo must never change a setting. The paw stays on Enter only.
- A typist presses Enter with the right little finger, so it is worth a little practice.
- In own practice the children do not know what "Odpis", "Diktát" and "Zapamätaj si" mean.

## What

- [x] **No automatic paw.** Backspace in a level does nothing outside free typing. Remove:
      - `togglePawAuto` and the `onBackspace` branch in `runtime.ts` that calls it;
      - the paw's own use when `p.progress.pawAuto` is on;
      - `pawAuto` in `schema.ts` and `store.ts`;
      - the texts `paw.autoOn`, `paw.autoOff`, `paw.chargedAuto`, and the Backspace sentence in
        `paw.title` and in any help text;
      - in the same commit, the backlog line "Backspace turns the automatic paw on for good".
- [x] **Enter now and then.** After the key under the right little finger on the home row is
      unlocked, some targets are a word followed by an Enter mark `↵`:
      - About one target in 20, never two in a row, at most 2 per level; the same rate in own practice.
      - After the letters, the target waits for Enter. The finger guide shows Enter with the
        right little finger.
      - While a target waits for Enter, Enter finishes the target and does not call the paw.
        At any other time Enter calls the paw as now.
      - Enter presses go into key stats as key `Enter`, but `advanceLesson` ignores them, so
        they never block lesson progress.
      - Not in `noSpace` modes with single letters, not in the gate code, and not spoken in
        dictation (the mark stays visible there).
- [x] **Practice styles explained.** On the practice-keys screen:
      - Each style button (copy, dictation, memory) gets a tooltip (`data-tip`).
      - A line under the style row changes with the chosen style:
        - Odpis: "Slovo vidíš a odpíšeš ho." / "You see the word and type it."
        - Diktát: "Slovo počuješ, ale nevidíš ho. Napíš, čo počuješ." / "You hear the word
          without seeing it. Type what you hear."
        - Zapamätaj si: "Slovo sa na chvíľu ukáže a skryje sa. Napíš ho spamäti." / "The word
          shows for a moment and hides. Type it from memory."
- [x] **Specs:**
      - tapko.md: the paw only on Enter, and why.
      - lesson-progression.md and finger-guide.md: Enter practice, and why it never blocks progress.
      - mechanics.md: the practice styles.
      - help.md: no Backspace for the paw.
      - README.md: the paw sentence ("Backspace lets Tapko help by himself") goes.
- [x] **Checks:** `npm run build`, `npm test` (update the paw, typing and lessons tests), e2e.
      Then drive the game with the playwright MCP:
      - A level with the paw: Enter helps, Backspace changes nothing.
      - A level that shows an Enter target.
      - The practice-keys screen: the hint line changes with the style, and the tooltips show.

## Done - 2026-10-23

Shipped:
- No automatic paw: `togglePawAuto`, the auto start (`isHardMoment`, its test, the pulsing
  button), `progress.pawAuto` and the texts `paw.autoOn/autoOff/chargedAuto` are gone; Backspace
  in a level does nothing outside free typing. The backlog line is removed.
- Enter targets: an Enter key (`↵`, right little finger) at the end of the home row of every
  layout; `EnterMarks` (`src/game/enter.ts`) picks about one target in 20, never two in a row,
  at most 2 per level, no cap in own practice. Not in drills, `noSpace` levels, the gate or free
  typing. While the locked target waits for `↵`, Enter types it; otherwise Enter calls the paw.
  The mark stays visible in masked targets and is never spoken.
- Practice styles: a tooltip on each style button and a line under the row that follows the
  chosen style.
- Specs (tapko, lesson-progression, finger-guide, mechanics, help) and README updated.
- Checks: build, 281 unit tests, 56 e2e; playwright MCP: Backspace left the paw at 3 charges
  and the bubble unchanged, Enter sent the paws (3 -> 2); own practice showed "kasa afô↵", the
  guide lit Enter with finger 9 and Enter finished the target without the paw; the style line
  and the three tooltips changed with the style.

Decisions:
- The stats key of Enter is the mark `↵` itself (the base of the new layout key), not the
  string `Enter`: then the stats heat map, the guide and `fingerFor` work like for any key.
  `advanceLesson` ignores it because `↵` is in no lesson group (covered by a test).
- Any target may end with Enter, a phrase too, not only single words: most targets are
  two-word phrases and own practice uses longer ones, so single words only would almost never
  show Enter. A phrase split into parts carries the mark on its last part.
- The parent's key picker ignores a click on Enter (no words are built from it).
- Old stored profiles keep a stale `pawAuto` field in their JSON; nothing reads it.

Left out: nothing.
