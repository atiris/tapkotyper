# CLAUDE.md

TapkoTyper (Ťapko) is a static browser game that teaches children touch typing through stories: TypeScript + Vite, Canvas 2D for scenes, DOM for screens, no backend, deployed to GitHub Pages on every push to `main`. What and why per feature: `.specify/index.md` (read the one feature file a task touches, not the whole tree); platform rules and performance budget: `.specify/architecture.md`.

## Map

| Path | What lives here |
| --- | --- |
| `src/main.ts`, `src/app/` | start-up, routing, the app state (`app.ts`), theme, super mode, the about pages built by `vite.config.ts` |
| `src/screens/` | one file per screen (start, map, level, parent settings, stats, translator, teacher pages in `teacher/`) |
| `src/game/` | levels (`levels.ts`), the level runtime (`runtime.ts` + `runtime/`), cards, rewards, progress; `modes/` one file per level kind, `modes/kit/` pieces shared by two or more modes |
| `src/engine/`, `src/gfx/` | frame loop, stage, particles, tweens; drawing of scenes, the character and pictures (`assets.ts` resolves them) |
| `src/keyboard/` | layouts (`layouts.ts`: keys, fingers, dead keys), key names, fingers |
| `src/learning/` | lesson order per layout (`lessons.ts`), key stats, the placement check |
| `src/words/` | target words from the word lists, blocked words, dictation rules |
| `src/i18n/` | language table and lookup (`i18n.ts`), the translator's catalog of every text (`catalog.ts`), own languages |
| `src/ui/` | DOM widgets: keyboard guide, hands, menus, cards, tooltips, QR, toasts |
| `src/storage/` | profile schema and `localStorage` store, IndexedDB helper |
| `src/share/` | teacher tasks and results as links, `.tapko` files |
| `src/audio/` | synthesized sounds, music tracks, speech |
| `public/i18n/<lang>.json` | every game text per language (~165 KB each); `translator/en.json` the translator's situations |
| `public/words/<lang>.json` | word lists; `public/assets/` web pictures made by `npm run assets` from `assets-src/` (raw files not committed, prompts in `assets-src/PROMPTS.md`) |
| `e2e/` | Playwright specs; `scripts/` build helpers, `perf.mjs`, `i18n.mjs`, `test-affected.mjs`; `tools/hand-poser/` the owner's hand tool |
| `.specify/` `.research/` `.scenarios/` `.todo/` | specs (WHAT/WHY), research, end-to-end scenarios, plans and backlog; `.todo/.done/` is history, never current truth |

## Commands

- `npm run dev` - dev server on http://localhost:5173/ (`?fast` before the hash speeds up animations; `window.tapkoType(text)` types like a child)
- `npm test` - the whole unit suite, about 3 s; `npx tsc --noEmit` about 2 s
- `npm run test:affected` - tsc + unit suite + only the Playwright specs that cover the changed files (`-- --dry` shows the choice, `-- --base <ref>` for a range, `-- <paths>`); a new spec or a new area gets its line in `RULES` in `scripts/test-affected.mjs`
- `npx playwright test e2e/<name>.spec.ts` - one spec (the server builds the e2e bundle first, ~5 s); the whole e2e suite takes minutes
- `node scripts/perf.mjs --budget` and `node scripts/perf.mjs --machine slow --low --budget` - frame budget, one to two minutes per scene; only before a world plan is finished
- `npm run i18n -- <key or prefix>` / `-- --find <text>` / `-- --missing` / `-- --same cs,sk` - texts in every language side by side with their situation; `--same` lists texts identical in two languages, counted per section

## Verify

- After a change: `npm run test:affected`. A step is done when it is green. CI (`.github/workflows/deploy.yml`) runs build + unit tests on every push.
- UI changes are also checked in the browser (global rule); judge looks from a screenshot, but check state, texts and layout numbers with `browser_evaluate` or `browser_snapshot`, which cost a fraction of a picture.

## Reading cheaply

- Never Read `public/i18n/*.json`, `public/i18n/translator/en.json` or `public/words/*.json` whole (40-60k tokens each): use `npm run i18n` or Grep for the key.
- Files over ~600 lines (`src/styles.css`, `src/game/runtime.ts`, `src/game/modes/aim.ts`, `dragons-flight.ts`, `rhythm.ts`, `planet.ts`, `src/screens/translate.ts`, `tools/hand-poser/rows.ts`): Grep their outline first (`^export|^function|^class|^const [A-Z]` for code, `^/\* ` for the CSS sections), then Read only the range.
- `.ignore` keeps `.todo/.done/`, the word lists and the hand tool's pose data out of searches; name the path to search them.
- A long visual loop (generating pictures, many screenshot rounds) fills the context with images that every later turn pays for again: give it to a subagent that returns a short verdict and file paths, unless the owner said the work stays in this chat.

## Rules

- Path-scoped rules in `.claude/rules/` load with the files they cover: texts and languages, game modes and drawing, e2e specs, pictures.
- Alpha: no store migrations or data versions; a new profile field gets a default.
- Languages: adding or changing a language starts from `.specify/experience/localization.md`; languages, layouts and lesson orders are tables in `src/i18n/i18n.ts`, `src/keyboard/layouts.ts` and `src/learning/lessons.ts`.
