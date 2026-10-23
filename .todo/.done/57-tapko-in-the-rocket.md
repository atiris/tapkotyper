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

- [x] **Tapko gets in.** At the start of a space level (every `SpaceMode`, the super level and a
      rescue mission in that world too):
      - The DOM Tapko is hidden, like in the modes that draw their own hero (`HeroMode`).
      - The mode draws Tapko where the DOM one stood. In about 1 s he hops to the rocket and
        shrinks into its round window (`drawTapko` at about 40 px, clipped to the window circle).
      - He stays in the window for the whole level, with his mood: happy at a word, curious at
        a mistake, end hops in the window at the end.
      - With reduced motion he is in the window from the start.
- [x] **Speedometer under the rocket.** After Tapko is in, the speedometer slides up from below
      the scene (about 0.5 s, ease out) and docks right under the rocket. It follows the
      rocket's bob, so it reads as the rocket's own instrument. Keep its size and its label.
      With reduced motion it is there from the start.
- [x] **Shouts and bubbles.** `heroSpot()` and Tapko's speech bubble point to the rocket window,
      not to the old DOM place.
- [x] **Specs:**
      - story.md, world 2: Tapko flies in the rocket, and the speedometer is the rocket's instrument.
      - visuals.md: a mode may seat Tapko in its vehicle instead of the standing figure.
- [x] **Checks:** `npm run build`, `npm test`, e2e `play.spec.ts`. Then drive the game with the
      playwright MCP: Rocket level 1 (the hop into the rocket, the speedometer slides up and bobs
      with the rocket), the super level, and with reduced motion on.

## Done - 2026-10-23

- Shipped: in `space` and `asteroid` levels (and their rescue missions) the DOM Tapko is hidden;
  `SpaceMode` draws him where the DOM one stood, he hops in about 1 s into the rocket's window and
  sits there at 44 px behind glass (an empty-glass circle covers the picture's own pilot), with the
  runtime's mood (new `tapkoMood`) and end hops. The speedometer then slides up in 0.5 s and docks
  under the rocket, bobbing with it. Reduced motion: seated and docked from the start.
  `heroSpot()` and the new `Mode.bubbleSpot()` follow Tapko, so shouts and the bubble's tail point
  to the window. `drawTapko` got `shadow: false` for a Tapko off the ground.
- Decisions: the rocket keeps its size (120); the window (glass radius 18) fits the plan's ~40 px.
  The bubble is moved only for modes that return a `bubbleSpot()`; walking heroes keep the corner.
- Checked: `npm run build`, `npm test` (293 passed), e2e `play.spec.ts`; playwright MCP: Rocket
  level 1 (hop, slide-up, bubble on the window), the super level with reduced motion.
- Owner's request mid-run (own commit): on the start page the number sits behind the character,
  which moves gently right on a narrow card; "New player" becomes the bottom button whenever its
  card would start a row of its own; "Play as guest" is now "Incognito".
- Left out: nothing.
