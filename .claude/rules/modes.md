---
paths:
  - "src/game/**"
  - "src/engine/**"
  - "src/gfx/**"
---

# Game modes and drawing

- A level kind is a `Mode` subclass loaded on demand (`src/game/modes.ts`); its contract (stage units, `label`, `pictures`, `renderFront`) is in `.specify/architecture.md`, "How to add a world". A mode imports only `modes/kit/`, never another world's mode: each mode is its own chunk.
- Every mode is in `src/game/modes/idle.test.ts` (plays to its end, idles safely); its pure rules get unit tests beside it.
- The cost on a weak computer is pixels, not code (architecture, "Performance on slow computers"): scale once, copy on whole pixels, cache glows and labels, never read the canvas size while drawing a frame, change only the DOM elements a change concerns.
- A world change ends with `node scripts/perf.mjs --budget` and `node scripts/perf.mjs --machine slow --low --budget` on its scenes (`--only <scene>,...`).
- Every picture keeps its drawn fallback; pictures resolve through `src/gfx/assets.ts`.
- Nothing bad happens to the child: obstacles are pushed away, cleared or helped, never destroyed; no lives, no failing timers.
