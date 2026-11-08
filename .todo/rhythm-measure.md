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

- [ ] **1. The measure.** A pure module computing the evenness score 0-100 from correct strokes with
  their `KeyboardEvent.timeStamp`, by the research file: log intervals, successive differences, chain
  breaks (first letter of a target, after a pause/card/resume/lost focus, an interval holding a wrong
  key or Backspace, the same key repeated), combos (dead key, Shift + letter) as one stroke, the
  mapping to 0-100 with the research's starting numbers; `null` below 10 pairs. Unit tests with
  synthetic streams: steady slow and steady fast both score high, bursts and hunts score low, a slow
  drift costs nothing, combos and errors are left out.
- [ ] **2. Keys feed it.** The runtime passes each correct stroke (and the breaks) to the measure for
  the whole level; the score is read for the ring and the session.
- [ ] **3. Three rings, one component each.** In `hud.ts`: `accuracyRing` (the level's right keys
  share, `accuracyFill` ring, "%" text, a check at 100), `rhythmRing` (score 0-100, ring by score, "…"
  until there is a score), `speedRing` (the existing wave gauge with characters a minute). Tooltips and
  `aria-label`s name the measure and the value ("Presnosť: 96 %", "Rytmus: 82 zo 100 - ako rovnomerne
  píšeš", "Rýchlosť: 64 písmen za minútu"). The top bar of every level kind uses exactly these (in the
  order above, after the progress bar); remove `accuracyPics` and any other indicator they replace.
  Rytmus feeds the same three with its own beat accuracy, its beat score and its tempo (its own
  `accEl`/`beatEl`/`tempoEl` go away).
- [ ] **4. The switches.** Per-profile settings `hudAccuracy` (default true), `hudRhythm` (false),
  `hudSpeed` (false), three checkboxes in Settings > "Zvuky a rozhranie" with one hint line; the super
  player gets all three true. The rings hidden by them are not built. Exception: in Rytmus all three
  always show, its game is the beat (say so in the hint).
- [ ] **5. Statistics.** `SessionRecord.rhythm: number | null` saved at a level's end (null without a
  score; Rytmus saves its beat score). The parent statistics get a "Rytmus" line between accuracy and
  speed (average of the sessions with a score, like the others); My progress's second row (last 14
  days) gets a rhythm chip between accuracy and speed (picture `ui-act-rhythm`, tooltip "Rytmus za 14
  dní: {n} zo 100 - ako rovnomerne píšeš"), hidden while no session has a score. The overall result
  code / teacher result carries it if they carry accuracy and speed per session (check
  `makeOverallResult`); old records without it read as null.
- [ ] **6. Clean up.** Remove anything left that calls speed "rhythm" or shows a speed-based
  "rhythm" (search `rhythm` in `progress.ts`, `end-news.ts`, `speed.ts`, texts); the end card shows no
  rhythm. Remove the backlog line if still present.
- [ ] **7. Checks.** tsc, vitest, build, e2e for the top bar and statistics (`play`, `rhythm`, `aim`,
  `parrot`, `free-type`, `parent`, `layout`); browser check of a story level with all three rings on,
  the defaults (only Presnosť), Rytmus with its three, the statistics line and chip.

## State
Nothing implemented yet.
