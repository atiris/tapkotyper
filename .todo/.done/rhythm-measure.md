# Rhythm as evenness in every level, and one set of top-bar rings

The backlog's P1 "Rhythm of the levels", with the owner's decisions of 2026-11-08. The method is in
`.research/learning/rhythm-measure.md` (pairwise variability of log key intervals, its chain breaks,
combos, errors and pauses) - read it first; the owner agreed with it. Specs to keep in step:
`.specify/learning/feedback.md`, `.specify/game/mechanics.md` (top bar), `.specify/profiles/statistics.md`,
`.specify/profiles/parent-controls.md` (the new switches), `.specify/game/rhythm.md` (its rings).
No store migrations: new fields get defaults.

Owner's decisions:
- The top bar shows the same three rings everywhere, story levels and the bonus games (parrot, target
  range, Rytmus, own practice, free typing, tasks): **Presnosť**, **Rytmus**, **Rýchlosť**, in this order.
- The per-key accuracy rings of the target range and own practice go away (the key statistics keep
  that information). Every other speed/rhythm/accuracy indicator in the top bar is replaced by the three.
- Rhythm never changes stars, never shows on the end card; it goes into the statistics.
- Which rings show is a per-profile setting: three checkboxes in Settings, group "Zvuky a rozhranie":
  Presnosť (on by default), Rytmus (off), Rýchlosť (off); the super player has all three on.

Affected: `src/game/speed.ts` (or a new `src/game/evenness.ts`), `src/game/runtime.ts` (key times,
the rings), `src/ui/hud.ts` (one ring component per measure), `src/game/modes/rhythm.ts` (feeds the
same rings), `src/learning/stats.ts` + `src/storage/schema.ts` (session `rhythm`), `src/screens/stats.ts`
(statistics), `src/screens/parent.ts` (checkboxes), `src/app/super.ts`, `public/i18n/*`, `src/styles.css`.

## Steps

- [x] **1. The measure.** A pure module computing the evenness score 0-100 from correct strokes with
  their `KeyboardEvent.timeStamp`, by the research file: log intervals, successive differences, chain
  breaks (first letter of a target, after a pause/card/resume/lost focus, an interval holding a wrong
  key or Backspace, the same key repeated), combos (dead key, Shift + letter) as one stroke, the
  mapping to 0-100 with the research's starting numbers; `null` below 10 pairs. Unit tests with
  synthetic streams: steady slow and steady fast both score high, bursts and hunts score low, a slow
  drift costs nothing, combos and errors are left out.
- [x] **2. Keys feed it.** The runtime passes each correct stroke (and the breaks) to the measure for
  the whole level; the score is read for the ring and the session.
- [x] **3. Three rings, one component each.** In `hud.ts`: `accuracyRing` (the level's right keys
  share, `accuracyFill` ring, "%" text, a check at 100), `rhythmRing` (score 0-100, ring by score, "…"
  until there is a score), `speedRing` (the existing wave gauge with characters a minute). Tooltips and
  `aria-label`s name the measure and the value ("Presnosť: 96 %", "Rytmus: 82 zo 100 - ako rovnomerne
  píšeš", "Rýchlosť: 64 písmen za minútu"). The top bar of every level kind uses exactly these (in the
  order above, after the progress bar); remove `accuracyPics` and any other indicator they replace.
  Rytmus feeds the same three with its own beat accuracy, its beat score and its tempo (its own
  `accEl`/`beatEl`/`tempoEl` go away).
- [x] **4. The switches.** Per-profile settings `hudAccuracy` (default true), `hudRhythm` (false),
  `hudSpeed` (false), three checkboxes in Settings > "Zvuky a rozhranie" with one hint line; the super
  player gets all three true. The rings hidden by them are not built. Exception: in Rytmus all three
  always show, its game is the beat (say so in the hint).
- [x] **5. Statistics.** `SessionRecord.rhythm: number | null` saved at a level's end (null without a
  score; Rytmus saves its beat score). The parent statistics get a "Rytmus" line between accuracy and
  speed (average of the sessions with a score, like the others); My progress's second row (last 14
  days) gets a rhythm chip between accuracy and speed (picture `ui-act-rhythm`, tooltip "Rytmus za 14
  dní: {n} zo 100 - ako rovnomerne píšeš"), hidden while no session has a score. The overall result
  code / teacher result carries it if they carry accuracy and speed per session (check
  `makeOverallResult`); old records without it read as null.
- [x] **6. Clean up.** Remove anything left that calls speed "rhythm" or shows a speed-based
  "rhythm" (search `rhythm` in `progress.ts`, `end-news.ts`, `speed.ts`, texts); the end card shows no
  rhythm. Remove the backlog line if still present.
- [x] **7. Checks.** tsc, vitest, build, e2e for the top bar and statistics (`play`, `rhythm`, `aim`,
  `parrot`, `free-type`, `parent`, `layout`); browser check of a story level with all three rings on,
  the defaults (only Presnosť), Rytmus with its three, the statistics line and chip.

## State
- Step 1: `src/game/evenness.ts` (`Evenness`): the live ring needs 10 pairs, a session score 20 (the research's numbers; the plan's "null below 10 pairs" is the ring's). Key pair classes (two hands, one hand, one finger; thumbs and unknown keys count as two hands) learn their usual interval within the level only, not across sessions in the profile: no new stored field, and the class shares 0.85 / 1.0 / 1.3 cover the start. The accuracy cap uses the whole level's accuracy for the ring and the session.
- Step 2: `TypedChar.start` is a combo's first press (the dead key, or a Shift pressed after the previous character). One runtime `typingReady()` replaces every `speed.ready(...)` (play start, resume, paws stopped, held key back, a new target in focus, the dragons' waits), so the speed and the rhythm chain always restart together. Free typing feeds the speed and the rhythm (an erase or a sent text breaks the chain); its accuracy ring stays at 100, as free typing has no wrong keys.
- Step 3: `accuracyRing`, `rhythmRing`, `speedRing` in `hud.ts`; the disc shows the number without "%" (it fits the disc; the tooltip has it). `Mode.rings()` is gone; a mode that measures itself gives `meter()` (Rytmus: beat accuracy, beat score of the last 16 landings, tempo) and `sessionRhythm()`. The placement check gets the rings too (it was not listed, but "every level kind").
- Step 5: a session is a day, so the day's `rhythm` is the average of its scored levels weighted by their letters, kept in a second optional field `rhythmChars`; both fields are optional in `SessionRecord` (old records read as none). The parent "line" is a chart "Rytmus" between accuracy and speed in My progress > Klávesy, only with days that have a score. `makeOverallResult` carries no per-session values, so the result code is unchanged.
- Step 6: no speed-based "rhythm" was left in `progress.ts`, `end-news.ts`, `speed.ts`; the backlog line was already gone. Rytmus' own end card keeps its beat score (it is that game's result).
- Step 7: tsc, vitest (710), build and e2e `play`, `rhythm`, `aim`, `parrot`, `free-type`, `parent`, `layout`, `styles` (46) pass. Browser (own headless Playwright script, the MCP browser was held by another session): defaults show only Presnosť; with all three on the order after the progress bar is Presnosť, Rytmus, Rýchlosť; steady typing in meadow level 3 scored "Rhythm: 100 of 100"; a session of 71 letters saved `rhythm: 100`, one of 28 letters none (under 20 pairs); Rytmus showed its three with switches off ("Speed: 40 letters per minute" = its tempo); My progress showed the drum chip "Rhythm over the last 14 days: 100 of 100" and the Klávesy charts Accuracy, Rhythm, Speed, Time per day. Seen: meadow level 1 (single f/j targets, mostly repeats) never forms pairs, so its ring stays "…" (backlog).

## Done - 2026-11-08
Shipped: rhythm as evenness (pairwise variability of log key intervals with chain breaks, combos as one stroke, key pair classes, bounded hunts, accuracy cap); one set of top-bar rings in every level kind (Presnosť, Rytmus, Rýchlosť) replacing the per-key accuracy rings and the speed gauge, Rytmus feeding the same rings; three per-profile switches in Settings > Zvuky a rozhranie (Presnosť on, the others off, all on for the super player); the day's rhythm in the statistics, the 14-day chip and the trend chart; help page icons; specs.
Left out: class medians kept across sessions in the profile (per level only); the rocket's and the dragons' flight stay on speed (the research's open question was not decided; the dragons' story line "píš pravidelne, plynulo" still asks for evenness); levels of single letters or repeated keys get no rhythm score (in BACKLOG.md).
