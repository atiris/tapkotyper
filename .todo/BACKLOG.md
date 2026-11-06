# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P2] Sticky finger: its first level - decide which world's level first plays the Sticky finger kind (plan 104 builds it for own practice only); it needs at least 4 known keys of each hand, so not before the rocket's third level (src/game/levels.ts LEVELS)
- [P3] Flaky start page layout test - e2e/theme.spec.ts "the start page fits ... (light)" fails about 1 in 6 runs (also before the start texts): at 820x1180 with no players a sky piece overlaps the text
- [P3] Profile PIN - optional PIN a child sets on their profile; anything beyond the map and the progress popup asks for it until the player switches profile or locks the map; the parent removes it with the device password (src/screens/start.ts, map.ts)
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P3] Calm background bands may show their inner joins - layers quilted with a sibling strip (scripts/bg-seam.mjs quilt) can leave steps in calm bands, as the planet path did; re-quilt them with the same strip as donor (assets-src/PROMPTS.md section 3) when one shows
- [P3] Egg mountain far band shows light streaks in its sky - public/assets/bg-egg-far.webp has pale vertical bands in the sky (about x 250 and x 1100 of 1376) left by Gemini's seam repaint and the local tone fix; repaint the sky or regenerate the far layer (assets-src/PROMPTS.md section 3)
- [P3] Simple graphics slow-profile p95 sits at 50-80 ms in valley-1 and space-5 - the :has rules and per-key restyles of the keyboard are gone; the rest is style recalcs of about 207 level elements each time Tapko changes (src/game/runtime/tapko.ts) and the SVG hands' opacity transitions (`node scripts/perf.mjs --machine slow --low --only space-5,valley-1`)
