# 54 - "Stay a while" after a level

Affected:
- `src/screens/level.ts`: results actions and the end card.
- `src/game/runtime.ts`: an endless run of the same level.
- `src/game/mode.ts` and the modes, only where a mode needs an endless spawn.
- `public/i18n/{sk,en}.json`, `.specify/game/mechanics.md`, `.specify/experience/session-pacing.md`.

No storage or DB impact beyond the usual key stats and play time.

## Why

A child who likes a level wants to keep typing there. Replaying gives stars again, which the
owner does not want. Staying may only improve accuracy and add play time.

## What

- [x] **Button.** On the results card of a story level (not practice, not rescue), add
      "Ešte chvíľu zostať" / "Stay a while" after the main next button. The main action keeps
      the default focus.
- [x] **Endless run.** The button restarts the same level, with the same mode and background,
      without an end:
      - Targets keep coming at the level's pace.
      - No stars, no rewards, no level result, and no unlocks during the run.
      - Key presses go to the stats, and the time counts as play time like in any level.
        Lesson advance runs at the end, as it does after a practice.
      - On a super level, the run uses the mode's normal (non-super) spawn. If a mode cannot
        run endless, use the mode of the world's level 1 for it and note that in a `## State`
        section of this plan.
- [x] **Tapko explains it.** At the start Tapko says in a bubble:
      - sk "Zostávame tu. Píš, koľko chceš. Keď budeš chcieť skončiť, stlač Esc."
      - en "We stay here. Type as long as you like. Press Esc when you want to stop."
      - A small HUD hint stays on screen: "Esc = koniec" / "Esc = stop".
- [x] **Esc ends the run** (it does not pause). A small card like the practice result appears:
      - "Cvičenie hotové!" with the run's accuracy and rhythm.
      - Actions: "Na mapu" (default) and next, to the next level.
      - The break reminder from session-pacing still appears on time, as everywhere.
- [x] **Specs:**
      - mechanics.md: staying a while, and why it gives no stars.
      - session-pacing.md: the endless run still keeps the break reminder.
- [x] **Checks:** `npm run build`, `npm test`, and an e2e test for the new button. Then drive
      the game with the playwright MCP:
      - Finish a level, choose to stay, type for a while, press Esc.
      - Check the end card, and that the level's stars on the map did not change.

## State

- Implemented: `stay` option of `LevelRuntime` (no minimum ever reached, so every mode keeps
  growing its target count; Esc and the pause card's end button end the run), the button on
  story-level results, the stay end card in `level.ts`, `completeStay` in `progress.ts`.
- Super levels: the super modes are separate classes with no normal spawn, so staying on a
  super level plays the world's last regular level (index 3) in the same world and
  background, not level 1: level 1 of world 1 is single chunks without space, level 4 uses
  every key. Next on the end card goes to the level after the original one when it is open.
- Decisions: the run skips the get-ready card, the tip and the surprise (the child just played
  the level); the paw stays available; growth time counts like after a practice; the end card
  also lists new keys and a growth step when the lesson advanced; it offers the break first
  when one is due, and Tapko's bubble says the break inside the run like in free typing; a
  run with no key goes back to the map. A task run shows no stay button (task runs are counted).

## Done - 2026-10-23

Shipped: "Stay a while" on story-level results, an endless run of the same level (no stars,
rewards, level result or unlocks; keys, time, lesson advance and growth count), Tapko's
start line and the "Esc = stop" HUD hint, Esc ending the run into a small practice-like
card (Map first, Next level, the break first when due), specs in mechanics.md and
session-pacing.md, a unit test for `completeStay` and an e2e test. Checked in the browser:
finished world 1 level 1, stayed and typed for 30 s, Esc showed "Cvičenie hotové!" with
accuracy and rhythm, and the map kept the level's 3 stars. Nothing was left out.
