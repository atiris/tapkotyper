# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P2] Mole and molehill are one picture - assets-src/obj-mole.jpg draws the mole inside its hill; the mole level (src/game/modes/egg.ts) needs the mole and the molehill as separate pictures
- [P2] Dictation words not all audible — src/words/words.ts WordSource.heard still lets through words whose spelling hearing does not decide (voicing at the end or before a consonant, i/y after consonants); see .research/game/activities.md Dictation rules
- [P2] Every world's mode code is in the main bundle - src/game/modes.ts imports all 25 mode files statically (main chunk 474 kB, 159 kB gzip, grows with each world); load a world's modes on demand in LevelRuntime (createMode is sync today)
- [P3] Calm background bands may show their inner joins - layers quilted with a sibling strip (scripts/bg-seam.mjs quilt) can leave steps in calm bands, as the planet path did; re-quilt them with the same strip as donor (assets-src/PROMPTS.md section 3) when one shows
