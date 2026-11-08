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

- [ ] **1. Map it.** List every use of the paw help (code, texts, help page, specs, pictures). Keep what
  only looks like a paw but is something else: the certificate frame's paw prints, an animal's paws in
  a drawing. Write the list into this plan's State section.
- [ ] **2. Remove it.** The button, the charging, the typing, the mode hooks, the state, the stored
  count, the texts (sk, en, translator, catalog), the help page lines, the styles, pictures used only by
  it. Keep the rule that a level the child typed too few keys of gives one star
  (`MIN_OWN_KEYS`/`byTapko`) only if something else still types for the child (the super help does);
  then reword it and its texts to the super help, else remove it too.
- [ ] **3. Specs and tests.** Update the specs listed above (WHAT/WHY), remove or adjust unit and e2e
  tests for the paws; tsc, vitest, build, the touched e2e specs; a browser check that a story level, a
  bonus game and the help page show no paw help and nothing is left empty where it was.

## State
Nothing implemented yet.
