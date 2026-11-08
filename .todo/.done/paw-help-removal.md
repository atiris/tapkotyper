# Remove the paw help

The owner's decision of 2026-11-08: the paw help goes away completely (its top-bar button, its
charging by mistake-free word streaks, the paw typing words for the child, its texts and pictures in
help). Nothing replaces it. Specs to keep in step: every `.specify/` file that mentions the paws
(search "paw": mechanics, help, ui-rules, visuals, tapko, free-typing, heros-journey, parrot, rhythm,
story, super-obstacles, target-practice, task-games, placement-check, parent-controls, profiles,
statistics). No store migration: `progress.pawHelp` is just dropped from the schema and the store.

Affected: `src/game/paw.ts`, `src/game/runtime/paws.ts`, `src/game/runtime.ts`, `src/game/runtime/state.ts`,
`src/game/mode.ts` and the modes that react to the paw typing (search `paw`/`paws` in `src/game/modes`),
`src/game/typing.ts`, `src/game/speed.ts`, `src/game/progress.ts`, `src/ui/hud.ts`, `src/ui/keyboard-guide.ts`,
`src/ui/dom.ts` (an icon only it uses), `src/gfx/tapko.ts`, `src/screens/help.ts`, `src/screens/level.ts`,
`src/app/super.ts`, `src/storage/schema.ts` + `store.ts`, `src/i18n/catalog.ts`, `public/i18n/*`, `src/styles.css`,
`e2e/play.spec.ts` and any spec using it, `assets-src/PROMPTS.md` + `public/assets` for paw-only pictures.

## Steps

- [x] **1. Map it.** List every use of the paw help (code, texts, help page, specs, pictures). Keep what
  only looks like a paw but is something else: the certificate frame's paw prints, an animal's paws in
  a drawing. Write the list into this plan's State section.
- [x] **2. Remove it.** The button, the charging, the typing, the mode hooks, the state, the stored
  count, the texts (sk, en, translator, catalog), the help page lines, the styles, pictures used only by
  it. Keep the rule that a level the child typed too few keys of gives one star
  (`MIN_OWN_KEYS`/`byTapko`) only if something else still types for the child (the super help does);
  then reword it and its texts to the super help, else remove it too.
- [x] **3. Specs and tests.** Update the specs listed above (WHAT/WHY), remove or adjust unit and e2e
  tests for the paws; tsc, vitest, build, the touched e2e specs; a browser check that a story level, a
  bonus game and the help page show no paw help and nothing is left empty where it was.

## State
Map (step 1): the paw help lived in src/game/paw.ts and src/game/runtime/paws.ts (button, charging, typing),
runtime.ts (button in the top bar, Enter call, word streak charge, tick/stop, guards on own keys), the modes'
`pawMay` hooks (egg-spell, egg, planet-roads; base in mode.ts), `TypingCore.reveal` (only the paw used it),
`KeyboardGuide.tap` with its `.kb-key.tap` animation, hud.ts `pawRing` and the 'paw' round kind, the 'paw'
icon in dom.ts (also used by the dev-only hand-tool button in free typing), progress.pawHelp in schema/store,
super.ts filling it, help.ts icon line, texts `paw.*`, `help.icons.paw`, `results.byTapko` (sk, en, translator,
catalog group 'helpers'), styles, e2e/play.spec.ts "Enter sends the hands", README and 17 specs.
Kept, not the paw help: the certificate frame's paw prints, the character's paw holding the range's thing,
the mud level's "clean paws" lines, PROMPTS.md drawing words. No picture was paw-help only.

Decisions:
- The few-keys rule (`MIN_OWN_KEYS`, fewer than 5 keys in a story level gives one star) stays: the super help
  types through the child's own key path (its keys count as own keys), so it never lowered the count; the rule
  still guards a story level where the child typed almost nothing and its accuracy would read 100 %. Renamed
  `byTapko` -> `fewKeys` and `results.byTapko` -> `results.fewKeys` with a new text that names no paw.
- The dev-only hand-tool button in free typing took the 'edit' (pencil) icon, so the 'paw' icon is gone.
- e2e/help.spec.ts counted 20 help icons while the page already had 22 (the rhythm plan added one); now 21.
- Browser check (own headless Chrome, the shared MCP browser was held by another session): a story level and
  the target range show pause then the next item with no gap and no paw button; Enter in a level does nothing;
  the help page lists 21 icons with no paw; no page errors.

Checks: tsc, vitest (709 passed), vite build, e2e play/help/translate/eggs/journey/free-type/aim/keyboard-only.

## Done - 2026-11-08
Shipped: the paw help is gone (top-bar button, charging by mistake-free streaks, the hands typing words, the
modes' hooks, the stored count, texts in sk/en/translator, the help page line, styles, the e2e test); the
few-keys one-star rule stays under a paw-free name and text; README and specs updated.
Left out: nothing.
