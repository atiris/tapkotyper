# 50 Honest rhythm, meadow story, two-minute levels, rescue missions with their own place

Runs **after plan 49** (both touch `runtime.ts`; plan 49 adds the rescue end label).

Affected: new `src/game/rhythm.ts` (+ test), `src/game/{runtime,levels,paw}.ts` (+ tests),
`src/learning/stats.ts` (+ test), `src/game/modes/meadow.ts`, the rescue setup in
`src/screens/level.ts` and `src/game/levels.ts` (`rescueLevel`), new rescue backdrop drawing
in `src/gfx/` (fallback), `assets-src/PROMPTS.md`, `public/i18n/{sk,en}.json`,
`e2e/play.spec.ts`, `.specify/game/{mechanics,story}.md`, `.specify/learning/feedback.md`.
Contracts: none. No storage shape change; the recorded rhythm values become more honest. No
server, no DB.

## What
1. **Rhythm counts only real moves between keys.**
   - In "jfjf", the "f" after "j" and the second "j" after "f" count.
   - In "ffff" or "jjjj", nothing counts after the first press.
   - The gauge never climbs high from repeated keys. It tracks the real pace without staying
     high for long after slow typing.
   - The same rule applies to recorded speed (the session's characters per minute and the
     per-day reaction times).
2. **Meadow story fits the play.** The animals play with the player: the wind carries
   leaves, the animals want to score a goal with them, and the player catches the leaves by
   typing their letters.
   - The intro scene and the level's start line say exactly that.
   - The get-ready card ("Pripraviť sa, pozor, píšeme!") of a story level also shows that
     level's one-line story under the title.
3. **No level is over in under two minutes.**
   - Every story level, super level and rescue mission lasts at least 2 minutes of active
     play.
   - Pauses do not count.
   - Timed and untimed practice, custom exercises and free typing keep their own length.
4. **Rescue missions have their own place**: a rescue camp backdrop (evening, warm lanterns,
   a rope bridge and a lookout flag), so a mission looks different from replaying a world.
   The play keeps the mission's level kind.
5. **The paw does not start by itself** in a rescue mission when the player did not ask for
   it. Targets appear as far from Tapko as in the normal level of that kind.

## Why
- Holding one key fakes speed. It lifted the gauge for a long time and wrote wrong speeds
  into the stats a parent reads.
- The old meadow text described something else than the play (goals as the happy outcome,
  a fan), which confused children.
- Some levels end in under a minute, and super levels with 2 to 6 words in seconds. That is
  too short to settle into a rhythm and makes stars cheap.
- A rescue is a special event and should feel like one.
- A paw that types by itself takes the mission away from the player.

## Decisions
- **Rhythm module** (`src/game/rhythm.ts`), pure and unit tested. It replaces the inline EMA
  in `runtime.ts` (`:456-476`, `:514`, `:946-953`) for levels and free typing alike.
  - `press(key, at)`: a correct press counts only when `key !== lastKey`, where `lastKey` is
    the previous **correct** key. The interval is measured from the previous correct press
    (any key) or from `readySince`. The first press after a repeat run counts from the last
    press of the run, so a held key does not produce a long interval.
  - It keeps `interval = clamp(rt, 0.12, 3)` and `ema = ema*0.85 + (1/interval)*0.15`.
  - Start value: `min(lastSessionCpm/60, 0.8*target)`, so a level never opens at the top
    of the gauge.
  - Idle: after 2.5 s without a counted press, the decay becomes `ema -= dt*0.25` (it was
    0.05), with the existing floor 0.4. A slow typist then leaves the top within a few
    seconds.
  - Gauge maximum: keep `target = 0.9 + difficulty*0.35`. Check it with a unit test that
    feeds a steady 1.2 cps at difficulty 3 and expects a gauge ratio near 0.6, not near 1.
    If the test shows a different cause of the "stays high" report, fix that cause and
    record it under `## State`.
  - Tests:
    - "ffff" leaves the ema unchanged after the first press;
    - "jfjf" counts three intervals;
    - start value capping;
    - decay speed.
- **Stats** (`learning/stats.ts` `recordPress`): the `rt` of a same-key repeat (same rule)
  is not added to `rtSum`/`rtCount`. Presses and errors still count as today.
  `recordSession` takes the rhythm module's cpm. Unit test.
- **Meadow texts** (sk + en, rephrase en to match):
  - `story.scenes.world1`: "Zvieratká na lúke sa s tebou hrajú." / "Vietor im nosí listy a
    chcú ti s nimi dať gól." / "Chytaj listy písmenami: napíš slovo na liste a list je
    tvoj."
  - `story.meadowStart`: "Zvieratká ti chcú dať gól! Chytaj listy písmenami."
  - The hedgehog start line should fit the same picture; check it and rephrase if not.
  - If the fan picture contradicts "chytať" in the visuals, keep the visuals and avoid
    naming the fan in texts.
- **Get-ready card** (`cards.ts` `postureContent`): optional `story?: string` shown as a
  short line under the title. `runtime.ts` passes the level's start line (the same text the
  mode says at `start()`, read through a new optional `Mode.startLine()`; meadow returns
  `story.meadowStart`). Other modes return their existing start key where they have one,
  else nothing.
- **Two-minute minimum** (`runtime.ts`, `levels.ts`):
  - New `MIN_ACTIVE_S = 120` for `kind` story levels, super levels and rescue. Active time
    is counted in the update loop while not paused and not on a card.
  - A level finishes when `mode.finished` **and** the active time is at least the minimum.
    Modes keep spawning: `def.count` stays the planned word count, and once it is reached
    early the mode asks for more targets of the same kind. Check each mode's finish test
    (`finished` getter) and give it a `extra` flag or a raised count from the runtime,
    whichever fits the mode code with the smaller change.
  - The progress bar shows `min(words/count, active/MIN_ACTIVE_S)`, so it never stands full
    while the level goes on.
  - Super levels whose story needs an exact number of phrases (owl, reflection, lastsong,
    fireflies, asteroid) repeat their phrase set in order and keep their ending scene.
  - Stars and results use all typed words.
  - Unit test of the finish rule with a fake clock. Update `mechanics.md` from "about 1 to
    3 minutes" to "at least 2 minutes of active play".
- **Rescue place**:
  - `rescueLevel` marks `def.rescue = true`. The runtime uses `bg-rescue-far/mid/near`
    instead of the kind's world backgrounds when the files exist. Otherwise a drawn
    fallback in `src/gfx/` (evening gradient, a few warm lantern glows, a dark rope-bridge
    silhouette and a small flag) is used, in the same three-layer parallax as the other
    worlds.
  - The screen class `world-rescue` is added next to the kind's class (the kind's own
    sprites stay).
  - Add the three strip prompts to `assets-src/PROMPTS.md` in the same style section as the
    other backgrounds. The user generates them. Run `npm run assets` only if the files
    appear.
  - Spec `story.md`: rescue missions happen at the rescue camp.
- **Paw in rescue**:
  - Reproduce with the playwright MCP: start a rescue with `pawAuto` off and paws charged,
    type nothing, and watch for `startPaws`. Check where targets spawn relative to Tapko for
    each `RESCUE_KINDS` mode.
  - Fix the cause:
    - Targets must start at the kind's normal spawn distance (the rescue setup must pass the
      same layout values as the world level).
    - `isHardMoment` must also need the target to have been visible for at least 3 s.
    - Enter pressed before the level started (the get-ready card) must not reach
      `onEnter`: ignore Enter for 300 ms after start and while `event.repeat`.
  - Test in `paw` tests for the 3 s rule.

## State
- Gauge maximum: the unit test with a steady 1.2 cps at difficulty 3 gives a ratio of about
  0.62, so `target` was right. The "stays high" report came from repeats of one key
  (0.12 s intervals lifted the ema to the top) and the slow idle decay (0.05/s).
- The rhythm module also measures the reaction time for the key statistics (from the
  previous press of any kind), so the runtime has one clock instead of `lastKey` and
  `readySince`.
- Two-minute minimum: modes read `L.count` (the runtime's growing count) instead of
  `def.count`; the runtime adds `max(3, maxActive + 1)` targets whenever fewer are left and
  the active time is under the minimum. The super levels' phrases are generated words, so
  "repeat the phrase set" is the same growth. The hedgehog turns new count into new volleys;
  the gate gets a new code of the same length ("one more lock") instead of a longer one,
  so its two-row panel layout stays readable. A mode test runs every mode with a steady
  fake typist and checks it ends between 120 and 180 s.
- e2e: Playwright now builds with `vite build --mode e2e` into `.e2e/dist`; only that build
  reads `?minActive=` (default 0 there), because the e2e tests run on `vite preview`, where
  `import.meta.env.DEV` is false.
- Rescue camp: no `bg-rescue-*` files yet, so the drawn fallback is used; prompts are in
  `PROMPTS.md` section 3 and the strip heights in `scripts/assets.mjs`. `def.rescue`
  replaced the `def.id === 'rescue'` checks in the runtime and the results screen.
- Paw in rescue: no code path starts the paw without `pawAuto` except Enter; a held Enter
  from the get-ready card reached `onEnter` as `event.repeat`. Fixed in `KeyInput` (repeats
  ignored) and with a 300 ms guard after play begins. Spawn positions do not depend on
  rescue (`def.index` only changes the egg sprite and the knot's rope), so no layout fix.

## Steps
- [x] Rhythm module with tests; runtime and free typing use it; stats repeat rule with test.
- [x] Meadow texts sk + en; `Mode.startLine()`; story line on the get-ready card.
- [x] Two-minute minimum with unit test; progress bar; super levels repeat phrases; spec.
- [x] Rescue place: flag, backgrounds or drawn fallback, prompts in `PROMPTS.md`, spec.
- [x] Paw in rescue: reproduce, spawn distance, 3 s rule, Enter guard; test.
- [x] `npm run build`, `npm test`, `npx playwright test` pass (e2e that finish a level fast
      need the fake clock helper or a test override of `MIN_ACTIVE_S`, exposed only in the
      e2e build flag that the helpers already use, if any; otherwise through a query
      parameter read only when `import.meta.env.DEV`).
- [x] Drive the app with the playwright MCP:
  - Type "ffff jjjj" at the start of a level and see the gauge not jump.
  - Type slowly and see it settle low.
  - The meadow intro and the get-ready card tell the leaf-goal story.
  - A first-world level does not finish before 2 minutes; the bar is honest.
  - A rescue mission shows the rescue camp and the paw stays idle without Enter.
  - Console clean.

## Done - 2026-10-23
Shipped: `src/game/rhythm.ts` (repeats of one key do not count, start capped at 80 % of the
gauge, fast idle sinking) used by levels and free typing, with tests; the stats repeat rule;
the meadow leaf-goal texts (sk, en) for the intro scene, the start line and the hedgehog;
`Mode.startLine()` with the story line on the get-ready card; the two-minute minimum for
story, super and rescue levels (growing `L.count`, a new gate code, more hedgehog volleys,
an honest bar) with unit and mode tests and an e2e test on an e2e build with `?minActive=`;
the rescue camp (`def.rescue`, `world-rescue`, drawn evening fallback, prompts in
`PROMPTS.md`); the paw 3 s rule and the Enter guard. Specs updated. `npm run build`,
`npm test` (282) and `npx playwright test` (56) pass. In the browser: repeated f/j did not
lift the gauge, slow typing settled it at 24 per minute, level 1 ended at 131 s with the bar
following the time, a rescue showed the camp and the paw stayed idle after a held Enter,
console clean.
Left out: the `bg-rescue-*` pictures (prompts are ready; the user generates them).
Backlog: Backspace turns the automatic paw on for good (P2).
