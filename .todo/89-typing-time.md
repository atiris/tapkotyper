# 89 - Time spent typing counts only typing; days and time in the 14-day row

## Why

Every statistic of time takes the level's `elapsed` (`src/game/runtime.ts`, `flushSession` and
`finish`): every unpaused second in a level, also minutes without a single key. A child who
leaves a level open and waits collects minutes for the day chart, the 7-day line, the teacher's
results, the task's played minutes, the parent's "minutes" surprises, wardrobe time and
automatic growth. Only the level's minimum (`played`) already stops after `IDLE_STOP_S`. Time
that stands for practice must be practice. The owner also wants to see in "My progress" how
regularly and how long the child typed in the last 14 days (2026-10-31).

## Decisions

- **Typing time** is one number per run, counted from the child's own keys: on each own key
  (right or wrong, Backspace too; the paw's keys never) it adds the time since the previous own
  key, at most `IDLE_STOP_S` (5 s); the first key of a run adds the time since the run started
  (play, not cards or pauses), also at most 5 s. Pauses, cards and a hidden tab add nothing,
  since the gap is measured on the game clock (`elapsed`), which stops then. A run with no own
  key has 0 s. A pure function in `src/learning/stats.ts` (e.g. `typingStep(gap)`), the runtime
  keeps `typedSeconds` beside `chars`/`errors` and resets it with them in `flushSession`.
- **It replaces `elapsed` everywhere a time of practice is stored or shown:** `recordSession`
  (the day's `seconds`, `trainedSeconds`, wardrobe earning), `completeLevel`/`completeStay`
  (`stats.seconds`, so `grow` and the task run's `recordTaskRun`), the end cards that show
  minutes (practice, staying a while, free typing; their label stays "Čas"), the teacher's
  result minutes (from `trainedSeconds`). Under a minute the end card says "menej ako 1 min"
  instead of rounding up to 1.
- **Not changed:** the level's minimum and progress bar (`played`, their own rules), a timed
  practice's own length (the chosen duration runs on the game clock as now), the break reminder
  (`app.sessionSeconds` stays screen time in a level: a break is about sitting, also while
  waiting), the stretch break's own card, the paws' help in the minimum.
- Growth's "seconds of good play" (`progress.ts`) now get typing time: the step thresholds
  (4 minutes, then one more per step) stay; growth comes a little later for children who read
  long, which is the intent.
- Old stored sessions keep their seconds (alpha: no migration, no data version).
- **14-day row of My progress** (`summaryRow`, the second `progress-sum` list), after the
  existing three chips, in this order:
  - **Days trained:** picture `ui-days-trained` (a pastel desk calendar page with a few days
    ticked off, the owner's style of `ui-keys-typed`), fallback glyph `▦`, text `9/14`, tooltip
    and label (sk) "Dni s tréningom za posledných 14 dní: {n} z 14" (en "Days with practice in
    the last 14 days: {n} of 14"). A day counts when its session has any own key
    (`chars + errors > 0`), today included, by local date as `recentTyping`.
  - **Typing time:** picture `ui-typing-time` (a pastel alarm clock with two bells, the same
    style), fallback glyph `◷` (no emoji); text `45 min` under an hour, else `1 h 25`; tooltip (sk) "Čas písania za posledných 14 dní: {time}" with the full
    form "1 h 25 min" (en "Typing time in the last 14 days: {time}").
  - Both chips always show (0/14 and 0 min too), like the letters chip.
- The line under the progress view ("Za posledných 7 dní: {n} min") stays and uses the same
  typing time.
- Pictures: prompts in `assets-src/PROMPTS.md` section 5 beside `ui-keys-typed` (same look: a
  soft pastel object on the interface background), generated with `gemini-images`, `npm run
  assets`; until they exist the glyphs show.

## Affected

- `src/learning/stats.ts` (typing step, days trained and time over 14 days next to
  `recentTyping`), `src/game/runtime.ts` (`typedSeconds`, `flushSession`, `finish`),
  `src/game/progress.ts` (seconds it gets), `src/screens/level.ts` (end card minutes),
  `src/screens/stats.ts` (`summaryRow` chips), `src/screens/free-type.ts` if it records its own
  time, `src/share/task.ts` (only through the run's seconds), `src/app/super.ts` (fill keeps its
  computed seconds), `public/i18n/{sk,en}.json`, `public/i18n/translator/en.json`,
  `src/i18n/catalog.ts`, `assets-src/PROMPTS.md`, `src/gfx/assets.ts` if pictures are listed.
- Specs: `.specify/profiles/statistics.md` (what time counts, the two new chips),
  `.specify/companion/wardrobe.md` and `.specify/profiles/parent-controls.md` / `teacher-links.md`
  wherever "minutes trained" is defined, `.specify/learning/lesson-progression.md` (growth time).
- DB/store: no new field; `stats.sessions[].seconds` and `trainedSeconds` keep their meaning,
  now honestly filled.

## Steps

- [ ] Specs: statistics (typing time, the new chips), the other mentions of trained minutes.
- [ ] Typing time in `stats.ts` and the runtime; every consumer switched from `elapsed`; end
      card "menej ako 1 min".
- [ ] The two chips in the 14-day row with texts and fallbacks; pictures via `gemini-images`
      and the assets run (if Gemini is unavailable, keep the glyphs and add a backlog line).
- [ ] Tests: unit tests of the typing step (gaps capped at 5 s, no key = 0, paw keys ignored,
      a pause adds nothing), days trained and 14-day time (local dates, today included, days
      without keys not counted); a runtime-level test that a level left idle for a minute with
      two keys records at most about 10 s; the stats row shows both chips.
- [ ] `npm run build`, `npx vitest run`, the stats e2e; Playwright MCP: play a level, wait a
      minute without keys, type, end it, and check My progress (the chips, the day chart, the
      7-day line) shows only the typing time; screenshot of the 14-day row at 1024x600 and at
      phone width (the chips fit on one or two lines without overflow).
