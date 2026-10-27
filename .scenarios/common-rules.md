# Common rules for every scenario in this directory

The generic rules (gate, durability, finding triage, report, starting the queue
runner) come from the `scenario-run` skill of the dev-workflow plugin. This
file adds what is specific to this project; where it contradicts the skill,
this file wins, and a scenario wins over this file.

## 1. The scenarios and what each is for

| Id | File | The question it answers | Destructive? |
|---|---|---|---|
| S1 | [full-playthrough.md](full-playthrough.md) | Can a new child learn the first keys, finish World 1, and can a parent manage and move the profile? | no |
| S2 | [cross-section.md](cross-section.md) | Does the whole product hold together, from a new account to moving it to another device? | no |

## 2. Environment

- How to start the product and what "up" means: `npm ci`, then `npm run dev`;
  up = `http://localhost:5173/tapkotyper/` loads with no console errors.
  Production build check: `npm run build && npm run preview`
  (`http://localhost:4173/tapkotyper/`).
- Environments: local dev server only. Production is GitHub Pages at
  `https://atiris.github.io/tapkotyper/`, deployed by `.github/workflows/deploy.yml`
  on every push to `main`.
- Seeded accounts: none. There is no backend; profiles live in the browser
  `localStorage`. Start each run in a fresh browser context.

## 3. Production guard

- Check: the browser URL host is `localhost` or `127.0.0.1`.
- Production looks like: `atiris.github.io`. Reading it is harmless (no
  backend, no shared data), but scenarios run against localhost.

## 4. Protected files

- none (the project has no secrets)

## 5. Evidence

- Evidence directory: `.e2e/<scenario>/<yyyymmdd-HHMM>/` (gitignored)

## 6. Hard platform rules during a run

- Drive the app with the `playwright` MCP as a real user (keyboard typing).
- After a fix: `npm run build`, `npm test`; the dev server hot-reloads.
- Commit and push to `main` after each fix; a push deploys GitHub Pages.

## 7. Severity examples for this product

- P1: the game does not start, typing input is lost or lags, a profile or its
  progress is lost, a crash or blank screen, anything that scares or punishes
  the child.
- P2: a story level cannot be finished, wrong per-key statistics, broken
  export/import, missing Slovak or English text.
- P3: visual glitches, animation roughness, minor wording.
