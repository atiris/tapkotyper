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

- [ ] **No automatic paw.** Backspace in a level does nothing outside free typing. Remove:
      - `togglePawAuto` and the `onBackspace` branch in `runtime.ts` that calls it;
      - the paw's own use when `p.progress.pawAuto` is on;
      - `pawAuto` in `schema.ts` and `store.ts`;
      - the texts `paw.autoOn`, `paw.autoOff`, `paw.chargedAuto`, and the Backspace sentence in
        `paw.title` and in any help text;
      - in the same commit, the backlog line "Backspace turns the automatic paw on for good".
- [ ] **Enter now and then.** After the key under the right little finger on the home row is
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
- [ ] **Practice styles explained.** On the practice-keys screen:
      - Each style button (copy, dictation, memory) gets a tooltip (`data-tip`).
      - A line under the style row changes with the chosen style:
        - Odpis: "Slovo vidíš a odpíšeš ho." / "You see the word and type it."
        - Diktát: "Slovo počuješ, ale nevidíš ho. Napíš, čo počuješ." / "You hear the word
          without seeing it. Type what you hear."
        - Zapamätaj si: "Slovo sa na chvíľu ukáže a skryje sa. Napíš ho spamäti." / "The word
          shows for a moment and hides. Type it from memory."
- [ ] **Specs:**
      - tapko.md: the paw only on Enter, and why.
      - lesson-progression.md and finger-guide.md: Enter practice, and why it never blocks progress.
      - mechanics.md: the practice styles.
      - help.md: no Backspace for the paw.
- [ ] **Checks:** `npm run build`, `npm test` (update the paw, typing and lessons tests), e2e.
      Then drive the game with the playwright MCP:
      - A level with the paw: Enter helps, Backspace changes nothing.
      - A level that shows an Enter target.
      - The practice-keys screen: the hint line changes with the style, and the tooltips show.
