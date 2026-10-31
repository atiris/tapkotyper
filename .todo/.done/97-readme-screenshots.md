# 97 - README pictures: current screenshots

The owner (2026-10-31) wants the pictures in `README.md` to show the game as it is now. Today the
README shows `docs/start.png`, `docs/map.png`, `docs/meadow.png` and `docs/space.png`, last taken
2026-10-23; since then the map, the levels, the journey, the egg, the great challenge pictures and
the tasks changed. Affects only `docs/*.png`, `README.md` (image lines and their alt text) and a
new script `scripts/readme-shots.mjs`. No code, store or spec impact.

## Decisions (taken; do not ask)
- **Same four pictures, same names**, so the README text around them stays: start page, map,
  a meadow level, a space level. Add a fifth, `docs/tasks.png` (the player's Tasks page with one
  unfinished and one finished task), under the map in the README; its alt text "Tasks page".
- **Taken by a script**, `scripts/readme-shots.mjs`, so the next update is one command
  (`node scripts/readme-shots.mjs`): it builds with `vite build --mode e2e` into `.e2e/dist`, serves
  it with `vite preview` on a free port, drives `@playwright/test`'s Chromium (already a dev
  dependency) and writes the PNGs into `docs/`. Mention the command in a one-line comment at the
  top of the script, not in the README.
- **Look**: viewport 1366x768, light theme, Slovak interface (the README's main audience plays in
  Slovak), `reduceMotion` on so frames are steady, sound off. Each picture is the viewport, not
  the full page. Save as PNG; keep every file under 400 KB (resize with `sharp`, already a dev
  dependency, to width 1200 if a file is larger).
- **State**: the script makes its own player and never types the super password: it creates a
  profile through the start page's new-player form (nickname "Ema"), then sets its progress in
  `localStorage['tapkotyper:v1']` so worlds 1-4 are done with stars
  (levels of those worlds 3 stars, `worldsDone` 0-3, all keys of those worlds unlocked), reload.
  The map picture shows the first story with the next level highlighted.
- **Levels**: the meadow picture is a chase level of world 1 mid-play (open
  `#/p/<id>/play` through the map's level node, close the get-ready cards, type about 20
  characters with `window.tapkoType` from the `.kb-guide` `data-next`, then shoot); the space
  picture is a level of the space world the same way. Use `?fast` in the address.
- **Tasks picture**: add two tasks with `addTask` data in `localStorage` (one finished with a best
  run, one not), open `#/p/<id>/tasks`.
- Check every picture by eye (Read the PNG) before committing: no open tooltip, no dialog left
  over, no console error.

## Steps
- [x] `scripts/readme-shots.mjs` (build, serve, player state, five pictures).
- [x] Run it; look at each picture; fix what looks wrong.
- [x] `README.md`: the fifth picture line; alt texts unchanged for the four.
- [x] Commit the script, the pictures and the README.

## Done - 2026-10-31
Shipped `scripts/readme-shots.mjs` (`node scripts/readme-shots.mjs`): e2e build, `vite preview` on
a free port, Chromium at 1366x768 with the Slovak locale, light theme and reduced motion. It reads
the lesson order and the dragon story's key counts from the game's own code (`vite.ssrLoadModule`),
so worlds 1-4 are done and the keys of the next level (5.1, the egg) are known, which keeps the
highlighted level in the first story. Focus is taken off before each picture, so no tooltip shows.
New pictures: start, map, tasks (new, under the map), meadow (level 1.3) and space (level 2.1).
Decision: the 1366 px PNGs were 650-1000 KB and still over 400 KB at width 1200, so the script then
saves them with a 256-color palette (170-250 KB, no visible loss). Nothing left out.
