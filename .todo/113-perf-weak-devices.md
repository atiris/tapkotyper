# 113 - Smooth play on weak devices (Fable optimizes, Opus measures)

Goal: every part of the game that costs frame time, load time or memory is gone through by an
optimization expert; slow devices play noticeably smoother, the graphics and effects look at least
as good (better where the budget allows), and nothing gets worse on fast devices or for crawlers.

Affected: `src/engine/`, `src/gfx/`, `src/game/runtime*`, `src/game/modes/**`, `src/ui/` (keyboard
guide, hands, HUD), `src/styles.css`, `src/app/` (start, about pages), `vite.config.ts`,
`scripts/perf.mjs`, `.specify/architecture.md` (Performance sections). No store fields, no contracts
of share links or `.tapko` files, no DB.

## Roles (fixed, no deviation)
Fable is expensive: it spends its tokens only on optimization thinking and edits. Everything else
(finding code, reading traces, measuring, testing, reverting, committing, docs) is Opus's work.
- **This session (Opus) is the orchestrator.** It measures, analyses the traces, prepares the
  dossier, runs every check, decides keep/revert by the gates, reverts, commits, updates specs. It
  does not design optimizations itself.
- **The dossier** `.todo/113-perf-dossier.md` (Opus writes it before Fable's first call of a
  step, under 250 lines), so Fable never has to search the repo:
  - per scene and machine the frame split from the traces: scripting / style recalc (count,
    elements) / layout / paint / raster-composite, the top 10 functions by self time with
    `file:line`, GC time, long tasks;
  - for each hot spot the code path in order (caller -> callee) as `file:start-end` ranges of the
    exact functions involved, with one line on what each does per frame;
  - the rules it must keep (architecture "Performance on slow computers", modes rules, gates
    below) condensed to bullets, and the list of earlier reverted ideas with their reasons;
  - the stats table of the current state.
- **The optimizer is a subagent on Fable:** `Agent({ model: "fable", subagent_type: "general-purpose" })`,
  one per step, continued with `SendMessage` inside the step (not relaunched). Its brief:
  - role: "expert in browser rendering performance (Canvas 2D software drawing, style recalcs,
    layout, GC, loading); improve smoothness on weak devices, keep or improve the look";
  - read only `.todo/113-perf-dossier.md` and the `file:start-end` ranges it names; open other
    code only when a change needs it, never search the tree broadly;
  - edit the files; no test runs, no `perf.mjs`, no builds (Opus runs them and reports back);
  - return per change: files, what it saves (which part of the frame), expected effect per
    machine, visual effect, risk; at most ~300 words, no code echoed back;
  - never commit, never add dependencies, never add `Co-Authored-By`, `Claude-Session` or other
    trailers anywhere.
- After each Fable batch Opus runs `npx tsc --noEmit` and `npm test` (type errors and red tests
  go back to Fable with the exact message, at most twice, then the change is reverted), measures,
  updates the stats, and sends Fable a short verdict per change (kept / reverted + numbers) for the
  next iteration. At most 4 iterations per step; stop earlier when an iteration gains less than
  noise.

## Measurement protocol (Opus)
- Build once per measurement batch, then `--no-build`. Run each configuration twice, take the
  better p50/p95 of the two as the row (headless noise); report a change only beyond noise:
  p50 +-1 ms, p95 +-3 ms, load +-5 %.
- Configurations (scenes: all of `SCENES` in `scripts/perf.mjs` unless the step narrows them):
  `--budget` (normal, Full) | `--machine slow --low --budget` | `--machine slow --lowres` |
  `--machine slow --auto --hiccup` (which step Automatic ends on) | `--machine big` (DPR 2) |
  `--load` | `--leak` | `--results` on meadow-1, valley-3.
- Also record: main chunk and each mode chunk size (gzip) from `vite build`, long tasks per scene,
  JS heap.
- SEO guard: after `npm run build`, keep a copy of `dist/index.html`, `dist/about/**/index.html`,
  `dist/robots.txt`, `dist/sitemap.xml`; a change that alters their `<head>`, visible text,
  links, `lang`, canonical/hreflang or structured data is reverted, unless it only reorders
  resource hints with equal content. `--load` first paint of the start page must not get worse.
- `.todo/113-perf-stats.md` holds: the baseline table, then one table per kept batch (scene x
  configuration: p50, p95, long tasks; load; chunk sizes) and a one-line verdict per change.
  Keep it under 200 lines: older batches collapse into one "after step N" table.

## Gates (a change is kept only if all hold)
- slow-low or slow-lowres improves in at least one scene beyond noise, or the look improves
  without any slow scene getting worse;
- normal and big: no scene worse beyond noise; budgets of `.specify/architecture.md` still met;
- SEO guard unchanged; main chunk not larger by more than 2 KB gzip without a measured gain;
- the game's pace, word timing, results, stars and lessons unchanged (architecture: "a slow
  computer gets the same lesson"); every mode still passes `src/game/modes/idle.test.ts`;
- every picture keeps its drawn fallback; labels stay as sharp as in Full.
A reverted change is listed in the stats file with its reason, so a later round does not retry it.

## Known leads (start here, not limits)
- Simple, slow: p95 50-80 ms in valley-1 and space-5 from style recalcs of ~207 level elements
  each time Tapko changes (`src/game/runtime/tapko.ts`) and the SVG hands' opacity transitions.
- Simple, slow: the sharp word-label layer (`src/engine/loop.ts` beginWords) costs 8-12 % main
  thread (meadow-1 at the 0.5 step 54 % busy vs 46 % with blurry labels); dirty-rect redraw of the
  scene canvas or labels as composited DOM may win it back.

### Step 1 - Baseline and audit
- [ ] Opus: full measurement batch (all configurations), SEO guard copies, write the
      baseline into `.todo/113-perf-stats.md`.
- [ ] Opus maps every performance-relevant part (frame loop, stage and scaling, background bands,
      particles, tweens, glows, labels, each mode's draw, HUD/keyboard/hands DOM and CSS, cards and
      blur, start page and map, asset loading and the service worker, memory over levels) to its
      cost in the traces and writes the dossier, all areas, ranked by measured cost.
- [ ] Fable (audit only, no edits, one call): from the dossier, a ranked list of proposals: cost
      now, expected gain per machine, risk, visual effect, which round.
- [ ] Opus writes the list (one line each) under `## Proposals` in this plan, grouped into rounds
      1-3 below; proposals that break a gate are dropped with the reason.
- Checks: none beyond the measurement. Commit plan, stats, dossier.

### Step 2 - Round 1: canvas and pixels (scenes, bands, labels, particles, glows)
- [ ] Opus refreshes the dossier for the round (only its hot spots and ranges, current numbers).
- [ ] Fable implements the round-1 proposals in iterations; Opus checks and measures slow-low,
      slow-lowres, normal, big on the scenes they touch; keep/revert per gate.
- Checks per iteration: `npx tsc --noEmit`, `npm test`; at the end `npm run test:affected`.
  Commit kept changes with the stats update.

### Step 3 - Round 2: page and styles (HUD, keyboard guide, hands, Tapko, cards, map, start)
- [ ] Same loop (dossier refresh first) for round-2 proposals; include style recalc counts from
      the traces in the table.
- Checks as step 2. Commit.

### Step 4 - Round 3: loading, memory, Automatic graphics, looks
- [ ] Same loop (dossier refresh first) for round-3 proposals: first load and level open (`--load`), heap (`--leak`),
      whether Automatic picks the right step on each machine (`--auto --hiccup`), and visual
      improvements (effects, glows, motion) that the budget now allows on normal/big, never at
      the cost of slow.
- Checks as step 2, plus the SEO guard. Commit.

### Step 5 - Full verification and close
- [ ] Full measurement batch, final table vs baseline at the top of the stats file.
- [ ] `npm run build`, `npm test`, the whole e2e suite (`npx playwright test`), SEO guard.
- [ ] Browser check with the Playwright MCP: start page, map, meadow-1, valley-3 in Full and
      Simple; screenshots only for scenes whose drawing changed (subagent returns a verdict).
- [ ] Update `.specify/architecture.md` "Performance on slow computers" with what is now true
      (WHAT/WHY); adjust the budget numbers only if they got stricter.
- [ ] Move plan, stats and dossier to `.todo/.done/`, `## Done - <date>`, leftovers to `BACKLOG.md`,
      remove the `QUEUE.md` line.
