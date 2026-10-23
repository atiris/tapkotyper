# 57 - Tapko rides in the rocket, the speedometer sits under it

Affected: `src/game/modes/space.ts` (`SpaceMode`, `AsteroidMode`), `src/game/runtime.ts` (hiding
the DOM Tapko for a mode that draws him), `src/gfx/tapko.ts` (`drawTapko`), `src/game/mode.ts`
(`heroSpot` for the shouts), `.specify/game/story.md`, `.specify/experience/visuals.md`.
No storage or DB impact.

## Why

In world 2 (Rocket) the speedometer floats at the bottom right with nothing under it, and Tapko
stands on nothing while his rocket flies above him. The owner wants Tapko in the rocket and the
speedometer as part of it.

## What

- [ ] **Tapko gets in.** At the start of a space level (every `SpaceMode`, the super level and a
      rescue mission in that world too):
      - The DOM Tapko is hidden, like in the modes that draw their own hero (`HeroMode`).
      - The mode draws Tapko where the DOM one stood. In about 1 s he hops to the rocket and
        shrinks into its round window (`drawTapko` at about 40 px, clipped to the window circle).
      - He stays in the window for the whole level, with his mood: happy at a word, curious at
        a mistake, end hops in the window at the end.
      - With reduced motion he is in the window from the start.
- [ ] **Speedometer under the rocket.** After Tapko is in, the speedometer slides up from below
      the scene (about 0.5 s, ease out) and docks right under the rocket. It follows the
      rocket's bob, so it reads as the rocket's own instrument. Keep its size and its label.
      With reduced motion it is there from the start.
- [ ] **Shouts and bubbles.** `heroSpot()` and Tapko's speech bubble point to the rocket window,
      not to the old DOM place.
- [ ] **Specs:**
      - story.md, world 2: Tapko flies in the rocket, and the speedometer is the rocket's instrument.
      - visuals.md: a mode may seat Tapko in its vehicle instead of the standing figure.
- [ ] **Checks:** `npm run build`, `npm test`, e2e `play.spec.ts`. Then drive the game with the
      playwright MCP: Rocket level 1 (the hop into the rocket, the speedometer slides up and bobs
      with the rocket), the super level, and with reduced motion on.
