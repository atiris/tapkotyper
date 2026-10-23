# 56 - A bigger, playful character on the progress card

Affected: the progress tab (`src/screens/stats.ts`, its card in the menu dialog), `src/gfx/tapko.ts`
only if a helper for a random mood is missing, `src/styles.css`, `.specify/profiles/statistics.md`.
No storage or DB impact.

## Why

On the "Postup" tab the child's character is small and does nothing. It is the child's own
figure, so it should be big and react when the child clicks it, like a friend.

## What

- [ ] **Bigger.** The character on the Postup tab is about 1.5x its current size (now about
      140 px wide, so about 210 px). It stays left of the summary, and on a phone it sits above
      the summary at about 160 px.
- [ ] **Reacts to a click** (and to Enter or Space, since it is a button with an aria-label
      such as "Ťapko" / "Tapko"). Each click does one of these at random, never the same twice
      in a row:
      - a jump (the CSS `jump` animation the level uses, or a similar short hop);
      - another mood or pose from the moods that have a picture for this kind (`hasImage(`tapko-<kind>-<mood>`)`),
        shown for about 2 s, then back to idle.
      With reduced motion: only the mood change, no jump.
- [ ] Spec: statistics.md - the character on the progress tab is big and plays when clicked, and why.
- [ ] **Checks:** `npm run build`, `npm test`. Then drive the game with the playwright MCP:
      open Môj postup, click the character several times (jumps and changes poses), and press
      Enter on it.
