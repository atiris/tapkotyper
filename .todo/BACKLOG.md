# Backlog

Everything found outside the current task, one line each, most important first:
`- [P1|P2|P3] <title> - <one line: what is wrong and where>`.
Search before adding; an entry is worked only when it is named.
- [P3] Check .tapko sharing and opening on real devices - src/screens/teacher.ts sendDialog uses Web Share with files (Android, iPhone) and main.ts launchQueue opens a double-clicked .tapko in installed Chrome/Edge (plan 59); neither is testable here
- [P2] Mole and molehill are one picture - assets-src/obj-mole.jpg draws the mole inside its hill; the mole level (src/game/modes/egg.ts) needs the mole and the molehill as separate pictures
- [P2] Dictation words not all audible — src/words/words.ts WordSource.heard still lets through words whose spelling hearing does not decide (voicing at the end or before a consonant, i/y after consonants); see .research/game/activities.md Dictation rules
- [P2] Three e2e tests fail already on abb8420 - e2e/parrot.spec.ts:50 (no results card after the parrot flies off), e2e/play.spec.ts:152 (gate progress stays 13 % after a slip, expects 0 %), e2e/service.spec.ts:4 (13 done level nodes instead of 10 after the green side cards)
- [P2] Two e2e tests still name the old buttons - e2e/play.spec.ts:278 expects "Map" first on the stay-a-while card and :249 clicks "End exercise"; commit 279bab3 made both "Stop typing"
- [P3] Calm background bands may show their inner joins - layers quilted with a sibling strip (scripts/bg-seam.mjs quilt) can leave steps in calm bands, as the planet path did; re-quilt them with the same strip as donor (assets-src/PROMPTS.md section 3) when one shows
