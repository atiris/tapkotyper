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

- [ ] **Button.** On the results card of a story level (not practice, not rescue), add
      "Ešte chvíľu zostať" / "Stay a while" after the main next button. The main action keeps
      the default focus.
- [ ] **Endless run.** The button restarts the same level, with the same mode and background,
      without an end:
      - Targets keep coming at the level's pace.
      - No stars, no rewards, no level result, and no unlocks during the run.
      - Key presses go to the stats, and the time counts as play time like in any level.
        Lesson advance runs at the end, as it does after a practice.
      - On a super level, the run uses the mode's normal (non-super) spawn. If a mode cannot
        run endless, use the mode of the world's level 1 for it and note that in a `## State`
        section of this plan.
- [ ] **Tapko explains it.** At the start Tapko says in a bubble:
      - sk "Zostávame tu. Píš, koľko chceš. Keď budeš chcieť skončiť, stlač Esc."
      - en "We stay here. Type as long as you like. Press Esc when you want to stop."
      - A small HUD hint stays on screen: "Esc = koniec" / "Esc = stop".
- [ ] **Esc ends the run** (it does not pause). A small card like the practice result appears:
      - "Cvičenie hotové!" with the run's accuracy and rhythm.
      - Actions: "Na mapu" (default) and next, to the next level.
      - The break reminder from session-pacing still appears on time, as everywhere.
- [ ] **Specs:**
      - mechanics.md: staying a while, and why it gives no stars.
      - session-pacing.md: the endless run still keeps the break reminder.
- [ ] **Checks:** `npm run build`, `npm test`, and an e2e test for the new button. Then drive
      the game with the playwright MCP:
      - Finish a level, choose to stay, type for a while, press Esc.
      - Check the end card, and that the level's stars on the map did not change.
