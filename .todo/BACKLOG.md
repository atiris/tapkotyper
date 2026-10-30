# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P2] Mole and molehill are one picture - assets-src/obj-mole.jpg draws the mole inside its hill; the egg world's mole (not built yet; its old src/game/modes/egg.ts is gone) needs the mole and the molehill as separate pictures
- [P2] Dictation words not all audible — src/words/words.ts WordSource.heard still lets through words whose spelling hearing does not decide (voicing at the end or before a consonant, i/y after consonants); see .research/game/activities.md Dictation rules
- [P3] Calm background bands may show their inner joins - layers quilted with a sibling strip (scripts/bg-seam.mjs quilt) can leave steps in calm bands, as the planet path did; re-quilt them with the same strip as donor (assets-src/PROMPTS.md section 3) when one shows
- [P2] Service worker install downloads every file at once - scripts/sw-template.js install() fetches all ~6.8 MB with one Promise.all on the first visit, competing with a level's own pictures on a slow school line (plan 82 limited only the page's own background preload); a few at a time would let the level open first
- [P3] Blur behind the results card redraws every frame - .overlay backdrop-filter: blur(3px) in src/styles.css sits over the scene that keeps animating, so full graphics re-blur the whole stage each frame (placeholder and hedgehog results: p50 33 ms on the normal profile); Simple graphics drop it, Full could freeze or cache the scene under the card
- [P3] Simple graphics could draw a smaller canvas - on the slow profile (CPU x6, software drawing) Simple graphics hold p50 33 ms but p95 stays 50-100 ms, almost all of it the full-screen raster (scripts/perf.mjs, plan 82); a canvas at 0.75 of the screen pixels would cut it, at the cost of a softer picture
- [P3] runtime.ts is still 1450 lines - src/game/runtime.ts keeps the pause card with stretches, paw help and the super helper, all on its private state; moving them out needs a small state object they share (plan 82 moved labels and callouts only)
- [P3] Great swamp shore far after a long wait - src/game/modes/planet.ts places the shore just past the right edge (about 8 jumps), so a child who waits long at the log plays ~30 s past the minimum; a nearer shore when the time is already up would end sooner
