# S3 - Does the game still run smoothly on a weak school computer, and does the code stay easy to grow?

Read `.scenarios/common-rules.md` first; everything in it applies here. This
file adds only what is specific to S3.

Written 2026-10-30 against `main` at `7431abf`, from the work of the finished
plan `.todo/.done/82-performance-and-upkeep.md` (its Findings are a worked
example of a full run).

## 1. Purpose and when to run

A review for speed, smooth drawing, memory and long-term upkeep, done the way a
careful engineer would: **measure first, then change; keep only what measurably
helps; the game looks and plays the same on a normal computer.** A weak school
computer means a slow processor, little memory and no graphics card worth
counting on (old laptops, cheap Chromebooks, a blocklisted driver); disk space
and network speed are not the limit, so nothing is shrunk only to save download
size.

Re-run after a new world or a new kind of level, after changes to the drawing,
the frame loop, the pictures or the screens, when a teacher reports a slow
computer, and in any case every few months. The promises it checks are the
performance section and the performance budget in `.specify/architecture.md`;
the scenario never invents its own numbers.

Every defect found is triaged as `common-rules.md` and the `scenario-run` skill
say: easy and measured -> fixed now (build, test, commit, push); hard and
substantial -> a `.todo/` plan with a queue line; hard and minor -> one
`.todo/BACKLOG.md` line. Inside this scenario the per-reply backlog limit does
not apply (it keeps everything it finds), but each finding is searched first and
never duplicated.

**Destructive:** no. It changes code only through the triage above.

**What it never does:** rewrite a working mode only for style, add a framework or
a runtime dependency, change the game's pace, word timing, difficulty or
results, or make anything visibly worse on a normal computer to win a number.
It never lowers a budget to make a run pass without writing down why.

## 2. Gate

| # | Must be true | How to check | Produced by |
|---|---|---|---|
| G1 | The product builds and its unit tests pass | `npm run build`, `npm test` | - |
| G2 | A tester player with every level open and every key exists as a file the measurement can load | the file the memory note "browser-test-typing" names exists and parses as a profile | - (made once, as that note says; never by typing the super password) |
| G3 | A repeatable measurement tool exists that plays chosen scenes by typing and reports frame times, main-thread busy time, heap, load and leak numbers, and can fail over budget | its usage text, or the `.specify/architecture.md` budget section names it | this scenario (P01 builds or repairs it) |
| G4 | The performance budget is written down | `.specify/architecture.md` has a performance budget section | this scenario (P06 keeps it current) |

**Leaves behind:** a dated before/after table of every measured scene, every
measured fix committed, the budget section and the "how to add a world" section
in `.specify/architecture.md` true for today's code, the measurement tool
passing its budget runs, and the findings triaged.

## 3. Phases

### P01 - A measurement you can trust (budget: 40 min)

- S1: Find the measurement tool and make it cover today's product: one or two
  levels of every built world (its first level and its hardest), one placeholder
  level of an unbuilt world, every side activity (target range, parrot, free
  typing where it draws a scene), the map and the start page. A scene that no
  longer exists is replaced, not skipped.
- S2: Make sure it measures what matters: frames of **play** only (not cards, not
  the results card), the graphics choice pinned per run (the automatic choice
  must not switch in the middle of a run), and three machine profiles: normal
  (laptop size, device pixel ratio 1), slow (the same with the processor slowed
  six times) and big (full HD at device pixel ratio 2).
- S3: Understand what the numbers mean in this tool: in headless Chromium the
  canvas is drawn in software and frames are capped at 60 Hz, so on the normal
  profile the **main-thread busy share** is the sensitive number, on slow and
  big the frame times.

Assertions:

- A01: One command plays every listed scene for a fixed time by typing the
  expected keys and prints a table with, per scene and profile: frame count,
  p50/p95/p99 frame time, frames over 33 ms, long tasks, busy % with script,
  style and layout parts, heap at start and end, and when the level ended.
- A02: Two runs of the same scene on the normal profile differ by at most a few
  busy points; a scene that varies more is noted and measured longer.

### P02 - Baseline (budget: 90 min, mostly waiting)

- S1: Measure every scene on normal (Full graphics), slow (Full and Simple) and
  big (Full) on the unchanged code, and keep the raw results outside the repo.
- S2: Measure loading on a slow line from a cold cache: time to the map, time to
  the first card of a level, what downloads meanwhile by kind.
- S3: Measure memory over many levels in a row (at least ten, better forty):
  heap after each, listeners, stored data size, and the live canvases with their
  sizes and whether they are still on the page.

Assertions:

- A03: A dated baseline table exists in the run's notes, one row per scene and
  profile.
- A04: The budget runs are recorded as passing or failing per scene, with the
  scene and the number over budget named.

### P03 - Where the time goes (budget: 60 min)

- S1: Take one trace of the most expensive scene per profile and rank what the
  main thread spends its time on.
- S2: Switch one thing off at a time (the background, a layer, labels, shadows,
  particles, a DOM part) in a throw-away build and measure the difference: the
  cost of each part, in busy points or milliseconds.
- S3: Walk the usual suspects and give each a measured cost or "no cost":
  per-frame allocations and garbage collection; scaled or sub-pixel picture
  copies; blurs, glows, gradients and filters drawn every frame; big canvases
  cleared and redrawn every frame though little changes; still screens that
  keep redrawing; layout reads after style writes; particle counts; sound nodes
  never released; pictures larger than they are ever drawn or not drawn at all;
  what the first screen's code chunk carries and which mode chunks pull in other
  worlds' code; listeners, observers, timers and caches that outlive their
  screen; files that grew too big to change safely; dead exports, styles, texts
  and pictures.

Assertions:

- A05: Every suspect above has a line in the findings with its measured cost or
  "no cost", and the two or three biggest costs are named with their share.
- A06: For every memory growth found over many levels, the thing that grows is
  named (what object, how many, attached or not) and its retainer is found or
  the growth is shown to be the player's own data.

### P04 - Fix what the numbers say (budget: 120 min)

- S1: Fix the biggest measured costs first, each as small and safe as it can be,
  and measure the same scenes again after each fix.
- S2: Look at every changed scene in the browser as a player (the `playwright`
  MCP, typing with the test typing helper), with Full graphics, side by side
  with how it looked before.

Assertions:

- A07: Every kept fix has a before and after number from the same tool and
  profile in the findings; a fix that does not measurably help is reverted.
- A08: On a normal computer nothing visible changed: same pictures, motion,
  timing and texts (a sub-pixel or rounding difference no one can see is fine;
  a softer, blurrier or jerkier picture is not).
- A09: Unit tests, the build and the main e2e play test pass after the fixes.

### P05 - Slow computers keep the same lesson (budget: 60 min)

- S1: Check that a slow computer gets a lighter drawing and the same game: the
  graphics setting offers its choices in the settings, the automatic choice
  switches on a slow machine and stays switched for that device, and the light
  drawing changes only how things are drawn.
- S2: Play one level per built world and a placeholder level with the light
  drawing chosen in the settings, then with the full one again.

Assertions:

- A10: On the slow profile with the light drawing every story level meets the
  budget's slow numbers; any that does not is a finding with its numbers.
- A11: With the light drawing the level's targets, timing, progress and results
  are the same as with the full one (same words typed, same count to finish).
- A12: Switching the choice in the settings takes effect on the next screen and
  survives a reload.

### P06 - Easy to grow (budget: 60 min)

- S1: Look at what the last world plans kept re-making and what grew too big:
  pieces two or more modes share, a mode that imports another world's mode,
  files that are hard to change safely. Move shared pieces to the shared place
  the architecture names; split only along what a file already does, with the
  same public surface and tests green after each move.
- S2: Remove dead code found in P03 (exports nobody imports, styles no screen
  uses, texts no screen shows, pictures nothing draws), checking history before
  deleting anything that looks deliberate.
- S3: Read the "how to add a world" and performance sections of
  `.specify/architecture.md` against the code as it is now.

Assertions:

- A13: No mode's code chunk pulls in another world's mode (visible in the build
  output or the chunk graph).
- A14: The architecture sections describe today's code: every file, hook and
  command they name exists and does what they say; the budget numbers match
  what the budget runs check.
- A15: Dead code removed is listed in the findings; nothing removed was in use
  (build, tests and e2e green).

### P07 - Guard (budget: 60 min, mostly waiting)

- S1: Measure every scene again on all profiles with the final code, plus load
  and memory, with the same tool version as the final baseline comparison.
- S2: Run the budget checks.

Assertions:

- A16: A dated before/after table of every scene and profile, the load numbers
  and the memory numbers are in the findings.
- A17: Both budget runs pass, or every scene over budget is a queued `.todo/`
  plan or a dated decision in `.specify/architecture.md` saying why the budget
  moved.
- A18: Memory over many levels stays flat after a short warm-up (heap, listeners
  and canvases holding pixels); the player's own stored data may grow a little.

## 4. Close-out (budget for the whole run: about 9 hours, half of it waiting for measurements)

- The findings (method, analysis item by item, fixes with numbers, the final
  table, decisions) go into the plan or report of the run; small leftovers into
  `.todo/BACKLOG.md`, substantial ones into queued `.todo/` plans.
- Verify "leaves behind": the budget runs pass, `.specify/architecture.md` is
  current, `git status` is clean and pushed.

## 5. Known pitfalls (2026-10-30)

- Measuring while something else builds into the same output directory or loads
  the machine skews the numbers: one measurement at a time, nothing else heavy.
- The automatic graphics choice switches a slow run to the light drawing after
  a few seconds unless the run pins the choice.
- On a slow line the network never goes idle while background pictures download:
  wait for a fixed time, not for "network idle".
- A level that ends early (with `?fast`) leaves the results card on screen; its
  backdrop blur over the moving scene inflated the first measurements.
- Sub-pixel copies of big pictures cost almost as much as scaled ones; snapping
  a moving layer to whole pixels at device pixel ratio 1 makes slow layers move
  in visible jumps, so it belongs only in the light drawing.
- Live canvas counts include the bounded caches; look at sizes and whether
  their pixels were freed, not at the count alone.
- Unit tests that use a fixed date but read data back with the real clock start
  failing days later; fix the test, not the product.
- Python on this Windows machine writes CRLF and cannot open `/c/...` paths;
  normalize line endings before committing.
- The `playwright` MCP may only save screenshots inside the repository.

## Appendix - last known paths (2026-10-30, orientation only, expected to go stale)

- Measurement tool: `node scripts/perf.mjs` with `--machine normal|slow|big|all`,
  `--only <scenes>`, `--seconds`, `--low` (light drawing), `--load`, `--leak
  --levels <n>`, `--budget`, `--no-build`, `--no-trace`; traces and raw results in
  `test-results/perf/`.
- Tester profile: `.e2e/tester-profile.json` (gitignored); test typing:
  `window.tapkoType(text)` in dev and e2e builds, `?fast` before the hash.
- Graphics setting: settings screen, look group, "Grafika" / "Graphics" with
  Automatic / Full / Simple; device memory key `tapkotyper:slow-device`.
- Shared mode pieces: `src/game/modes/kit/`; runtime parts: `src/game/runtime/`.
