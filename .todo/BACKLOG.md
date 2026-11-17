# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P2] Sticky finger: its first level - decide which world's level first plays the Sticky finger kind (plan 104 builds it for own practice only); it needs at least 4 known keys of each hand; a, e, i, o are all known first in the valley's 2nd level (17 keys) and in the robot story's workshop 3rd level (src/game/levels.ts LEVELS, src/learning/lessons.ts)
- [P3] Profile PIN - optional PIN a child sets on their profile; anything beyond the map and the progress popup asks for it until the player switches profile or locks the map; the parent removes it with the device password; it is set in Settings > Študent (src/screens/start.ts, map.ts, parent.ts)
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P3] Calm background bands may show their inner joins - layers quilted with a sibling strip (scripts/bg-seam.mjs quilt) can leave steps in calm bands, as the planet path did; re-quilt them with the same strip as donor (assets-src/PROMPTS.md section 3) when one shows
- [P3] Egg mountain far band shows light streaks in its sky - public/assets/bg-egg-far.webp has pale vertical bands in the sky (about x 250 and x 1100 of 1376) left by Gemini's seam repaint and the local tone fix; repaint the sky or regenerate the far layer (assets-src/PROMPTS.md section 3)
- [P3] Hero's speech bubble covers the junkyard's ribbon and code screen - in 6:4 and 6:5 (src/game/modes/junkyard-wake.ts) the bubble over the hero hides the top-left corner of the ribbon and of the source screen while it shows
- [P3] Band seam steps of the junkyard rework are one-off scripts - centering a strip, the white ground below it, the exact bumpy gap edge, Gemini's bottom copied into rolled.png and the evened bottom edges (assets-src/PROMPTS.md lessons, 2026-11-15) belong in scripts/bg-seam.mjs as commands
